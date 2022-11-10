import { LicenseManager, TLicenseContainerStr } from '@n8n_io/license-sdk';
import { ILogger } from 'n8n-workflow';
import { getLogger } from './Logger';
import config from '@/config';
import * as Db from '@/Db';
import { LICENSE_FEATURES, SETTINGS_LICENSE_CERT_KEY } from './constants';

async function loadCertStr(): Promise<TLicenseContainerStr> {
	const databaseSettings = await Db.collections.Settings.findOne({
		where: {
			key: SETTINGS_LICENSE_CERT_KEY,
		},
	});

	return databaseSettings?.value ?? '';
}

async function saveCertStr(value: TLicenseContainerStr): Promise<void> {
	await Db.collections.Settings.upsert(
		{
			key: SETTINGS_LICENSE_CERT_KEY,
			value,
			loadOnStartup: false,
		},
		['key'],
	);
}

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
		const autoRenewOffset = config.getEnv('license.autoRenewOffset');

		try {
			this.manager = new LicenseManager({
				server,
				tenantId: 1,
				productIdentifier: `n8n-${version}`,
				autoRenewEnabled,
				autoRenewOffset,
				logger: this.logger,
				loadCertStr,
				saveCertStr,
				deviceFingerprint: () => instanceId,
			});

			await this.manager.initialize();
		} catch (e: unknown) {
			if (e instanceof Error) {
				this.logger.error('Could not initialize license manager sdk', e);
			}
		}
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
			if (e instanceof Error) {
				this.logger.error('Could not activate license', e);
			}
		}
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		try {
			await this.manager.renew();
		} catch (e) {
			if (e instanceof Error) {
				this.logger.error('Could not renew license', e);
			}
		}
	}

	isFeatureEnabled(feature: string): boolean {
		if (!this.manager) {
			return false;
		}

		return this.manager.hasFeatureEnabled(feature);
	}

	isSharingEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.SHARING);
	}
}

let licenseInstance: License | undefined;

export function getLicense(): License {
	if (licenseInstance === undefined) {
		licenseInstance = new License();
	}

	return licenseInstance;
}
