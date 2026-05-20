import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	collectStrings,
	type DirectJsonRefMatch,
	extractDirectJsonColumnRefs,
	extractDirectJsonRefMatches,
	extractNamedRefMatches,
	findAgentSubComponents,
	nodeHasName,
	unique,
} from './column-ref-utils';

export interface AgentInputColumns {
	agentNodeName: string;
	inputColumns: string[];
}

export type DirectJsonRef = DirectJsonRefMatch & { column: string; targetNodeName: string };

const FALLBACK_COLUMN = 'input';

export function analyzeAgentInputColumns(
	workflow: WorkflowJSON,
	agentNodeName: string,
): AgentInputColumns {
	const node = (workflow.nodes ?? []).find((n) => nodeHasName(n) && n.name === agentNodeName);
	if (!node) {
		throw new Error(`Agent node "${agentNodeName}" not found in workflow`);
	}

	const strings = collectStrings(node.parameters);
	const refs = unique(strings.flatMap((text) => extractDirectJsonColumnRefs(text)));

	if (refs.length === 0) {
		if (strings.some((text) => extractNamedRefMatches(text).length > 0)) {
			return { agentNodeName, inputColumns: [] };
		}
		return { agentNodeName, inputColumns: [FALLBACK_COLUMN] };
	}
	return { agentNodeName, inputColumns: refs };
}

export function analyzeAgentEvalInputColumns(
	workflow: WorkflowJSON,
	agentNodeName: string,
): AgentInputColumns {
	const agentInput = analyzeAgentInputColumns(workflow, agentNodeName);
	const nodesByName = new Map(
		(workflow.nodes ?? []).filter(nodeHasName).map((n) => [n.name, n] as const),
	);
	const subComponentColumns = findAgentSubComponents(workflow, agentNodeName).flatMap(
		(nodeName) => {
			const node = nodesByName.get(nodeName);
			if (!node) return [];
			return collectStrings(node.parameters).flatMap((text) => extractDirectJsonColumnRefs(text));
		},
	);

	return {
		agentNodeName,
		inputColumns: unique([...agentInput.inputColumns, ...subComponentColumns]),
	};
}

export function detectAgentEvalInputRefs(
	workflow: WorkflowJSON,
	agentNodeName: string,
): DirectJsonRef[] {
	const nodesByName = new Map(
		(workflow.nodes ?? []).filter(nodeHasName).map((n) => [n.name, n] as const),
	);
	const targets = [agentNodeName, ...findAgentSubComponents(workflow, agentNodeName)];
	const refs: DirectJsonRef[] = [];

	for (const targetNodeName of targets) {
		const node = nodesByName.get(targetNodeName);
		if (!node) continue;

		const dedup = new Map<string, DirectJsonRef>();
		for (const text of collectStrings(node.parameters)) {
			for (const match of extractDirectJsonRefMatches(text)) {
				const key = `${match.originalExpression}\x00${match.field}`;
				if (dedup.has(key)) continue;
				dedup.set(key, { ...match, column: match.field, targetNodeName });
			}
		}
		refs.push(...dedup.values());
	}

	return refs;
}
