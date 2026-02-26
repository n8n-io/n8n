import { createMockTool } from '../../__tests__/helpers';
import { InMemorySessionStore } from '../InMemorySessionStore';

describe('InMemorySessionStore', () => {
	let store: InMemorySessionStore;

	beforeEach(() => {
		store = new InMemorySessionStore();
	});

	describe('session lifecycle', () => {
		it('should register and validate a session', async () => {
			await store.register('session-1');
			expect(await store.validate('session-1')).toBe(true);
		});

		it('should return false for unregistered session', async () => {
			expect(await store.validate('non-existent')).toBe(false);
		});

		it('should handle registering same session twice (idempotent)', async () => {
			await store.register('session-1');
			await store.register('session-1');
			expect(await store.validate('session-1')).toBe(true);
		});

		it('should unregister session and invalidate it', async () => {
			await store.register('session-1');
			await store.unregister('session-1');
			expect(await store.validate('session-1')).toBe(false);
		});

		it('should handle unregistering non-existent session gracefully', async () => {
			await expect(store.unregister('non-existent')).resolves.not.toThrow();
		});

		it('should handle multiple sessions independently', async () => {
			await store.register('session-1');
			await store.register('session-2');
			await store.register('session-3');

			expect(await store.validate('session-1')).toBe(true);
			expect(await store.validate('session-2')).toBe(true);
			expect(await store.validate('session-3')).toBe(true);

			await store.unregister('session-2');

			expect(await store.validate('session-1')).toBe(true);
			expect(await store.validate('session-2')).toBe(false);
			expect(await store.validate('session-3')).toBe(true);
		});

		it('should handle empty string as session id', async () => {
			await store.register('');
			expect(await store.validate('')).toBe(true);
		});
	});

	describe('tools management', () => {
		const mockTools = [createMockTool('tool-1'), createMockTool('tool-2')];

		it('should set and get tools for a session', () => {
			store.setTools('session-1', mockTools);
			expect(store.getTools('session-1')).toEqual(mockTools);
		});

		it('should return undefined for session without tools', () => {
			expect(store.getTools('session-without-tools')).toBeUndefined();
		});

		it('should clear tools for a session', () => {
			store.setTools('session-1', mockTools);
			store.clearTools('session-1');
			expect(store.getTools('session-1')).toBeUndefined();
		});

		it('should clear tools when session is unregistered', async () => {
			await store.register('session-1');
			store.setTools('session-1', mockTools);
			await store.unregister('session-1');
			expect(store.getTools('session-1')).toBeUndefined();
		});

		it('should handle clearing tools for non-existent session', () => {
			expect(() => store.clearTools('non-existent')).not.toThrow();
		});

		it('should isolate tools between sessions', () => {
			const tools1 = [createMockTool('tool-a')];
			const tools2 = [createMockTool('tool-b')];
			store.setTools('session-1', tools1);
			store.setTools('session-2', tools2);
			expect(store.getTools('session-1')).toEqual(tools1);
			expect(store.getTools('session-2')).toEqual(tools2);
		});

		it('should overwrite tools when set again', () => {
			const tools1 = [createMockTool('tool-a')];
			const tools2 = [createMockTool('tool-b'), createMockTool('tool-c')];
			store.setTools('session-1', tools1);
			store.setTools('session-1', tools2);
			expect(store.getTools('session-1')).toEqual(tools2);
		});

		it('should handle setting empty tools array', () => {
			store.setTools('session-1', []);
			expect(store.getTools('session-1')).toEqual([]);
		});

		it('should not affect tools when clearing non-existent session', () => {
			const tools = [createMockTool('tool-a')];
			store.setTools('session-1', tools);
			store.clearTools('session-2');
			expect(store.getTools('session-1')).toEqual(tools);
		});
	});

	describe('combined session and tools operations', () => {
		it('should allow setting tools before registering session', () => {
			const tools = [createMockTool('tool-1')];
			store.setTools('session-1', tools);
			expect(store.getTools('session-1')).toEqual(tools);
		});

		it('should not delete tools when registering session with existing tools', async () => {
			const tools = [createMockTool('tool-1')];
			store.setTools('session-1', tools);
			await store.register('session-1');
			expect(store.getTools('session-1')).toEqual(tools);
		});
	});
});
