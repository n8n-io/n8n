import type { DismissBannerRequestDto } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { OwnerController } from '@/controllers/owner.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { BannerService } from '@/services/banner.service';
import type { UserService } from '@/services/user.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { PostHogClient } from '@/posthog';

describe('OwnerController', () => {
	const authService = mock<AuthService>();
	const bannerService = mock<BannerService>();
	const userService = mock<UserService>();
	const ownershipService = mock<OwnershipService>();
	const postHogClient = mock<PostHogClient>();

	const controller = new OwnerController(
		authService,
		bannerService,
		userService,
		postHogClient,
		ownershipService,
	);

	describe('setupOwner', () => {
		it('should pass on errors from the service', async () => {
			jest
				.spyOn(ownershipService, 'setupOwner')
				.mockRejectedValueOnce(new BadRequestError('Instance owner already setup'));

			await expect(controller.setupOwner(mock(), mock(), mock())).rejects.toThrowError(
				new BadRequestError('Instance owner already setup'),
			);

			expect(authService.issueCookie).not.toHaveBeenCalled();
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
