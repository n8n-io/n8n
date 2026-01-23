import { CRDTEngine, createCRDTProvider, ChangeOrigin } from '../index';
import type { CRDTDoc, CRDTAwareness, AwarenessChangeEvent, AwarenessState } from '../types';

/**
 * Custom awareness state for testing
 */
interface TestAwarenessState extends AwarenessState {
	user: { name: string; color: string };
	cursor?: { x: number; y: number };
}

/**
 * Awareness conformance test suite - runs the same tests against both providers
 * to ensure they behave identically.
 */
describe.each([CRDTEngine.yjs])('Awareness Conformance: %s', (engine) => {
	let doc: CRDTDoc;
	let awareness: CRDTAwareness<TestAwarenessState>;

	beforeEach(() => {
		const provider = createCRDTProvider({ engine });
		doc = provider.createDoc('test-awareness');
		awareness = doc.getAwareness<TestAwarenessState>();
	});

	afterEach(() => {
		doc.destroy();
	});

	describe('Client ID', () => {
		it('should have a unique clientId', () => {
			expect(awareness.clientId).toBeDefined();
			expect(typeof awareness.clientId).toBe('number');
			expect(awareness.clientId).toBeGreaterThan(0);
		});

		it('should return same awareness instance on multiple getAwareness() calls', () => {
			const awareness2 = doc.getAwareness<TestAwarenessState>();
			expect(awareness.clientId).toBe(awareness2.clientId);
		});

		it('should have different clientIds for different docs', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// ClientIds should be different (with very high probability)
			expect(awareness.clientId).not.toBe(awareness2.clientId);

			doc2.destroy();
		});
	});

	describe('Local State', () => {
		it('should return null for uninitialized local state', () => {
			expect(awareness.getLocalState()).toBeNull();
		});

		it('should set and get local state', () => {
			const state: TestAwarenessState = {
				user: { name: 'Alice', color: '#ff0000' },
				cursor: { x: 100, y: 200 },
			};

			awareness.setLocalState(state);

			expect(awareness.getLocalState()).toEqual(state);
		});

		it('should update local state', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			awareness.setLocalState({
				user: { name: 'Alice', color: '#00ff00' },
				cursor: { x: 50, y: 50 },
			});

			const state = awareness.getLocalState();
			expect(state?.user.color).toBe('#00ff00');
			expect(state?.cursor).toEqual({ x: 50, y: 50 });
		});

		it('should set local state to null (mark offline)', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			awareness.setLocalState(null);

			expect(awareness.getLocalState()).toBeNull();
		});

		it('should update single field with setLocalStateField', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			awareness.setLocalStateField('cursor', { x: 100, y: 200 });

			const state = awareness.getLocalState();
			expect(state?.user.name).toBe('Alice');
			expect(state?.cursor).toEqual({ x: 100, y: 200 });
		});

		it('should do nothing when setLocalStateField called with null state', () => {
			// Local state is null
			expect(awareness.getLocalState()).toBeNull();

			// This should not throw or do anything
			awareness.setLocalStateField('cursor', { x: 100, y: 200 });

			expect(awareness.getLocalState()).toBeNull();
		});
	});

	describe('Getting States', () => {
		it('should return empty map when no state is set', () => {
			const states = awareness.getStates();
			expect(states.size).toBe(0);
		});

		it('should include local state in getStates()', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			const states = awareness.getStates();
			expect(states.size).toBe(1);
			expect(states.get(awareness.clientId)).toEqual({
				user: { name: 'Alice', color: '#ff0000' },
			});
		});

		it('should not include null states in getStates()', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			awareness.setLocalState(null);

			const states = awareness.getStates();
			expect(states.size).toBe(0);
		});
	});

	describe('Change Events', () => {
		it('should emit change event when setting local state', () => {
			const changes: Array<{ event: AwarenessChangeEvent; origin: string }> = [];
			awareness.onChange((event, origin) => {
				changes.push({ event, origin });
			});

			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(changes).toHaveLength(1);
			// When setting state for the first time, it can be either 'added' or 'updated'
			// depending on the provider implementation
			const clientInAdded = changes[0].event.added.includes(awareness.clientId);
			const clientInUpdated = changes[0].event.updated.includes(awareness.clientId);
			expect(clientInAdded || clientInUpdated).toBe(true);
			expect(changes[0].origin).toBe(ChangeOrigin.local);
		});

		it('should emit change event when updating local state', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			const changes: AwarenessChangeEvent[] = [];
			awareness.onChange((event) => changes.push(event));

			awareness.setLocalState({
				user: { name: 'Alice', color: '#00ff00' },
			});

			expect(changes).toHaveLength(1);
			expect(changes[0].updated).toContain(awareness.clientId);
		});

		it('should emit removed event when setting state to null', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			const changes: AwarenessChangeEvent[] = [];
			awareness.onChange((event) => changes.push(event));

			awareness.setLocalState(null);

			expect(changes).toHaveLength(1);
			expect(changes[0].removed).toContain(awareness.clientId);
		});

		it('should stop emitting events after unsubscribe', () => {
			const changes: AwarenessChangeEvent[] = [];
			const unsubscribe = awareness.onChange((event) => changes.push(event));

			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(changes).toHaveLength(1);

			unsubscribe();

			awareness.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			expect(changes).toHaveLength(1); // No new changes
		});
	});

	describe('Encoding and Decoding', () => {
		it('should encode state as Uint8Array', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			const encoded = awareness.encodeState();

			expect(encoded).toBeInstanceOf(Uint8Array);
			expect(encoded.length).toBeGreaterThan(0);
		});

		it('should encode only specified clients', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			const encodedAll = awareness.encodeState();
			const encodedOne = awareness.encodeState([awareness.clientId]);

			expect(encodedAll).toBeInstanceOf(Uint8Array);
			expect(encodedOne).toBeInstanceOf(Uint8Array);
			// Both should have content (exact size may vary by format)
			expect(encodedAll.length).toBeGreaterThan(0);
			expect(encodedOne.length).toBeGreaterThan(0);
		});

		it('should apply update from another awareness', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// Set state in awareness2
			awareness2.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			// Encode and apply to awareness1
			const update = awareness2.encodeState([awareness2.clientId]);
			awareness.applyUpdate(update);

			// awareness1 should now have awareness2's state
			const states = awareness.getStates();
			expect(states.get(awareness2.clientId)).toEqual({
				user: { name: 'Bob', color: '#0000ff' },
			});

			doc2.destroy();
		});

		it('should emit change event when applying remote update', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			awareness2.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			const changes: Array<{ event: AwarenessChangeEvent; origin: string }> = [];
			awareness.onChange((event, origin) => {
				changes.push({ event, origin });
			});

			const update = awareness2.encodeState([awareness2.clientId]);
			awareness.applyUpdate(update);

			expect(changes).toHaveLength(1);
			expect(changes[0].event.added).toContain(awareness2.clientId);
			expect(changes[0].origin).toBe(ChangeOrigin.remote);

			doc2.destroy();
		});
	});

	describe('Update Events', () => {
		it('should emit update when local state changes', () => {
			const updates: Array<{ data: Uint8Array; origin: string }> = [];
			awareness.onUpdate((data, origin) => {
				updates.push({ data, origin });
			});

			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(updates).toHaveLength(1);
			expect(updates[0].data).toBeInstanceOf(Uint8Array);
			expect(updates[0].origin).toBe(ChangeOrigin.local);
		});

		it('should stop emitting updates after unsubscribe', () => {
			const updates: Uint8Array[] = [];
			const unsubscribe = awareness.onUpdate((data) => {
				updates.push(data);
			});

			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(updates).toHaveLength(1);

			unsubscribe();

			awareness.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			expect(updates).toHaveLength(1); // No new updates
		});
	});

	describe('Remove States', () => {
		it('should remove specified client states', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// Add remote state
			awareness2.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			const update = awareness2.encodeState([awareness2.clientId]);
			awareness.applyUpdate(update);

			expect(awareness.getStates().has(awareness2.clientId)).toBe(true);

			// Remove the state
			awareness.removeStates([awareness2.clientId]);

			expect(awareness.getStates().has(awareness2.clientId)).toBe(false);

			doc2.destroy();
		});

		it('should emit removed event when removing states', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			awareness2.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			const update = awareness2.encodeState([awareness2.clientId]);
			awareness.applyUpdate(update);

			const changes: AwarenessChangeEvent[] = [];
			awareness.onChange((event) => changes.push(event));

			awareness.removeStates([awareness2.clientId]);

			expect(changes).toHaveLength(1);
			expect(changes[0].removed).toContain(awareness2.clientId);

			doc2.destroy();
		});

		it('should not remove own state', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			// Try to remove own state via removeStates (should be ignored)
			awareness.removeStates([awareness.clientId]);

			// Local state should still exist
			expect(awareness.getLocalState()).not.toBeNull();
		});
	});

	describe('Destroy', () => {
		it('should mark client offline when destroyed', () => {
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(awareness.getLocalState()).not.toBeNull();

			awareness.destroy();

			// After destroy, local state should be null (marked offline)
			expect(awareness.getLocalState()).toBeNull();
		});

		it('should emit removed event when destroyed', () => {
			const changes: AwarenessChangeEvent[] = [];
			awareness.onChange((event) => changes.push(event));

			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(changes).toHaveLength(1);

			awareness.destroy();

			// Destroy should emit a removed event (marking client offline)
			expect(changes.length).toBeGreaterThan(1);
			const lastChange = changes[changes.length - 1];
			expect(lastChange.removed).toContain(awareness.clientId);
		});
	});

	describe('Two-Way Sync', () => {
		it('should sync awareness between two docs', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// Set up two-way sync
			awareness.onUpdate((update) => {
				awareness2.applyUpdate(update);
			});

			awareness2.onUpdate((update) => {
				awareness.applyUpdate(update);
			});

			// Set states
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			awareness2.setLocalState({
				user: { name: 'Bob', color: '#0000ff' },
			});

			// Both should see each other
			const states1 = awareness.getStates();
			const states2 = awareness2.getStates();

			expect(states1.size).toBe(2);
			expect(states2.size).toBe(2);

			expect(states1.get(awareness.clientId)?.user.name).toBe('Alice');
			expect(states1.get(awareness2.clientId)?.user.name).toBe('Bob');

			expect(states2.get(awareness.clientId)?.user.name).toBe('Alice');
			expect(states2.get(awareness2.clientId)?.user.name).toBe('Bob');

			doc2.destroy();
		});

		it('should propagate state updates', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// Set up two-way sync
			awareness.onUpdate((update) => {
				awareness2.applyUpdate(update);
			});

			awareness2.onUpdate((update) => {
				awareness.applyUpdate(update);
			});

			// Initial state
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			// Update state
			awareness.setLocalState({
				user: { name: 'Alice', color: '#00ff00' },
				cursor: { x: 100, y: 200 },
			});

			// awareness2 should see the update
			const state = awareness2.getStates().get(awareness.clientId);
			expect(state?.user.color).toBe('#00ff00');
			expect(state?.cursor).toEqual({ x: 100, y: 200 });

			doc2.destroy();
		});

		it('should handle offline correctly', () => {
			const provider = createCRDTProvider({ engine });
			const doc2 = provider.createDoc('test-awareness-2');
			const awareness2 = doc2.getAwareness<TestAwarenessState>();

			// Set up two-way sync
			awareness.onUpdate((update) => {
				awareness2.applyUpdate(update);
			});

			awareness2.onUpdate((update) => {
				awareness.applyUpdate(update);
			});

			// Set state
			awareness.setLocalState({
				user: { name: 'Alice', color: '#ff0000' },
			});

			expect(awareness2.getStates().has(awareness.clientId)).toBe(true);

			// Go offline
			awareness.setLocalState(null);

			// awareness2 should see the removal
			expect(awareness2.getStates().has(awareness.clientId)).toBe(false);

			doc2.destroy();
		});
	});
});

describe('Awareness - Yjs specific', () => {
	it('should use y-protocols Awareness internally', () => {
		const provider = createCRDTProvider({ engine: CRDTEngine.yjs });
		const doc = provider.createDoc('test');
		const awareness = doc.getAwareness();

		// Yjs awareness should have a valid clientId from y-protocols
		expect(awareness.clientId).toBeDefined();
		expect(typeof awareness.clientId).toBe('number');

		doc.destroy();
	});
});
