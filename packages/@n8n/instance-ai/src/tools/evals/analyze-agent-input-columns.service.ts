import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	collectStrings,
	extractDirectJsonColumnRefs,
	extractNamedRefMatches,
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
