import type { DismissBannerRequestDto, OwnerSetupRequestDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	AuthenticatedRequest,
	User,
	PublicUser,
	SettingsRepository,
	UserRepository,
} from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { OwnerController } from '@/controllers/owner.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { BannerService } from '@/services/banner.service';
import type { PasswordUtility } from '@/services/password.utility';
import type { UserService } from '@/services/user.service';

describe('OwnerController', () => {
	const configGetSpy = jest.spyOn(config, 'getEnv');
	const configSetSpy = jest.spyOn(config, 'set');

	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	const authService = mock<AuthService>();
	const bannerService = mock<BannerService>();
	const userService = mock<UserService>();
	const userRepository = mock<UserRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const passwordUtility = mock<PasswordUtility>();

	const controller = new OwnerController(
		logger,
		eventService,
		settingsRepository,
		authService,
		bannerService,
		userService,
		passwordUtility,
		mock(),
		userRepository,
	);

	describe('setupOwner', () => {
		it('should throw a BadRequestError if the instance owner is already setup', async () => {
			configGetSpy.mockReturnValue(true);
			await expect(controller.setupOwner(mock(), mock(), mock())).rejects.toThrowError(
				new BadRequestError('Instance owner already setup'),
			);

			expect(userRepository.findOneOrFail).not.toHaveBeenCalled();
			expect(userRepository.save).not.toHaveBeenCalled();
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(settingsRepository.update).not.toHaveBeenCalled();
			expect(configSetSpy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Request to claim instance ownership failed because instance owner already exists',
			);
		});

		it('should setup the instance owner successfully', async () => {
			const user = mock<User>({
				id: 'userId',
				role: 'global:owner',
				authIdentities: [],
			});
			const browserId = 'test-browser-id';
			const req = mock<AuthenticatedRequest>({ user, browserId, authInfo: { usedMfa: false } });
			const res = mock<Response>();
			const payload = mock<OwnerSetupRequestDto>({
				email: 'valid@email.com',
				password: 'NewPassword123',
				firstName: 'Jane',
				lastName: 'Doe',
			});
			configGetSpy.mockReturnValue(false);
			userRepository.findOneOrFail.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(user);
			userService.toPublic.mockResolvedValue(mock<PublicUser>({ id: 'newUserId' }));

			const result = await controller.setupOwner(req, res, payload);

			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: 'global:owner' },
			});
			expect(userRepository.save).toHaveBeenCalledWith(user, { transaction: false });
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, false, browserId);
			expect(settingsRepository.update).toHaveBeenCalledWith(
				{ key: 'userManagement.isInstanceOwnerSetUp' },
				{ value: JSON.stringify(true) },
			);
			expect(configSetSpy).toHaveBeenCalledWith('userManagement.isInstanceOwnerSetUp', true);
			expect(eventService.emit).toHaveBeenCalledWith('instance-owner-setup', { userId: 'userId' });
			expect(result.id).toEqual('newUserId');
		});
	});

	describe('dismissBanner', () => {
		it('should not call dismissBanner if no banner is provided', async () => {
			const payload = mock<DismissBannerRequestDto>({ banner: undefined });

			const result = await controller.dismissBanner(mock(), mock(), payload);

			expect(bannerService.dismissBanner).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should call dismissBanner with the correct banner name', async () => {
			const payload = mock<DismissBannerRequestDto>({ banner: 'TRIAL' });

			await controller.dismissBanner(mock(), mock(), payload);

			expect(bannerService.dismissBanner).toHaveBeenCalledWith('TRIAL');
		});
	});
});
