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

	const prompt = `You are analyzing an n8n workflow to create a simplified, readable overview by grouping nodes into logical clusters.

Your goal is to group as MANY nodes as possible so the user sees a clean, high-level picture of what the workflow does. Ideally, only triggers and key destination nodes remain ungrouped — everything else should belong to a group.

Rules for what stays STANDALONE (ungrouped):
- Trigger nodes are ALWAYS standalone — never group them
- Final destination nodes (the last node that sends data to an external service like sending email, posting to Slack, updating a database) should usually be standalone, unless they are tightly coupled with other nodes in a clear sub-task
- Important branching nodes (IF, Switch) that represent a key decision point visible to the user should stay standalone — but only if the branch is meaningful to understanding the workflow's logic

Rules for what goes INTO GROUPS:
- Group aggressively — most nodes should be in a group. A workflow with 15 nodes might have 3-4 groups and only 2-3 standalone nodes
- Each group represents a distinct phase, step, or function (e.g. "Data Preparation", "Error Handling", "AI Processing")
- AI agents should be grouped WITH their tools, model, memory, and other sub-nodes — they form a single functional unit
- Error handling branches (nodes connected to error/false outputs) should be grouped together, often as their own "Error Handling" group or merged into the group they handle errors for
- Non-essential branching (IF/Switch nodes used for simple routing or filtering within a sub-task) should be INSIDE a group, not standalone
- Data transformation chains (Set, Code, Filter, Sort, Merge) should always be grouped with the nodes they serve
- Intermediate API calls that fetch or prepare data for another step belong in the same group as that step
- A node can only be in ONE group
- Each group must have at least 2 nodes

Naming and descriptions:
- Group name: short, 2-4 words (e.g. "Input Validation", "AI Research Agent", "Notification Dispatch")
- Group description: 1-2 sentences explaining what the group accomplishes and why, aimed at someone unfamiliar with the workflow (max 25 words)

Here is the workflow:
${workflow}

Respond with ONLY a JSON object with this structure:
{
  "groups": [
    {"name": "Data Preparation", "description": "Fetches customer data from the CRM and formats it for the AI agent to process", "nodes": ["Set", "HTTP Request"]}
  ],
  "standalone": ["Telegram Trigger", "Send Email"]
}

No other text.`;

	const content = await callBackend('/node-importance/classify', prompt);

	const jsonStr = stripJsonFences(content);
	const parsed = JSON.parse(jsonStr) as ClassificationResult;

	console.log('[groups] Semantic classification:', parsed);

	return parsed;
}
