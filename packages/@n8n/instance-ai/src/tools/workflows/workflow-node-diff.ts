/**
 * Node-level diff between a built workflow and its previously saved version.
 *
 * `build-workflow` round-trips the whole workflow (get-as-code → edit → build),
 * so every build re-submits nodes the user never asked to touch. These helpers
 * let the build pipeline tell touched nodes apart from pre-existing ones, so
 * validation and setup routing never punish a node for merely being present.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { isDeepStrictEqual } from 'node:util';

import type { ValidationWarning } from './workflow-validation-warnings';

type NodeJSON = WorkflowJSON['nodes'][number];

function nodesByName(workflow: WorkflowJSON): Map<string, NodeJSON> {
	const byName = new Map<string, NodeJSON>();
	for (const node of workflow.nodes ?? []) {
		if (node.name) byName.set(node.name, node);
	}
	return byName;
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
		isDeepStrictEqual(node.credentials ?? {}, saved.credentials ?? {}) &&
		(node.disabled ?? false) === (saved.disabled ?? false)
	);
}

/**
 * Names of nodes this build added or modified relative to the saved workflow
 * (type, typeVersion, parameters, credentials, or disabled state differ).
 * Unnamed nodes are always treated as changed.
 */
export function computeChangedNodeNames(
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON,
): string[] {
	const savedByName = nodesByName(savedWorkflow);
	const changed: string[] = [];
	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		const saved = savedByName.get(node.name);
		if (!saved || !nodeUnchanged(node, saved)) {
			changed.push(node.name);
		}
	}
	return changed;
}

/**
 * Downgrade blocking `INVALID_PARAMETER` findings to informational when the
 * node's type/version/parameters are identical to the saved workflow. The node
 * already exists (and runs) in exactly this shape, so failing the build on it
 * only forces the agent to decorate nodes the user never asked to touch —
 * which is how unrelated nodes end up in the setup flow (INS-997).
 */
export function downgradeUnchangedNodeBlockers(
	warnings: ValidationWarning[],
	workflow: WorkflowJSON,
	savedWorkflow: WorkflowJSON | undefined,
): ValidationWarning[] {
	if (!savedWorkflow) return warnings;

	const savedByName = nodesByName(savedWorkflow);
	const unchangedNames = new Set<string>();
	for (const node of workflow.nodes ?? []) {
		if (!node.name) continue;
		const saved = savedByName.get(node.name);
		if (saved && parametersUnchanged(node, saved)) unchangedNames.add(node.name);
	}
	if (unchangedNames.size === 0) return warnings;

	return warnings.map((warning) => {
		if (warning.severity === 'informational') return warning;
		if (warning.code !== 'INVALID_PARAMETER') return warning;
		if (!warning.nodeName || !unchangedNames.has(warning.nodeName)) return warning;
		return {
			...warning,
			severity: 'informational' as const,
			message: `${warning.message} (pre-existing node, unchanged by this build — not blocking)`,
		};
	});
}
