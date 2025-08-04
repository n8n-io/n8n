'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
var E2EController_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.E2EController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const config_1 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const license_1 = require('@/license');
const mfa_service_1 = require('@/mfa/mfa.service');
const push_1 = require('@/push');
const cache_service_1 = require('@/services/cache/cache.service');
const frontend_service_1 = require('@/services/frontend.service');
const password_utility_1 = require('@/services/password.utility');
if (!constants_2.inE2ETests) {
	di_1.Container.get(backend_common_1.Logger).error('E2E endpoints only allowed during E2E tests');
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
let E2EController = (E2EController_1 = class E2EController {
	constructor(
		license,
		settingsRepo,
		workflowRunner,
		mfaService,
		cacheService,
		push,
		passwordUtility,
		eventBus,
		userRepository,
		frontendService,
	) {
		this.settingsRepo = settingsRepo;
		this.workflowRunner = workflowRunner;
		this.mfaService = mfaService;
		this.cacheService = cacheService;
		this.push = push;
		this.passwordUtility = passwordUtility;
		this.eventBus = eventBus;
		this.userRepository = userRepository;
		this.frontendService = frontendService;
		this.enabledFeatures = {
			[constants_1.LICENSE_FEATURES.SHARING]: false,
			[constants_1.LICENSE_FEATURES.LDAP]: false,
			[constants_1.LICENSE_FEATURES.SAML]: false,
			[constants_1.LICENSE_FEATURES.LOG_STREAMING]: false,
			[constants_1.LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS]: false,
			[constants_1.LICENSE_FEATURES.SOURCE_CONTROL]: false,
			[constants_1.LICENSE_FEATURES.VARIABLES]: false,
			[constants_1.LICENSE_FEATURES.API_DISABLED]: false,
			[constants_1.LICENSE_FEATURES.EXTERNAL_SECRETS]: false,
			[constants_1.LICENSE_FEATURES.SHOW_NON_PROD_BANNER]: false,
			[constants_1.LICENSE_FEATURES.WORKFLOW_HISTORY]: false,
			[constants_1.LICENSE_FEATURES.DEBUG_IN_EDITOR]: false,
			[constants_1.LICENSE_FEATURES.BINARY_DATA_S3]: false,
			[constants_1.LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES]: false,
			[constants_1.LICENSE_FEATURES.WORKER_VIEW]: false,
			[constants_1.LICENSE_FEATURES.ADVANCED_PERMISSIONS]: false,
			[constants_1.LICENSE_FEATURES.PROJECT_ROLE_ADMIN]: false,
			[constants_1.LICENSE_FEATURES.PROJECT_ROLE_EDITOR]: false,
			[constants_1.LICENSE_FEATURES.PROJECT_ROLE_VIEWER]: false,
			[constants_1.LICENSE_FEATURES.AI_ASSISTANT]: false,
			[constants_1.LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY]: false,
			[constants_1.LICENSE_FEATURES.ASK_AI]: false,
			[constants_1.LICENSE_FEATURES.AI_CREDITS]: false,
			[constants_1.LICENSE_FEATURES.FOLDERS]: false,
			[constants_1.LICENSE_FEATURES.INSIGHTS_VIEW_SUMMARY]: false,
			[constants_1.LICENSE_FEATURES.INSIGHTS_VIEW_DASHBOARD]: false,
			[constants_1.LICENSE_FEATURES.INSIGHTS_VIEW_HOURLY_DATA]: false,
			[constants_1.LICENSE_FEATURES.API_KEY_SCOPES]: false,
			[constants_1.LICENSE_FEATURES.OIDC]: false,
			[constants_1.LICENSE_FEATURES.MFA_ENFORCEMENT]: false,
		};
		this.numericFeatures = {
			[constants_1.LICENSE_QUOTAS.TRIGGER_LIMIT]:
				E2EController_1.numericFeaturesDefaults[constants_1.LICENSE_QUOTAS.TRIGGER_LIMIT],
			[constants_1.LICENSE_QUOTAS.VARIABLES_LIMIT]:
				E2EController_1.numericFeaturesDefaults[constants_1.LICENSE_QUOTAS.VARIABLES_LIMIT],
			[constants_1.LICENSE_QUOTAS.USERS_LIMIT]:
				E2EController_1.numericFeaturesDefaults[constants_1.LICENSE_QUOTAS.USERS_LIMIT],
			[constants_1.LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT]:
				E2EController_1.numericFeaturesDefaults[
					constants_1.LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT
				],
			[constants_1.LICENSE_QUOTAS.TEAM_PROJECT_LIMIT]:
				E2EController_1.numericFeaturesDefaults[constants_1.LICENSE_QUOTAS.TEAM_PROJECT_LIMIT],
			[constants_1.LICENSE_QUOTAS.AI_CREDITS]:
				E2EController_1.numericFeaturesDefaults[constants_1.LICENSE_QUOTAS.AI_CREDITS],
			[constants_1.LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS]:
				E2EController_1.numericFeaturesDefaults[
					constants_1.LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS
				],
			[constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS]:
				E2EController_1.numericFeaturesDefaults[
					constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS
				],
			[constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS]:
				E2EController_1.numericFeaturesDefaults[
					constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS
				],
			[constants_1.LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT]:
				E2EController_1.numericFeaturesDefaults[
					constants_1.LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT
				],
		};
		license.isLicensed = (feature) => this.enabledFeatures[feature] ?? false;
		const getFeatureValue = (feature) => {
			if (feature in this.numericFeatures) {
				return this.numericFeatures[feature];
			} else {
				return constants_1.UNLIMITED_LICENSE_QUOTA;
			}
		};
		license.getValue = getFeatureValue;
		license.getPlanName = () => 'Enterprise';
	}
	async reset(req) {
		this.resetFeatures();
		await this.resetLogStreaming();
		await this.removeActiveWorkflows();
		await this.truncateAll();
		await this.resetCache();
		await this.setupUserManagement(req.body.owner, req.body.members, req.body.admin);
	}
	async pushSend(req) {
		const { pushRef: _, ...pushMsg } = req.body;
		this.push.broadcast(pushMsg);
	}
	setFeature(req) {
		const { enabled, feature } = req.body;
		this.enabledFeatures[feature] = enabled;
	}
	setQuota(req) {
		const { value, feature } = req.body;
		this.numericFeatures[feature] = value;
	}
	async setQueueMode(req) {
		const { enabled } = req.body;
		config_1.default.set('executions.mode', enabled ? 'queue' : 'regular');
		return {
			success: true,
			message: `Queue mode set to ${config_1.default.getEnv('executions.mode')}`,
		};
	}
	async getEnvFeatureFlags() {
		const currentFlags = this.frontendService.getSettings().envFeatureFlags;
		return currentFlags;
	}
	async setEnvFeatureFlags(req) {
		const { flags } = req.body;
		for (const key of Object.keys(flags)) {
			if (!key.startsWith('N8N_ENV_FEAT_')) {
				return {
					success: false,
					message: `Invalid flag key: ${key}. Must start with N8N_ENV_FEAT_`,
				};
			}
		}
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('N8N_ENV_FEAT_')) {
				delete process.env[key];
			}
		}
		for (const [key, value] of Object.entries(flags)) {
			process.env[key] = value;
		}
		const currentFlags = this.frontendService.getSettings().envFeatureFlags;
		return {
			success: true,
			message: 'Environment feature flags updated',
			flags: currentFlags,
		};
	}
	resetFeatures() {
		for (const feature of Object.keys(this.enabledFeatures)) {
			this.enabledFeatures[feature] = false;
		}
		for (const feature of Object.keys(this.numericFeatures)) {
			this.numericFeatures[feature] = E2EController_1.numericFeaturesDefaults[feature];
		}
	}
	async removeActiveWorkflows() {
		this.workflowRunner.removeAllQueuedWorkflowActivations();
		await this.workflowRunner.removeAll();
	}
	async resetLogStreaming() {
		for (const id in this.eventBus.destinations) {
			await this.eventBus.removeDestination(id, false);
			await this.eventBus.deleteDestination(id);
		}
	}
	async truncateAll() {
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
				di_1.Container.get(backend_common_1.Logger).warn(
					`Dropping Table "${table}" for E2E Reset error`,
					{
						error: error,
					},
				);
			}
		}
	}
	async setupUserManagement(owner, members, admin) {
		const userCreatePromises = [
			this.userRepository.createUserWithProject({
				id: (0, uuid_1.v4)(),
				...owner,
				password: await this.passwordUtility.hash(owner.password),
				role: 'global:owner',
			}),
		];
		userCreatePromises.push(
			this.userRepository.createUserWithProject({
				id: (0, uuid_1.v4)(),
				...admin,
				password: await this.passwordUtility.hash(admin.password),
				role: 'global:admin',
			}),
		);
		for (const { password, ...payload } of members) {
			userCreatePromises.push(
				this.userRepository.createUserWithProject({
					id: (0, uuid_1.v4)(),
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
		config_1.default.set('userManagement.isInstanceOwnerSetUp', true);
	}
	async resetCache() {
		await this.cacheService.reset();
	}
});
exports.E2EController = E2EController;
E2EController.numericFeaturesDefaults = {
	[constants_1.LICENSE_QUOTAS.TRIGGER_LIMIT]: -1,
	[constants_1.LICENSE_QUOTAS.VARIABLES_LIMIT]: -1,
	[constants_1.LICENSE_QUOTAS.USERS_LIMIT]: -1,
	[constants_1.LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT]: -1,
	[constants_1.LICENSE_QUOTAS.TEAM_PROJECT_LIMIT]: 0,
	[constants_1.LICENSE_QUOTAS.AI_CREDITS]: 0,
	[constants_1.LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS]: 7,
	[constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS]: 30,
	[constants_1.LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS]: 180,
	[constants_1.LICENSE_QUOTAS.WORKFLOWS_WITH_EVALUATION_LIMIT]: 1,
};
__decorate(
	[
		(0, decorators_1.Post)('/reset', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	E2EController.prototype,
	'reset',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/push', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	E2EController.prototype,
	'pushSend',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/feature', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	E2EController.prototype,
	'setFeature',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/quota', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	E2EController.prototype,
	'setQuota',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/queue-mode', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	E2EController.prototype,
	'setQueueMode',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/env-feature-flags', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	E2EController.prototype,
	'getEnvFeatureFlags',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/env-feature-flags', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	E2EController.prototype,
	'setEnvFeatureFlags',
	null,
);
exports.E2EController =
	E2EController =
	E2EController_1 =
		__decorate(
			[
				(0, decorators_1.RestController)('/e2e'),
				__metadata('design:paramtypes', [
					license_1.License,
					db_1.SettingsRepository,
					active_workflow_manager_1.ActiveWorkflowManager,
					mfa_service_1.MfaService,
					cache_service_1.CacheService,
					push_1.Push,
					password_utility_1.PasswordUtility,
					message_event_bus_1.MessageEventBus,
					db_1.UserRepository,
					frontend_service_1.FrontendService,
				]),
			],
			E2EController,
		);
//# sourceMappingURL=e2e.controller.js.map
