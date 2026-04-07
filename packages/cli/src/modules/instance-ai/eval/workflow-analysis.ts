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

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { type INode, type IPinData, type IWorkflowBase, jsonParse } from 'n8n-workflow';

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { extractNodeConfig } from './node-config';

// ---------------------------------------------------------------------------
// Node classification
// ---------------------------------------------------------------------------

/**
 * Find node names that are targets of ai_* connections (Agent, Chain nodes).
 * These are "root" AI nodes whose sub-nodes use vendor SDKs. Pinning the root
 * prevents supplyData() on all connected sub-nodes, avoiding SDK calls entirely.
 *
 * Ported from @n8n/instance-ai/evaluations/support/service-node-classifier.ts
 */
function findAiRootNodeNames(workflow: IWorkflowBase): Set<string> {
	const roots = new Set<string>();
	for (const nodeConns of Object.values(workflow.connections)) {
		for (const [connType, outputs] of Object.entries(nodeConns)) {
			if (!connType.startsWith('ai_') || !Array.isArray(outputs)) continue;
			for (const group of outputs) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					if (typeof conn === 'object' && conn !== null && 'node' in conn) {
						roots.add((conn as { node: string }).node);
					}
				}
			}
		}
	}
	return roots;
}

/**
 * Find node names that are sources of ai_* connections (LLM models, tools, memory).
 * These are sub-nodes handled via their root — they should not be pinned individually
 * or receive mock hints.
 *
 * Ported from @n8n/instance-ai/evaluations/support/service-node-classifier.ts
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

// ---------------------------------------------------------------------------
// Bypass node types — nodes that use non-HTTP protocols or bypass n8n's
// request helper functions. These can't be intercepted by the eval mock handler.
// ---------------------------------------------------------------------------

const BYPASS_NODE_TYPES = new Set([
	// Databases (TCP/binary protocol)
	'n8n-nodes-base.redis',
	'n8n-nodes-base.mongoDb',
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
	// Message queues (TCP/binary protocol)
	'n8n-nodes-base.kafka',
	'n8n-nodes-base.rabbitmq',
	'n8n-nodes-base.mqtt',
	'n8n-nodes-base.amqp',
	// File/network protocols
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.ldap',
	'n8n-nodes-base.emailSend',
	// Non-helper HTTP
	'n8n-nodes-base.rssFeedRead',
	'n8n-nodes-base.git',
]);

/**
 * Identify nodes that bypass the HTTP mock layer and need pin data instead.
 * Returns AI root nodes (Agent, Chain) and protocol/bypass nodes.
 */
export function identifyNodesForPinData(workflow: IWorkflowBase): INode[] {
	const aiRootNodes = findAiRootNodeNames(workflow);

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (aiRootNodes.has(node.name)) return true;
		if (BYPASS_NODE_TYPES.has(node.type)) return true;
		return false;
	});
}

/**
 * Identify which nodes in a workflow should receive mock hints.
 * Excludes AI sub-nodes (handled via their root) and nodes that will be
 * pinned (they don't execute, so hints are irrelevant for them).
 */
export function identifyNodesForHints(workflow: IWorkflowBase): INode[] {
	const aiSubNodes = findAiSubNodeNames(workflow);
	const aiRootNodes = findAiRootNodeNames(workflow);
	const pinnedNodeNames = new Set(identifyNodesForPinData(workflow).map((n) => n.name));

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (aiSubNodes.has(node.name)) return false;
		if (aiRootNodes.has(node.name)) return false;
		if (pinnedNodeNames.has(node.name)) return false;
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
	/** Errors encountered during hint generation or mock execution */
	warnings: string[];
	/** Pin data for nodes that bypass the HTTP mock layer (AI roots, protocol nodes) */
	bypassPinData: IPinData;
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
7. **If a "Test Scenario" section is provided, it OVERRIDES your default data generation.** Use the exact names, emails, values, and conditions described in the scenario. If the scenario says "no name field", do NOT include a name. If it says "email is not-an-email", use that exact value. The scenario defines the test — follow it precisely.
8. Return ONLY valid JSON, no explanation or markdown fencing.`;

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
		let line = `- ${node.name} (${node.type})`;
		const config = extractNodeConfig(node);
		if (config) {
			line += ` ${config}`;
		}
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
	const emptyResult: MockHints = {
		globalContext: '',
		nodeHints: {},
		triggerContent: {},
		warnings: [],
		bypassPinData: {},
	};

	if (nodeNames.length === 0) return emptyResult;

	const userPrompt = buildUserPrompt(workflow, nodeNames, scenarioHints);

	try {
		const agent = createEvalAgent('eval-hint-generator', {
			instructions: SYSTEM_PROMPT,
		});

		const result = await agent.generate(userPrompt, {
			providerOptions: { anthropic: { maxTokens: 4096 } },
		});

		let text: string = extractText(result);

		text = text
			.replace(/^```(?:json)?\s*\n?/i, '')
			.replace(/\n?\s*```\s*$/i, '')
			.trim();

		const parsed: Record<string, unknown> = jsonParse(text);

		// globalContext may come back as a string or object — normalize to string
		let globalContext = '';
		if (typeof parsed.globalContext === 'string') {
			globalContext = parsed.globalContext;
		} else if (typeof parsed.globalContext === 'object' && parsed.globalContext !== null) {
			globalContext = JSON.stringify(parsed.globalContext);
		}

		if (
			typeof parsed.nodeHints !== 'object' ||
			parsed.nodeHints === null ||
			Array.isArray(parsed.nodeHints)
		) {
			const preview = text.slice(0, 300);
			return {
				...emptyResult,
				warnings: [`Phase 1: LLM returned invalid structure. Raw: ${preview}`],
			};
		}

		const warnings: string[] = [];
		const triggerContent =
			typeof parsed.triggerContent === 'object' &&
			parsed.triggerContent !== null &&
			!Array.isArray(parsed.triggerContent)
				? parsed.triggerContent
				: {};
		if (Object.keys(triggerContent).length === 0) {
			warnings.push('Phase 1: LLM returned empty triggerContent — trigger node will have no data');
		}

		// Coerce nodeHints values to strings — LLM may return objects instead of strings
		const nodeHints: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed.nodeHints as Record<string, unknown>)) {
			nodeHints[key] = typeof value === 'string' ? value : JSON.stringify(value);
		}

		return {
			globalContext,
			nodeHints,
			triggerContent: triggerContent as Record<string, unknown>,
			warnings,
			bypassPinData: {},
		};
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error);
		Container.get(Logger).error(`[EvalMock] Phase 1 hint generation failed: ${errorMsg}`);
		return { ...emptyResult, warnings: [`Phase 1 error: ${errorMsg}`] };
	}
}
