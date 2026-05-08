import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	collectStrings,
	extractNamedRefMatches,
	findAgentSubComponents,
	nodeHasName,
	type NamedRefMatch,
} from './column-ref-utils';

export interface NamedRef {
	/** Source node name extracted from $('NodeName') reference. */
	nodeName: string;
	/** Field after .item.json.<field>. */
	field: string;
	/** Original expression substring, useful for the rewrite step (no $('… surrounding). E.g., "$('Voice or Text').item.json.text". */
	originalExpression: string;
	/** Proposed dataset column name. Equals `field` when unique; otherwise `<node_slug>_<field>` to disambiguate. */
	column: string;
	/** Which node has the parameter that references nodeName. Either the agent itself or a sub-component (memory, tool, ...). */
	targetNodeName: string;
}

function slug(name: string): string {
	const result = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return result.length > 0 ? result : 'node';
}

type RawMatch = NamedRefMatch;

export function detectAgentNamedRefs(workflow: WorkflowJSON, agentNodeName: string): NamedRef[] {
	const node = (workflow.nodes ?? []).find((n) => nodeHasName(n) && n.name === agentNodeName);
	if (!node) {
		throw new Error(`Agent node "${agentNodeName}" not found in workflow`);
	}

	const targets = [agentNodeName, ...findAgentSubComponents(workflow, agentNodeName)];
	const nodesByName = new Map(
		(workflow.nodes ?? []).filter(nodeHasName).map((n) => [n.name, n] as const),
	);

	// First pass: collect, per target, the de-duplicated set of (source, field) raw matches.
	const targetMatches = new Map<string, RawMatch[]>();
	for (const target of targets) {
		const tNode = nodesByName.get(target);
		if (!tNode) continue;
		const matches = collectStrings(tNode.parameters).flatMap((text) =>
			extractNamedRefMatches(text),
		);
		const dedup = new Map<string, RawMatch>();
		for (const m of matches) {
			const key = `${m.nodeName}\x00${m.field}`;
			if (!dedup.has(key)) dedup.set(key, m);
		}
		if (dedup.size > 0) targetMatches.set(target, [...dedup.values()]);
	}

	// Second pass: compute column names with collision detection across all unique source-field pairs.
	const allPairs = new Map<string, { nodeName: string; field: string }>();
	for (const matches of targetMatches.values()) {
		for (const m of matches) {
			const key = `${m.nodeName}\x00${m.field}`;
			if (!allPairs.has(key)) {
				allPairs.set(key, { nodeName: m.nodeName, field: m.field });
			}
		}
	}
	const byField = new Map<string, Array<{ nodeName: string; field: string }>>();
	for (const p of allPairs.values()) {
		const arr = byField.get(p.field) ?? [];
		arr.push(p);
		byField.set(p.field, arr);
	}
	function columnFor(nodeName: string, field: string): string {
		const group = byField.get(field) ?? [];
		return group.length === 1 ? field : `${slug(nodeName)}_${field}`;
	}

	// Third pass: emit one NamedRef per (target, source, field).
	const result: NamedRef[] = [];
	for (const [target, matches] of targetMatches) {
		for (const m of matches) {
			result.push({
				nodeName: m.nodeName,
				field: m.field,
				originalExpression: m.originalExpression,
				column: columnFor(m.nodeName, m.field),
				targetNodeName: target,
			});
		}
	}
	return result;
}
