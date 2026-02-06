import type { GlobalConfig } from '@n8n/config';
import type { AuthIdentity, User } from '@n8n/db';
import type { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { AuthError } from '@/errors/response-errors/auth.error';
import type { EventService } from '@/events/event.service';
import type { PasswordUtility } from '@/services/password.utility';

import { EmailAuthHandler } from '../email.auth-handler';

describe('EmailAuthHandler', () => {
	const userRepository = mock<UserRepository>();
	const passwordUtility = mock<PasswordUtility>();
	const eventService = mock<EventService>();
	const globalConfig = mock<GlobalConfig>({
		sso: {
			ldap: {
				loginEnabled: false,
			},
		},
	});

	let handler: EmailAuthHandler;

	beforeEach(() => {
		jest.resetAllMocks();
		handler = new EmailAuthHandler(userRepository, passwordUtility, eventService, globalConfig);
	});

	describe('metadata', () => {
		it('should have correct metadata', () => {
			expect(handler.metadata).toEqual({
				name: 'email',
				type: 'password',
			});
		});
	});

	describe('handleLogin', () => {
		const email = 'test@example.com';
		const password = 'password123';

		it('should return user when credentials are valid', async () => {
			const user = mock<User>({
				email,
				password: 'hashedPassword',
			});

			userRepository.findOne.mockResolvedValue(user);
			passwordUtility.compare.mockResolvedValue(true);

			const result = await handler.handleLogin(email, password);

			expect(result).toBe(user);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { email },
				relations: ['authIdentities', 'role'],
			});
			expect(passwordUtility.compare).toHaveBeenCalledWith(password, user.password);
		});

		it('should return undefined when user is not found', async () => {
			userRepository.findOne.mockResolvedValue(null);

			const result = await handler.handleLogin(email, password);

			expect(result).toBeUndefined();
			expect(passwordUtility.compare).not.toHaveBeenCalled();
		});

		it('should return undefined when password is incorrect', async () => {
			const user = mock<User>({
				email,
				password: 'hashedPassword',
				authIdentities: [],
			});

			userRepository.findOne.mockResolvedValue(user);
			passwordUtility.compare.mockResolvedValue(false);

			const result = await handler.handleLogin(email, password);

			expect(result).toBeUndefined();
		});

		it('should return undefined when user has no password', async () => {
			const user = mock<User>({
				email,
				password: null,
				authIdentities: [],
			});

			userRepository.findOne.mockResolvedValue(user);

			const result = await handler.handleLogin(email, password);

			expect(result).toBeUndefined();
			expect(passwordUtility.compare).not.toHaveBeenCalled();
		});

		describe('LDAP user handling', () => {
			it('should throw AuthError when user has LDAP identity and LDAP is disabled', async () => {
				const ldapIdentity = mock<AuthIdentity>({
					providerType: 'ldap',
				});
				const user = mock<User>({
					id: 'user-id',
					email,
					password: null,
					authIdentities: [ldapIdentity],
				});

				userRepository.findOne.mockResolvedValue(user);
				globalConfig.sso.ldap.loginEnabled = false;

				await expect(handler.handleLogin(email, password)).rejects.toThrow(
					new AuthError('Reset your password to gain access to the instance.'),
				);

				expect(eventService.emit).toHaveBeenCalledWith('login-failed-due-to-ldap-disabled', {
					userId: user.id,
				});
			});

			it('should not throw when user has LDAP identity but LDAP is enabled', async () => {
				const ldapIdentity = mock<AuthIdentity>({
					providerType: 'ldap',
				});
				const user = mock<User>({
					id: 'user-id',
					email,
					password: null,
					authIdentities: [ldapIdentity],
				});

				userRepository.findOne.mockResolvedValue(user);
				globalConfig.sso.ldap.loginEnabled = true;

				const result = await handler.handleLogin(email, password);

				expect(result).toBeUndefined();
				expect(eventService.emit).not.toHaveBeenCalled();
			});

			it('should return undefined when user has no LDAP identity', async () => {
				const user = mock<User>({
					email,
					password: null,
					authIdentities: [],
				});

				userRepository.findOne.mockResolvedValue(user);

				const result = await handler.handleLogin(email, password);

				expect(result).toBeUndefined();
				expect(eventService.emit).not.toHaveBeenCalled();
			});
		});
	});
});
