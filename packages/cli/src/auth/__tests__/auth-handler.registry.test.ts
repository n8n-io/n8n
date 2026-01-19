import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AuthenticationHandler } from '../auth-handler.registry';
import { AuthHandlerRegistry } from '../auth-handler.registry';

describe('AuthHandlerRegistry', () => {
	let registry: AuthHandlerRegistry;

	beforeEach(() => {
		registry = new AuthHandlerRegistry();
	});

	describe('registerHandler', () => {
		it('should register a new authentication handler', () => {
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn().mockReturnValue(true),
				getProviderType: jest.fn().mockReturnValue('ldap'),
			});

			registry.registerHandler(handler);

			expect(registry.hasHandlerFor('ldap')).toBe(true);
		});

		it('should allow registering multiple handlers', () => {
			const ldapHandler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'ldap'),
				getProviderType: jest.fn().mockReturnValue('ldap'),
			});

			const samlHandler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'saml'),
				getProviderType: jest.fn().mockReturnValue('saml'),
			});

			registry.registerHandler(ldapHandler);
			registry.registerHandler(samlHandler);

			expect(registry.hasHandlerFor('ldap')).toBe(true);
			expect(registry.hasHandlerFor('saml')).toBe(true);
		});
	});

	describe('hasHandlerFor', () => {
		it('should return true when a handler can handle the authentication method', () => {
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'ldap'),
			});

			registry.registerHandler(handler);

			expect(registry.hasHandlerFor('ldap')).toBe(true);
		});

		it('should return false when no handler can handle the authentication method', () => {
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'ldap'),
			});

			registry.registerHandler(handler);

			expect(registry.hasHandlerFor('saml')).toBe(false);
		});

		it('should return false when no handlers are registered', () => {
			expect(registry.hasHandlerFor('ldap')).toBe(false);
		});
	});

	describe('handleLogin', () => {
		it('should delegate to the correct handler', async () => {
			const user = mock<User>();
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'ldap'),
				handleLogin: jest.fn().mockResolvedValue(user),
			});

			registry.registerHandler(handler);

			const result = await registry.handleLogin('ldap', 'testuser', 'password123');

			expect(handler.canHandle).toHaveBeenCalledWith('ldap');
			expect(handler.handleLogin).toHaveBeenCalledWith('testuser', 'password123');
			expect(result).toBe(user);
		});

		it('should return undefined when no handler can handle the method', async () => {
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn((method) => method === 'ldap'),
			});

			registry.registerHandler(handler);

			const result = await registry.handleLogin('saml', 'testuser', 'password123');

			expect(result).toBeUndefined();
		});

		it('should use the first matching handler when multiple handlers match', async () => {
			const user1 = mock<User>({ id: 'user1' });
			const user2 = mock<User>({ id: 'user2' });

			const handler1 = mock<AuthenticationHandler>({
				canHandle: jest.fn().mockReturnValue(true),
				handleLogin: jest.fn().mockResolvedValue(user1),
			});

			const handler2 = mock<AuthenticationHandler>({
				canHandle: jest.fn().mockReturnValue(true),
				handleLogin: jest.fn().mockResolvedValue(user2),
			});

			registry.registerHandler(handler1);
			registry.registerHandler(handler2);

			const result = await registry.handleLogin('ldap', 'testuser', 'password123');

			expect(handler1.handleLogin).toHaveBeenCalled();
			expect(handler2.handleLogin).not.toHaveBeenCalled();
			expect(result).toBe(user1);
		});

		it('should return undefined when handler returns undefined', async () => {
			const handler = mock<AuthenticationHandler>({
				canHandle: jest.fn().mockReturnValue(true),
				handleLogin: jest.fn().mockResolvedValue(undefined),
			});

			registry.registerHandler(handler);

			const result = await registry.handleLogin('ldap', 'testuser', 'wrongpassword');

			expect(result).toBeUndefined();
		});
	});

	describe('getDisabledProvidersForUser', () => {
		it('should return empty array when user has no auth identities', () => {
			const user = mock<User>({
				authIdentities: [],
			});

			const result = registry.getDisabledProvidersForUser(user);

			expect(result).toEqual([]);
		});

		it('should return empty array when all providers are enabled', () => {
			const user = mock<User>({
				authIdentities: [{ providerType: 'ldap' }],
			});

			const handler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('ldap'),
				isLoginEnabled: jest.fn().mockReturnValue(true),
			});

			registry.registerHandler(handler);

			const result = registry.getDisabledProvidersForUser(user);

			expect(result).toEqual([]);
		});

		it('should return disabled provider when login is disabled', () => {
			const user = mock<User>({
				authIdentities: [{ providerType: 'ldap' }],
			});

			const handler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('ldap'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			registry.registerHandler(handler);

			const result = registry.getDisabledProvidersForUser(user);

			expect(result).toEqual(['ldap']);
		});

		it('should return multiple disabled providers', () => {
			const user = mock<User>({
				authIdentities: [{ providerType: 'ldap' }, { providerType: 'saml' }],
			});

			const ldapHandler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('ldap'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			const samlHandler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('saml'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			registry.registerHandler(ldapHandler);
			registry.registerHandler(samlHandler);

			const result = registry.getDisabledProvidersForUser(user);

			expect(result).toEqual(['ldap', 'saml']);
		});

		it('should only return disabled providers, not enabled ones', () => {
			const user = mock<User>({
				authIdentities: [
					{ providerType: 'ldap' },
					{ providerType: 'saml' },
					{ providerType: 'oidc' },
				],
			});

			const ldapHandler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('ldap'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			const samlHandler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('saml'),
				isLoginEnabled: jest.fn().mockReturnValue(true),
			});

			const oidcHandler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('oidc'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			registry.registerHandler(ldapHandler);
			registry.registerHandler(samlHandler);
			registry.registerHandler(oidcHandler);

			const result = registry.getDisabledProvidersForUser(user);

			expect(result).toEqual(['ldap', 'oidc']);
		});

		it('should ignore auth identities with no registered handler', () => {
			const user = mock<User>({
				authIdentities: [{ providerType: 'ldap' }, { providerType: 'oidc' }],
			});

			// Only register handler for LDAP, not OIDC
			const handler = mock<AuthenticationHandler>({
				getProviderType: jest.fn().mockReturnValue('ldap'),
				isLoginEnabled: jest.fn().mockReturnValue(false),
			});

			registry.registerHandler(handler);

			const result = registry.getDisabledProvidersForUser(user);

			// Should only include LDAP, OIDC should be ignored since no handler is registered
			expect(result).toEqual(['ldap']);
		});
	});
});
