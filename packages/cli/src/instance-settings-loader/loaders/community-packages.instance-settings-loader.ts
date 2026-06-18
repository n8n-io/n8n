import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import { z } from 'zod';

import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import {
	CommunityPackagesService,
	isValidVersionSpecifier,
} from '@/modules/community-packages/community-packages.service';
import { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';

const envPackageSchema = z
	.object({
		name: z.string().min(1),
		version: z.string().min(1).optional(),
		checksum: z.string().min(1).optional(),
	})
	.strict();

const envPackagesSchema = z.array(envPackageSchema);

type EnvPackage = z.infer<typeof envPackageSchema>;

type ResolvedPackage = {
	name: string;
	version: string | undefined;
	checksum: string | undefined;
};

@Service()
export class CommunityPackagesInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly communityPackagesConfig: CommunityPackagesConfig,
		private readonly communityPackagesService: CommunityPackagesService,
		private readonly communityNodeTypesService: CommunityNodeTypesService,
		private readonly workflowRepository: WorkflowRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.communityPackagesManagedByEnv) {
			this.logger.debug(
				'communityPackagesManagedByEnv is disabled — skipping community packages env config',
			);
			return 'skipped';
		}

		if (!this.communityPackagesConfig.enabled) {
			this.logger.warn(
				'N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV is enabled but community packages are disabled (N8N_COMMUNITY_PACKAGES_ENABLED=false) — skipping',
			);
			return 'skipped';
		}

		this.logger.info(
			'communityPackagesManagedByEnv is enabled — reconciling installed community packages from env vars',
		);

		let items: EnvPackage[];
		try {
			items = this.parseAndValidate(this.config.communityPackages);
		} catch (error) {
			const message = (error as Error).message ?? 'Unknown error';
			this.logger.error(message);
			throw new InstanceBootstrappingError(message);
		}

		// Resolve version + checksum up-front so a missing-checksum-in-locked-down-mode
		// failure aborts the boot before any partial reconciliation runs.
		const resolved: ResolvedPackage[] = [];
		for (const item of items) {
			resolved.push(await this.resolveVersionAndChecksum(item));
		}

		const installed = await this.communityPackagesService.getAllInstalledPackages();
		const { toInstall, toUpdate, toRemove } = this.buildReconciliationPlan(resolved, installed);

		let changed = false;

		for (const item of toInstall) {
			try {
				await this.communityPackagesService.installPackage(item.name, item.version, item.checksum);
				this.logger.info(`Installed community package ${formatRef(item)} from env`);
				changed = true;
			} catch (error) {
				this.logger.error(
					`Failed to install community package ${formatRef(item)} from env: ${ensureError(error).message}`,
				);
			}
		}

		for (const { env, installed: existing } of toUpdate) {
			try {
				await this.communityPackagesService.updatePackage(
					env.name,
					existing,
					env.version,
					env.checksum,
				);
				this.logger.info(
					`Updated community package '${env.name}' from ${existing.installedVersion} to ${env.version} from env`,
				);
				changed = true;
			} catch (error) {
				this.logger.error(
					`Failed to update community package '${env.name}' to ${env.version} from env: ${ensureError(error).message}`,
				);
			}
		}

		for (const pkg of toRemove) {
			const { packageName } = pkg;
			const dependentNodeCount = pkg.installedNodes?.length ?? 0;
			const affectedWorkflows = await this.findWorkflowsReferencingPackage(pkg);
			try {
				await this.communityPackagesService.removePackage(packageName, pkg);
				this.logger.warn(
					`Removed community package '${packageName}' (had ${dependentNodeCount} registered node type(s)) — not declared in N8N_COMMUNITY_PACKAGES`,
					{
						packageName,
						installedVersion: pkg.installedVersion,
						workflowIds: affectedWorkflows.map((w) => w.id),
						activeWorkflowIds: affectedWorkflows.filter((w) => w.active).map((w) => w.id),
					},
				);
				changed = true;
			} catch (error) {
				this.logger.error(
					`Failed to remove community package '${packageName}' that is not declared in env: ${ensureError(error).message}`,
				);
			}
		}

		return changed ? 'created' : 'skipped';
	}

	private async findWorkflowsReferencingPackage(
		pkg: InstalledPackages,
	): Promise<Array<{ id: string; active: boolean }>> {
		const nodeTypes = pkg.installedNodes?.map((node) => node.type) ?? [];
		if (nodeTypes.length === 0) return [];

		try {
			return await this.workflowRepository.findWorkflowsWithNodeType(nodeTypes);
		} catch (error) {
			this.logger.warn(
				`Failed to check workflows referencing community package '${pkg.packageName}' before removal`,
				{ packageName: pkg.packageName, error: ensureError(error) },
			);
			return [];
		}
	}

	private buildReconciliationPlan(resolved: ResolvedPackage[], installed: InstalledPackages[]) {
		const installedByName = new Map(installed.map((p) => [p.packageName, p]));
		const desiredNames = new Set(resolved.map((i) => i.name));

		const toInstall: ResolvedPackage[] = [];
		const toUpdate: Array<{ env: ResolvedPackage; installed: InstalledPackages }> = [];
		const toRemove: InstalledPackages[] = [];

		for (const item of resolved) {
			const existing = installedByName.get(item.name);
			if (!existing) {
				toInstall.push(item);
			} else if (item.version !== undefined && existing.installedVersion !== item.version) {
				toUpdate.push({ env: item, installed: existing });
			}
		}

		for (const pkg of installed) {
			if (!desiredNames.has(pkg.packageName)) {
				toRemove.push(pkg);
			}
		}

		return { toInstall, toUpdate, toRemove };
	}

	private async resolveVersionAndChecksum(item: EnvPackage): Promise<ResolvedPackage> {
		if (item.checksum) {
			return { name: item.name, version: item.version, checksum: item.checksum };
		}

		let vetted: Awaited<ReturnType<CommunityNodeTypesService['findVetted']>>;
		try {
			vetted = await this.communityNodeTypesService.findVetted(item.name);
		} catch (error) {
			this.logger.warn(
				`Failed to look up vetted checksum for community package '${item.name}': ${ensureError(error).message}`,
			);
		}

		let resolvedVersion = item.version;
		let checksum: string | undefined;

		if (vetted) {
			if (item.version === undefined) {
				resolvedVersion = vetted.npmVersion;
				checksum = vetted.checksum;
			} else if (vetted.npmVersion === item.version) {
				checksum = vetted.checksum;
			} else {
				checksum = vetted.nodeVersions?.find((v) => v.npmVersion === item.version)?.checksum;
			}
		}

		if (!checksum && !this.communityPackagesConfig.unverifiedEnabled) {
			const ref = resolvedVersion ? `'${item.name}@${resolvedVersion}'` : `'${item.name}'`;
			throw new InstanceBootstrappingError(
				`N8N_COMMUNITY_PACKAGES: no checksum available for ${ref} and unverified packages are disabled`,
			);
		}

		if (resolvedVersion === undefined) {
			this.logger.warn(
				`Community package '${item.name}' has no pinned version and no vetted entry — installed version will not be reconciled across restarts`,
			);
		}

		return { name: item.name, version: resolvedVersion, checksum };
	}

	private parseAndValidate(raw: string): EnvPackage[] {
		const trimmed = (raw ?? '').trim();
		if (trimmed.length === 0) return [];

		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch (error) {
			throw new Error(`N8N_COMMUNITY_PACKAGES is not valid JSON: ${(error as Error).message}`);
		}

		const result = envPackagesSchema.safeParse(parsed);
		if (!result.success) {
			const issue = result.error.issues[0];
			const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
			throw new Error(`N8N_COMMUNITY_PACKAGES validation failed at "${path}": ${issue.message}`);
		}

		const items = result.data;
		const seenNames = new Set<string>();

		const normalized: EnvPackage[] = items.map((item, index) => {
			let parsed;
			try {
				parsed = this.communityPackagesService.parseNpmPackageName(item.name);
			} catch (error) {
				throw new Error(
					`N8N_COMMUNITY_PACKAGES has an invalid package name "${item.name}" at index ${index}: ${(error as Error).message}`,
				);
			}

			if (
				parsed.version !== undefined &&
				item.version !== undefined &&
				parsed.version !== item.version
			) {
				throw new Error(
					`N8N_COMMUNITY_PACKAGES has conflicting versions for "${parsed.packageName}" at index ${index}: "${parsed.version}" in name vs "${item.version}" in version field`,
				);
			}

			const name = parsed.packageName;
			const version = item.version ?? parsed.version;

			if (version !== undefined && !isValidVersionSpecifier(version)) {
				throw new Error(
					`N8N_COMMUNITY_PACKAGES has an invalid version "${version}" for package "${name}" at index ${index}`,
				);
			}

			if (seenNames.has(name)) {
				throw new Error(
					`N8N_COMMUNITY_PACKAGES has duplicate package name "${name}" at index ${index}`,
				);
			}
			seenNames.add(name);

			if (item.checksum !== undefined && version === undefined) {
				throw new Error(
					`N8N_COMMUNITY_PACKAGES has a checksum but no version for package "${name}" at index ${index}: checksum requires a version`,
				);
			}

			return { name, version, checksum: item.checksum };
		});

		return normalized;
	}
}

const formatRef = (item: ResolvedPackage): string =>
	item.version ? `'${item.name}@${item.version}'` : `'${item.name}'`;
