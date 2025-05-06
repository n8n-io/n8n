import type { CommunityNodeAttributes, CommunityNodeData } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ensureError } from 'n8n-workflow';

import { CommunityPackagesService } from './community-packages.service';
import { paginatedRequest } from '../utils/community-nodes-request-utils';

const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;

const N8N_VETTED_NODE_TYPES_STAGING_URL = 'https://api-staging.n8n.io/api/community-nodes';
const N8N_VETTED_NODE_TYPES_PRODUCTION_URL = 'https://api.n8n.io/api/community-nodes';

@Service()
export class CommunityNodeTypesService {
	private communityNodes: {
		[key: string]: CommunityNodeAttributes & {
			nodeDescription: INodeTypeDescription;
		};
	} = {};

	private lastUpdateTimestamp = 0;

	constructor(
		private readonly logger: Logger,
		private globalConfig: GlobalConfig,
		private communityPackagesService: CommunityPackagesService,
	) {}

	private async fetchNodeTypes() {
		try {
			let data: CommunityNodeData[] = [];
			if (
				this.globalConfig.nodes.communityPackages.enabled &&
				this.globalConfig.nodes.communityPackages.verifiedEnabled
			) {
				const environment = this.globalConfig.license.tenantId === 1 ? 'production' : 'staging';
				const url =
					environment === 'production'
						? N8N_VETTED_NODE_TYPES_PRODUCTION_URL
						: N8N_VETTED_NODE_TYPES_STAGING_URL;
				data = await paginatedRequest(url);
			}

			this.updateData(data);
		} catch (error) {
			this.logger.error('Failed to fetch community node types', { error: ensureError(error) });
		}
	}

	private updateData(data: CommunityNodeData[]) {
		if (!data?.length) return;

		this.resetData();

		for (const entry of data) {
			this.communityNodes[entry.attributes.name] = entry.attributes;
		}

		this.lastUpdateTimestamp = Date.now();
	}

	private resetData() {
		this.communityNodes = {};
	}

	private updateRequired() {
		if (!this.lastUpdateTimestamp) return true;
		return Date.now() - this.lastUpdateTimestamp > UPDATE_INTERVAL;
	}

	async getDescriptions(): Promise<INodeTypeDescription[]> {
		const nodesDescriptions: INodeTypeDescription[] = [];

		if (this.updateRequired() || !Object.keys(this.communityNodes).length) {
			await this.fetchNodeTypes();
		}

		const installedPackages = (
			(await this.communityPackagesService.getAllInstalledPackages()) ?? []
		).map((p) => p.packageName);

		for (const node of Object.values(this.communityNodes)) {
			if (installedPackages.includes(node.name.split('.')[0])) continue;
			nodesDescriptions.push(node.nodeDescription);
		}

		return nodesDescriptions;
	}

	getCommunityNodeAttributes(type: string): CommunityNodeAttributes | null {
		const node = this.communityNodes[type];
		if (!node) return null;
		const { nodeDescription, ...attributes } = node;
		return attributes;
	}

	findVetted(packageName: string) {
		const vettedTypes = Object.keys(this.communityNodes);
		const nodeName = vettedTypes.find((t) => t.includes(packageName));
		if (!nodeName) return;
		return this.communityNodes[nodeName];
	}
}
