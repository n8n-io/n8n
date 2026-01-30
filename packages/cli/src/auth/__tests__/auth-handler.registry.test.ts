import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AuthHandler } from '@/auth/auth-handler.registry';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';

describe('AuthHandlerRegistry', () => {
	let registry: AuthHandlerRegistry;

	beforeEach(() => {
		registry = new AuthHandlerRegistry();
	});

	it('should register and retrieve an auth handler', () => {
		const mockHandler = mock<AuthHandler>();

		registry.register('ldap', mockHandler);

		expect(registry.has('ldap')).toBe(true);
		expect(registry.get('ldap')).toBe(mockHandler);
	});

	it('should return undefined for non-existent handler', () => {
		expect(registry.has('nonexistent')).toBe(false);
		expect(registry.get('nonexistent')).toBeUndefined();
	});

	it('should handle multiple registered handlers', () => {
		const ldapHandler = mock<AuthHandler>();
		const samlHandler = mock<AuthHandler>();

		registry.register('ldap', ldapHandler);
		registry.register('saml', samlHandler);

		expect(registry.get('ldap')).toBe(ldapHandler);
		expect(registry.get('saml')).toBe(samlHandler);
	});

	it('should allow handler to be called', async () => {
		const mockUser = mock<User>({ id: '123' });
		const mockHandler: AuthHandler = {
			handleLogin: jest.fn().mockResolvedValue(mockUser),
		};

		registry.register('ldap', mockHandler);
		const result = await registry.get('ldap')!.handleLogin('user', 'pass');

		expect(result).toBe(mockUser);
		expect(mockHandler.handleLogin).toHaveBeenCalledWith('user', 'pass');
	});
});
