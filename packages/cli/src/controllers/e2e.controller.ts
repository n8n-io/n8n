import type { PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import type { BooleanLicenseFeature, NumericLicenseFeature } from '@n8n/constants';
import { LICENSE_FEATURES, LICENSE_QUOTAS, UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import {
	AuthRolesService,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_CHAT_USER_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	SettingsRepository,
	UserRepository,
} from '@n8n/db';
import { Get, Patch, Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Request } from 'express';
import type nodeFs from 'node:fs';
import type nodePath from 'node:path';
import type nodeV8 from 'node:v8';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { inE2ETests } from '@/constants';
import type { FeatureReturnType } from '@/license';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';
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
	'role',
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
		chat: UserSetupPayload;
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
		[LICENSE_FEATURES.DYNAMIC_CREDENTIALS]: false,
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
		[LICENSE_FEATURES.AI_GATEWAY]: false,
		[LICENSE_FEATURES.FOLDERS]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_SUMMARY]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_DASHBOARD]: false,
		[LICENSE_FEATURES.INSIGHTS_VIEW_HOURLY_DATA]: false,
		[LICENSE_FEATURES.API_KEY_SCOPES]: false,
		[LICENSE_FEATURES.OIDC]: false,
		[LICENSE_FEATURES.MFA_ENFORCEMENT]: false,
		[LICENSE_FEATURES.WORKFLOW_DIFFS]: false,
		[LICENSE_FEATURES.NAMED_VERSIONS]: false,
		[LICENSE_FEATURES.CUSTOM_ROLES]: false,
		[LICENSE_FEATURES.AI_BUILDER]: false,
		[LICENSE_FEATURES.PERSONAL_SPACE_POLICY]: false,
		[LICENSE_FEATURES.TOKEN_EXCHANGE]: false,
		[LICENSE_FEATURES.DATA_REDACTION]: false,
	};

	private static readonly numericFeaturesDefaults: Record<NumericLicenseFeature, number> = {
		[LICENSE_QUOTAS.TRIGGER_LIMIT]: -1,
		[LICENSE_QUOTAS.VARIABLES_LIMIT]: -1,
		[LICENSE_QUOTAS.USERS_LIMIT]: -1,
		[LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT]: -1,
		[LICENSE_QUOTAS.TEAM_PROJECT_LIMIT]: 0,
		[LICENSE_QUOTAS.AI_CREDITS]: 0,
		[LICENSE_QUOTAS.AI_GATEWAY_BUDGET]: 0,
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
		[LICENSE_QUOTAS.AI_GATEWAY_BUDGET]:
			E2EController.numericFeaturesDefaults[LICENSE_QUOTAS.AI_GATEWAY_BUDGET],

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
		private readonly userRepository: UserRepository,
		private readonly frontendService: FrontendService,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly logStreamingDestinationsService: LogStreamingDestinationService,
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
		await this.reseedRolesAndScopes();
		await this.resetCache();
		await this.setupUserManagement(req.body.owner, req.body.members, req.body.admin, req.body.chat);
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
		this.executionsConfig.mode = req.body.enabled ? 'queue' : 'regular';
		return { success: true, message: `Queue mode set to ${this.executionsConfig.mode}` };
	}

	@Get('/env-feature-flags', { skipAuth: true })
	async getEnvFeatureFlags() {
		return (await this.frontendService.getSettings()).envFeatureFlags;
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
		const currentFlags = (await this.frontendService.getSettings()).envFeatureFlags;
		return {
			success: true,
			message: 'Environment feature flags updated',
			flags: currentFlags,
		};
	}

	/**
	 * Trigger garbage collection for memory profiling in performance tests.
	 * Requires Node.js to be started with --expose-gc flag.
	 */
	@Post('/gc', { skipAuth: true })
	triggerGarbageCollection() {
		if (typeof global.gc === 'function') {
			// Call GC twice to allow for more reclaimation
			global.gc();
			global.gc();
			return { success: true, message: 'Garbage collection triggered' };
		}
		return {
			success: false,
			message: 'Garbage collection not available. Ensure Node.js is started with --expose-gc flag.',
		};
	}

	/**
	 * Write a V8 heap snapshot for memory leak analysis.
	 * Triggers GC first for a cleaner snapshot.
	 * Returns the file path inside the container — retrieve via `docker cp` or keepalive mode.
	 */
	@Post('/heap-snapshot', { skipAuth: true })
	takeHeapSnapshot() {
		const v8 = require('node:v8') as typeof nodeV8;
		const fs = require('node:fs') as typeof nodeFs;

		if (typeof global.gc === 'function') {
			global.gc();
			global.gc();
		}

		const filePath = v8.writeHeapSnapshot();
		if (!filePath) {
			return { success: false, message: 'Failed to write heap snapshot' };
		}

		const path = require('node:path') as typeof nodePath;
		const stats = fs.statSync(filePath);
		const filename = path.basename(filePath);
		this.heapSnapshotPaths.set(filename, filePath);

		return {
			success: true,
			filePath: filename,
			sizeBytes: stats.size,
			sizeMB: Math.round(stats.size / 1024 / 1024),
		};
	}

	private heapSnapshotPaths = new Map<string, string>();

	/**
	 * Download a heap snapshot file as a stream.
	 * The response-helper pipes Readable streams directly to the response.
	 */
	@Get('/heap-snapshot/:filename', { skipAuth: true })
	downloadHeapSnapshot(req: Request) {
		const fs = require('node:fs') as typeof nodeFs;
		const path = require('node:path') as typeof nodePath;

		const filename = path.basename(req.params.filename);
		if (!filename.endsWith('.heapsnapshot')) {
			throw new Error('Invalid file type');
		}

		// Look up the full path stored during POST, or try cwd
		const filePath = this.heapSnapshotPaths.get(filename) ?? path.resolve(filename);
		if (!fs.existsSync(filePath)) {
			throw new Error(`Snapshot not found: ${filename} (tried ${filePath})`);
		}

		return fs.createReadStream(filePath);
	}

	/**
	 * Return a parsed breakdown of process RSS from /proc/self/smaps.
	 * Groups memory mappings by pathname and returns both a rollup summary
	 * and per-mapping detail sorted by RSS. Linux-only (containers).
	 */
	@Get('/memory-maps', { skipAuth: true })
	getMemoryMaps() {
		const fs = require('node:fs') as typeof nodeFs;

		const memUsage = process.memoryUsage();
		const result: {
			processMemoryUsage: {
				rss: number;
				heapTotal: number;
				heapUsed: number;
				external: number;
				arrayBuffers: number;
			};
			rollup: Record<string, number> | null;
			mappings: Array<{ name: string; rssMB: number; pssMB: number; count: number }> | null;
			raw: string | null;
		} = {
			processMemoryUsage: {
				rss: Math.round(memUsage.rss / 1024 / 1024),
				heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
				heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
				external: Math.round(memUsage.external / 1024 / 1024),
				arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024),
			},
			rollup: null,
			mappings: null,
			raw: null,
		};

		// Parse /proc/self/smaps_rollup (summary)
		try {
			const rollupText = fs.readFileSync('/proc/self/smaps_rollup', 'utf-8');
			const rollup: Record<string, number> = {};
			for (const line of rollupText.split('\n')) {
				const match = line.match(/^(\w+):\s+(\d+)\s+kB$/);
				if (match) {
					rollup[`${match[1]}MB`] = Math.round(Number(match[2]) / 1024);
				}
			}
			result.rollup = rollup;
		} catch {
			// Not available (macOS, permissions)
		}

		// Parse /proc/self/smaps (detailed per-mapping)
		try {
			const smapsText = fs.readFileSync('/proc/self/smaps', 'utf-8');
			result.raw = smapsText;

			const grouped = new Map<string, { rssKB: number; pssKB: number; count: number }>();
			let currentName = '[unknown]';

			for (const line of smapsText.split('\n')) {
				// Mapping header: address range + pathname
				const headerMatch = line.match(/^[0-9a-f]+-[0-9a-f]+\s+\S+\s+\S+\s+\S+\s+\S+\s*(.*)/);
				if (headerMatch) {
					const path = headerMatch[1].trim();
					currentName = path || '[anon]';
					if (!grouped.has(currentName)) {
						grouped.set(currentName, { rssKB: 0, pssKB: 0, count: 0 });
					}
					const entry = grouped.get(currentName)!;
					entry.count++;
					continue;
				}

				const rssMatch = line.match(/^Rss:\s+(\d+)\s+kB$/);
				if (rssMatch) {
					const entry = grouped.get(currentName);
					if (entry) entry.rssKB += Number(rssMatch[1]);
					continue;
				}

				const pssMatch = line.match(/^Pss:\s+(\d+)\s+kB$/);
				if (pssMatch) {
					const entry = grouped.get(currentName);
					if (entry) entry.pssKB += Number(pssMatch[1]);
				}
			}

			result.mappings = [...grouped.entries()]
				.map(([name, { rssKB, pssKB, count }]) => ({
					name,
					rssMB: Math.round((rssKB / 1024) * 10) / 10,
					pssMB: Math.round((pssKB / 1024) * 10) / 10,
					count,
				}))
				.filter((m) => m.rssMB > 0)
				.sort((a, b) => b.rssMB - a.rssMB);
		} catch {
			// Not available (macOS, permissions)
		}

		return result;
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
		const destinations = await this.logStreamingDestinationsService.findDestination();
		for (const destination of destinations) {
			if (destination.id) {
				await this.logStreamingDestinationsService.removeDestination(destination.id, false);
			}
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

	private async reseedRolesAndScopes() {
		// Re-initialize scopes and roles after truncation so that foreign keys
		// from users and project relations can be created safely, especially
		// on databases that strictly enforce foreign keys like Postgres.
		await Container.get(AuthRolesService).init();
	}

	private async setupUserManagement(
		owner: UserSetupPayload,
		members: UserSetupPayload[],
		admin: UserSetupPayload,
		chat: UserSetupPayload,
	) {
		const userCreatePromises = [
			this.userRepository.createUserWithProject({
				id: uuid(),
				...owner,
				password: await this.passwordUtility.hash(owner.password),
				role: {
					slug: GLOBAL_OWNER_ROLE.slug,
				},
			}),
		];

		userCreatePromises.push(
			this.userRepository.createUserWithProject({
				id: uuid(),
				...admin,
				password: await this.passwordUtility.hash(admin.password),
				role: {
					slug: GLOBAL_ADMIN_ROLE.slug,
				},
			}),
		);

		for (const { password, ...payload } of members) {
			userCreatePromises.push(
				this.userRepository.createUserWithProject({
					id: uuid(),
					...payload,
					password: await this.passwordUtility.hash(password),
					role: {
						slug: GLOBAL_MEMBER_ROLE.slug,
					},
				}),
			);
		}

		userCreatePromises.push(
			this.userRepository.createUserWithProject({
				id: uuid(),
				...chat,
				password: await this.passwordUtility.hash(chat.password),
				role: {
					slug: GLOBAL_CHAT_USER_ROLE.slug,
				},
			}),
		);

		const [newOwner] = await Promise.all(userCreatePromises);

		if (owner?.mfaSecret && owner.mfaRecoveryCodes?.length) {
			const { encryptedRecoveryCodes, encryptedSecret } =
				this.mfaService.encryptSecretAndRecoveryCodes(owner.mfaSecret, owner.mfaRecoveryCodes);

			await this.userRepository.update(newOwner.user.id, {
				mfaSecret: encryptedSecret,
				mfaRecoveryCodes: encryptedRecoveryCodes,
			});
		}
	}

	private async resetCache() {
		await this.cacheService.reset();
	}
}
