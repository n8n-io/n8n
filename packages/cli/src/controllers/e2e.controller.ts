import type { PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { BooleanLicenseFeature, NumericLicenseFeature } from '@n8n/constants';
import { LICENSE_FEATURES, LICENSE_QUOTAS, UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { SettingsRepository, UserRepository } from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Request } from 'express';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { inE2ETests } from '@/constants';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { FeatureReturnType } from '@/license';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { Push } from '@/push';
import { CacheService } from '@/services/cache/cache.service';
import { FrontendService } from '@/services/frontend.service';
import { PasswordUtility } from '@/services/password.utility';

if (!inE2ETests) {
	Container.get(Logger).error('E2E endpoints only allowed during E2E tests');
	process.exit(1);
}

const tablesToTruncate = [
	'auth_identity',
	'auth_provider_sync_history',
	'credentials_entity',
	'event_destinations',
	'execution_entity',
	'installed_nodes',
	'installed_packages',
	'project',
	'project_relation',
	'settings',
	'shared_credentials',
	'shared_workflow',
	'tag_entity',
	'user',
	'variables',
	'webhook_entity',
	'workflow_entity',
	'workflow_statistics',
	'workflows_tags',
];

type UserSetupPayload = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	mfaEnabled?: boolean;
	mfaSecret?: string;
	mfaRecoveryCodes?: string[];
};

type ResetRequest = Request<
	{},
	{},
	{
		owner: UserSetupPayload;
		members: UserSetupPayload[];
		admin: UserSetupPayload;
	}
>;

type PushRequest = Request<
	{},
	{},
	{
		pushRef: string;
	} & PushMessage
>;

@RestController('/e2e')
export class E2EController {
	private enabledFeatures: Record<BooleanLicenseFeature, boolean> = {
		[LICENSE_FEATURES.SHARING]: false,
		[LICENSE_FEATURES.LDAP]: false,
		[LICENSE_FEATURES.SAML]: false,
		[LICENSE_FEATURES.LOG_STREAMING]: false,
		[LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS]: false,
		[LICENSE_FEATURES.SOURCE_CONTROL]: false,
		[LICENSE_FEATURES.VARIABLES]: false,
		[LICENSE_FEATURES.API_DISABLED]: false,
		[LICENSE_FEATURES.EXTERNAL_SECRETS]: false,
		[LICENSE_FEATURES.SHOW_NON_PROD_BANNER]: false,
		[LICENSE_FEATURES.WORKFLOW_HISTORY]: false,
		[LICENSE_FEATURES.DEBUG_IN_EDITOR]: false,
		[LICENSE_FEATURES.BINARY_DATA_S3]: false,
		[LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES]: false,
		[LICENSE_FEATURES.WORKER_VIEW]: false,
		[LICENSE_FEATURES.ADVANCED_PERMISSIONS]: false,
		[LICENSE_FEATURES.PROJECT_ROLE_ADMIN]: false,
		[LICENSE_FEATURES.PROJECT_ROLE_EDITOR]: false,
		[LICENSE_FEATURES.PROJECT_ROLE_VIEWER]: false,
		[LICENSE_FEATURES.AI_ASSISTANT]: false,
		[LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY]: false,
		[LICENSE_FEATURES.ASK_AI]: false,
		[LICENSE_FEATURES.AI_CREDITS]: false,
		[LICENSE_FEATURES.FOLDERS]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_SUMMARY]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_DASHBOARD]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_HOURLY_DATA]: false,
		[LICENSE_FEATURES.API_KEY_SCOPES]: false,
		[LICENSE_FEATURES.OIDC]: false,
		[LICENSE_FEATURES.MFA_ENFORCEMENT]: false,
		[LICENSE_FEATURES.WORKFLOW_DIFFS]: false,
	};

	private static readonly numericFeaturesDefaults: Record<NumericLicenseFeature, number> = {
		[LICENSE_QUOTAS.TRIGGER_LIMIT]: -1,
		[LICENSE_QUOTAS.VARIABLES_LIMIT]: -1,
		[LICENSE_QUOTAS.USERS_LIMIT]: -1,
		[LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT]: -1,
		[LICENSE_QUOTAS.TEAM_PROJECT_LIMIT]: 0,
		[LICENSE_QUOTAS.AI_CREDITS]: 0,
		[LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS]: 7,
		[LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS]: 30,
		[LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS]: 180,
		[LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT]: 1,
	};

	private numericFeatures: Record<NumericLicenseFeature, number> = {
		[LICENSE_QUOTAS.TRIGGER_LIMIT]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.TRIGGER_LIMIT],
		[LICENSE_QUOTAS.VARIABLES_LIMIT]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.VARIABLES_LIMIT],
		[LICENSE_QUOTAS.USERS_LIMIT]: E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.USERS_LIMIT],
		[LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT],
		[LICENSE_QUOTAS.TEAM_PROJECT_LIMIT]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.TEAM_PROJECT_LIMIT],
		[LICENSE_QUOTAS.AI_CREDITS]: E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.AI_CREDITS],

		[LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS],
		[LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS],
		[LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS],
		[LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT],
	};

	constructor(
		license: License,
		private readonly settingsRepo: SettingsRepository,
		private readonly workflowRunner: ActiveWorkflowManager,
		private readonly mfaService: MfaService,
		private readonly cacheService: CacheService,
		private readonly push: Push,
		private readonly passwordUtility: PasswordUtility,
		private readonly eventBus: MessageEventBus,
		private readonly userRepository: UserRepository,
		private readonly frontendService: FrontendService,
	) {
		license.isLicensed = (feature: BooleanLicenseFeature) => this.enabledFeatures[feature] ?? false;

		// Ugly hack to satisfy biome parser
		const getFeatureValue = <T extends keyof FeatureReturnType>(
			feature: T,
		): FeatureReturnType[T] => {
			if (feature in this.numericFeatures) {
				return this.numericFeatures[feature as NumericLicenseFeature] as FeatureReturnType[T];
			} else {
				return UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
			}
		};
		license.getValue = getFeatureValue;

		license.getPlanName = () => 'Enterprise';
	}

	@Post('/reset', { skipAuth: true })
	async reset(req: ResetRequest) {
		this.resetFeatures();
		await this.resetLogStreaming();
		await this.removeActiveWorkflows();
		await this.truncateAll();
		await this.resetCache();
		await this.setupUserManagement(req.body.owner, req.body.members, req.body.admin);
	}

	@Post('/push', { skipAuth: true })
	async pushSend(req: PushRequest) {
		const { pushRef: _, ...pushMsg } = req.body;
		this.push.broadcast(pushMsg);
	}

	@Patch('/feature', { skipAuth: true })
	setFeature(req: Request<{}, {}, { feature: BooleanLicenseFeature; enabled: boolean }>) {
		const { enabled, feature } = req.body;
		this.enabledFeatures[feature] = enabled;
	}

	@Patch('/quota', { skipAuth: true })
	setQuota(req: Request<{}, {}, { feature: NumericLicenseFeature; value: number }>) {
		const { value, feature } = req.body;
		this.numericFeatures[feature] = value;
	}

	@Patch('/queue-mode', { skipAuth: true })
	async setQueueMode(req: Request<{}, {}, { enabled: boolean }>) {
		const { enabled } = req.body;
		config.set('executions.mode', enabled ? 'queue' : 'regular');
		return { success: true, message: `Queue mode set to ${config.getEnv('executions.mode')}` };
	}

	@Get('/env-feature-flags', { skipAuth: true })
	async getEnvFeatureFlags() {
		const currentFlags = this.frontendService.getSettings().envFeatureFlags;
		return currentFlags;
	}

	@Patch('/env-feature-flags', { skipAuth: true })
	async setEnvFeatureFlags(req: Request<{}, {}, { flags: Record<string, string> }>) {
		const { flags } = req.body;

		// Validate that all flags start with N8N_ENV_FEAT_
		for (const key of Object.keys(flags)) {
			if (!key.startsWith('N8N_ENV_FEAT_')) {
				return {
					success: false,
					message: `Invalid flag key: ${key}. Must start with N8N_ENV_FEAT_`,
				};
			}
		}

		// Clear existing N8N_ENV_FEAT_ environment variables
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('N8N_ENV_FEAT_')) {
				delete process.env[key];
			}
		}

		// Set new environment variables
		for (const [key, value] of Object.entries(flags)) {
			process.env[key] = value;
		}

		// Return the current environment feature flags
		const currentFlags = this.frontendService.getSettings().envFeatureFlags;
		return {
			success: true,
			message: 'Environment feature flags updated',
			flags: currentFlags,
		};
	}

	private resetFeatures() {
		for (const feature of Object.keys(this.enabledFeatures)) {
			this.enabledFeatures[feature as BooleanLicenseFeature] = false;
		}

		for (const feature of Object.keys(this.numericFeatures)) {
			this.numericFeatures[feature as NumericLicenseFeature] =
				E2EController.numericFeaturesDefaults[feature as NumericLicenseFeature];
		}
	}

	private async removeActiveWorkflows() {
		this.workflowRunner.removeAllQueuedWorkflowActivations();
		await this.workflowRunner.removeAll();
	}

	private async resetLogStreaming() {
		for (const id in this.eventBus.destinations) {
			await this.eventBus.removeDestination(id, false);
			await this.eventBus.deleteDestination(id);
		}
	}

	private async truncateAll() {
		const { connection } = this.settingsRepo.manager;
		const dbType = connection.options.type;
		for (const table of tablesToTruncate) {
			try {
				if (dbType === 'postgres') {
					await connection.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
				} else {
					await connection.query(`DELETE FROM "${table}";`);
					if (dbType === 'sqlite') {
						await connection.query(`DELETE FROM sqlite_sequence WHERE name = '${table}';`);
					}
				}
			} catch (error) {
				Container.get(Logger).warn(`Dropping Table "${table}" for E2E Reset error`, {
					error: error as Error,
				});
			}
		}
	}

	private async setupUserManagement(
		owner: UserSetupPayload,
		members: UserSetupPayload[],
		admin: UserSetupPayload,
	) {
		const userCreatePromises = [
			this.userRepository.createUserWithProject({
				id: uuid(),
				...owner,
				password: await this.passwordUtility.hash(owner.password),
				role: 'global:owner',
			}),
		];

		userCreatePromises.push(
			this.userRepository.createUserWithProject({
				id: uuid(),
				...admin,
				password: await this.passwordUtility.hash(admin.password),
				role: 'global:admin',
			}),
		);

		for (const { password, ...payload } of members) {
			userCreatePromises.push(
				this.userRepository.createUserWithProject({
					id: uuid(),
					...payload,
					password: await this.passwordUtility.hash(password),
					role: 'global:member',
				}),
			);
		}

		const [newOwner] = await Promise.all(userCreatePromises);

		if (owner?.mfaSecret && owner.mfaRecoveryCodes?.length) {
			const { encryptedRecoveryCodes, encryptedSecret } =
				this.mfaService.encryptSecretAndRecoveryCodes(owner.mfaSecret, owner.mfaRecoveryCodes);

			await this.userRepository.update(newOwner.user.id, {
				mfaSecret: encryptedSecret,
				mfaRecoveryCodes: encryptedRecoveryCodes,
			});
		}

		await this.settingsRepo.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: 'true' },
		);

		config.set('userManagement.isInstanceOwnerSetUp', true);
	}

	private async resetCache() {
		await this.cacheService.reset();
	}
}
