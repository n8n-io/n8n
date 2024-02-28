import Container from 'typedi';
import type { Response } from 'express';
import { anyObject, mock } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';

import type { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { OwnerController } from '@/controllers/owner.controller';
import type { User } from '@db/entities/User';
import type { SettingsRepository } from '@db/repositories/settings.repository';
import type { UserRepository } from '@db/repositories/user.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import type { OwnerRequest } from '@/requests';
import type { UserService } from '@/services/user.service';
import { PasswordUtility } from '@/services/password.utility';

import { mockInstance } from '../../shared/mocking';
import { badPasswords } from '../shared/testData';

describe('OwnerController', () => {
	const configGetSpy = jest.spyOn(config, 'getEnv');
	const internalHooks = mock<InternalHooks>();
	const authService = mock<AuthService>();
	const userService = mock<UserService>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	mockInstance(License).isWithinUsersLimit.mockReturnValue(true);
	const controller = new OwnerController(
		mock(),
		internalHooks,
		settingsRepository,
		authService,
		userService,
		Container.get(PasswordUtility),
		mock(),
		userRepository,
	);

	describe('setupOwner', () => {
		it('should throw a BadRequestError if the instance owner is already setup', async () => {
			configGetSpy.mockReturnValue(true);
			await expect(controller.setupOwner(mock(), mock())).rejects.toThrowError(
				new BadRequestError('Instance owner already setup'),
			);
		});

		it('should throw a BadRequestError if the email is invalid', async () => {
			configGetSpy.mockReturnValue(false);
			const req = mock<OwnerRequest.Post>({ body: { email: 'invalid email' } });
			await expect(controller.setupOwner(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
		});

		describe('should throw if the password is invalid', () => {
			Object.entries(badPasswords).forEach(([password, errorMessage]) => {
				it(password, async () => {
					configGetSpy.mockReturnValue(false);
					const req = mock<OwnerRequest.Post>({ body: { email: 'valid@email.com', password } });
					await expect(controller.setupOwner(req, mock())).rejects.toThrowError(
						new BadRequestError(errorMessage),
					);
				});
			});
		});

		it('should throw a BadRequestError if firstName & lastName are missing ', async () => {
			configGetSpy.mockReturnValue(false);
			const req = mock<OwnerRequest.Post>({
				body: { email: 'valid@email.com', password: 'NewPassword123', firstName: '', lastName: '' },
			});
			await expect(controller.setupOwner(req, mock())).rejects.toThrowError(
				new BadRequestError('First and last names are mandatory'),
			);
		});

		it('should setup the instance owner successfully', async () => {
			const user = mock<User>({
				id: 'userId',
				role: 'global:owner',
				authIdentities: [],
			});
			const req = mock<OwnerRequest.Post>({
				body: {
					email: 'valid@email.com',
					password: 'NewPassword123',
					firstName: 'Jane',
					lastName: 'Doe',
				},
				user,
			});
			const res = mock<Response>();
			configGetSpy.mockReturnValue(false);
			userRepository.findOneOrFail.calledWith(anyObject()).mockResolvedValue(user);
			userRepository.save.calledWith(anyObject()).mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

			await controller.setupOwner(req, res);

			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: 'global:owner' },
			});
			expect(userRepository.save).toHaveBeenCalledWith(user, { transaction: false });
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user);
		});
	});
});
