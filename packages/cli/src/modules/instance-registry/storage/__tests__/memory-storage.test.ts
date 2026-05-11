import type { InstanceRegistration } from '@n8n/api-types';

import { MemoryInstanceStorage } from '../memory-storage';

const makeRegistration = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1 as const,
	instanceKey: 'instance-1',
	hostId: 'host-1',
	instanceType: 'main',
	instanceRole: 'leader',
	version: '1.0.0',
	registeredAt: Date.now(),
	lastSeen: Date.now(),
	...overrides,
});

describe('MemoryInstanceStorage', () => {
	let storage: MemoryInstanceStorage;

	beforeEach(() => {
		storage = new MemoryInstanceStorage();
	});

	it('should have kind "memory"', () => {
		expect(storage.kind).toBe('memory');
	});

	describe('register', () => {
		it('should store registration', async () => {
			const reg = makeRegistration();

			await storage.register(reg);

			const result = await storage.getRegistration('instance-1');
			expect(result).toEqual(reg);
		});
	});

	describe('heartbeat', () => {
		it('should update stored registration', async () => {
			const reg = makeRegistration();
			await storage.register(reg);

			const updated = makeRegistration({ lastSeen: Date.now() + 30_000 });
			await storage.heartbeat(updated);

			const result = await storage.getRegistration('instance-1');
			expect(result).toEqual(updated);
		});
	});

	describe('unregister', () => {
		it('should clear registration when key matches', async () => {
			await storage.register(makeRegistration());

			await storage.unregister('instance-1');

			const result = await storage.getRegistration('instance-1');
			expect(result).toBeNull();
		});

		it('should not clear registration when key does not match', async () => {
			const reg = makeRegistration();
			await storage.register(reg);

			await storage.unregister('other-instance');

			const result = await storage.getRegistration('instance-1');
			expect(result).toEqual(reg);
		});

		it('should be safe to call when no registration exists', async () => {
			await expect(storage.unregister('instance-1')).resolves.toBeUndefined();
		});
	});

	describe('getAllRegistrations', () => {
		it('should return empty array when no registration exists', async () => {
			const result = await storage.getAllRegistrations();
			expect(result).toEqual([]);
		});

		it('should return array with single registration', async () => {
			const reg = makeRegistration();
			await storage.register(reg);

			const result = await storage.getAllRegistrations();
			expect(result).toEqual([reg]);
		});

		it('should return empty array after unregistering', async () => {
			await storage.register(makeRegistration());
			await storage.unregister('instance-1');

			const result = await storage.getAllRegistrations();
			expect(result).toEqual([]);
		});
	});

	describe('getRegistration', () => {
		it('should return null when no registration exists', async () => {
			const result = await storage.getRegistration('instance-1');
			expect(result).toBeNull();
		});

		it('should return null when key does not match', async () => {
			await storage.register(makeRegistration());

			const result = await storage.getRegistration('other-instance');
			expect(result).toBeNull();
		});

		it('should return registration when key matches', async () => {
			const reg = makeRegistration();
			await storage.register(reg);

			const result = await storage.getRegistration('instance-1');
			expect(result).toEqual(reg);
		});
	});

	describe('getLastKnownState', () => {
		it('should return empty map initially', async () => {
			const result = await storage.getLastKnownState();
			expect(result.size).toBe(0);
		});

		it('should return a copy, not the internal reference', async () => {
			const state = new Map<string, InstanceRegistration>();
			state.set('instance-1', makeRegistration());
			await storage.saveLastKnownState(state);

			const result = await storage.getLastKnownState();
			result.delete('instance-1');

			const resultAfterMutation = await storage.getLastKnownState();
			expect(resultAfterMutation.size).toBe(1);
		});
	});

	describe('saveLastKnownState', () => {
		it('should persist state', async () => {
			const state = new Map<string, InstanceRegistration>();
			const reg = makeRegistration();
			state.set('instance-1', reg);

			await storage.saveLastKnownState(state);

			const result = await storage.getLastKnownState();
			expect(result.get('instance-1')).toEqual(reg);
		});

		it('should not be affected by mutations to the input map', async () => {
			const state = new Map<string, InstanceRegistration>();
			state.set('instance-1', makeRegistration());
			await storage.saveLastKnownState(state);

			state.delete('instance-1');

			const result = await storage.getLastKnownState();
			expect(result.size).toBe(1);
		});
	});

	describe('cleanupStaleMembers', () => {
		it('should return 0', async () => {
			const result = await storage.cleanupStaleMembers();
			expect(result).toBe(0);
		});
	});
});
