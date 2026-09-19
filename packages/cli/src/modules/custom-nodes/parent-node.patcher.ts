import type { CustomOperationDefinition } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { RoutingNode } from 'n8n-core';
import type { ExecuteContext } from 'n8n-core';
import type {
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IVersionedNodeType,
} from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import {
	generateRuntimeDescription,
	injectOperationsIntoParent,
	OPERATION_PARAMETER_NAME,
} from './node-description.generator';

type ExecuteFn = NonNullable<INodeType['execute']>;

/**
 * Makes custom operations part of their parent node:
 *
 * - **Description**: the parent's served description (`types.nodes`, which
 *   becomes `types/nodes.json`) and its loaded class description get the
 *   operations in the Resource/Operation dropdowns plus their inputs.
 * - **Execution**: the parent's `execute` is wrapped. When the selected
 *   `operation` is a custom one, the request runs through `RoutingNode` with a
 *   declarative description generated from the definition; otherwise the
 *   original `execute` runs untouched.
 *
 * Everything is reversible so a refresh can re-apply from scratch.
 */
@Service()
export class ParentNodePatcher {
	/** parent node type → operation id → runtime description */
	private readonly runtime = new Map<string, Map<string, INodeTypeDescription>>();

	private readonly originalProperties = new WeakMap<INodeTypeDescription, INodeProperties[]>();

	private readonly originalExecute = new WeakMap<INodeType, ExecuteFn | undefined>();

	private patchedParents = new Set<string>();

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {}

	/** Re-applies all parent patches from the given operations. Call after `postProcessLoaders`. */
	apply(operations: CustomOperationDefinition[]) {
		const byParent = new Map<string, CustomOperationDefinition[]>();
		for (const operation of operations) {
			if (!operation.parentNodeType) continue;
			const list = byParent.get(operation.parentNodeType) ?? [];
			list.push(operation);
			byParent.set(operation.parentNodeType, list);
		}

		// Restore parents that lost all their operations
		for (const parent of this.patchedParents) {
			if (!byParent.has(parent)) this.restoreClass(parent);
		}
		this.runtime.clear();
		this.patchedParents = new Set();

		for (const [parent, ops] of byParent) {
			try {
				this.patchServedDescriptions(parent, ops);
				this.patchClass(parent, ops);
				this.patchedParents.add(parent);
			} catch (error) {
				this.logger.warn(`Could not add custom operations to node type "${parent}"`, { error });
			}
		}
	}

	/** `types.nodes` holds fresh shallow copies after every rebuild, so replacing entries is safe. */
	private patchServedDescriptions(parent: string, operations: CustomOperationDefinition[]) {
		const { types } = this.loadNodesAndCredentials;
		types.nodes = types.nodes.map((description) =>
			description.name === parent
				? injectOperationsIntoParent(description, operations)
				: description,
		);
	}

	private versionsOf(type: INodeType | IVersionedNodeType): INodeType[] {
		return 'nodeVersions' in type ? Object.values(type.nodeVersions) : [type];
	}

	private patchClass(parent: string, operations: CustomOperationDefinition[]) {
		const { type } = this.loadNodesAndCredentials.getNode(parent);
		const runtimeByOperation = new Map<string, INodeTypeDescription>();

		for (const version of this.versionsOf(type)) {
			const { description } = version;
			const original = this.originalProperties.get(description) ?? description.properties;
			this.originalProperties.set(description, original);
			description.properties = injectOperationsIntoParent(
				{ ...description, properties: original },
				operations,
			).properties;

			for (const operation of operations) {
				runtimeByOperation.set(operation.id, generateRuntimeDescription(operation, description));
			}

			this.wrapExecute(version, parent);
		}

		this.runtime.set(parent, runtimeByOperation);
	}

	private wrapExecute(version: INodeType, parent: string) {
		if (this.originalExecute.has(version)) return; // already wrapped
		const original = version.execute;
		this.originalExecute.set(version, original);
		const runtimeByParent = this.runtime;

		version.execute = async function (this: ExecuteContext): ReturnType<ExecuteFn> {
			const operation = this.getNodeParameter(OPERATION_PARAMETER_NAME, 0, '');
			const runtime =
				typeof operation === 'string' ? runtimeByParent.get(parent)?.get(operation) : undefined;
			if (runtime) {
				const routingNode = new RoutingNode(this, { description: runtime });
				return (await routingNode.runNode()) ?? [];
			}
			if (original) return await original.call(this);
			// Declarative parent without its own execute: behave like NodeTypes does
			const routingNode = new RoutingNode(this, version);
			return (await routingNode.runNode()) ?? [];
		};
	}

	private restoreClass(parent: string) {
		try {
			const { type } = this.loadNodesAndCredentials.getNode(parent);
			for (const version of this.versionsOf(type)) {
				const original = this.originalProperties.get(version.description);
				if (original) version.description.properties = original;
				if (this.originalExecute.has(version)) {
					version.execute = this.originalExecute.get(version);
					this.originalExecute.delete(version);
				}
			}
		} catch (error) {
			this.logger.warn(`Could not restore node type "${parent}"`, { error });
		}
	}
}
