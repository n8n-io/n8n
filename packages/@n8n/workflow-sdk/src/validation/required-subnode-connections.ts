/**
 * Completes AI subnode connections that a node's own parameters made required.
 *
 * Turning on a capability can add a required input one level below the node the
 * author was thinking about (`autoFix` on an output parser needs a model), and
 * generated code routinely sets the parameter without wiring it.
 */

import type { INodeTypes } from 'n8n-workflow';

import { matchesDisplayOptions } from './display-options';
import type { DisplayOptions, DisplayOptionsContext } from './display-options';

/**
 * Structural rather than `WorkflowJSON` so both callers fit: the SDK and
 * `n8n-workflow` declare separate node and connection types.
 */
export interface WorkflowForSubnodeWiring {
	nodes: Array<{
		name?: string;
		type: string;
		typeVersion?: number | string;
		parameters?: Record<string, unknown>;
	}>;
	connections: {
		[sourceNode: string]:
			| {
					[connectionType: string]:
						| Array<Array<{ node: string; type?: string; index?: number }> | null>
						| undefined;
			  }
			| undefined;
	};
}

/** A connection this pass added. */
export interface AddedSubnodeConnection {
	sourceNode: string;
	targetNode: string;
	connectionType: string;
	/** Parent both nodes hang off, which is where the source came from. */
	viaParent: string;
}

/** Kept next to the producer so both callers share one wording. */
export function describeAddedSubnodeConnection(link: AddedSubnodeConnection): {
	code: string;
	message: string;
	nodeName: string;
} {
	return {
		code: 'REQUIRED_SUBNODE_CONNECTED',
		message: `Connected '${link.sourceNode}' to the ${link.connectionType} input of '${link.targetNode}', which its own parameters made required. The source was taken from '${link.viaParent}'. Wire this explicitly in future edits.`,
		nodeName: link.targetNode,
	};
}

/** An input the caller cleared on purpose, which must not be repaired. */
export interface ClearedSubnodeInput {
	nodeName: string;
	connectionType: string;
}

/** node -> connection type -> source nodes feeding it. */
type IncomingIndex = Map<string, Map<string, Set<string>>>;

function buildIncomingIndex(workflow: WorkflowForSubnodeWiring): IncomingIndex {
	const incoming: IncomingIndex = new Map();

	for (const [sourceNode, byType] of Object.entries(workflow.connections ?? {})) {
		for (const [connectionType, outputs] of Object.entries(byType ?? {})) {
			if (!Array.isArray(outputs)) continue;
			for (const targets of outputs) {
				for (const target of targets ?? []) {
					if (!target?.node) continue;
					const type = target.type ?? connectionType;
					const byTargetType = incoming.get(target.node) ?? new Map<string, Set<string>>();
					const sources = byTargetType.get(type) ?? new Set<string>();
					sources.add(sourceNode);
					byTargetType.set(type, sources);
					incoming.set(target.node, byTargetType);
				}
			}
		}
	}

	return incoming;
}

/** Every node this subnode feeds over an `ai_*` connection. */
function findParents(workflow: WorkflowForSubnodeWiring, nodeName: string): string[] {
	const parents = new Set<string>();
	const byType = workflow.connections?.[nodeName];

	for (const [connectionType, outputs] of Object.entries(byType ?? {})) {
		if (!connectionType.startsWith('ai_') || !Array.isArray(outputs)) continue;
		for (const targets of outputs) {
			for (const target of targets ?? []) {
				if (target?.node) parents.add(target.node);
			}
		}
	}

	return [...parents];
}

function addConnection(
	workflow: WorkflowForSubnodeWiring,
	sourceNode: string,
	targetNode: string,
	connectionType: string,
): void {
	const byType = (workflow.connections[sourceNode] ??= {});
	const outputs = (byType[connectionType] ??= []);
	outputs[0] = [...(outputs[0] ?? []), { node: targetNode, type: connectionType, index: 0 }];
}

/**
 * Mutates `workflow.connections` and returns the links added. Anything it cannot
 * satisfy is left for `validateWorkflow` to report as `MISSING_REQUIRED_INPUT`.
 *
 * `clearedInputs` are inputs the caller just disconnected; repairing one would
 * undo their own removal.
 */
export function connectRequiredSubnodeInputs(
	workflow: WorkflowForSubnodeWiring,
	nodeTypesProvider: INodeTypes,
	options: { clearedInputs?: readonly ClearedSubnodeInput[] } = {},
): AddedSubnodeConnection[] {
	const cleared = new Set(
		(options.clearedInputs ?? []).map((input) => `${input.nodeName}\u0000${input.connectionType}`),
	);
	const added: AddedSubnodeConnection[] = [];
	const incoming = buildIncomingIndex(workflow);

	for (const node of workflow.nodes) {
		if (!node.name) continue;

		// validate-workflow.ts does the same: the wire can carry a string.
		const version =
			typeof node.typeVersion === 'string' ? parseFloat(node.typeVersion) : (node.typeVersion ?? 1);

		let builderHintInputs;
		try {
			builderHintInputs = nodeTypesProvider.getByNameAndVersion(node.type, version)?.description
				?.builderHint?.inputs;
		} catch {
			continue; // unknown type or version
		}
		if (!builderHintInputs) continue;

		const parameters = node.parameters ?? {};

		for (const [connectionType, inputConfig] of Object.entries(builderHintInputs)) {
			if (!connectionType.startsWith('ai_')) continue;
			if (!inputConfig?.required) continue;
			if (cleared.has(`${node.name}\u0000${connectionType}`)) continue;

			// A gated input does not exist until its condition holds.
			const displayOptions = inputConfig.displayOptions as DisplayOptions | undefined;
			if (displayOptions) {
				const context: DisplayOptionsContext = {
					parameters,
					nodeVersion: version,
					rootParameters: parameters,
				};
				if (!matchesDisplayOptions(context, displayOptions)) continue;
			}

			// buildIncomingIndex only stores non-empty sets.
			if (incoming.get(node.name)?.get(connectionType)) continue;

			// Take the source from the parent the subnode hangs off, not the whole graph.
			const parentBySource = new Map<string, string>();
			for (const parent of findParents(workflow, node.name)) {
				for (const source of incoming.get(parent)?.get(connectionType) ?? []) {
					if (source !== node.name) parentBySource.set(source, parent);
				}
			}

			// Wire only when the source is unambiguous.
			const candidates = [...parentBySource.keys()];
			if (candidates.length !== 1) continue;

			const [sourceNode] = candidates;
			addConnection(workflow, sourceNode, node.name, connectionType);
			added.push({
				sourceNode,
				targetNode: node.name,
				connectionType,
				viaParent: parentBySource.get(sourceNode) as string,
			});
		}
	}

	return added;
}
