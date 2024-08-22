import type { Response } from 'express';
import { Container } from 'typedi';
import jwt from 'jsonwebtoken';
import { mock, anyObject } from 'jest-mock-extended';

import type { PublicUser } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { API_KEY_PREFIX, MeController } from '@/controllers/me.controller';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { AuthenticatedRequest, MeRequest } from '@/requests';
import { UserService } from '@/services/user.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { badPasswords } from '@test/testData';
import { mockInstance } from '@test/mocking';
import { AuthUserRepository } from '@/databases/repositories/authUser.repository';
import { InvalidAuthTokenRepository } from '@db/repositories/invalidAuthToken.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { MfaService } from '@/mfa/mfa.service';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';

const browserId = 'test-browser-id';

describe('MeController', () => {
	const externalHooks = mockInstance(ExternalHooks);
	const eventService = mockInstance(EventService);
	const userService = mockInstance(UserService);
	const userRepository = mockInstance(UserRepository);
	const mockMfaService = mockInstance(MfaService);
	mockInstance(AuthUserRepository);
	mockInstance(InvalidAuthTokenRepository);
	mockInstance(License).isWithinUsersLimit.mockReturnValue(true);
	const controller = Container.get(MeController);

	describe('updateCurrentUser', () => {
		it('should throw BadRequestError if email is missing in the payload', async () => {
			const req = mock<MeRequest.UserUpdate>({});
			await expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Email is mandatory'),
			);
		});

		it('should throw BadRequestError if email is invalid', async () => {
			const req = mock<MeRequest.UserUpdate>({ body: { email: 'invalid-email' } });
			await expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
		});

		it('should update the user in the DB, and issue a new cookie', async () => {
			const user = mock<User>({
				id: '123',
				email: 'valid@email.com',
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
				mfaEnabled: false,
			});
			const req = mock<MeRequest.UserUpdate>({ user, browserId });
			req.body = {
				email: 'valid@email.com',
				firstName: 'John',
				lastName: 'Potato',
			};
			const res = mock<Response>();
			userRepository.findOneByOrFail.mockResolvedValue(user);
			userRepository.findOneOrFail.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
			userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

			await controller.updateCurrentUser(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.beforeUpdate', [
				user.id,
				user.email,
				req.body,
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

		it('should not allow updating any other fields on a user besides email and name', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:member',
				mfaEnabled: false,
			});
			const req = mock<MeRequest.UserUpdate>({ user, browserId });
			req.body = { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' };
			const res = mock<Response>();
			userRepository.findOneOrFail.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

			// Add invalid data to the request payload
			Object.assign(req.body, { id: '0', role: 'global:owner' });

			await controller.updateCurrentUser(req, res);

			expect(userService.update).toHaveBeenCalled();

			const updatePayload = userService.update.mock.calls[0][1];
			expect(updatePayload.email).toBe(req.body.email);
			expect(updatePayload.firstName).toBe(req.body.firstName);
			expect(updatePayload.lastName).toBe(req.body.lastName);
			expect(updatePayload.id).toBeUndefined();
			expect(updatePayload.role).toBeUndefined();
		});

		it('should throw BadRequestError if beforeUpdate hook throws BadRequestError', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
				mfaEnabled: false,
			});
			const reqBody = { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' };
			const req = mock<MeRequest.UserUpdate>({ user, body: reqBody });
			req.body = reqBody; // We don't want the body to be a mock object

			externalHooks.run.mockImplementationOnce(async (hookName) => {
				if (hookName === 'user.profile.beforeUpdate') {
					throw new BadRequestError('Invalid email address');
				}
			});

			await expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
		});

		describe('when mfa is enabled', () => {
			it('should throw BadRequestError if mfa code is missing', async () => {
				const user = mock<User>({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
				});
				const req = mock<MeRequest.UserUpdate>({ user, browserId });
				req.body = { email: 'new@email.com', firstName: 'John', lastName: 'Potato' };

				await expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
					new BadRequestError('Two-factor code is required to change email'),
				);
			});

			it('should throw InvalidMfaCodeError if mfa code is invalid', async () => {
				const user = mock<User>({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
				});
				const req = mock<MeRequest.UserUpdate>({ user, browserId });
				req.body = {
					email: 'new@email.com',
					firstName: 'John',
					lastName: 'Potato',
					mfaCode: 'invalid',
				};
				mockMfaService.validateMfa.mockResolvedValue(false);

				await expect(controller.updateCurrentUser(req, mock())).rejects.toThrow(
					InvalidMfaCodeError,
				);
			});

			it("should update the user's email if mfa code is valid", async () => {
				const user = mock<User>({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
				});
				const req = mock<MeRequest.UserUpdate>({ user, browserId });
				req.body = {
					email: 'new@email.com',
					firstName: 'John',
					lastName: 'Potato',
					mfaCode: '123456',
				};
				const res = mock<Response>();
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userRepository.findOneOrFail.mockResolvedValue(user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
				userService.toPublic.mockResolvedValue({} as unknown as PublicUser);
				mockMfaService.validateMfa.mockResolvedValue(true);

				const result = await controller.updateCurrentUser(req, res);

				expect(result).toEqual({});
			});
		});
	});

	describe('updatePassword', () => {
		const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6'; // Hashed 'old_password'

		it('should throw if the user does not have a password set', async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: undefined }),
				body: { currentPassword: '', newPassword: '' },
			});
			await expect(controller.updatePassword(req, mock())).rejects.toThrowError(
				new BadRequestError('Requesting user not set up.'),
			);
		});

		it("should throw if currentPassword does not match the user's password", async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: passwordHash }),
				body: { currentPassword: 'not_old_password', newPassword: '' },
			});
			await expect(controller.updatePassword(req, mock())).rejects.toThrowError(
				new BadRequestError('Provided current password is incorrect.'),
			);
		});

		describe('should throw if newPassword is not valid', () => {
			Object.entries(badPasswords).forEach(([newPassword, errorMessage]) => {
				it(newPassword, async () => {
					const req = mock<MeRequest.Password>({
						user: mock({ password: passwordHash }),
						body: { currentPassword: 'old_password', newPassword },
						browserId,
					});
					await expect(controller.updatePassword(req, mock())).rejects.toThrowError(
						new BadRequestError(errorMessage),
					);
				});
			});
		});

		it('should update the password in the DB, and issue a new cookie', async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: passwordHash, mfaEnabled: false }),
				body: { currentPassword: 'old_password', newPassword: 'NewPassword123' },
				browserId,
			});
			const res = mock<Response>();
			userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');

			await controller.updatePassword(req, res);

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
				const req = mock<MeRequest.Password>({
					user: mock({ password: passwordHash, mfaEnabled: true }),
					body: { currentPassword: 'old_password', newPassword: 'NewPassword123' },
				});

				await expect(controller.updatePassword(req, mock())).rejects.toThrowError(
					new BadRequestError('Two-factor code is required to change password.'),
				);
			});

			it('should throw InvalidMfaCodeError if invalid mfa code is given', async () => {
				const req = mock<MeRequest.Password>({
					user: mock({ password: passwordHash, mfaEnabled: true }),
					body: { currentPassword: 'old_password', newPassword: 'NewPassword123', mfaCode: '123' },
				});
				mockMfaService.validateMfa.mockResolvedValue(false);

				await expect(controller.updatePassword(req, mock())).rejects.toThrow(InvalidMfaCodeError);
			});

			it('should succeed when mfa code is correct', async () => {
				const req = mock<MeRequest.Password>({
					user: mock({ password: passwordHash, mfaEnabled: true }),
					body: {
						currentPassword: 'old_password',
						newPassword: 'NewPassword123',
						mfaCode: 'valid',
					},
					browserId,
				});
				const res = mock<Response>();
				userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
				jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');
				mockMfaService.validateMfa.mockResolvedValue(true);

				const result = await controller.updatePassword(req, res);

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

	describe('updateCurrentUserSettings', () => {
		it('should throw BadRequestError on XSS attempt', async () => {
			const req = mock<AuthenticatedRequest>({
				body: {
					userActivated: '<script>alert("XSS")</script>',
				},
			});

			await expect(controller.updateCurrentUserSettings(req)).rejects.toThrowError(BadRequestError);
		});
	});

	describe('API Key methods', () => {
		let req: AuthenticatedRequest;
		beforeAll(() => {
			req = mock({ user: mock<Partial<User>>({ id: '123', apiKey: `${API_KEY_PREFIX}test-key` }) });
		});

		describe('createAPIKey', () => {
			it('should create and save an API key', async () => {
				const { apiKey } = await controller.createAPIKey(req);
				expect(userService.update).toHaveBeenCalledWith(req.user.id, { apiKey });
			});
		});

		describe('getAPIKey', () => {
			it('should return the users api key redacted', async () => {
				const { apiKey } = await controller.getAPIKey(req);
				expect(apiKey).not.toEqual(req.user.apiKey);
			});
		});

		describe('deleteAPIKey', () => {
			it('should delete the API key', async () => {
				await controller.deleteAPIKey(req);
				expect(userService.update).toHaveBeenCalledWith(req.user.id, { apiKey: null });
			});
		});
	});
});
