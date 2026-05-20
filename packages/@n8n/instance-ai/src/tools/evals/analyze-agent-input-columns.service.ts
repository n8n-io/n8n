import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	collectStrings,
	extractDirectJsonColumnRefs,
	extractNamedRefMatches,
	findAgentSubComponents,
	nodeHasName,
	unique,
} from './column-ref-utils';

export interface AgentInputColumns {
	agentNodeName: string;
	inputColumns: string[];
}

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
