import { createMockServer, createMockTransport, createMockTool } from '../../__tests__/helpers';
import { SessionManager } from '../SessionManager';
import type { SessionStore } from '../SessionStore';

describe('SessionManager', () => {
	let manager: SessionManager;
	let mockStore: jest.Mocked<SessionStore>;

	beforeEach(() => {
		mockStore = {
			register: jest.fn().mockResolvedValue(undefined),
			validate: jest.fn().mockResolvedValue(true),
			unregister: jest.fn().mockResolvedValue(undefined),
			getTools: jest.fn(),
			setTools: jest.fn(),
			clearTools: jest.fn(),
		};
		manager = new SessionManager(mockStore);
	});

	describe('registerSession', () => {
		it('should register session with server and transport', async () => {
			const server = createMockServer();
			const transport = createMockTransport('session-1');

			await manager.registerSession('session-1', server, transport);

			expect(mockStore.register).toHaveBeenCalledWith('session-1');
			expect(manager.getSession('session-1')).toEqual({
				sessionId: 'session-1',
				server,
				transport,
			});
		});

		it('should store tools when provided', async () => {
			const tools = [createMockTool('tool-1')];
			await manager.registerSession(
				'session-1',
				createMockServer(),
				createMockTransport('session-1'),
				tools,
			);

			expect(mockStore.setTools).toHaveBeenCalledWith('session-1', tools);
		});

		it('should not call setTools when no tools provided', async () => {
			await manager.registerSession(
				'session-1',
				createMockServer(),
				createMockTransport('session-1'),
			);

			expect(mockStore.setTools).not.toHaveBeenCalled();
		});

		it('should not register if sessionId is empty', async () => {
			await manager.registerSession('', createMockServer(), createMockTransport(''));

			expect(mockStore.register).not.toHaveBeenCalled();
			expect(manager.getSession('')).toBeUndefined();
		});

		it('should overwrite existing session when registering same sessionId', async () => {
			const server1 = createMockServer();
			const transport1 = createMockTransport('session-1');
			const server2 = createMockServer();
			const transport2 = createMockTransport('session-1');

			await manager.registerSession('session-1', server1, transport1);
			await manager.registerSession('session-1', server2, transport2);

			const session = manager.getSession('session-1');
			expect(session?.server).toBe(server2);
			expect(session?.transport).toBe(transport2);
		});
	});

	describe('destroySession', () => {
		it('should remove session and delegate to store', async () => {
			await manager.registerSession(
				'session-1',
				createMockServer(),
				createMockTransport('session-1'),
			);
			await manager.destroySession('session-1');

			expect(mockStore.unregister).toHaveBeenCalledWith('session-1');
			expect(manager.getSession('session-1')).toBeUndefined();
		});

		it('should handle destroying non-existent session', async () => {
			await expect(manager.destroySession('non-existent')).resolves.not.toThrow();
			expect(mockStore.unregister).toHaveBeenCalledWith('non-existent');
		});
	});

	describe('getSession', () => {
		it('should return session info for registered session', async () => {
			const server = createMockServer();
			const transport = createMockTransport('session-1');
			await manager.registerSession('session-1', server, transport);

			const session = manager.getSession('session-1');

			expect(session).toEqual({
				sessionId: 'session-1',
				server,
				transport,
			});
		});

		it('should return undefined for unregistered session', () => {
			expect(manager.getSession('non-existent')).toBeUndefined();
		});
	});

	describe('getTransport', () => {
		it('should return transport for registered session', async () => {
			const transport = createMockTransport('session-1');
			await manager.registerSession('session-1', createMockServer(), transport);

			expect(manager.getTransport('session-1')).toBe(transport);
		});

		it('should return undefined for unregistered session', () => {
			expect(manager.getTransport('non-existent')).toBeUndefined();
		});
	});

	describe('getServer', () => {
		it('should return server for registered session', async () => {
			const server = createMockServer();
			await manager.registerSession('session-1', server, createMockTransport('session-1'));

			expect(manager.getServer('session-1')).toBe(server);
		});

		it('should return undefined for unregistered session', () => {
			expect(manager.getServer('non-existent')).toBeUndefined();
		});
	});

	describe('isSessionValid', () => {
		it('should delegate to store.validate and return true', async () => {
			mockStore.validate.mockResolvedValue(true);
			expect(await manager.isSessionValid('session-1')).toBe(true);
			expect(mockStore.validate).toHaveBeenCalledWith('session-1');
		});

		it('should delegate to store.validate and return false', async () => {
			mockStore.validate.mockResolvedValue(false);
			expect(await manager.isSessionValid('session-1')).toBe(false);
		});
	});

	describe('tools management', () => {
		it('should delegate getTools to store', () => {
			const tools = [createMockTool('tool-1')];
			mockStore.getTools.mockReturnValue(tools);

			expect(manager.getTools('session-1')).toBe(tools);
			expect(mockStore.getTools).toHaveBeenCalledWith('session-1');
		});

		it('should delegate setTools to store', () => {
			const tools = [createMockTool('tool-1')];
			manager.setTools('session-1', tools);

			expect(mockStore.setTools).toHaveBeenCalledWith('session-1', tools);
		});
	});

	describe('store management', () => {
		it('should allow swapping session store', () => {
			const newStore = { ...mockStore } as jest.Mocked<SessionStore>;
			manager.setStore(newStore);
			expect(manager.getStore()).toBe(newStore);
		});

		it('should return current store', () => {
			expect(manager.getStore()).toBe(mockStore);
		});
	});
});
