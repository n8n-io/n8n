import { MemoryChatBufferSingleton } from './MemoryChatBufferSingleton';

describe('MemoryChatBufferSingleton', () => {
	beforeEach(() => {
		// @ts-expect-error Reset memory singleton between tests
		MemoryChatBufferSingleton.instance = undefined;
	});

	describe('getInstance', () => {
		it('should return the same instance on multiple calls', () => {
			const instance1 = MemoryChatBufferSingleton.getInstance();
			const instance2 = MemoryChatBufferSingleton.getInstance();

			expect(instance1).toBe(instance2);
		});

		it('should create a new instance if none exists', () => {
			const instance = MemoryChatBufferSingleton.getInstance();

			expect(instance).toBeInstanceOf(MemoryChatBufferSingleton);
		});
	});

	describe('getMemory', () => {
		it('should create a new memory for a new session key', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = {
				k: 5,
				inputKey: 'input',
				memoryKey: 'chat_history',
				outputKey: 'output',
				returnMessages: true,
			};

			const memory = await singleton.getMemory('session-1', memoryParams);

			expect(memory).toBeDefined();
			expect(memory.k).toBe(5);
		});

		it('should return the same memory for the same session key', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = {
				k: 5,
				inputKey: 'input',
				memoryKey: 'chat_history',
				outputKey: 'output',
				returnMessages: true,
			};

			const memory1 = await singleton.getMemory('session-1', memoryParams);
			const memory2 = await singleton.getMemory('session-1', memoryParams);

			expect(memory1).toBe(memory2);
		});

		it('should return different memories for different session keys', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = {
				k: 5,
				inputKey: 'input',
				memoryKey: 'chat_history',
				outputKey: 'output',
				returnMessages: true,
			};

			const memory1 = await singleton.getMemory('session-1', memoryParams);
			const memory2 = await singleton.getMemory('session-2', memoryParams);

			expect(memory1).not.toBe(memory2);
		});

		it('should update last_accessed on subsequent access', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = { k: 5 };

			// Access memory first time
			await singleton.getMemory('session-1', memoryParams);

			// Wait a bit to ensure time difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Access again
			await singleton.getMemory('session-1', memoryParams);

			// Access the internal buffer - memory should still be accessible
			const memory = await singleton.getMemory('session-1', memoryParams);
			expect(memory).toBeDefined();
		});

		it('should respect k parameter for window size', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();

			const memory3 = await singleton.getMemory('session-k3', { k: 3 });
			const memory10 = await singleton.getMemory('session-k10', { k: 10 });

			expect(memory3.k).toBe(3);
			expect(memory10.k).toBe(10);
		});
	});

	describe('cleanup', () => {
		it('should clean up stale buffers older than 1 hour', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = { k: 5 };

			// Create a memory
			const memory = await singleton.getMemory('stale-session', memoryParams);
			expect(memory).toBeDefined();

			// Access the internal memoryBuffer to simulate stale entry
			// @ts-expect-error Accessing private property for testing
			const bufferEntry = singleton.memoryBuffer.get('stale-session');
			if (bufferEntry) {
				// Set last_accessed to 2 hours ago
				bufferEntry.last_accessed = new Date(Date.now() - 2 * 60 * 60 * 1000);
			}

			// Trigger cleanup by getting another memory
			await singleton.getMemory('new-session', memoryParams);

			// Verify stale session was cleaned up by checking if a new memory is created
			// @ts-expect-error Accessing private property for testing
			const staleEntry = singleton.memoryBuffer.get('stale-session');
			expect(staleEntry).toBeUndefined();
		});

		it('should not clean up buffers less than 1 hour old', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = { k: 5 };

			// Create a memory
			const memory = await singleton.getMemory('fresh-session', memoryParams);
			expect(memory).toBeDefined();

			// Access the internal memoryBuffer to check entry
			// @ts-expect-error Accessing private property for testing
			const bufferEntry = singleton.memoryBuffer.get('fresh-session');
			if (bufferEntry) {
				// Set last_accessed to 30 minutes ago (less than 1 hour)
				bufferEntry.last_accessed = new Date(Date.now() - 30 * 60 * 1000);
			}

			// Trigger cleanup by getting another memory
			await singleton.getMemory('another-session', memoryParams);

			// Verify fresh session was NOT cleaned up
			// @ts-expect-error Accessing private property for testing
			const freshEntry = singleton.memoryBuffer.get('fresh-session');
			expect(freshEntry).toBeDefined();
		});

		it('should clear memory contents when cleaning up', async () => {
			const singleton = MemoryChatBufferSingleton.getInstance();
			const memoryParams = { k: 5 };

			// Create a memory and add some content
			const memory = await singleton.getMemory('to-clear-session', memoryParams);
			await memory.saveContext({ input: 'Hello' }, { output: 'Hi!' });

			// Get memory buffer entry and make it stale
			// @ts-expect-error Accessing private property for testing
			const bufferEntry = singleton.memoryBuffer.get('to-clear-session');
			if (bufferEntry) {
				bufferEntry.last_accessed = new Date(Date.now() - 2 * 60 * 60 * 1000);
			}

			// Spy on clear method
			const clearSpy = jest.spyOn(memory, 'clear');

			// Trigger cleanup
			await singleton.getMemory('trigger-session', memoryParams);

			// Clear should have been called
			expect(clearSpy).toHaveBeenCalled();
		});
	});
});
