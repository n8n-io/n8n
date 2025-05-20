import { LicenseState } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import axios, { AxiosError } from 'axios';
import { Logger } from 'n8n-core';
import { ensureError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { UrlService } from '@/services/url.service';

type LicenseError = Error & { errorId?: keyof typeof LicenseErrors };

export const LicenseErrors = {
	SCHEMA_VALIDATION: 'Activation key is in the wrong format',
	RESERVATION_EXHAUSTED: 'Activation key has been used too many times',
	RESERVATION_EXPIRED: 'Activation key has expired',
	NOT_FOUND: 'Activation key not found',
	RESERVATION_CONFLICT: 'Activation key not found',
	RESERVATION_DUPLICATE: 'Activation key has already been used on this instance',
};

@Service()
export class LicenseService {
	constructor(
		private readonly logger: Logger,
		private readonly license: License,
		private readonly licenseState: LicenseState,
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	async getLicenseData() {
		const triggerCount = await this.workflowRepository.getActiveTriggerCount();
		const workflowsWithEvaluationsCount =
			await this.workflowRepository.getWorkflowsWithEvaluationCount();
		const mainPlan = this.license.getMainPlan();

		return {
			usage: {
				activeWorkflowTriggers: {
					value: triggerCount,
					limit: this.license.getTriggerLimit(),
					warningThreshold: 0.8,
				},
				workflowsHavingEvaluations: {
					value: workflowsWithEvaluationsCount,
					limit: 1, //this.licenseState.getMaxWorkflowsWithEvaluations(),
				},
			},
			license: {
				planId: mainPlan?.productId ?? '',
				planName: this.license.getPlanName(),
			},
		};
	}

	async requestEnterpriseTrial(user: User) {
		await axios.post('https://enterprise.n8n.io/enterprise-trial', {
			licenseType: 'enterprise',
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			instanceUrl: this.urlService.getWebhookBaseUrl(),
		});
	}

	async registerCommunityEdition({
		userId,
		email,
		instanceId,
		instanceUrl,
		licenseType,
	}: {
		userId: User['id'];
		email: string;
		instanceId: string;
		instanceUrl: string;
		licenseType: string;
	}): Promise<{ title: string; text: string }> {
		try {
			const {
				data: { licenseKey, ...rest },
			} = await axios.post<{ title: string; text: string; licenseKey: string }>(
				'https://enterprise.n8n.io/community-registered',
				{
					email,
					instanceId,
					instanceUrl,
					licenseType,
				},
			);
			this.eventService.emit('license-community-plus-registered', { userId, email, licenseKey });
			return rest;
		} catch (e: unknown) {
			if (e instanceof AxiosError) {
				const error = e as AxiosError<{ message: string }>;
				const errorMsg = error.response?.data?.message ?? e.message;
				throw new BadRequestError('Failed to register community edition: ' + errorMsg);
			} else {
				this.logger.error('Failed to register community edition', { error: ensureError(e) });
				throw new BadRequestError('Failed to register community edition');
			}
		}
	}

	getManagementJwt(): string {
		return this.license.getManagementJwt();
	}

	async activateLicense(activationKey: string) {
		try {
			await this.license.activate(activationKey);
		} catch (e) {
			const message = this.mapErrorMessage(e as LicenseError, 'activate');
			throw new BadRequestError(message);
		}
	}

	async renewLicense() {
		try {
			await this.license.renew();
		} catch (e) {
			const message = this.mapErrorMessage(e as LicenseError, 'renew');

			this.eventService.emit('license-renewal-attempted', { success: false });
			throw new BadRequestError(message);
		}

		this.eventService.emit('license-renewal-attempted', { success: true });
	}

	private mapErrorMessage(error: LicenseError, action: 'activate' | 'renew') {
		let message = error.errorId && LicenseErrors[error.errorId];
		if (!message) {
			message = `Failed to ${action} license: ${error.message}`;
			this.logger.error(message, { stack: error.stack ?? 'n/a' });
		}
		return message;
	}
}
