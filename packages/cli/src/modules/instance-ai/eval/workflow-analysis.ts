import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import {
	type INode,
	type IPinData,
	type IWorkflowBase,
	jsonParse,
	mapConnectionsByDestination,
	UserError,
} from 'n8n-workflow';

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { extractNodeConfig } from './node-config';

/** Targets of `ai_*` connections — Agent/Chain root nodes. Pinning these short-circuits sub-node SDK calls. */
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

/** Sources of `ai_*` connections — LLM/tool/memory sub-nodes. Handled via their root, never pinned individually. */
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

/** Node types that bypass the HTTP mock handler (non-HTTP protocols or non-helper HTTP). */
const BYPASS_NODE_TYPES = new Set([
	'n8n-nodes-base.redis',
	'n8n-nodes-base.mongoDb',
	'n8n-nodes-base.mySql',
	'n8n-nodes-base.postgres',
	'n8n-nodes-base.microsoftSql',
	'n8n-nodes-base.snowflake',
	'n8n-nodes-base.kafka',
	'n8n-nodes-base.rabbitmq',
	'n8n-nodes-base.mqtt',
	'n8n-nodes-base.amqp',
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.ssh',
	'n8n-nodes-base.ldap',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.rssFeedRead',
	'n8n-nodes-base.git',
]);

/** LLM sub-node types whose vendor URL can be rewritten to the wire server (must match `EVAL_PROVIDER_URL_FIELD`). */
const SUPPORTED_VENDOR_LLM_SUB_NODE_TYPES = new Set(['@n8n/n8n-nodes-langchain.lmChatOpenAi']);

/** `lm*` nodes bake the vendor base URL into the SDK; only credential URL rewrite can intercept them. */
function isVendorLlmSubNode(nodeType: string): boolean {
	return nodeType.startsWith('@n8n/n8n-nodes-langchain.lm');
}

/** Non-empty `options.baseURL` on the LangChain OpenAI node beats credentials.url — credential rewrite isn't enough. */
function hasUnsafeBaseUrlOverride(node: INode): boolean {
	if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
		const options = (node.parameters?.options ?? {}) as Record<string, unknown>;
		const baseURL = options.baseURL;
		return typeof baseURL === 'string' && baseURL.trim().length > 0;
	}
	return false;
}

/** AI sub-nodes that speak non-HTTP protocols — can't be intercepted, so their root must stay pinned. */
const PROTOCOL_BINARY_SUB_NODE_TYPES = new Set([
	// Memory backends
	'@n8n/n8n-nodes-langchain.memoryPostgresChat',
	'@n8n/n8n-nodes-langchain.memoryRedisChat',
	'@n8n/n8n-nodes-langchain.memoryMongoDbChat',
	// Vector stores
	'@n8n/n8n-nodes-langchain.vectorStorePGVector',
	'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
	'@n8n/n8n-nodes-langchain.vectorStoreRedis',
	'@n8n/n8n-nodes-langchain.vectorStoreMilvus',
	'@n8n/n8n-nodes-langchain.chatHubVectorStorePGVector',
]);

/** Returns nodes that need pin data — AI roots (unless in `exclusionSet`) and bypass-protocol nodes. */
export function identifyNodesForPinData(
	workflow: IWorkflowBase,
	exclusionSet?: Set<string>,
): INode[] {
	const aiRootNodes = findAiRootNodeNames(workflow);

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (aiRootNodes.has(node.name) && !exclusionSet?.has(node.name)) return true;
		if (BYPASS_NODE_TYPES.has(node.type)) return true;
		return false;
	});
}

type UnpinRefusal = {
	root: string;
	subNode: string;
	subNodeType: string;
	reason: 'protocol_binary' | 'unsupported_vendor_llm' | 'unsafe_baseurl_override';
};

/**
 * Routing maps for vendor SDK interception. `subNodeToRoot` lets the credentials
 * helper embed the calling sub-node's root in the rewritten URL; `rootToSubNode`
 * lets the wire server fetch the sub-node `INode` for the mock handler.
 *
 * Known limitation: when a single vendor LLM sub-node feeds multiple unpinned
 * roots, the first root in `unpinNodes` wins. See the "first wins" test in
 * `workflow-analysis.test.ts` for the contract.
 */
export interface VendorLlmRouting {
	subNodeToRoot: Map<string, string>;
	rootToSubNode: Map<string, INode>;
}

/** Walk inbound `ai_languageModel` connections per unpinned root and build the routing maps. */
export function buildVendorLlmRouting(
	workflow: IWorkflowBase,
	unpinNodes: string[],
): VendorLlmRouting {
	const subNodeToRoot = new Map<string, string>();
	const rootToSubNode = new Map<string, INode>();

	if (unpinNodes.length === 0) return { subNodeToRoot, rootToSubNode };

	const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]));
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);

	for (const rootName of unpinNodes) {
		const inbound = connectionsByDestination[rootName];
		if (!inbound) continue;

		for (const [connType, groups] of Object.entries(inbound)) {
			if (connType !== 'ai_languageModel' || !Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					const subNode = nodesByName.get(conn.node);
					if (!subNode || subNode.disabled) continue;
					if (!SUPPORTED_VENDOR_LLM_SUB_NODE_TYPES.has(subNode.type)) continue;

					if (!subNodeToRoot.has(subNode.name)) {
						subNodeToRoot.set(subNode.name, rootName);
					}
					if (!rootToSubNode.has(rootName)) {
						rootToSubNode.set(rootName, subNode);
					}
				}
			}
		}
	}

	return { subNodeToRoot, rootToSubNode };
}

/** Throws if any unpinned AI root has a sub-node we can't intercept: protocol-binary, unmapped vendor LLM, or unsafe baseURL override. */
export function assertUnpinCompatibility(workflow: IWorkflowBase, unpinNodes: string[]): void {
	if (unpinNodes.length === 0) return;

	const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]));
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);

	const refusals: UnpinRefusal[] = [];

	for (const rootName of unpinNodes) {
		const rootNode = nodesByName.get(rootName);
		if (!rootNode || rootNode.disabled) continue;
		const inbound = connectionsByDestination[rootName];
		if (!inbound) continue;

		for (const [connType, groups] of Object.entries(inbound)) {
			if (!connType.startsWith('ai_') || !Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					const sourceNode = nodesByName.get(conn.node);
					if (!sourceNode || sourceNode.disabled) continue;

					if (PROTOCOL_BINARY_SUB_NODE_TYPES.has(sourceNode.type)) {
						refusals.push({
							root: rootName,
							subNode: sourceNode.name,
							subNodeType: sourceNode.type,
							reason: 'protocol_binary',
						});
					} else if (SUPPORTED_VENDOR_LLM_SUB_NODE_TYPES.has(sourceNode.type)) {
						if (hasUnsafeBaseUrlOverride(sourceNode)) {
							refusals.push({
								root: rootName,
								subNode: sourceNode.name,
								subNodeType: sourceNode.type,
								reason: 'unsafe_baseurl_override',
							});
						}
					} else if (isVendorLlmSubNode(sourceNode.type)) {
						refusals.push({
							root: rootName,
							subNode: sourceNode.name,
							subNodeType: sourceNode.type,
							reason: 'unsupported_vendor_llm',
						});
					}
				}
			}
		}
	}

	if (refusals.length === 0) return;

	const formatPairs = (list: UnpinRefusal[]) =>
		list.map((r) => `"${r.subNode}" (${r.subNodeType}) → "${r.root}"`).join(', ');

	const protocolBinary = refusals.filter((r) => r.reason === 'protocol_binary');
	const unsupportedVendor = refusals.filter((r) => r.reason === 'unsupported_vendor_llm');
	const baseUrlOverride = refusals.filter((r) => r.reason === 'unsafe_baseurl_override');

	const segments: string[] = [];
	if (protocolBinary.length > 0) {
		segments.push(
			`protocol-binary sub-nodes (cannot be intercepted via HTTP): ${formatPairs(protocolBinary)}`,
		);
	}
	if (unsupportedVendor.length > 0) {
		segments.push(
			`unsupported vendor LLM sub-nodes (no eval URL-rewrite mapping yet): ${formatPairs(unsupportedVendor)}`,
		);
	}
	if (baseUrlOverride.length > 0) {
		segments.push(
			`vendor LLM sub-nodes with a configured options.baseURL that bypasses the credential rewrite: ${formatPairs(baseUrlOverride)}`,
		);
	}

	throw new UserError(
		`Cannot unpin AI root nodes — ${segments.join('; ')}. ` +
			'Leave these roots pinned, remove the parameter override, or replace the sub-node with one that has interception support.',
	);
}

/** Nodes that should receive mock hints — excludes AI sub-nodes (handled via root) and pinned nodes. */
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
   - CRITICAL: triggerContent must NEVER be an empty object ({}). Even for scenarios that test empty payloads ("empty submission", "no data", "missing fields"), emit the trigger envelope with empty *nested* fields — an empty webhook is { headers: {}, query: {}, body: {} }, a schedule with no context is { timestamp: "..." }. The workflow cannot execute without trigger output.
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

const MAX_HINT_ATTEMPTS = 2;

/** One LLM call → globalContext + triggerContent + per-node hints. Retried once on structural issues. */
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
	const warnings: string[] = [];

	for (let attempt = 1; attempt <= MAX_HINT_ATTEMPTS; attempt++) {
		let reason = '';
		try {
			const agent = createEvalAgent('eval-hint-generator', {
				instructions: SYSTEM_PROMPT,
			});

			const result = await agent.generate(userPrompt, {
				providerOptions: { anthropic: { maxTokens: 4096 } },
			});

			const text = extractText(result)
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
				reason = `invalid nodeHints structure (raw: ${text.slice(0, 200)})`;
			} else {
				const triggerContent =
					typeof parsed.triggerContent === 'object' &&
					parsed.triggerContent !== null &&
					!Array.isArray(parsed.triggerContent)
						? parsed.triggerContent
						: {};
				if (Object.keys(triggerContent).length === 0) {
					reason = 'empty triggerContent';
				} else {
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
				}
			}
		} catch (error) {
			reason = error instanceof Error ? error.message : String(error);
		}

		warnings.push(`Phase 1 attempt ${attempt}/${MAX_HINT_ATTEMPTS}: ${reason}`);
		if (attempt < MAX_HINT_ATTEMPTS) {
			Container.get(Logger).warn(
				`[EvalMock] Phase 1 attempt ${attempt}/${MAX_HINT_ATTEMPTS} unusable (${reason}) — retrying`,
			);
		}
	}

	Container.get(Logger).error(
		`[EvalMock] Phase 1 exhausted ${MAX_HINT_ATTEMPTS} attempts — ${warnings.join('; ')}`,
	);
	return { ...emptyResult, warnings };
}
