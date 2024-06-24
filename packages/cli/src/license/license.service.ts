import { Service } from 'typedi';
import axios from 'axios';

import { Logger } from '@/Logger';
import { License } from '@/License';
import type { User } from '@db/entities/User';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';
import { EventRelay } from '@/eventbus/event-relay.service';

type LicenseError = Error & { errorId?: keyof typeof LicenseErrors };

export const LicenseErrors = {
	SCHEMA_VALIDATION: 'Activation key is in the wrong format',
	RESERVATION_EXHAUSTED:
		'Activation key has been used too many times. Please contact sales@n8n.io if you would like to extend it',
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
		private readonly workflowRepository: WorkflowRepository,
		private readonly urlService: UrlService,
		private readonly eventRelay: EventRelay,
	) {}

	async getLicenseData() {
		const triggerCount = await this.workflowRepository.getActiveTriggerCount();
		const mainPlan = this.license.getMainPlan();

		return {
			usage: {
				executions: {
					value: triggerCount,
					limit: this.license.getTriggerLimit(),
					warningThreshold: 0.8,
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
			// not awaiting so as not to make the endpoint hang
			void this.eventRelay.emit('license-renew-attempted', { success: false });
			throw new BadRequestError(message);
		}

		// not awaiting so as not to make the endpoint hang
		void this.eventRelay.emit('license-renew-attempted', { success: true });
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
