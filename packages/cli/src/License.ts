import { LicenseManager, TEntitlement, TLicenseContainerStr } from '@n8n_io/license-sdk';
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
				tenantId: config.getEnv('license.tenantId'),
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

		await this.manager.activate(activationKey);
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		await this.manager.renew();
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

	getCurrentEntitlements() {
		return this.manager?.getCurrentEntitlements() ?? [];
	}

	getFeatureValue(
		feature: string,
		requireValidCert?: boolean,
	): undefined | boolean | number | string {
		if (!this.manager) {
			return undefined;
		}

		return this.manager.getFeatureValue(feature, requireValidCert);
	}

	getManagementJwt(): string {
		if (!this.manager) {
			return '';
		}
		return this.manager.getManagementJwt();
	}

	/**
	 * Helper function to get the main plan for a license
	 */
	getMainPlan(): TEntitlement | undefined {
		if (!this.manager) {
			return undefined;
		}

		const entitlements = this.getCurrentEntitlements();
		if (!entitlements.length) {
			return undefined;
		}

		return entitlements.find(
			(entitlement) =>
				(entitlement.productMetadata.terms as unknown as { isMainPlan: boolean }).isMainPlan,
		);
	}

	// Helper functions for computed data
	getTriggerLimit(): number {
		return (this.getFeatureValue('quota:activeWorkflows') ?? -1) as number;
	}

	getPlanName(): string {
		return (this.getFeatureValue('planName') ?? 'Community') as string;
	}
}

let licenseInstance: License | undefined;

export function getLicense(): License {
	if (licenseInstance === undefined) {
		licenseInstance = new License();
	}

	return licenseInstance;
}
