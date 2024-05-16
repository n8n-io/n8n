import type { Response } from 'express';
import { Container } from 'typedi';
import jwt from 'jsonwebtoken';
import { mock, anyObject } from 'jest-mock-extended';
import type { PublicUser } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { MeController } from '@/controllers/me.controller';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { AuthenticatedRequest, MeRequest } from '@/requests';
import { UserService } from '@/services/user.service';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UserRepository } from '@/databases/repositories/user.repository';
import { badPasswords } from '../shared/testData';
import { mockInstance } from '../../shared/mocking';

const browserId = 'test-browser-id';

describe('MeController', () => {
	const externalHooks = mockInstance(ExternalHooks);
	const internalHooks = mockInstance(InternalHooks);
	const userService = mockInstance(UserService);
	const userRepository = mockInstance(UserRepository);
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
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
			});
			const reqBody = { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' };
			const req = mock<MeRequest.UserUpdate>({ user, body: reqBody, browserId });
			const res = mock<Response>();
			userRepository.findOneOrFail.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');
			userService.toPublic.mockResolvedValue({} as unknown as PublicUser);

			await controller.updateCurrentUser(req, res);

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.beforeUpdate', [
				user.id,
				user.email,
				reqBody,
			]);

			expect(userService.update).toHaveBeenCalled();

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
			});
			const reqBody = { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' };
			const req = mock<MeRequest.UserUpdate>({ user, browserId });
			req.body = reqBody;
			const res = mock<Response>();
			userRepository.findOneOrFail.mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

			// Add invalid data to the request payload
			Object.assign(reqBody, { id: '0', role: 'global:owner' });

			await controller.updateCurrentUser(req, res);

			expect(userService.update).toHaveBeenCalled();

			const updatePayload = userService.update.mock.calls[0][1];
			expect(updatePayload.email).toBe(reqBody.email);
			expect(updatePayload.firstName).toBe(reqBody.firstName);
			expect(updatePayload.lastName).toBe(reqBody.lastName);
			expect(updatePayload.id).toBeUndefined();
			expect(updatePayload.role).toBeUndefined();
		});

		it('should throw BadRequestError if beforeUpdate hook throws BadRequestError', async () => {
			const user = mock<User>({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
			});
			const reqBody = { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' };
			const req = mock<MeRequest.UserUpdate>({ user, body: reqBody });
			// userService.findOneOrFail.mockResolvedValue(user);

			externalHooks.run.mockImplementationOnce(async (hookName) => {
				if (hookName === 'user.profile.beforeUpdate') {
					throw new BadRequestError('Invalid email address');
				}
			});

			await expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
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
				user: mock({ password: passwordHash }),
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

			expect(internalHooks.onUserUpdate).toHaveBeenCalledWith({
				user: req.user,
				fields_changed: ['password'],
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
	});

	describe('API Key methods', () => {
		let req: AuthenticatedRequest;
		beforeAll(() => {
			req = mock({ user: mock<Partial<User>>({ id: '123', apiKey: 'test-key' }) });
		});

		describe('createAPIKey', () => {
			it('should create and save an API key', async () => {
				const { apiKey } = await controller.createAPIKey(req);
				expect(userService.update).toHaveBeenCalledWith(req.user.id, { apiKey });
			});
		});

		describe('getAPIKey', () => {
			it('should return the users api key', async () => {
				const { apiKey } = await controller.getAPIKey(req);
				expect(apiKey).toEqual(req.user.apiKey);
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
