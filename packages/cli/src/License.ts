import { LicenseManager, TLicenseContainerStr } from '@n8n_io/license-sdk';
import { ILogger } from 'n8n-workflow';
import { getLogger } from './Logger';
import config from '@/config';

let cached = '';

export class License {
	private logger: ILogger;

	private manager: LicenseManager | undefined;

	constructor() {
		this.logger = getLogger();
	}

	async init(instanceId: string, version: string) {
		if (this.manager) {
			return;
		}

		const server = config.getEnv('license.serverUrl');
		const autoRenewEnabled = config.getEnv('license.autoRenewEnabled');
		const autoRenewOffset = config.getEnv('license.autoRenewOffset');;

		this.manager = new LicenseManager({
			server,
			tenantId: 1,
			productIdentifier: `n8n-${version}`,
			autoRenewEnabled,
			autoRenewOffset,
			logger: this.logger,
			loadCertStr: async () => {
				// todo
				// code that returns a stored cert string from DB
				return cached;
			},
			saveCertStr: async (cert: TLicenseContainerStr) => {
				// todo
				// code that persists a cert string into the DB
				cached = cert;
			},
			deviceFingerprint: () => instanceId,
		});

		await this.manager.initialize();
	}

	async activate(activationKey: string): Promise<void> {
		if (!this.manager) {
			return;
		}

		if (this.manager.isValid()) {
			return;
		}

		try {
			await this.manager.activate(activationKey);
		} catch (e) {
			// todo
		}
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		try {
			await this.manager.renew();
		} catch (e) {
			// todo
		}
	}

	isFeatureEnabled(feature: string): boolean {
		if (!this.manager) {
			return false;
		}

		return this.manager.hasFeatureEnabled(feature);
	}
}
