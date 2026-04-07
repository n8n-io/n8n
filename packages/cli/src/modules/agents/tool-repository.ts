import type { CredentialProvider } from '@n8n/agents';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

// ---------------------------------------------------------------------------
// Public contracts
// ---------------------------------------------------------------------------

export interface ToolDescriptor {
	name: string;
	description: string;
	/** Whether the user has at least one credential configured for this node. */
	hasCredentials: boolean;
}

export interface ToolRepository {
	listTools(credentialProvider?: CredentialProvider): Promise<ToolDescriptor[]>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/** Minimal node data we retain after the heavy type load is released. */
interface CachedNodeEntry {
	name: string;
	description: string;
	version: number | number[];
	credentialTypes: string[];
	properties: INodeTypeDescription['properties'];
}

/**
 * A {@link ToolRepository} backed by n8n's node registry.
 *
 * Node types are loaded once via {@link LoadNodesAndCredentials.collectTypes} and
 * then immediately released — only the minimal fields needed for tool resolution
 * are retained in memory.
 */
@Service()
export class NodeToolRepository implements ToolRepository {
	/** Populated once on first use, keyed by node name. */
	private nodeCache: Map<string, CachedNodeEntry> | undefined;

	constructor(private readonly loadNodesAndCredentials: LoadNodesAndCredentials) {}

	/**
	 * Load all usableAsTool nodes into the cache exactly once.
	 * The heavy INodeTypeDescription array is discarded after extraction.
	 */
	private async ensureCache(): Promise<Map<string, CachedNodeEntry>> {
		if (this.nodeCache) return this.nodeCache;

		const types = await this.loadNodesAndCredentials.collectTypes();

		const cache = new Map<string, CachedNodeEntry>();
		for (const node of types.nodes) {
			if (!node.usableAsTool) continue;
			cache.set(node.name, {
				name: node.name,
				description: node.description,
				version: node.version,
				credentialTypes: (node.credentials ?? []).map((c) => c.name),
				properties: node.properties,
			});
		}

		this.nodeCache = cache;
		return cache;
	}

	async listTools(credentialProvider?: CredentialProvider): Promise<ToolDescriptor[]> {
		const cache = await this.ensureCache();

		let availableCredentialTypes: Set<string> | undefined;
		if (credentialProvider) {
			const creds = await credentialProvider.list();
			availableCredentialTypes = new Set(creds.map((c) => c.type));
		}

		return Array.from(cache.values()).map((n) => {
			const hasCredentials =
				availableCredentialTypes === undefined
					? true
					: n.credentialTypes.length === 0 ||
						n.credentialTypes.some((t) => availableCredentialTypes!.has(t));

			return { name: n.name, description: n.description, hasCredentials };
		});
	}
}
