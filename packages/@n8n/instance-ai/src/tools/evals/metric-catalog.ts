import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

export const METRIC_IDS = ['correctness', 'relevance', 'tool_use', 'helpfulness'] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export interface MetricProposal {
	id: string;
	name: string;
	kind: string;
	cannedMetricKey?: string;
	description: string;
	prompt?: string;
	defaultEnabled: boolean;
}

export interface MetricCatalogEntry extends MetricProposal {
	id: MetricId;
	kind: 'llm-judge';
	cannedMetricKey: MetricId;
	prompt: string;
	requiresExpected: boolean;
}

export const METRIC_CATALOG = {
	correctness: {
		id: 'correctness',
		name: 'Correctness',
		kind: 'llm-judge',
		cannedMetricKey: 'correctness',
		description: 'Judge whether the workflow output matches the expected ground-truth response.',
		prompt:
			'Given the input and expected output, rate from 0 to 1 how correct the actual output is.',
		defaultEnabled: true,
		requiresExpected: true,
	},
	relevance: {
		id: 'relevance',
		name: 'Relevance',
		kind: 'llm-judge',
		cannedMetricKey: 'relevance',
		description: 'Judge whether retrieved context is relevant to the user query (RAG).',
		prompt: 'Rate from 0 to 1 how relevant the retrieved documents are to the user query.',
		defaultEnabled: false,
		requiresExpected: false,
	},
	tool_use: {
		id: 'tool_use',
		name: 'Tool use',
		kind: 'llm-judge',
		cannedMetricKey: 'tool_use',
		description: 'Judge whether the agent selected and used the correct tools for the input.',
		prompt:
			'Rate from 0 to 1 how appropriate the tool selection and arguments were for the user query.',
		defaultEnabled: false,
		requiresExpected: false,
	},
	helpfulness: {
		id: 'helpfulness',
		name: 'Helpfulness',
		kind: 'llm-judge',
		cannedMetricKey: 'helpfulness',
		description: 'Judge whether the agent response is helpful to the user.',
		prompt: 'Rate from 0 to 1 how helpful the response is to the user query.',
		defaultEnabled: false,
		requiresExpected: false,
	},
} satisfies Record<MetricId, MetricCatalogEntry>;

function isMetricId(id: string): id is MetricId {
	return (METRIC_IDS as readonly string[]).includes(id);
}

export function getMetricsByIds(ids: string[]): MetricCatalogEntry[] {
	return ids.filter(isMetricId).map((id) => METRIC_CATALOG[id]);
}

function agentHasTools(workflow: WorkflowJSON, agentNodeName: string): boolean {
	const connections = workflow.connections ?? {};
	for (const sourceConnections of Object.values(connections)) {
		if (!isRecord(sourceConnections)) continue;
		const aiTool = sourceConnections.ai_tool;
		if (!Array.isArray(aiTool)) continue;
		for (const slot of aiTool) {
			if (!Array.isArray(slot)) continue;
			for (const conn of slot) {
				if (isRecord(conn) && conn.node === agentNodeName) return true;
			}
		}
	}
	return false;
}

export function proposeDefaultMetricIds(workflow: WorkflowJSON, agentNodeName: string): MetricId[] {
	const ids: MetricId[] = ['correctness'];
	if (agentHasTools(workflow, agentNodeName)) ids.push('tool_use');
	return ids;
}
