import type { CommunityNodeType } from '@n8n/api-types';
import { inProduction, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import cloneDeep from 'lodash/cloneDeep';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isToolType, NodeConnectionTypes } from 'n8n-workflow';

import { buildStrapiUpdateQuery } from '@/utils/strapi-utils';

import {
	getCommunityNodeTypes,
	getCommunityNodesMetadata,
	StrapiCommunityNodeType,
	type CommunityNodesMetadata,
} from './community-node-types-utils';
import { CommunityPackagesConfig } from './community-packages.config';
import { CommunityPackagesService } from './community-packages.service';

const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;
const RETRY_INTERVAL = 5 * 60 * 1000;

// Strapi's qs parser has an arrayLimit of 100, so we batch IDs
const STRAPI_ARRAY_LIMIT = 100;

@Service()
export class CommunityNodeTypesService {
	private communityNodeTypes: Map<string, StrapiCommunityNodeType> = new Map();

	private lastUpdateTimestamp = 0;

	constructor(
		private readonly logger: Logger,
		private config: CommunityPackagesConfig,
		private communityPackagesService: CommunityPackagesService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** Same rule the node loader applies, so the editor never offers a type that would not load. */
	private isLoadable(nodeTypeName: string) {
		const { exclude, include } = this.globalConfig.nodes;
		if (exclude.includes(nodeTypeName)) return false;
		return include.length === 0 || include.includes(nodeTypeName);
	}

	private async detectUpdates(
		environment: 'staging' | 'production',
	): Promise<{ typesToUpdate?: number[]; scheduleRetry?: boolean }> {
		let communityNodesMetadata: CommunityNodesMetadata[] = [];
		try {
			communityNodesMetadata = await getCommunityNodesMetadata(
				environment,
				this.config.aiNodeSdkVersion,
				this.config.nodesApiVersion,
			);
		} catch (error) {
			this.logger.error('Failed to fetch community nodes metadata', {
				error: ensureError(error),
			});
			return { scheduleRetry: true };
		}

		const typesToUpdate: number[] = [];
		const metadataNames = new Set(communityNodesMetadata.map((entry) => entry.name));

		// Detect updates and new entries
		for (const entry of communityNodesMetadata) {
			const nodeType = this.communityNodeTypes.get(entry.name);

			if (
				!nodeType ||
				nodeType.npmVersion !== entry.npmVersion ||
				nodeType.updatedAt !== entry.updatedAt
			) {
				this.logger.debug(
					`Detected update for community node type: name - ${entry.name}; npmVersion - ${entry.npmVersion}; updatedAt - ${entry.updatedAt};`,
				);
				typesToUpdate.push(entry.id);
			}
		}

		// Detect and remove deleted entries
		for (const [name, nodeType] of this.communityNodeTypes.entries()) {
			if (!metadataNames.has(name)) {
				this.logger.debug(
					`Detected removal of community node type: name - ${name}; id - ${nodeType.id};`,
				);
				this.communityNodeTypes.delete(name);
			}
		}

		return { typesToUpdate };
	}

	private async fetchNodeTypes() {
		try {
			// Cloud sets ENVIRONMENT to 'production' or 'staging' depending on the environment
			const environment = this.detectEnvironment();

			let data: StrapiCommunityNodeType[] = [];
			if (this.config.enabled && this.config.verifiedEnabled) {
				if (this.communityNodeTypes.size === 0) {
					data = await getCommunityNodeTypes(
						environment,
						{},
						this.config.aiNodeSdkVersion,
						this.config.nodesApiVersion,
					);
					this.updateCommunityNodeTypes(data);
					return;
				}
				const { typesToUpdate, scheduleRetry } = await this.detectUpdates(environment);

				if (scheduleRetry) {
					this.setTimestampForRetry();
					return;
				}

				if (!typesToUpdate?.length) {
					this.lastUpdateTimestamp = Date.now();
					return;
				}

				for (let i = 0; i < typesToUpdate.length; i += STRAPI_ARRAY_LIMIT) {
					const batch = typesToUpdate.slice(i, i + STRAPI_ARRAY_LIMIT);
					const qs = buildStrapiUpdateQuery(batch);
					const batchData = await getCommunityNodeTypes(
						environment,
						qs,
						this.config.aiNodeSdkVersion,
						this.config.nodesApiVersion,
					);
					data.push(...batchData);
				}
			}

			this.updateCommunityNodeTypes(data);
		} catch (error) {
			this.logger.error('Failed to fetch community node types', { error: ensureError(error) });
		}
	}

	private detectEnvironment() {
		const environment = process.env.ENVIRONMENT;
		if (environment === 'staging') return 'staging';
		if (inProduction) return 'production';
		if (environment === 'production') return 'production';
		return 'staging';
	}

	private updateCommunityNodeTypes(nodeTypes: StrapiCommunityNodeType[]) {
		if (!nodeTypes?.length) {
			// When we get empty data, don't wait the full UPDATE_INTERVAL to try again.
			// Instead, set the timestamp to retry after RETRY_INTERVAL with some
			// random jitter to avoid all instances retrying at once
			this.setTimestampForRetry();
			return;
		}

		this.setCommunityNodeTypes(nodeTypes);

		this.createAiTools();

		this.lastUpdateTimestamp = Date.now();
	}

	private createAiTools() {
		const usableAsTools = Array.from(this.communityNodeTypes.values()).filter(
			(nodeType) =>
				nodeType.nodeDescription.usableAsTool &&
				!isToolType(nodeType.name) &&
				!nodeType.nodeDescription.group?.includes('trigger'),
		);
		const forbiddenCategories = ['Recommended Tools'];
		for (const nodeType of usableAsTools) {
			const clonedNodeType = cloneDeep(nodeType);
			const toolSubcategories = clonedNodeType.nodeDescription.codex?.subcategories?.Tools ?? [
				'Other Tools',
			];
			// don't allow community nodes to appear in Recommended Tools category
			const filteredToolSubcategories = toolSubcategories.filter(
				(subcategory) => !forbiddenCategories.includes(subcategory),
			);
			// this parameter is valid npm package name
			clonedNodeType.name += 'Tool';
			// this parameter has -preview suffix
			clonedNodeType.nodeDescription.name += 'Tool';
			clonedNodeType.nodeDescription.inputs = [];
			clonedNodeType.nodeDescription.outputs = [NodeConnectionTypes.AiTool];
			clonedNodeType.nodeDescription.displayName += ' Tool';
			clonedNodeType.nodeDescription.codex = {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: filteredToolSubcategories,
				},
				resources: clonedNodeType.nodeDescription.codex?.resources ?? {},
			};

			this.communityNodeTypes.set(clonedNodeType.name, clonedNodeType);
		}
	}

	private setCommunityNodeTypes(nodeTypes: StrapiCommunityNodeType[]) {
		for (const nodeType of nodeTypes) {
			this.communityNodeTypes.set(nodeType.name, nodeType);
		}
	}

	private updateRequired() {
		if (!this.lastUpdateTimestamp) return true;
		return Date.now() - this.lastUpdateTimestamp > UPDATE_INTERVAL;
	}

	private setTimestampForRetry() {
		const jitter = Math.floor(Math.random() * 4 * 60 * 1000) - 2 * 60 * 1000;
		this.lastUpdateTimestamp = Date.now() - (UPDATE_INTERVAL - RETRY_INTERVAL + jitter);
	}

	private async createIsInstalled() {
		const installedPackages = (await this.communityPackagesService.getAllInstalledPackages()) ?? [];
		const installedPackageNames = new Set(installedPackages.map((p) => p.packageName));

		// Matched on the entry's own package name, not derived by splitting the
		// node type on its first dot: npm allows dots in package names, so the
		// split mis-parses a package like `n8n-nodes-chatwoot.io` and reports an
		// installed package as missing.
		return (nodeType: Pick<StrapiCommunityNodeType, 'packageName'>) =>
			installedPackageNames.has(nodeType.packageName);
	}

	async getCommunityNodeTypes(): Promise<CommunityNodeType[]> {
		if (this.updateRequired()) {
			await this.fetchNodeTypes();
		}

		const isInstalled = await this.createIsInstalled();

		return Array.from(this.communityNodeTypes.values())
			.filter((nodeType) => this.isLoadable(nodeType.name))
			.map((nodeType) => ({
				...nodeType,
				isInstalled: isInstalled(nodeType),
			}));
	}

	async getCommunityNodeType(type: string): Promise<CommunityNodeType | null> {
		const nodeType = this.communityNodeTypes.get(type);
		const isInstalled = await this.createIsInstalled();
		if (!nodeType) return null;
		return { ...nodeType, isInstalled: isInstalled(nodeType) };
	}

	/**
	 * Exact vetted entry for one node type, refreshing a stale catalog first.
	 *
	 * `getCommunityNodeType` reads the map as-is and reports nothing on a cold
	 * one, so callers that must distinguish "not vetted" from "not fetched yet"
	 * need the refresh. Carries `packageName`, so callers never have to derive it
	 * from the node type.
	 */
	async findVettedNodeType(nodeType: string) {
		if (this.updateRequired()) {
			await this.fetchNodeTypes();
		}
		return await this.getCommunityNodeType(nodeType);
	}

	async findVetted(packageName: string) {
		if (this.updateRequired()) {
			await this.fetchNodeTypes();
		}
		const vettedTypes = Array.from(this.communityNodeTypes.values());
		return vettedTypes.find((nodeType) => nodeType.packageName === packageName);
	}
}
