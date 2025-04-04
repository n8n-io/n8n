import { Service } from '@n8n/di';
import axios from 'axios';
import { Logger } from 'n8n-core';
import type { CommunityNodeAttributes, INodeTypeDescription } from 'n8n-workflow';
import { COMMUNITY_NODE_TYPE_PREVIEW_TOKEN, ensureError } from 'n8n-workflow';

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

const VETTED_NODE_TYPES_URL =
	'https://fraction-choose-conversations-isaac.trycloudflare.com/api/community-nodes';
const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;

@Service()
export class CommunityNodeTypesService {
	private communityNodes: { [key: string]: CommunityNodeAttributes } = {};

	private nodesDescriptions: INodeTypeDescription[] = [];

	private vettedNodes: string[] = [];

	private lastUpdateTimestamp = 0;

	constructor(private readonly logger: Logger) {}

	private async fetchNodeTypes() {
		try {
			const { data } = await axios.get<ResponseData>(VETTED_NODE_TYPES_URL, {
				headers: { 'Content-Type': 'application/json' },
			});

			this.updateData(data);
		} catch (error) {
			this.logger.error('Failed to fetch community node types', { error: ensureError(error) });
		}
	}

	private updateData(data: ResponseData) {
		if (!data?.data?.length) return;

		this.resetData();

		for (const entry of data.data) {
			const { nodeDescription, ...attributes } = entry.attributes;
			this.communityNodes[entry.attributes.name] = attributes;
			this.nodesDescriptions.push(nodeDescription);
			this.vettedNodes.push(nodeDescription.name);
		}

		this.lastUpdateTimestamp = Date.now();
	}

	private resetData() {
		this.communityNodes = {};
		this.nodesDescriptions = [];
		this.vettedNodes = [];
	}

	private updateRequired() {
		if (!this.lastUpdateTimestamp) return true;
		return Date.now() - this.lastUpdateTimestamp > UPDATE_INTERVAL;
	}

	async getDescriptions(): Promise<INodeTypeDescription[]> {
		if (this.updateRequired() || !this.nodesDescriptions.length) {
			await this.fetchNodeTypes();
		}

		return this.nodesDescriptions;
	}

	getVettedNodes(): string[] {
		return this.vettedNodes;
	}

	getCommunityNodeAttributes(nodeName: string): CommunityNodeAttributes {
		const name = nodeName.replace(COMMUNITY_NODE_TYPE_PREVIEW_TOKEN, '');
		return this.communityNodes[name];
	}

	isVetted(packageName: string) {
		const vettedTypes = Object.keys(this.communityNodes);
		return vettedTypes.some((t) => t.includes(packageName));
	}
}
