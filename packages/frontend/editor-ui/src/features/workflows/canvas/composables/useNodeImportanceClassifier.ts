import type { IConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export interface SemanticGroup {
	name: string;
	description: string;
	nodes: string[];
}

export interface ClassificationResult {
	groups: SemanticGroup[];
	standalone: string[];
}

function serializeWorkflow(
	workflowName: string,
	nodes: INodeUi[],
	connections: IConnections,
): string {
	const nodeList = nodes.map((n) => ({
		name: n.name,
		type: n.type,
	}));

	const edges: string[] = [];
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const mainOutputs = nodeConns?.main;
		if (!mainOutputs) continue;
		for (const outputGroup of mainOutputs) {
			if (!outputGroup) continue;
			for (const conn of outputGroup) {
				edges.push(`${sourceName} → ${conn.node}`);
			}
		}
	}

	return JSON.stringify({ workflowName, nodes: nodeList, connections: edges }, null, 2);
}

function stripJsonFences(text: string): string {
	return text
		.replace(/```json?\n?/g, '')
		.replace(/```/g, '')
		.trim();
}

async function callBackend(endpoint: string, prompt: string): Promise<string> {
	const rootStore = useRootStore();
	const result = await makeRestApiRequest<{ content: string }>(
		rootStore.restApiContext,
		'POST',
		endpoint,
		{ prompt },
	);
	return result.content;
}

export async function classifyWorkflowGroups(
	workflowName: string,
	nodes: INodeUi[],
	connections: IConnections,
): Promise<ClassificationResult> {
	const workflow = serializeWorkflow(workflowName, nodes, connections);

	const prompt = `You are analyzing an n8n workflow to identify semantic groups of nodes that work together to accomplish a specific function.

Your job is to cluster nodes into logical groups based on what they DO together in the workflow, and leave important standalone nodes ungrouped.

Rules:
- Each group represents a distinct phase, step, or function in the workflow (e.g. "Data Preparation", "Send Notifications", "Score Evaluation")
- Trigger nodes are ALWAYS standalone — never group them
- AI agents should be grouped WITH their tools, model, memory, and other sub-nodes into one group. An agent and its supporting nodes form a single functional unit — keep them together unless a tool clearly serves a completely different purpose
- Group together nodes that collaborate on the same sub-task: data transformation + routing + intermediate API calls that serve the same purpose
- A node can only be in ONE group
- Each group must have at least 2 nodes
- Not every node needs to be in a group — important nodes should stay standalone
- Aim for 2-5 groups depending on workflow complexity
- Give each group a short name (2-3 words) and a one-sentence description (max 12 words)

Here is the workflow:
${workflow}

Respond with ONLY a JSON object with this structure:
{
  "groups": [
    {"name": "Data Preparation", "description": "Fetches and formats input data for processing", "nodes": ["Set", "HTTP Request"]}
  ],
  "standalone": ["Telegram Trigger", "AI Agent"]
}

No other text.`;

	const content = await callBackend('/node-importance/classify', prompt);

	const jsonStr = stripJsonFences(content);
	const parsed = JSON.parse(jsonStr) as ClassificationResult;

	console.log('[groups] Semantic classification:', parsed);

	return parsed;
}
