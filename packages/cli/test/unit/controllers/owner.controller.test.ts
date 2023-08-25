import type { CookieOptions, Response } from 'express';
import { anyObject, captor, mock } from 'jest-mock-extended';
import type { ILogger } from 'n8n-workflow';
import jwt from 'jsonwebtoken';
import type { IInternalHooksClass } from '@/Interfaces';
import type { User } from '@db/entities/User';
import type { SettingsRepository } from '@db/repositories';
import type { Config } from '@/config';
import { BadRequestError } from '@/ResponseHelper';
import type { OwnerRequest } from '@/requests';
import { OwnerController } from '@/controllers';
import { badPasswords } from '../shared/testData';
import { AUTH_COOKIE_NAME } from '@/constants';
import { UserService } from '@/services/user.service';
import { mockInstance } from '../../integration/shared/utils';

describe('OwnerController', () => {
	const config = mock<Config>();
	const logger = mock<ILogger>();
	const internalHooks = mock<IInternalHooksClass>();
	const userService = mockInstance(UserService);
	const settingsRepository = mock<SettingsRepository>();
	const controller = new OwnerController(
		config,
		logger,
		internalHooks,
		settingsRepository,
		userService,
	);

	describe('setupOwner', () => {
		it('should throw a BadRequestError if the instance owner is already setup', async () => {
			config.getEnv.calledWith('userManagement.isInstanceOwnerSetUp').mockReturnValue(true);
			await expect(controller.setupOwner(mock(), mock())).rejects.toThrowError(
				new BadRequestError('Instance owner already setup'),
			);
		});

		it('should throw a BadRequestError if the email is invalid', async () => {
			config.getEnv.calledWith('userManagement.isInstanceOwnerSetUp').mockReturnValue(false);
			const req = mock<OwnerRequest.Post>({ body: { email: 'invalid email' } });
			await expect(controller.setupOwner(req, mock())).rejects.toThrowError(
				new BadRequestError('Invalid email address'),
			);
		});

		describe('should throw if the password is invalid', () => {
			Object.entries(badPasswords).forEach(([password, errorMessage]) => {
				it(password, async () => {
					config.getEnv.calledWith('userManagement.isInstanceOwnerSetUp').mockReturnValue(false);
					const req = mock<OwnerRequest.Post>({ body: { email: 'valid@email.com', password } });
					await expect(controller.setupOwner(req, mock())).rejects.toThrowError(
						new BadRequestError(errorMessage),
					);
				});
			});
		});

		it('should throw a BadRequestError if firstName & lastName are missing ', async () => {
			config.getEnv.calledWith('userManagement.isInstanceOwnerSetUp').mockReturnValue(false);
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
				globalRole: { scope: 'global', name: 'owner' },
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
			config.getEnv.calledWith('userManagement.isInstanceOwnerSetUp').mockReturnValue(false);
			userService.save.calledWith(anyObject()).mockResolvedValue(user);
			jest.spyOn(jwt, 'sign').mockImplementation(() => 'signed-token');

			await controller.setupOwner(req, res);

			expect(userService.save).toHaveBeenCalledWith(user);

			const cookieOptions = captor<CookieOptions>();
			expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'signed-token', cookieOptions);
			expect(cookieOptions.value.httpOnly).toBe(true);
			expect(cookieOptions.value.sameSite).toBe('lax');
		});
	});
});
