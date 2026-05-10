import { UserUpdateRequestDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest, User, PublicUser, AuthIdentity } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, InvalidAuthTokenRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock, anyObject } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';

import { AUTH_COOKIE_NAME } from '@/constants';
import { MeController } from '@/controllers/me.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import type { MeRequest } from '@/requests';
import { UserService } from '@/services/user.service';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { badPasswords } from '@test/test-data';

jest.mock('@/sso.ee/sso-helpers', () => ({
	...jest.requireActual('@/sso.ee/sso-helpers'),
	getCurrentAuthenticationMethod: jest.fn(),
}));

const getCurrentAuthenticationMethodMock = getCurrentAuthenticationMethod as jest.Mock;

const browserId = 'test-browser-id';

describe('MeController', () => {
	const externalHooks = mockInstance(ExternalHooks);
	const eventService = mockInstance(EventService);
	const userService = mockInstance(UserService);
	const userRepository = mockInstance(UserRepository);
	const mockMfaService = mockInstance(MfaService);
	mockInstance(InvalidAuthTokenRepository);
	mockInstance(License).isWithinUsersLimit.mockReturnValue(true);
	const controller = Container.get(MeController);

	beforeEach(() => {
		userService.findSsoIdentity.mockResolvedValue(undefined);
		getCurrentAuthenticationMethodMock.mockReturnValue('email');
	});

	describe('updateCurrentUser', () => {
		it('should update the user in the DB, and issue a new cookie', async () => {
			const user = {
				id: '123',
				email: 'valid@email.com',
				password: 'password',
				authIdentities: [],
				role: GLOBAL_OWNER_ROLE,
				mfaEnabled: false,
			} as unknown as User;
			const payload = new UserUpdateRequestDto({
				email: 'valid@email.com',
				firstName: 'John',
				lastName: 'Potato',
			});
			const req = { user, browserId } as unknown as AuthenticatedRequest;
			const res = mock<Response>();
			userRepository.findOneByOrFail.mockResolvedValue(user);
			userService.findUserWithAuthIdentities.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
			userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

			await controller.updateCurrentUser(req, res, payload);

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.beforeUpdate', [
				user.id,
				user.email,
				payload,
			]);

			expect(userService.update).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['firstName', 'lastName'], // email did not change
			});
			expect(res.cookie).toHaveBeenCalledWith(
				AUTH_COOKIE_NAME,
				'signed-token',
				expect.objectContaining({
					maxAge: expect.any(Number),
					httpOnly: true,
					sameSite: 'lax',
					secure: false,
				}),
			);

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.update', [
				user.email,
				anyObject(),
			]);
		});

		it('should throw BadRequestError if beforeUpdate hook throws BadRequestError', async () => {
			const user = {
				id: '123',
				password: 'password',
				email: 'current@email.com',
				authIdentities: [],
				role: GLOBAL_OWNER_ROLE,
				mfaEnabled: false,
			} as unknown as User;
			const req = { user } as unknown as AuthenticatedRequest;

			externalHooks.run.mockImplementationOnce(async (hookName) => {
				if (hookName === 'user.profile.beforeUpdate') {
					throw new BadRequestError('Invalid email address');
				}
			});

			await expect(
				controller.updateCurrentUser(
					req,
					mock(),
					mock({ email: user.email, firstName: 'John', lastName: 'Potato' }),
				),
			).rejects.toThrowError(new BadRequestError('Invalid email address'));
		});

		describe('when user is authenticated via LDAP or OIDC', () => {
			it('should throw BadRequestError when LDAP user tries to change their profile', async () => {
				const user = {
					id: '123',
					email: 'ldap@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'ldap',
				} as unknown as AuthIdentity);
				getCurrentAuthenticationMethodMock.mockReturnValue('ldap');

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'ldap@email.com',
							firstName: 'Jane',
							lastName: 'Doe',
						}),
					),
				).rejects.toThrowError(
					new BadRequestError('LDAP user may not change their profile information'),
				);
			});

			it('should throw BadRequestError when OIDC user tries to change their profile', async () => {
				const user = {
					id: '123',
					email: 'oidc@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'oidc',
				} as unknown as AuthIdentity);
				getCurrentAuthenticationMethodMock.mockReturnValue('oidc');

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'new-oidc@email.com',
							firstName: 'John',
							lastName: 'Doe',
						}),
					),
				).rejects.toThrowError(
					new BadRequestError('OIDC user may not change their profile information'),
				);
			});

			it('should allow non-LDAP/OIDC users to update their profile', async () => {
				const user = {
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const payload = new UserUpdateRequestDto({
					email: 'valid@email.com',
					firstName: 'John',
					lastName: 'Potato',
				});
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userRepository.findOneByOrFail.mockResolvedValue(user);
				userService.findUserWithAuthIdentities.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

				await controller.updateCurrentUser(req, res, payload);

				expect(userService.update).toHaveBeenCalled();
			});

			it('should block user with multiple identities if one is LDAP', async () => {
				const user = {
					id: '123',
					email: 'multi@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				// User has multiple identities, one of which is LDAP - findSsoIdentity returns the SSO one
				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'ldap',
				} as unknown as AuthIdentity);
				getCurrentAuthenticationMethodMock.mockReturnValue('ldap');

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'multi@email.com',
							firstName: 'Jane',
							lastName: 'Doe',
						}),
					),
				).rejects.toThrowError(
					new BadRequestError('LDAP user may not change their profile information'),
				);
			});
		});

		describe('when an auth_identity exists but the SSO provider is no longer active', () => {
			const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6'; // Hashed 'old_password'

			const setUpdateMocks = (user: User) => {
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userService.findUserWithAuthIdentities.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);
			};

			it('should throw BadRequestError when SAML user tries to change their profile while SAML is enabled', async () => {
				const user = {
					id: '123',
					email: 'saml@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'saml',
				} as unknown as AuthIdentity);
				getCurrentAuthenticationMethodMock.mockReturnValue('saml');

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'saml@email.com',
							firstName: 'Jane',
							lastName: 'Doe',
						}),
					),
				).rejects.toThrowError(
					new BadRequestError('SAML user may not change their profile information'),
				);
			});

			it('should allow profile update when SAML auth_identity exists but SAML is disabled', async () => {
				const user = {
					id: '123',
					email: 'saml@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const payload = new UserUpdateRequestDto({
					email: 'saml@email.com',
					firstName: 'NewFirst',
					lastName: 'NewLast',
				});
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'saml',
				} as unknown as AuthIdentity);
				setUpdateMocks(user);

				await controller.updateCurrentUser(req, res, payload);

				expect(userService.update).toHaveBeenCalledWith(user.id, {
					email: 'saml@email.com',
					firstName: 'NewFirst',
					lastName: 'NewLast',
				});
				expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
					user,
					fieldsChanged: ['firstName', 'lastName'],
				});
			});

			it('should allow profile update when LDAP auth_identity exists but LDAP is disabled', async () => {
				const user = {
					id: '123',
					email: 'ldap@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const payload = new UserUpdateRequestDto({
					email: 'ldap@email.com',
					firstName: 'NewFirst',
					lastName: 'NewLast',
				});
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'ldap',
				} as unknown as AuthIdentity);
				setUpdateMocks(user);

				await controller.updateCurrentUser(req, res, payload);

				expect(userService.update).toHaveBeenCalled();
			});

			it('should allow profile update when OIDC auth_identity exists but OIDC is disabled', async () => {
				const user = {
					id: '123',
					email: 'oidc@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const payload = new UserUpdateRequestDto({
					email: 'oidc@email.com',
					firstName: 'NewFirst',
					lastName: 'NewLast',
				});
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'oidc',
				} as unknown as AuthIdentity);
				setUpdateMocks(user);

				await controller.updateCurrentUser(req, res, payload);

				expect(userService.update).toHaveBeenCalled();
			});

			it('should allow email change for previously-SAML user once SAML is disabled', async () => {
				const user = {
					id: '123',
					email: 'saml-old@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: passwordHash,
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'saml',
				} as unknown as AuthIdentity);
				setUpdateMocks(user);

				await controller.updateCurrentUser(
					req,
					res,
					new UserUpdateRequestDto({
						email: 'saml-new@email.com',
						firstName: 'John',
						lastName: 'Doe',
						currentPassword: 'old_password',
					}),
				);

				expect(userService.update).toHaveBeenCalled();
			});

			it('should allow profile update when providerType is token-exchange', async () => {
				const user = {
					id: '123',
					email: 'token@email.com',
					firstName: 'John',
					lastName: 'Doe',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'token-exchange',
				} as unknown as AuthIdentity);
				setUpdateMocks(user);

				await controller.updateCurrentUser(
					req,
					res,
					new UserUpdateRequestDto({
						email: 'token@email.com',
						firstName: 'NewFirst',
						lastName: 'NewLast',
					}),
				);

				expect(userService.update).toHaveBeenCalled();
			});

			it('should bypass the SSO guard when no profile fields are changing', async () => {
				const user = {
					id: '123',
					email: 'unchanged@email.com',
					firstName: 'Same',
					lastName: 'Name',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();

				userService.findSsoIdentity.mockClear();
				userService.findSsoIdentity.mockResolvedValue({
					providerType: 'saml',
				} as unknown as AuthIdentity);
				getCurrentAuthenticationMethodMock.mockReturnValue('saml');
				setUpdateMocks(user);

				await controller.updateCurrentUser(
					req,
					res,
					new UserUpdateRequestDto({
						email: 'unchanged@email.com',
						firstName: 'Same',
						lastName: 'Name',
					}),
				);

				expect(userService.findSsoIdentity).not.toHaveBeenCalled();
				expect(userService.update).toHaveBeenCalled();
			});
		});

		describe('when mfa is enabled', () => {
			it('should throw BadRequestError if mfa code is missing', async () => {
				const user = {
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: true,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'new@email.com',
							firstName: 'John',
							lastName: 'Potato',
						}),
					),
				).rejects.toThrowError(new BadRequestError('Two-factor code is required to change email'));
			});

			it('should throw InvalidMfaCodeError if mfa code is invalid', async () => {
				const user = {
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: true,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				mockMfaService.validateMfa.mockResolvedValue(false);

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						mock({
							email: 'new@email.com',
							firstName: 'John',
							lastName: 'Potato',
							mfaCode: 'invalid',
						}),
					),
				).rejects.toThrow(InvalidMfaCodeError);
			});

			it("should update the user's email if mfa code is valid", async () => {
				const user = {
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: GLOBAL_OWNER_ROLE,
					mfaEnabled: true,
					mfaSecret: 'secret',
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userService.findUserWithAuthIdentities.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);
				mockMfaService.validateMfa.mockResolvedValue(true);

				const result = await controller.updateCurrentUser(
					req,
					res,
					mock({
						email: 'new@email.com',
						firstName: 'John',
						lastName: 'Potato',
						mfaCode: '123456',
					}),
				);

				expect(result).toEqual({});
			});
		});

		describe('when mfa is disabled and email is being changed', () => {
			const oldPasswordPlain = 'old_password';
			const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6'; // Hashed 'old_password'

			it('should throw BadRequestError if currentPassword is missing', async () => {
				const user = {
					id: '123',
					email: 'michel-old@email.com',
					password: passwordHash,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						new UserUpdateRequestDto({
							email: 'michel-new@email.com',
							firstName: 'Michel',
							lastName: 'n8n',
						}),
					),
				).rejects.toThrowError(new BadRequestError('Current password is required to change email'));
			});

			it('should throw BadRequestError if currentPassword is not a string', async () => {
				const user = {
					id: '123',
					email: 'michel-old@email.com',
					password: passwordHash,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				await expect(
					controller.updateCurrentUser(req, mock(), {
						email: 'michel-new@email.com',
						firstName: 'Michel',
						lastName: 'n8n',
						currentPassword: 123 as any,
					} as any),
				).rejects.toThrowError(new BadRequestError('Current password is required to change email'));
			});

			it('should throw BadRequestError if currentPassword is incorrect', async () => {
				const user = {
					email: 'michel-old@email.com',
					password: passwordHash,
					mfaEnabled: false,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;

				await expect(
					controller.updateCurrentUser(
						req,
						mock(),
						mock({
							email: 'michel-new@email.com',
							firstName: 'Michel',
							lastName: 'n8n',
							currentPassword: 'wrong-password',
						}),
					),
				).rejects.toThrowError(
					new BadRequestError(
						'Unable to update profile. Please check your credentials and try again.',
					),
				);
			});

			it('should update the user email if currentPassword is correct', async () => {
				const user = {
					email: 'michel-old@email.com',
					password: passwordHash,
					mfaEnabled: false,
					role: GLOBAL_OWNER_ROLE,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userService.findUserWithAuthIdentities.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

				const result = await controller.updateCurrentUser(
					req,
					res,
					mock({
						email: 'michel-new@email.com',
						firstName: 'Michel',
						lastName: 'n8n',
						currentPassword: oldPasswordPlain,
					}),
				);

				expect(userService.update).toHaveBeenCalled();
				expect(result).toEqual({});
			});

			it('should not require currentPassword when email is not being changed', async () => {
				const user = {
					email: 'michel@email.com',
					password: passwordHash,
					mfaEnabled: false,
					role: GLOBAL_OWNER_ROLE,
				} as unknown as User;
				const req = { user, browserId } as unknown as AuthenticatedRequest;
				const res = mock<Response>();
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userService.findUserWithAuthIdentities.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

				const result = await controller.updateCurrentUser(
					req,
					res,
					new UserUpdateRequestDto({
						email: 'michel@email.com',
						firstName: 'Michel',
						lastName: 'n8n',
					}),
				);

				expect(userService.update).toHaveBeenCalled();
				expect(result).toEqual({});
			});
		});
	});

	describe('when user is managed by env', () => {
		const globalConfig = Container.get(GlobalConfig);

		beforeEach(() => {
			globalConfig.instanceSettingsLoader.ownerManagedByEnv = true;
			globalConfig.instanceSettingsLoader.ownerEmail = 'managed@example.com';
		});

		afterEach(() => {
			globalConfig.instanceSettingsLoader.ownerManagedByEnv = false;
			globalConfig.instanceSettingsLoader.ownerEmail = '';
		});

		it('should reject profile update for env-managed user', async () => {
			const user = {
				id: '123',
				email: 'managed@example.com',
				password: 'password',
				role: GLOBAL_OWNER_ROLE,
			} as unknown as User;
			const req = { user, browserId } as unknown as AuthenticatedRequest;

			await expect(
				controller.updateCurrentUser(
					req,
					mock(),
					mock({ email: user.email, firstName: 'John', lastName: 'Doe' }),
				),
			).rejects.toThrowError(
				new ForbiddenError(
					'This account is managed via environment variables and cannot be modified through the API',
				),
			);
		});

		it('should reject password update for env-managed user', async () => {
			const req = {
				user: {
					email: 'managed@example.com',
					password: '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6',
				} as unknown as User,
			} as unknown as AuthenticatedRequest;

			await expect(
				controller.updatePassword(
					req,
					mock(),
					mock({ currentPassword: 'old_password', newPassword: 'NewPassword123' }),
				),
			).rejects.toThrowError(
				new ForbiddenError(
					'This account is managed via environment variables and cannot be modified through the API',
				),
			);
		});

		it('should allow profile update for non-env-managed owner', async () => {
			const user = {
				id: '456',
				email: 'other-owner@example.com',
				password: 'password',
				authIdentities: [],
				role: GLOBAL_OWNER_ROLE,
				mfaEnabled: false,
			} as unknown as User;
			const req = { user, browserId } as unknown as AuthenticatedRequest;
			const res = mock<Response>();
			userRepository.findOneByOrFail.mockResolvedValue(user);
			userService.findUserWithAuthIdentities.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
			userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

			await controller.updateCurrentUser(
				req,
				res,
				mock({ email: user.email, firstName: 'Other', lastName: 'Owner' }),
			);

			expect(userService.update).toHaveBeenCalled();
		});
	});

	describe('updatePassword', () => {
		const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6'; // Hashed 'old_password'

		it('should throw if the user does not have a password set', async () => {
			const req = {
				user: mock({ password: undefined }),
			} as unknown as AuthenticatedRequest;
			await expect(
				controller.updatePassword(req, mock(), mock({ currentPassword: '', newPassword: '' })),
			).rejects.toThrowError(new BadRequestError('Requesting user not set up.'));
		});

		it("should throw if currentPassword does not match the user's password", async () => {
			const req = {
				user: mock({ password: passwordHash }),
			} as unknown as AuthenticatedRequest;
			await expect(
				controller.updatePassword(
					req,
					mock(),
					mock({ currentPassword: 'not_old_password', newPassword: '' }),
				),
			).rejects.toThrowError(new BadRequestError('Provided current password is incorrect.'));
		});

		describe('should throw if newPassword is not valid', () => {
			Object.entries(badPasswords).forEach(([newPassword, errorMessage]) => {
				it(newPassword, async () => {
					const req = {
						user: mock({ password: passwordHash }),
						browserId,
					} as unknown as AuthenticatedRequest;
					await expect(
						controller.updatePassword(
							req,
							mock(),
							mock({ currentPassword: 'old_password', newPassword }),
						),
					).rejects.toThrowError(new BadRequestError(errorMessage));
				});
			});
		});

		it('should update the password in the DB, and issue a new cookie', async () => {
			const req = {
				user: mock({ password: passwordHash, mfaEnabled: false }),
				browserId,
			} as unknown as AuthenticatedRequest;
			const res = mock<Response>();
			userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');

			await controller.updatePassword(
				req,
				res,
				mock({ currentPassword: 'old_password', newPassword: 'NewPassword123' }),
			);

			expect(req.user.password).not.toBe(passwordHash);

			expect(res.cookie).toHaveBeenCalledWith(
				AUTH_COOKIE_NAME,
				'new-signed-token',
				expect.objectContaining({
					maxAge: expect.any(Number),
					httpOnly: true,
					sameSite: 'lax',
					secure: false,
				}),
			);

			expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
				req.user.email,
				req.user.password,
			]);

			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user: req.user,
				fieldsChanged: ['password'],
			});
		});

		describe('mfa enabled', () => {
			it('should throw BadRequestError if mfa code is missing', async () => {
				const req = {
					user: mock({ password: passwordHash, mfaEnabled: true }),
				} as unknown as AuthenticatedRequest;

				await expect(
					controller.updatePassword(
						req,
						mock(),
						mock({ currentPassword: 'old_password', newPassword: 'NewPassword123' }),
					),
				).rejects.toThrowError(
					new BadRequestError('Two-factor code is required to change password.'),
				);
			});

			it('should throw InvalidMfaCodeError if invalid mfa code is given', async () => {
				const req = {
					user: mock({ password: passwordHash, mfaEnabled: true }),
				} as unknown as AuthenticatedRequest;
				mockMfaService.validateMfa.mockResolvedValue(false);

				await expect(
					controller.updatePassword(
						req,
						mock(),
						mock({
							currentPassword: 'old_password',
							newPassword: 'NewPassword123',
							mfaCode: '123',
						}),
					),
				).rejects.toThrow(InvalidMfaCodeError);
			});

			it('should succeed when mfa code is correct', async () => {
				const req = {
					user: mock({ password: passwordHash, mfaEnabled: true, mfaSecret: 'secret' }),
					browserId,
				} as unknown as AuthenticatedRequest;
				const res = mock<Response>();
				userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');
				mockMfaService.validateMfa.mockResolvedValue(true);

				const result = await controller.updatePassword(
					req,
					res,
					mock({
						currentPassword: 'old_password',
						newPassword: 'NewPassword123',
						mfaCode: 'valid',
					}),
				);

				expect(result).toEqual({ success: true });
				expect(req.user.password).not.toBe(passwordHash);
			});
		});
	});

	describe('storeSurveyAnswers', () => {
		it('should throw BadRequestError if answers are missing in the payload', async () => {
			const req = mock<MeRequest.SurveyAnswers>({
				body: undefined,
			});
			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(
				new BadRequestError('Personalization answers are mandatory'),
			);
		});

		it('should not flag XSS attempt for `<` sign in company size', async () => {
			const req = mock<MeRequest.SurveyAnswers>();
			req.body = {
				version: 'v4',
				personalization_survey_submitted_at: '2024-08-06T12:19:51.268Z',
				personalization_survey_n8n_version: '1.0.0',
				companySize: '<20',
				otherCompanyIndustryExtended: ['test'],
				automationGoalSm: ['test'],
				usageModes: ['test'],
				email: 'test@email.com',
				role: 'test',
				roleOther: 'test',
				reportedSource: 'test',
				reportedSourceOther: 'test',
			};

			await expect(controller.storeSurveyAnswers(req)).resolves.toEqual({ success: true });
		});

		test.each([
			'automationGoalDevops',
			'companyIndustryExtended',
			'otherCompanyIndustryExtended',
			'automationGoalSm',
			'usageModes',
		])('should throw BadRequestError on XSS attempt for an array field %s', async (fieldName) => {
			const req = mock<MeRequest.SurveyAnswers>();
			req.body = {
				version: 'v4',
				personalization_survey_n8n_version: '1.0.0',
				personalization_survey_submitted_at: new Date().toISOString(),
				[fieldName]: ['<script>alert("XSS")</script>'],
			};

			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(BadRequestError);
		});

		test.each([
			'automationGoalDevopsOther',
			'companySize',
			'companyType',
			'automationGoalSmOther',
			'roleOther',
			'reportedSource',
			'reportedSourceOther',
		])('should throw BadRequestError on XSS attempt for a string field %s', async (fieldName) => {
			const req = mock<MeRequest.SurveyAnswers>();
			req.body = {
				version: 'v4',
				personalization_survey_n8n_version: '1.0.0',
				personalization_survey_submitted_at: new Date().toISOString(),
				[fieldName]: '<script>alert("XSS")</script>',
			};

			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(BadRequestError);
		});
	});
});
