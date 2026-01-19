import type { CommunityNodeType } from '@n8n/api-types';
import { Logger, inProduction, inTest } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import { readFileSync } from 'fs';
import { writeFile, rename } from 'fs/promises';
import { join } from 'path';

import {
	getCommunityNodeTypes,
	getCommunityNodesMetadata,
	StrapiCommunityNodeType,
} from './community-node-types-utils';
import { CommunityPackagesConfig } from './community-packages.config';
import { CommunityPackagesService } from './community-packages.service';
import { buildStrapiUpdateQuery } from './strapi-utils';

const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;
const RETRY_INTERVAL = 5 * 60 * 1000;

@Service()
export class CommunityNodeTypesService {
	private communityNodeTypes: Map<string, StrapiCommunityNodeType> = new Map();

	private lastUpdateTimestamp = 0;

	constructor(
		private readonly logger: Logger,
		private config: CommunityPackagesConfig,
		private communityPackagesService: CommunityPackagesService,
	) {}

	async init() {
		if (this.communityNodeTypes.size > 0) return;
		this.logger.debug('Initializing community node types...');

		const environment = this.detectEnvironment();
		this.hydrateNodeTypes(environment);
	}

	private async detectUpdates(environment: 'staging' | 'production'): Promise<number[]> {
		const communityNodesMetadata = await getCommunityNodesMetadata(environment);

		const typesToUpdate: number[] = [];

		for (const entry of communityNodesMetadata) {
			const nodeType = this.communityNodeTypes.get(entry.name);

			if (
				!nodeType ||
				nodeType.npmVersion !== entry.npmVersion ||
				nodeType.updatedAt !== entry.updatedAt
			) {
				this.logger.info(
					`Detected update for community node type: name - ${entry.name}; npmVersion - ${entry.npmVersion}; updatedAt - ${entry.updatedAt};`,
				);
				typesToUpdate.push(entry.id);
			}
		}

		return typesToUpdate;
	}

	private hydrateNodeTypes(environment: 'staging' | 'production' = 'production') {
		const filePath = join(__dirname, 'data', `${environment}-node-types.json`);
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const nodeTypes: StrapiCommunityNodeType[] = JSON.parse(fileContent);
			this.setCommunityNodeTypes(nodeTypes);
		} catch (error) {
			this.logger.error(
				`Failed to hydrate community node types from ${environment} file: ${ensureError(error).message}`,
			);
		}
	}

	private async fetchNodeTypes() {
		try {
			// Cloud sets ENVIRONMENT to 'production' or 'staging' depending on the environment
			const environment = this.detectEnvironment();

			if (this.communityNodeTypes.size === 0) {
				this.hydrateNodeTypes(environment);
			}

			let data: StrapiCommunityNodeType[] = [];
			if (this.config.enabled && this.config.verifiedEnabled) {
				const typesToUpdate = await this.detectUpdates(environment);

				if (!typesToUpdate.length) {
					this.updateCommunityNodeTypes(data);
					return;
				}

				const qs = buildStrapiUpdateQuery(typesToUpdate);
				data = await getCommunityNodeTypes(environment, qs);
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

		this.lastUpdateTimestamp = Date.now();
	}

	private setCommunityNodeTypes(nodeTypes: StrapiCommunityNodeType[]) {
		for (const nodeType of nodeTypes) {
			this.communityNodeTypes.set(nodeType.name, nodeType);
		}

		if (!inTest) {
			this.persistNodeTypesToFile(nodeTypes).catch((error) => {
				this.logger.error('Failed to persist community node types to file', {
					error: ensureError(error),
				});
			});
		}
	}

	private async persistNodeTypesToFile(nodeTypes: StrapiCommunityNodeType[]) {
		if (nodeTypes.length === 0) return;

		const environment = this.detectEnvironment();
		const filePath = join(__dirname, 'data', `${environment}-node-types.json`);
		const tempFilePath = `${filePath}.tmp`;
		const jsonContent = JSON.stringify(Array.from(this.communityNodeTypes.values()));

		await writeFile(tempFilePath, jsonContent, 'utf-8');
		await rename(tempFilePath, filePath);
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

		return (nodeTypeName: string) => installedPackageNames.has(nodeTypeName.split('.')[0]);
	}

	async getCommunityNodeTypes(): Promise<CommunityNodeType[]> {
		if (this.updateRequired()) {
			await this.fetchNodeTypes();
		}

		const isInstalled = await this.createIsInstalled();

		return Array.from(this.communityNodeTypes.values()).map((nodeType) => ({
			...nodeType,
			isInstalled: isInstalled(nodeType.name),
		}));
	}

	async getCommunityNodeType(type: string): Promise<CommunityNodeType | null> {
		const nodeType = this.communityNodeTypes.get(type);
		const isInstalled = await this.createIsInstalled();
		if (!nodeType) return null;
		return { ...nodeType, isInstalled: isInstalled(nodeType.name) };
	}

	findVetted(packageName: string) {
		const vettedTypes = Array.from(this.communityNodeTypes.values());
		return vettedTypes.find((nodeType) => nodeType.packageName === packageName);
	}
}
