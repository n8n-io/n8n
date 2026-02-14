import { DismissBannerRequestDto, OwnerSetupRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { PostHogClient } from '@/posthog';
import { BannerService } from '@/services/banner.service';
import { UserService } from '@/services/user.service';
import { OwnershipService } from '@/services/ownership.service';

@RestController('/owner')
export class OwnerController {
	constructor(
		private readonly authService: AuthService,
		private readonly bannerService: BannerService,
		private readonly userService: UserService,
		private readonly postHog: PostHogClient,
		private readonly ownershipService: OwnershipService,
	) {}

	/**
	 * Promote a shell into the owner of the n8n instance
	 */
	@Post('/setup', { skipAuth: true })
	async setupOwner(req: AuthenticatedRequest, res: Response, @Body payload: OwnerSetupRequestDto) {
		const owner = await this.ownershipService.setupOwner(payload);
		this.authService.issueCookie(res, owner, req.authInfo?.usedMfa ?? false, req.browserId);
		return await this.userService.toPublic(owner, { posthog: this.postHog, withScopes: true });
	}

	@Post('/dismiss-banner')
	@GlobalScope('banner:dismiss')
	async dismissBanner(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: DismissBannerRequestDto,
	) {
		const bannerName = payload.banner;
		if (!bannerName) return;
		await this.bannerService.dismissBanner(bannerName);
	}
}
