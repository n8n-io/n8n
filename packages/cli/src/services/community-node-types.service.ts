import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import axios from 'axios';
import { Logger } from 'n8n-core';
import type { CommunityNodeAttributes, INodeTypeDescription } from 'n8n-workflow';
import { ensureError } from 'n8n-workflow';

import { CommunityPackagesService } from './community-packages.service';

interface ResponseData {
	data: Data[];
	meta: Meta;
}

interface Meta {
	pagination: Pagination;
}

interface Pagination {
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
}

interface Data {
	id: number;
	attributes: CommunityNodeAttributes & {
		nodeDescription: INodeTypeDescription;
	};
}

const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;
const N8N_VETTED_NODE_TYPES_URL =
	'https://bread-liberty-returns-impaired.trycloudflare.com/api/community-nodes';

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

	private async strapiPaginatedRequest() {
		let returnData: Data[] = [];
		let responseData;

		const params = {
			pagination: {
				page: 1,
				pageSize: 25,
			},
		};

		do {
			const response = await axios.get<ResponseData>(N8N_VETTED_NODE_TYPES_URL, {
				headers: { 'Content-Type': 'application/json' },
				params,
			});

			responseData = response?.data?.data;
			if (!responseData?.length) break;
			returnData = returnData.concat(responseData);
			params.pagination.page++;
		} while (!responseData.length);

		return returnData;
	}

	private async fetchNodeTypes() {
		try {
			let data: Data[] = [];
			if (this.globalConfig.nodes.communityPackages.enabled) {
				data = await this.strapiPaginatedRequest();
			}

			this.updateData(data);
		} catch (error) {
			this.logger.error('Failed to fetch community node types', { error: ensureError(error) });
		}
	}

	private updateData(data: Data[]) {
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

		try {
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
		} catch (error) {}

		return nodesDescriptions;
	}

	getCommunityNodeAttributes(nodeName: string): CommunityNodeAttributes | null {
		const node = this.communityNodes[nodeName];
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
