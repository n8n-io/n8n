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
 * This pass completes those connections. The source is not guessed — it is taken
 * from the parent the subnode is already attached to, which is the same node a
 * person would drag the wire from. Where no single unambiguous source exists the
 * gap is reported instead, so the caller can refuse rather than invent a link.
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
		typeVersion?: number;
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

/** A required input this pass could not satisfy on its own. */
export interface UnsatisfiedRequiredInput {
	nodeName: string;
	connectionType: string;
	/** Parameters that made the input required, e.g. `{ autoFix: true }` */
	requiredBy: Record<string, unknown>;
	/** `none` when no candidate was found, `ambiguous` when several were */
	reason: 'none' | 'ambiguous';
	/** Candidate source nodes when `reason` is `ambiguous` */
	candidates: string[];
}

export interface RequiredSubnodeWiringResult {
	added: AddedSubnodeConnection[];
	unsatisfied: UnsatisfiedRequiredInput[];
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

/** Which parameter values made a required input apply, for the report. */
function describeTrigger(
	displayOptions: DisplayOptions | undefined,
	parameters: Record<string, unknown>,
): Record<string, unknown> {
	const trigger: Record<string, unknown> = {};
	for (const path of Object.keys(displayOptions?.show ?? {})) {
		trigger[path] = parameters[path];
	}
	return trigger;
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
 * Mutates `workflow.connections` in place. Returns what was connected and what
 * could not be, so a caller can surface the remainder or refuse to save.
 */
export function connectRequiredSubnodeInputs(
	workflow: WorkflowForSubnodeWiring,
	nodeTypesProvider: INodeTypes,
): RequiredSubnodeWiringResult {
	const added: AddedSubnodeConnection[] = [];
	const unsatisfied: UnsatisfiedRequiredInput[] = [];
	const incoming = buildIncomingIndex(workflow);

	for (const node of workflow.nodes) {
		if (!node.name) continue;

		const version = node.typeVersion ?? 1;

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

			const alreadyConnected = incoming.get(node.name)?.get(connectionType);
			if (alreadyConnected && alreadyConnected.size > 0) continue;

			// Take the source from whatever already supplies this connection type to
			// the parent the subnode hangs off — the wire a person would draw.
			const candidatesByParent = new Map<string, string>();
			for (const parent of findParents(workflow, node.name)) {
				for (const source of incoming.get(parent)?.get(connectionType) ?? []) {
					if (source !== node.name) candidatesByParent.set(source, parent);
				}
			}

			const requiredBy = describeTrigger(displayOptions, parameters);
			const candidates = [...candidatesByParent.keys()];

			if (candidates.length !== 1) {
				unsatisfied.push({
					nodeName: node.name,
					connectionType,
					requiredBy,
					reason: candidates.length === 0 ? 'none' : 'ambiguous',
					candidates,
				});
				continue;
			}

			const [sourceNode] = candidates;
			addConnection(workflow, sourceNode, node.name, connectionType);
			added.push({
				sourceNode,
				targetNode: node.name,
				connectionType,
				viaParent: candidatesByParent.get(sourceNode) as string,
			});
		}
	}

	return { added, unsatisfied };
}
