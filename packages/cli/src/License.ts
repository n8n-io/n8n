import { LicenseManager, TLicenseContainerStr } from '@n8n_io/license-sdk';
import { ILogger } from 'n8n-workflow';
import { getLogger } from './Logger';
import config from '@/config';
import * as Db from '@/Db';
import { SETTINGS_LICENSE_CERT_KEY } from './constants';

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
