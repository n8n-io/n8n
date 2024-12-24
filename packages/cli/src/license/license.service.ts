import { Logger } from 'n8n-workflow';
import { Service } from 'typedi';

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
		private logger: Logger,
		_instanceSettings: any,
		_config: any,
		private eventBus: any,
		_eventService: any,
	) {
		this.logger?.debug('Initializing LicenseService');
		this.setupEventHandlers();
	}

	private setupEventHandlers() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.eventBus?.on('license.updated', () => {
			this.logger?.debug('License updated');
		});
	}

	async getLicenseData() {
		return {
			usage: {
				activeWorkflowTriggers: {
					value: 0,
					limit: -1, // unlimited
					warningThreshold: 0.8,
				},
			},
			license: {
				planId: 'enterprise',
				planName: 'Enterprise',
			},
		};
	}

	async activate(_activationKey: string, _options?: { instanceType?: string; tenantId?: number }) {
		// Always successful
		return;
	}

	async refresh() {
		// No refresh needed
		return;
	}

	async requestEnterpriseTrial(_user?: any) {
		// Auto-approved
		return;
	}

	async registerCommunityEdition(_data: any) {
		// No registration needed
		return;
	}

	async activateLicense(_activationKey: string) {
		// No activation needed
		return;
	}

	async renewLicense() {
		// No renewal needed
		return;
	}

	getManagementJwt(): string {
		return '';
	}

	async loadCertStr(): Promise<string> {
		return '';
	}
}
