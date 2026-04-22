import type { Tool } from '@langchain/core/tools';
import { mock } from 'jest-mock-extended';

import { RedisSessionStore, type RedisPublisher } from '../RedisSessionStore';

describe('RedisSessionStore', () => {
	let store: RedisSessionStore;
	let mockPublisher: jest.Mocked<RedisPublisher>;
	const getSessionKey = (sessionId: string) => `mcp-session:${sessionId}`;
	const ttl = 3600;

	beforeEach(() => {
		mockPublisher = {
			set: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue(null),
			clear: jest.fn().mockResolvedValue(undefined),
		};
		store = new RedisSessionStore(mockPublisher, getSessionKey, ttl);
	});

	describe('register', () => {
		it('should store session with TTL in Redis', async () => {
			await store.register('session-123');

			expect(mockPublisher.set).toHaveBeenCalledWith('mcp-session:session-123', '1', ttl);
		});
	});

	describe('validate', () => {
		it('should return true when session exists in Redis', async () => {
			mockPublisher.get.mockResolvedValue('1');

			const result = await store.validate('session-123');

			expect(mockPublisher.get).toHaveBeenCalledWith('mcp-session:session-123');
			expect(result).toBe(true);
		});

		it('should return false when session does not exist', async () => {
			mockPublisher.get.mockResolvedValue(null);

			const result = await store.validate('non-existent');

			expect(result).toBe(false);
		});
	});

	describe('unregister', () => {
		it('should clear session from Redis and remove tools', async () => {
			const mockTool = mock<Tool>();
			store.setTools('session-123', [mockTool]);

			await store.unregister('session-123');

			expect(mockPublisher.clear).toHaveBeenCalledWith('mcp-session:session-123');
			expect(store.getTools('session-123')).toBeUndefined();
		});
	});

	describe('tool management', () => {
		it('should store and retrieve tools', () => {
			const mockTool1 = mock<Tool>();
			const mockTool2 = mock<Tool>();

			store.setTools('session-1', [mockTool1]);
			store.setTools('session-2', [mockTool2]);

			expect(store.getTools('session-1')).toEqual([mockTool1]);
			expect(store.getTools('session-2')).toEqual([mockTool2]);
		});

		it('should return undefined for unknown session', () => {
			expect(store.getTools('unknown')).toBeUndefined();
		});

		it('should clear tools for a session', () => {
			const mockTool = mock<Tool>();
			store.setTools('session-123', [mockTool]);

			store.clearTools('session-123');

			expect(store.getTools('session-123')).toBeUndefined();
		});
	});

	describe('custom key function', () => {
		it('should use custom key function for Redis operations', async () => {
			const customKeyFn = (sessionId: string) => `custom:prefix:${sessionId}`;
			const customStore = new RedisSessionStore(mockPublisher, customKeyFn, ttl);

			await customStore.register('test-id');

			expect(mockPublisher.set).toHaveBeenCalledWith('custom:prefix:test-id', '1', ttl);
		});
	});

	describe('custom TTL', () => {
		it('should use custom TTL for register', async () => {
			const customTtl = 86400;
			const customStore = new RedisSessionStore(mockPublisher, getSessionKey, customTtl);

			await customStore.register('test-id');

			expect(mockPublisher.set).toHaveBeenCalledWith(expect.any(String), '1', customTtl);
		});
	});
});
