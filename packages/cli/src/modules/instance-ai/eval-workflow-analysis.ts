/**
 * Workflow analysis utilities for evaluation mock execution.
 *
 * Identifies which nodes should receive mock hints and generates consistent
 * per-node hints + trigger data via a single LLM call.
 *
 * Adapted from @n8n/instance-ai/evaluations/support/ — this copy lives
 * in the CLI package because it runs in-process during workflow execution.
 * TODO: Extract to a shared @n8n/eval-utils package for reuse by
 * the eval CLI, MCP, and other consumers.
 */

import type { INode, IWorkflowBase } from 'n8n-workflow';

import { createEvalAgent, extractText } from '@n8n/instance-ai';

// ---------------------------------------------------------------------------
// Node classification
// ---------------------------------------------------------------------------

/**
 * Find node names that are AI sub-nodes (connected via ai_* connection types).
 * These are pinned via their root AI node and should not receive individual hints.
 */
function findAiSubNodeNames(workflow: IWorkflowBase): Set<string> {
	const subNodes = new Set<string>();
	for (const [sourceName, nodeConns] of Object.entries(workflow.connections)) {
		for (const connType of Object.keys(nodeConns)) {
			if (connType.startsWith('ai_')) {
				subNodes.add(sourceName);
			}
		}
	}
	return subNodes;
}

/**
 * Identify which nodes in a workflow should receive mock hints.
 * Returns all active nodes except AI sub-nodes (which are handled via their root).
 * Hints are generated for every node — the mock handler and execution engine
 * decide how to use them (HTTP interception, pin data, or ignored for logic nodes).
 */
export function identifyNodesForHints(workflow: IWorkflowBase): INode[] {
	const aiSubNodes = findAiSubNodeNames(workflow);

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (aiSubNodes.has(node.name)) return false;
		return true;
	});
}

// ---------------------------------------------------------------------------
// Mock hints generation
// ---------------------------------------------------------------------------

export interface MockHints {
	/** Shared data context for all nodes (user IDs, entity names, relationships) */
	globalContext: string;
	/** Per-node hints describing what data to return for each service node */
	nodeHints: Record<string, string>;
	/** Generated trigger output matching what the start node would produce */
	triggerContent: Record<string, unknown>;
}

export interface GenerateMockHintsOptions {
	workflow: IWorkflowBase;
	nodeNames: string[];
	scenarioHints?: string;
}

const SYSTEM_PROMPT = `You are a test data planner for n8n workflow automation. Your job is to create a consistent data context, trigger output data, and per-node hints that will guide an API mock server to generate realistic, coherent responses across all nodes in a workflow.

RULES:
1. Create a "globalContext" that defines the shared world — user IDs, entity names, channel names, email addresses, and relationships that ALL nodes should reference consistently.
2. Create a "triggerContent" object that represents the exact output the workflow's trigger/start node would produce. This is used as pin data (the node's output), so it must match what downstream nodes reference:
   - Look at the trigger node's type to determine the output structure
   - For webhook triggers: include { headers: {}, query: {}, body: { ...fields } } since downstream nodes reference $json.body.fieldName
   - For service-specific triggers (Gmail Trigger, Slack Trigger, etc.): match the service's real event/message output format
   - For schedule triggers: include timestamp fields
   - For manual triggers: include the fields that downstream nodes reference
   - CRITICAL: check what downstream nodes reference (e.g., $json.body.email, $json.subject, $json.text) and ensure those paths exist in triggerContent
3. Create a "nodeHints" object with one entry per node. Each hint describes what data that specific node's API response should contain, referencing entities from the global context.
4. Hints should describe the DATA CONTENT, not the API response format. The mock server already knows the API schema.
5. Ensure data flows logically through the workflow. If node A fetches items that node B processes, the items in A's hint should match what B expects.
6. Use realistic but clearly fake values (e.g., "jane@example.com", "U_abc123").
7. Return ONLY valid JSON, no explanation or markdown fencing.`;

function buildUserPrompt(
	workflow: IWorkflowBase,
	nodeNames: string[],
	scenarioHints?: string,
): string {
	const sections: string[] = [
		'Generate a consistent data context and per-node mock hints for this workflow.',
	];

	if (scenarioHints) {
		sections.push('', '## Test Scenario', '', scenarioHints);
	}

	sections.push('', '## Workflow Nodes', '');
	for (const node of workflow.nodes) {
		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;

		let line = `- ${node.name} (${node.type})`;
		if (resource) line += ` resource:${resource}`;
		if (operation) line += ` op:${operation}`;
		sections.push(line);
	}

	sections.push('', '## Connections', '');
	for (const [sourceName, nodeConns] of Object.entries(workflow.connections)) {
		for (const [connType, outputs] of Object.entries(nodeConns)) {
			if (!Array.isArray(outputs)) continue;
			for (const group of outputs) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					if (typeof conn === 'object' && conn !== null && 'node' in conn) {
						sections.push(`  ${sourceName} -[${connType}]-> ${(conn as { node: string }).node}`);
					}
				}
			}
		}
	}

	sections.push('', '## Expected Output', '', '```json', '{');
	sections.push('  "globalContext": "Shared entities: ...",');
	sections.push('  "triggerContent": { "...exact output the trigger node would produce..." },');
	sections.push('  "nodeHints": {');
	for (let i = 0; i < Math.min(nodeNames.length, 3); i++) {
		const comma = i < Math.min(nodeNames.length, 3) - 1 ? ',' : '';
		sections.push(`    "${nodeNames[i]}": "What data to return..."${comma}`);
	}
	if (nodeNames.length > 3) sections.push('    ...');
	sections.push('  }', '}', '```');

	return sections.join('\n');
}

/**
 * Generate consistent mock hints for service nodes in a workflow.
 * One LLM call produces a global context, trigger data, and per-node hints.
 */
export async function generateMockHints(options: GenerateMockHintsOptions): Promise<MockHints> {
	const { workflow, nodeNames, scenarioHints } = options;
	const emptyHints: MockHints = { globalContext: '', nodeHints: {}, triggerContent: {} };

	if (nodeNames.length === 0) return emptyHints;

	const userPrompt = buildUserPrompt(workflow, nodeNames, scenarioHints);

	try {
		const agent = createEvalAgent('eval-hint-generator', {
			instructions: SYSTEM_PROMPT,
		});

		const result = await agent.generate(userPrompt, {
			providerOptions: { anthropic: { maxTokens: 4096 } },
		});

		let text = extractText(result);

		text = text
			.replace(/^```(?:json)?\s*\n?/i, '')
			.replace(/\n?\s*```\s*$/i, '')
			.trim();

		const parsed = JSON.parse(text) as MockHints;
		if (typeof parsed.globalContext !== 'string' || typeof parsed.nodeHints !== 'object') {
			return emptyHints;
		}
		return {
			globalContext: parsed.globalContext,
			nodeHints: parsed.nodeHints,
			triggerContent:
				typeof parsed.triggerContent === 'object' && parsed.triggerContent !== null
					? parsed.triggerContent
					: {},
		};
	} catch {
		return emptyHints;
	}
}
