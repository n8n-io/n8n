import { CookieOptions, Response } from 'express';
import type { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import { mock, anyObject, captor } from 'jest-mock-extended';
import type { ILogger } from 'n8n-workflow';
import type { IExternalHooksClass, IInternalHooksClass } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { MeController } from '@/controllers';
import { AUTH_COOKIE_NAME } from '@/constants';
import { BadRequestError } from '@/ResponseHelper';
import type { AuthenticatedRequest, MeRequest } from '@/requests';
import { badPasswords } from '../shared/testData';

describe('MeController', () => {
	const logger = mock<ILogger>();
	const externalHooks = mock<IExternalHooksClass>();
	const internalHooks = mock<IInternalHooksClass>();
	const userRepository = mock<Repository<User>>();
	const controller = new MeController({
		logger,
		externalHooks,
		internalHooks,
		repositories: { User: userRepository },
	});

	describe('updateCurrentUser', () => {
		it('should throw BadRequestError if email is missing in the payload', async () => {
			const req = mock<MeRequest.Settings>({});
			expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Email is mandatory'),
			);
		});

		it('should throw BadRequestError if email is invalid', async () => {
			const req = mock<MeRequest.Settings>({ body: { email: 'invalid-email' } });
			expect(controller.updateCurrentUser(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
		});

		it('should update the user in the DB, and issue a new cookie', async () => {
			const req = mock<MeRequest.Settings>({
				user: mock({ id: '123', password: 'password', authIdentities: [] }),
				body: { email: 'valid@email.com', firstName: 'John', lastName: 'Potato' },
			});
			const res = mock<Response>();
			userRepository.save.calledWith(anyObject()).mockResolvedValue(req.user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

			await controller.updateCurrentUser(req, res);

			const cookieOptions = captor<CookieOptions>();
			expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'signed-token', cookieOptions);
			expect(cookieOptions.value.httpOnly).toBe(true);
			expect(cookieOptions.value.sameSite).toBe('lax');

			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.update', [
				req.user.email,
				anyObject(),
			]);
		});
	});

	describe('updatePassword', () => {
		const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6'; // Hashed 'old_password'

		it('should throw if the user does not have a password set', async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: undefined }),
				body: { currentPassword: '', newPassword: '' },
			});
			expect(controller.updatePassword(req, mock())).rejects.toThrowError(
				new BadRequestError('Requesting user not set up.'),
			);
		});

		it("should throw if currentPassword does not match the user's password", async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: passwordHash }),
				body: { currentPassword: 'not_old_password', newPassword: '' },
			});
			expect(controller.updatePassword(req, mock())).rejects.toThrowError(
				new BadRequestError('Provided current password is incorrect.'),
			);
		});

		describe('should throw if newPassword is not valid', () => {
			Object.entries(badPasswords).forEach(([newPassword, errorMessage]) => {
				it(newPassword, async () => {
					const req = mock<MeRequest.Password>({
						user: mock({ password: passwordHash }),
						body: { currentPassword: 'old_password', newPassword },
					});
					expect(controller.updatePassword(req, mock())).rejects.toThrowError(
						new BadRequestError(errorMessage),
					);
				});
			});
		});

		it('should update the password in the DB, and issue a new cookie', async () => {
			const req = mock<MeRequest.Password>({
				user: mock({ password: passwordHash }),
				body: { currentPassword: 'old_password', newPassword: 'NewPassword123' },
			});
			const res = mock<Response>();
			userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'new-signed-token');

			await controller.updatePassword(req, res);

			expect(req.user.password).not.toBe(passwordHash);

			const cookieOptions = captor<CookieOptions>();
			expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'new-signed-token', cookieOptions);
			expect(cookieOptions.value.httpOnly).toBe(true);
			expect(cookieOptions.value.sameSite).toBe('lax');

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

	describe('API Key methods', () => {
		let req: AuthenticatedRequest;
		beforeAll(() => {
			req = mock({ user: mock<Partial<User>>({ id: '123', apiKey: 'test-key' }) });
		});

		describe('createAPIKey', () => {
			it('should create and save an API key', async () => {
				const { apiKey } = await controller.createAPIKey(req);
				expect(userRepository.update).toHaveBeenCalledWith(req.user.id, { apiKey });
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
				expect(userRepository.update).toHaveBeenCalledWith(req.user.id, { apiKey: null });
			});
		});
	});
});
