import { CommunityRegisteredRequestDto } from '@n8n/api-types';
import type { AxiosError } from 'axios';
import { InstanceSettings } from 'n8n-core';

import { Get, Post, RestController, GlobalScope, Body } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AuthenticatedRequest, AuthlessRequest, LicenseRequest } from '@/requests';
import { UrlService } from '@/services/url.service';

import { LicenseService } from './license.service';

@RestController('/license')
export class LicenseController {
	constructor(
		private readonly licenseService: LicenseService,
		private readonly instanceSettings: InstanceSettings,
		private readonly urlService: UrlService,
	) {}

	@Get('/')
	async getLicenseData() {
		return await this.licenseService.getLicenseData();
	}

	@Post('/enterprise/request_trial')
	@GlobalScope('license:manage')
	async requestEnterpriseTrial(req: AuthenticatedRequest) {
		try {
			await this.licenseService.requestEnterpriseTrial(req.user);
		} catch (error: unknown) {
			if (error instanceof Error) {
				const errorMsg =
					(error as AxiosError<{ message: string }>).response?.data?.message ?? error.message;

				throw new BadRequestError(errorMsg);
			} else {
				throw new BadRequestError('Failed to request trial');
			}
		}
	}

	@Post('/enterprise/community-registered')
	async registerCommunityEdition(
		_req: AuthlessRequest,
		_res: Response,
		@Body payload: CommunityRegisteredRequestDto,
	) {
		return await this.licenseService.registerCommunityEdition({
			email: payload.email,
			instanceId: this.instanceSettings.instanceId,
			instanceUrl: this.urlService.getInstanceBaseUrl(),
			licenseType: 'community-registered',
		});
	}

	@Post('/activate')
	@GlobalScope('license:manage')
	async activateLicense(req: LicenseRequest.Activate) {
		const { activationKey } = req.body;
		await this.licenseService.activateLicense(activationKey);
		return await this.getTokenAndData();
	}

	@Post('/renew')
	@GlobalScope('license:manage')
	async renewLicense() {
		await this.licenseService.renewLicense();
		return await this.getTokenAndData();
	}

	private async getTokenAndData() {
		const managementToken = this.licenseService.getManagementJwt();
		const data = await this.licenseService.getLicenseData();
		return { ...data, managementToken };
	}
}
