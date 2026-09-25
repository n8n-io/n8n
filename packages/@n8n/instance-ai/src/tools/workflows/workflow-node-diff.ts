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
import {
	containsExpression,
	isSensitiveHeader,
	isCredentialFieldName,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
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

function httpAuthentication(node: NodeJSON, parameterPath: string): unknown[] | undefined {
	const params = node.parameters ?? {};
	const options = isRecord(params.options) ? params.options : {};
	const header = parameterPath.startsWith('headerParameters.parameters[');
	const group = header ? 'headerParameters' : 'queryParameters';
	const prefix = `${group}.parameters[`;
	if (!parameterPath.startsWith(prefix) || !parameterPath.endsWith(']')) return undefined;
	const name = parameterPath.slice(prefix.length, -1);
	if (!(header ? isSensitiveHeader(name) : isCredentialFieldName(name))) return undefined;
	const collection = params[group];
	if (!isRecord(collection) || !Array.isArray(collection.parameters)) return undefined;
	const values: unknown[] = [];
	for (const entry of collection.parameters) {
		if (!isRecord(entry) || typeof entry.name !== 'string') continue;
		if (header ? entry.name.toLowerCase() === name.toLowerCase() : entry.name === name) {
			values.push(entry.value);
		}
	}
	if (values.length === 0) return undefined;
	return [
		...['url', 'requestUrl', 'authentication', 'genericAuthType', 'nodeCredentialType'].map(
			(key) => params[key],
		),
		values,
		params[header ? 'sendHeaders' : 'sendQuery'],
		params[header ? 'specifyHeaders' : 'specifyQuery'],
		params[header ? 'jsonHeaders' : 'jsonQuery'],
		...[
			'redirect',
			'sendCredentialsOnCrossOriginRedirect',
			'proxy',
			'pagination',
			'allowUnauthorizedCerts',
			'lowercaseHeaders',
		].map((key) => options[key]),
		node.credentials ?? {},
	];
}

/** Compare the cause of auth and missing-output findings, not unrelated node edits. */
export function downgradeUnchangedNodeBlockers(
	warnings: ValidationWarning[],
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON | undefined,
): ValidationWarning[] {
	if (!savedWorkflow) return warnings;

	const findCounterpart = counterpartFinder(savedWorkflow);
	const builtSignatures = connectionSignatures(workflow);
	const savedSignatures = connectionSignatures(savedWorkflow);
	const nodesByName = new Map((workflow.nodes ?? []).map((node) => [node.name, node]));

	return warnings.map((warning) => {
		if (warning.severity === 'informational') return warning;
		if (!warning.nodeName) return warning;
		const node = nodesByName.get(warning.nodeName);
		const saved = node && findCounterpart(node);
		if (
			!node ||
			!saved ||
			(node.id && saved.id && node.id !== saved.id) ||
			node.type !== saved.type ||
			(node.typeVersion ?? 1) !== (saved.typeVersion ?? 1)
		)
			return warning;

		if (warning.code === 'HARDCODED_CREDENTIALS') {
			const url = node.parameters?.url ?? node.parameters?.requestUrl;
			const before = warning.parameterPath && httpAuthentication(saved, warning.parameterPath);
			const after = warning.parameterPath && httpAuthentication(node, warning.parameterPath);
			// ponytail: expression URLs stay blocking; comparing them needs execution data.
			if (
				node.type !== 'n8n-nodes-base.httpRequest' ||
				(node.disabled ?? false) !== (saved.disabled ?? false) ||
				typeof url !== 'string' ||
				containsExpression(url) ||
				!before ||
				!after ||
				!isDeepStrictEqual(before, after)
			)
				return warning;
		} else if (warning.code === 'SWITCH_NO_OUTPUT_CONNECTIONS') {
			if (
				node.type !== 'n8n-nodes-base.switch' ||
				saved.disabled === true ||
				node.disabled === true ||
				(savedSignatures.get(nodeKey(saved)) ?? []).some((edge) => edge.startsWith('out main[')) ||
				(builtSignatures.get(nodeKey(node)) ?? []).some((edge) => edge.startsWith('out main['))
			)
				return warning;
		} else if (warning.code === 'INVALID_PARAMETER' || warning.code === 'chat_model_validation') {
			if (
				!parametersUnchanged(node, saved) ||
				!connectionsUnchanged(node, saved, builtSignatures, savedSignatures)
			)
				return warning;
			if (
				warning.code === 'chat_model_validation' &&
				(!isDeepStrictEqual(node.credentials ?? {}, saved.credentials ?? {}) ||
					(node.disabled ?? false) !== (saved.disabled ?? false))
			)
				return warning;
		} else {
			return warning;
		}

		return {
			...warning,
			severity: 'informational' as const,
			message: `${warning.message} (pre-existing node issue; not blocking this edit)`,
		};
	});
}
