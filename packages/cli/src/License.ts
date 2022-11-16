/* eslint-disable @typescript-eslint/naming-convention */
import { LicenseManager, TFeatures, TLicenseContainerStr } from '@n8n_io/license-sdk';
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

const MOCK_PRODUCT_INFO = {
	planType: 'on-prem',
	planName: 'Individual',
	features: {
		'feat:2fa': {
			name: '2FA',
			description:
				'Provides additional security for user accounts by requiring a second factor when authenticating',
			supportedVersions: '>=0.200.0',
		},
		'feat:advancedExecutionSearch': {
			name: 'Advanced Execution Search',
			description: 'Allows searching for past executions by different criteria',
			supportedVersions: '>=0.300.0',
		},
		'feat:environments': {
			name: 'Environments',
			description: 'Provides the ability to deploy a workflow to different environments',
			supportedVersions: '>=0.200.0',
		},
		'feat:logStreaming': {
			name: 'Log Streaming',
			description: 'Provides the ability to export relevant n8n events to 3rd party systems',
			supportedVersions: '>=0.200.0',
		},
		'feat:githubSync': {
			name: 'GitHub Sync',
			description: 'Provides the ability to backup workflow data to a GitHub repository',
			supportedVersions: '>=0.200.0',
		},
		'feat:ldap': {
			name: 'LDAP',
			description:
				'Provides the ability to manage n8n user accounts in an external LDAP, e.g. Active Directory',
			supportedVersions: '>=0.200.0',
		},
		'feat:sharing': {
			name: 'Workflow and Credential Sharing',
			description: 'Allows sharing workflows and credentials with other users',
			supportedVersions: '>=0.200.0',
		},
		'quota:users': {
			name: 'Users',
			description: 'Allowed number of users',
			supportedVersions: '>=0.200.0',
		},
		'quota:workflowExecutions': {
			name: 'Workflow executions',
			description: 'Allows number of workflow executions',
			supportedVersions: '>=0.200.0',
		},
		'quota:activeWorkflows': {
			name: 'Active workflows',
			description: 'Allowed number of active workflows',
			supportedVersions: '>=0.200.0',
		},
		'quota:testWorkflows': {
			name: 'Test workflows',
			description: 'Allowed number of test workflows',
			supportedVersions: '>=0.200.0',
		},
	},
};

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

			throw e;
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

	getProductInfo():
		| undefined
		| { features: TFeatures | undefined; productInfo: object | undefined } {
		if (!this.manager?.isValid()) {
			return;
		}

		return {
			features: this.manager?.getFeatures(),
			productInfo: this.manager?.getProductMetadata(),
		};
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
