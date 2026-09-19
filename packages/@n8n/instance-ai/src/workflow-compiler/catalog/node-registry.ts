import type { NodeDescription } from '../../types';
import { PHASE_ONE_OPERATIONS } from './operations';
import type { NodeOperation, OperationKind } from './types';
import { NODE_REGISTRY_VERSION } from '../versions';

/** Optional live source of node descriptions. Matches `InstanceAiNodeService.getDescription`. */
export interface NodeDescriptionSource {
	getDescription(nodeType: string, version?: number): Promise<NodeDescription>;
}

export interface NodeRegistryOptions {
	operations?: readonly NodeOperation[];
	descriptions?: NodeDescriptionSource;
	/** Node types the instance has installed. When given, other operations are hidden. */
	installedNodeTypes?: ReadonlySet<string>;
}

/**
 * Version-aware registry of supported operations. Static entries drive retrieval, binding and
 * compilation. Live descriptions back parameter validation and are cached per node type/version.
 */
export class NodeRegistry {
	readonly version = NODE_REGISTRY_VERSION;

	private readonly byId = new Map<string, NodeOperation>();

	private readonly descriptionCache = new Map<string, Promise<NodeDescription | null>>();

	constructor(private readonly options: NodeRegistryOptions = {}) {
		const installed = options.installedNodeTypes;
		for (const operation of options.operations ?? PHASE_ONE_OPERATIONS) {
			if (!installed || installed.has(operation.nodeType)) this.byId.set(operation.id, operation);
		}
	}

	get(operationId: string): NodeOperation | undefined {
		return this.byId.get(operationId);
	}

	require(operationId: string): NodeOperation {
		const operation = this.byId.get(operationId);
		if (operation) return operation;
		throw new Error(`Unknown operation "${operationId}" (registry ${this.version}).`);
	}

	list(filter: { kind?: OperationKind; integration?: string } = {}): NodeOperation[] {
		return [...this.byId.values()].filter(
			(operation) =>
				(filter.kind === undefined || operation.kind === filter.kind) &&
				(filter.integration === undefined || operation.integration === filter.integration),
		);
	}

	integrations(): string[] {
		return [...new Set([...this.byId.values()].map((operation) => operation.integration))].sort();
	}

	/** Live node description, or `null` when no source is wired or the lookup fails. */
	async describe(nodeType: string, version: number): Promise<NodeDescription | null> {
		const source = this.options.descriptions;
		if (!source) return null;
		const key = `${nodeType}@${version}`;
		let pending = this.descriptionCache.get(key);
		if (!pending) {
			pending = source.getDescription(nodeType, version).catch(() => null);
			this.descriptionCache.set(key, pending);
		}
		return await pending;
	}

	/** Refreshes cached descriptions outside a user request. */
	async warm(): Promise<void> {
		await Promise.all(
			[...this.byId.values()].map(
				async (operation) => await this.describe(operation.nodeType, operation.version),
			),
		);
	}
}
