/**
 * Required Subnode Connections
 *
 * Some AI subnodes need a subnode of their own once a parameter turns the
 * capability on. A Structured Output Parser with `autoFix: true` spends a second
 * LLM call repairing malformed output, so it declares a *required*
 * `ai_languageModel` input; a Default Data Loader in `textSplittingMode: custom`
 * requires an `ai_textSplitter`. Those requirements are declared on the node type
 * as `builderHint.inputs[type]` with `required: true`.
 *
 * Builder-authored code sets the parameter but routinely omits the connection,
 * because the subnode is nested one level below the node the author was thinking
 * about. The result is a node with a required input left dangling: it renders as
 * an unconnected port and fails at runtime when the capability fires.
 *
 * This pass completes those connections. The source is not guessed: it is taken
 * from the parent the subnode is already attached to, which is the same node a
 * person would drag the wire from. Where no single unambiguous source exists the
 * input is left alone, and `validateWorkflow` reports it as
 * `MISSING_REQUIRED_INPUT`.
 */

import type { INodeTypes } from 'n8n-workflow';

import { matchesDisplayOptions } from './display-options';
import type { DisplayOptions, DisplayOptionsContext } from './display-options';

/**
 * Minimal workflow shape this pass reads and writes. Declared structurally
 * rather than as `WorkflowJSON` so callers can pass either the SDK's
 * `WorkflowJSON` or an `n8n-workflow`-typed slice — the two declare duplicate
 * but formally separate node and connection types.
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
	/** Node the connection now comes from (e.g. the shared chat model) */
	sourceNode: string;
	/** Node whose required input was unsatisfied (e.g. the output parser) */
	targetNode: string;
	/** The AI connection type, e.g. `ai_languageModel` */
	connectionType: string;
	/** Parent both nodes hang off, which is where the source was taken from */
	viaParent: string;
}

/**
 * The note shown to whoever asked for the build. Kept next to the producer so
 * the wording and the code stay in one place across both callers.
 */
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
	/** Node whose input was cleared */
	nodeName: string;
	/** The AI connection type that was removed, e.g. `ai_languageModel` */
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

/**
 * The parents a subnode is attached to — every node it feeds over an `ai_*`
 * connection. An output parser's parent is the agent it supplies.
 */
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
 * Connect required AI inputs that a node's own parameters made mandatory but
 * that were left unwired.
 *
 * Mutates `workflow.connections` in place and returns the links it added. An
 * input it cannot satisfy is left alone: `validateWorkflow` already reports
 * those as `MISSING_REQUIRED_INPUT`.
 *
 * Pass `clearedInputs` for anything the caller just disconnected on purpose.
 * Repairing one of those would undo the removal in the same breath, so they are
 * skipped and reported as missing instead.
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

		// Mirrors validate-workflow.ts, where a workflow read from the wire can
		// carry typeVersion as a string.
		const version =
			typeof node.typeVersion === 'string' ? parseFloat(node.typeVersion) : (node.typeVersion ?? 1);

		let builderHintInputs;
		try {
			builderHintInputs = nodeTypesProvider.getByNameAndVersion(node.type, version)?.description
				?.builderHint?.inputs;
		} catch {
			// Unknown type or version — nothing to derive the requirement from.
			continue;
		}
		if (!builderHintInputs) continue;

		const parameters = node.parameters ?? {};

		for (const [connectionType, inputConfig] of Object.entries(builderHintInputs)) {
			if (!connectionType.startsWith('ai_')) continue;
			if (!inputConfig?.required) continue;
			if (cleared.has(`${node.name}\u0000${connectionType}`)) continue;

			// A gated input only exists once its condition holds; until then the
			// node renders no port and nothing is missing.
			const displayOptions = inputConfig.displayOptions as DisplayOptions | undefined;
			if (displayOptions) {
				const context: DisplayOptionsContext = {
					parameters,
					nodeVersion: version,
					rootParameters: parameters,
				};
				if (!matchesDisplayOptions(context, displayOptions)) continue;
			}

			// buildIncomingIndex only ever stores non-empty sets.
			if (incoming.get(node.name)?.get(connectionType)) continue;

			// Take the source from whatever already supplies this connection type to
			// the parent the subnode hangs off — the wire a person would draw.
			const parentBySource = new Map<string, string>();
			for (const parent of findParents(workflow, node.name)) {
				for (const source of incoming.get(parent)?.get(connectionType) ?? []) {
					if (source !== node.name) parentBySource.set(source, parent);
				}
			}

			// Only wire when there is exactly one source it could have come from.
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
