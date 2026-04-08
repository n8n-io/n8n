import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { extractNodeParametersSchema, type NodeParametersSchema } from './node-schema-utils';

export interface ToolDescriptor {
	/** Human-readable display name, e.g. "HTTP Request" */
	displayName: string;
	description: string;
	/** Node type identifier, e.g. 'n8n-nodes-base.httpRequest' — pass as `type` in ToolFromNode */
	nodeType: string;
	/** The primary version number to use when executing this node. */
	nodeTypeVersion: number;
	/** Whether the user has at least one credential configured for this node. */
	hasCredentials: boolean;
	/** Configured credentials for this tool, ready to use in ToolFromNode config.credentials */
	credentials: CredentialListItem[];
}

/**
 * Registry of n8n nodes that are usable as agent tools.
 *
 * Filters to usableAsTool nodes once on first use; the full type descriptions
 * are held in memory so we can project any field at list time without reloading.
 */
@Service()
export class NodeToolRegistry {
	private toolNodes: INodeTypeDescription[] | undefined;

	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	private async ensureLoaded(): Promise<INodeTypeDescription[]> {
		if (this.toolNodes) return this.toolNodes;
		const { nodes } = await this.loadNodesAndCredentials.collectTypes();
		this.toolNodes = nodes.filter((n) => n.usableAsTool);
		return this.toolNodes;
	}

	async getNodeSchema(nodeType: string): Promise<NodeParametersSchema | undefined> {
		const nodes = await this.ensureLoaded();
		const node = nodes.find((n) => n.name === nodeType);
		if (!node) return undefined;
		return extractNodeParametersSchema(node.properties);
	}

	async listTools(credentialProvider?: CredentialProvider): Promise<ToolDescriptor[]> {
		const nodes = await this.ensureLoaded();

		const availableCreds = credentialProvider ? await credentialProvider.list() : [];
		const availableCredTypes =
			availableCreds.length > 0 ? new Set(availableCreds.map((c) => c.type)) : undefined;

		return nodes.map((node) => {
			const credentialSlots = (node.credentials ?? []).map((c) => c.name);

			const hasCredentials =
				availableCredTypes === undefined
					? true
					: credentialSlots.length === 0 || credentialSlots.some((t) => availableCredTypes.has(t));

			const nodeTypeVersion = Array.isArray(node.version)
				? node.version[node.version.length - 1]
				: node.version;

			const credentials = availableCreds.filter((c) => credentialSlots.includes(c.type));

			return {
				displayName: node.displayName,
				description: node.description,
				nodeType: node.name,
				nodeTypeVersion,
				hasCredentials,
				credentials,
			};
		});
	}
}
