import type { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import type { IPasswordAuthHandler, AuthHandlerEntryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';

describe('AuthHandlerRegistry', () => {
	let registry: AuthHandlerRegistry;
	let mockLogger: Logger;
	let mockMetadata: AuthHandlerEntryMetadata;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMetadata = mock<AuthHandlerEntryMetadata>();
		registry = new AuthHandlerRegistry(mockMetadata, mockLogger);
	});

	describe('init', () => {
		it('should discover and register auth handlers', async () => {
			const mockHandler = mock<IPasswordAuthHandler<User>>({
				metadata: { name: 'ldap', type: 'password' },
				userClass: User,
			});

			class MockHandlerClass {
				metadata = { name: 'ldap', type: 'password' as const };
				readonly userClass = User;
				async handleLogin() {
					return await mockHandler.handleLogin('', '');
				}
			}

			jest.spyOn(mockMetadata, 'getClasses').mockReturnValue([MockHandlerClass as any]);
			jest.spyOn(Container, 'get').mockReturnValue(mockHandler);

			await registry.init();

			expect(registry.has('ldap')).toBe(true);
			expect(registry.get('ldap', 'password')).toBe(mockHandler);
		});

		it('should call handler init() if present', async () => {
			const mockHandler = mock<IPasswordAuthHandler<User>>({
				metadata: { name: 'ldap', type: 'password' },
				userClass: User,
				init: jest.fn().mockResolvedValue(undefined),
			});

			class MockHandlerClass {}

			jest.spyOn(mockMetadata, 'getClasses').mockReturnValue([MockHandlerClass as any]);
			jest.spyOn(Container, 'get').mockReturnValue(mockHandler);

			await registry.init();

			expect(mockHandler.init).toHaveBeenCalled();
		});

		it('should skip handler on instantiation error', async () => {
			class MockHandlerClass {}

			jest.spyOn(mockMetadata, 'getClasses').mockReturnValue([MockHandlerClass as any]);
			jest.spyOn(Container, 'get').mockImplementation(() => {
				throw new Error('Instantiation failed');
			});

			await registry.init();

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to instantiate'),
				expect.any(Object),
			);
		});

		it('should skip handler on init error', async () => {
			const mockHandler = mock<IPasswordAuthHandler<User>>({
				metadata: { name: 'ldap', type: 'password' },
				userClass: User,
				init: jest.fn().mockRejectedValue(new Error('Init failed')),
			});

			class MockHandlerClass {}

			jest.spyOn(mockMetadata, 'getClasses').mockReturnValue([MockHandlerClass as any]);
			jest.spyOn(Container, 'get').mockReturnValue(mockHandler);

			await registry.init();

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to initialize'),
				expect.any(Object),
			);
			expect(registry.has('ldap')).toBe(false);
		});

		it('should warn on duplicate handler names', async () => {
			const handler1 = mock<IPasswordAuthHandler<User>>({
				metadata: { name: 'ldap', type: 'password' },
				userClass: User,
			});
			const handler2 = mock<IPasswordAuthHandler<User>>({
				metadata: { name: 'ldap', type: 'password' },
				userClass: User,
			});

			class MockHandlerClass1 {}
			class MockHandlerClass2 {}

			jest
				.spyOn(mockMetadata, 'getClasses')
				.mockReturnValue([MockHandlerClass1 as any, MockHandlerClass2 as any]);
			jest.spyOn(Container, 'get').mockReturnValueOnce(handler1).mockReturnValueOnce(handler2);

			await registry.init();

			expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('already registered'));
			expect(registry.get('ldap', 'password')).toBe(handler1);
		});
	});

	describe('get', () => {
		it('should return undefined for non-existent handler', () => {
			expect(registry.get('nonexistent', 'password')).toBeUndefined();
		});
	});

	describe('has', () => {
		it('should return false for non-existent handler', () => {
			expect(registry.has('nonexistent')).toBe(false);
		});
	});
});
