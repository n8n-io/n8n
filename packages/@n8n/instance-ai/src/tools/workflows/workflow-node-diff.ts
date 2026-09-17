/**
 * Node-level diff between a built workflow and its previously saved version.
 *
 * `build-workflow` round-trips the whole workflow (get-as-code → edit → build),
 * so every build re-submits nodes the user never asked to touch. These helpers
 * let the build pipeline tell touched nodes apart from pre-existing ones, so
 * validation and setup routing never punish a node for merely being present.
 *
 * Nodes are paired by id, which get-as-code preserves across the edit round-trip,
 * with a name fallback for nodes without a saved id counterpart. Connection changes count
 * as node changes: a node wired differently (e.g. a previously disconnected
 * node pulled into the flow) is no longer the node the user left there, even
 * when its parameters are byte-identical.
 */

import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { isDeepStrictEqual } from 'node:util';

import type { ValidationWarning } from './workflow-validation-warnings';

type NodeJSON = WorkflowJSON['nodes'][number];

/** Pair a built node with its saved counterpart: by id first, then by name. */
function counterpartFinder(savedWorkflow: WorkflowJSON): (node: NodeJSON) => NodeJSON | undefined {
	const byId = new Map<string, NodeJSON>();
	const byName = new Map<string, NodeJSON>();
	for (const node of savedWorkflow.nodes ?? []) {
		if (node.id) byId.set(node.id, node);
		if (node.name) byName.set(node.name, node);
	}
	return (node) =>
		(node.id ? byId.get(node.id) : undefined) ?? (node.name ? byName.get(node.name) : undefined);
}

/** The node's identity key inside a signature: id when present, else name. */
function nodeKey(node: NodeJSON): string {
	if (node.id) return node.id;
	return node.name ?? '';
}

/**
 * Sorted edge lists per node, in id-space so a neighbour's rename does not
 * shift this node's signature. Nodes referenced in connections but absent
 * from the node list keep their name as the key.
 */
function connectionSignatures(workflow: WorkflowJSON): Map<string, string[]> {
	const keyByName = new Map<string, string>();
	for (const node of workflow.nodes ?? []) {
		if (node.name) keyByName.set(node.name, nodeKey(node));
	}

	const edgesByKey = new Map<string, string[]>();
	const add = (key: string, edge: string) => {
		const list = edgesByKey.get(key) ?? [];
		list.push(edge);
		edgesByKey.set(key, list);
	};

	for (const [sourceName, byType] of Object.entries(workflow.connections ?? {})) {
		if (!isRecord(byType)) continue;
		const sourceKey = keyByName.get(sourceName) ?? sourceName;
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!Array.isArray(outputs)) continue;
			outputs.forEach((targets, outputIndex) => {
				if (!Array.isArray(targets)) return;
				for (const target of targets) {
					if (!isRecord(target) || typeof target.node !== 'string') continue;
					const targetKey = keyByName.get(target.node) ?? target.node;
					const inputIndex = typeof target.index === 'number' ? target.index : 0;
					const edge = `${connectionType}[${outputIndex}] ${sourceKey} > ${targetKey}[${inputIndex}]`;
					add(sourceKey, `out ${edge}`);
					add(targetKey, `in ${edge}`);
				}
			});
		}
	}

	for (const list of edgesByKey.values()) list.sort();
	return edgesByKey;
}

type SignatureLookup = Map<string, string[]>;

function connectionsUnchanged(
	node: NodeJSON,
	saved: NodeJSON,
	builtSignatures: SignatureLookup,
	savedSignatures: SignatureLookup,
): boolean {
	return isDeepStrictEqual(
		builtSignatures.get(nodeKey(node)) ?? [],
		savedSignatures.get(nodeKey(saved)) ?? [],
	);
}

function parametersUnchanged(node: NodeJSON, saved: NodeJSON): boolean {
	return (
		node.type === saved.type &&
		(node.typeVersion ?? 1) === (saved.typeVersion ?? 1) &&
		isDeepStrictEqual(node.parameters ?? {}, saved.parameters ?? {})
	);
}

function nodeUnchanged(node: NodeJSON, saved: NodeJSON): boolean {
	return (
		parametersUnchanged(node, saved) &&
		node.name === saved.name &&
		isDeepStrictEqual(node.credentials ?? {}, saved.credentials ?? {}) &&
		(node.disabled ?? false) === (saved.disabled ?? false)
	);
}

/**
 * Names of nodes this build added or modified relative to the saved workflow
 * (type, typeVersion, parameters, credentials, disabled state, name, or the
 * node's connections differ). Unnamed nodes are always treated as changed.
 */
export function computeChangedNodeNames(
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON,
): string[] {
	const findCounterpart = counterpartFinder(savedWorkflow);
	const builtSignatures = connectionSignatures(workflow);
	const savedSignatures = connectionSignatures(savedWorkflow);
	const changed: string[] = [];
	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		const saved = findCounterpart(node);
		if (
			!saved ||
			!nodeUnchanged(node, saved) ||
			!connectionsUnchanged(node, saved, builtSignatures, savedSignatures)
		) {
			changed.push(node.name);
		}
	}
	return changed;
}

/** Stable identity and full diagnostics keep distinct findings on the same node separate. */
function findingKey(warning: ValidationWarning, node: NodeJSON): string {
	return JSON.stringify([
		warning.code,
		nodeKey(node),
		warning.parameterPath ?? '',
		warning.severity,
		warning.message.replaceAll(warning.nodeName ?? node.name ?? '', '<node>'),
		warning.codeContext,
		warning.relatedNodeNames,
	]);
}

function nodeBehavior(node: NodeJSON) {
	const { id, name, position, notes, notesInFlow, parameters, ...configuration } = node;
	return Object.fromEntries(
		Object.entries({
			...configuration,
			credentials: node.credentials ?? {},
			disabled: node.disabled ?? false,
			onError: node.onError ?? 'stopWorkflow',
			executeOnce: node.executeOnce ?? false,
			alwaysOutputData: node.alwaysOutputData ?? false,
			retryOnFail: node.retryOnFail ?? false,
		}).filter(([, value]) => value !== undefined),
	);
}

/**
 * Preserve existing node findings only after the same validators confirm the baseline.
 * Workflow constraints and findings without a declared scope always remain blocking.
 */
export function downgradeUnchangedNodeBlockers(
	warnings: ValidationWarning[],
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON | undefined,
	savedWarnings?: ValidationWarning[],
): ValidationWarning[] {
	if (!savedWorkflow || !savedWarnings) return warnings;
	if (!isDeepStrictEqual(workflow.settings ?? {}, savedWorkflow.settings ?? {})) return warnings;

	const findCounterpart = counterpartFinder(savedWorkflow);
	const builtSignatures = connectionSignatures(workflow);
	const savedSignatures = connectionSignatures(savedWorkflow);
	const savedByName = new Map(savedWorkflow.nodes.map((node) => [node.name, node]));
	const existingFindings = new Map<string, number>();
	for (const warning of savedWarnings) {
		if (warning.scope !== 'node' || !warning.nodeName) continue;
		const node = savedByName.get(warning.nodeName);
		if (!node) continue;
		const key = findingKey(warning, node);
		existingFindings.set(key, (existingFindings.get(key) ?? 0) + 1);
	}

	const unchanged = new Map<string, { built: NodeJSON; saved: NodeJSON }>();
	for (const node of workflow.nodes) {
		if (!node.name) continue;
		const saved = findCounterpart(node);
		if (
			saved &&
			!(node.id && saved.id && node.id !== saved.id) &&
			node.type === saved.type &&
			(node.typeVersion ?? 1) === (saved.typeVersion ?? 1) &&
			isDeepStrictEqual(nodeBehavior(node), nodeBehavior(saved)) &&
			connectionsUnchanged(node, saved, builtSignatures, savedSignatures)
		) {
			unchanged.set(node.name, { built: node, saved });
		}
	}

	return warnings.map((warning): ValidationWarning => {
		if (warning.severity === 'informational' || warning.scope !== 'node' || !warning.nodeName) {
			return warning;
		}
		const pair = unchanged.get(warning.nodeName);
		if (!pair) return warning;
		if (!parametersUnchanged(pair.built, pair.saved)) {
			const parameter = warning.codeContext?.parameter;
			if (!parameter || warning.parameterPath !== parameter) return warning;
			const { [parameter]: builtCode, ...builtParameters } = pair.built.parameters ?? {};
			const { [parameter]: savedCode, ...savedParameters } = pair.saved.parameters ?? {};
			if (typeof builtCode !== 'string' || typeof savedCode !== 'string') return warning;
			if (!isDeepStrictEqual(builtParameters, savedParameters)) return warning;
		}
		for (const name of warning.relatedNodeNames ?? []) {
			const related = unchanged.get(name);
			if (!related || !parametersUnchanged(related.built, related.saved)) return warning;
		}
		const key = findingKey(warning, pair.saved);
		const count = existingFindings.get(key) ?? 0;
		if (count === 0) return warning;
		existingFindings.set(key, count - 1);
		return {
			...warning,
			severity: 'informational',
			message: `${warning.message} (pre-existing finding, unchanged by this edit; not blocking)`,
		};
	});
}
