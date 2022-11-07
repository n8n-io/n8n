import { LicenseManager, TLicenseContainerStr } from '@n8n_io/license-sdk';
import { ILogger } from 'n8n-workflow';
import { getLogger } from './Logger';

let cached = '';

export class License {
	private logger: ILogger;

	private manager: LicenseManager;

	constructor(instanceId: string) {
		this.logger = getLogger();
		this.manager = new LicenseManager({
			server: 'https://license.your-server.com',
			tenantId: 1, // referencing to resp. license-server entity
			productIdentifier: 'Demo Product v1.2.3', // must regex-match cert.productIdentifierPattern
			autoRenewEnabled: true,
			autoRenewOffset: 60 * 60 * 48, // = 48 hours
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
	}

	async init() {
		await this.manager.initialize();
	}

	async activate(activationKey: string) {
		try {
			await this.manager.activate(activationKey);

			return this.manager.isValid();
		} catch (e) {
			// todo
		}
	}

	async renew() {
		try {
			await this.manager.renew();
		} catch (e) {
			// todo
		}
	}

	isFeatureEnabled(feature: string) {
		return this.manager.hasFeatureEnabled(feature);
	}
}
