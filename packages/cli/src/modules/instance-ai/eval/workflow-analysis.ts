import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import {
	findAiRootNodeNames,
	type INode,
	type IPinData,
	type IWorkflowBase,
	jsonParse,
	mapConnectionsByDestination,
	UserError,
} from 'n8n-workflow';

import { extractNodeConfig } from './node-config';

/**
 * AI root node types — lets the typo guard accept a no-sub-node Agent.
 * Keep in sync with new agent/chain types in `@n8n/n8n-nodes-langchain`.
 */
const AI_ROOT_NODE_TYPES = new Set<string>([
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.chainLlm',
	'@n8n/n8n-nodes-langchain.chainRetrievalQa',
	'@n8n/n8n-nodes-langchain.chainSummarization',
]);

function isAiRootNodeType(nodeType: string): boolean {
	return AI_ROOT_NODE_TYPES.has(nodeType);
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

/** MCP registry nodes talk via the MCP SDK's own transport, not n8n's HTTP helper — the mock can't reach them, so their root must stay pinned. */
function isMcpRegistryNode(nodeType: string): boolean {
	return nodeType.startsWith('@n8n/mcp-registry.');
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
	const aiRootNodes = findAiRootNodeNames(workflow.connections);

	return workflow.nodes.filter((node) => {
		if (node.disabled) return false;
		if (aiRootNodes.has(node.name) && !exclusionSet?.has(node.name)) return true;
		if (BYPASS_NODE_TYPES.has(node.type)) return true;
		return false;
	});
}

// ---------------------------------------------------------------------------
// Binary dependency detection
// ---------------------------------------------------------------------------

/**
 * Trigger-side binary requirement: a downstream node consumes a binary
 * attachment from the trigger, either by expression (`$binary.data`) or
 * because its node type is known to read binary input.
 */
export interface TriggerBinaryRequirement {
	/** Binary map key on the pinned item (defaults to `data`). */
	propertyName: string;
	/** MIME type for the synthesized fixture. */
	contentType: string;
	/** Filename for the synthesized fixture. */
	filename: string;
}

/**
 * Node types that ALWAYS read a binary attachment from their upstream item,
 * regardless of resource/operation. Service-style nodes (Telegram, Slack, S3,
 * Drive, Dropbox) only consume binary on specific operations — those flows
 * always reference `$binary.<key>` in their parameters, so the expression
 * detector below handles them without needing entries here.
 */
const BINARY_CONSUMER_NODE_TYPES: Record<string, Omit<TriggerBinaryRequirement, 'propertyName'>> = {
	'n8n-nodes-base.extractFromFile': { contentType: 'application/pdf', filename: 'input.pdf' },
	'n8n-nodes-base.readBinaryFile': {
		contentType: 'application/octet-stream',
		filename: 'input.bin',
	},
	'n8n-nodes-base.writeBinaryFile': {
		contentType: 'application/octet-stream',
		filename: 'input.bin',
	},
	'@n8n/n8n-nodes-langchain.documentBinaryInputLoader': {
		contentType: 'application/pdf',
		filename: 'input.pdf',
	},
};

/**
 * Preferred content-type defaults when an upload-flavored node references
 * `$binary.<key>` but the expression alone doesn't say what MIME to use.
 * Looked up ONLY after a positive expression match — never on node type alone.
 */
const PREFERRED_BINARY_DEFAULTS: Record<string, Omit<TriggerBinaryRequirement, 'propertyName'>> = {
	'n8n-nodes-base.telegram': { contentType: 'audio/ogg', filename: 'voice.ogg' },
};

const BINARY_EXPRESSION_RE = /\$binary\.([A-Za-z_][\w-]*)/;

/**
 * Parameter names n8n uses on upload-flavored operations to declare which
 * binary key on the input item to read from. The literal value is the key
 * name — there's no `$binary.X` reference because the node looks it up via
 * `assertBinaryData(itemIndex, binaryPropertyName)` internally.
 */
const BINARY_PROPERTY_PARAM_NAMES = new Set([
	'binaryPropertyName',
	'binaryProperty',
	'dataPropertyName',
	'dataPropertyNameUpload',
	'binaryDataKey',
]);

/**
 * Try to pull a literal string from an n8n expression like `={{ "image" }}` or
 * `={{ 'image' }}`. Returns undefined when the expression has interpolations or
 * references — those can't be resolved without an execution context.
 */
function extractLiteralFromExpression(value: string): string | undefined {
	const trimmed = value.slice(1).trim();
	if (!trimmed.startsWith('{{') || !trimmed.endsWith('}}')) return undefined;
	const inner = trimmed.slice(2, -2).trim();
	const m = /^(["'])(.+)\1$/.exec(inner);
	return m ? m[2] : undefined;
}

function findBinaryPropertyNameParam(params: unknown): { propertyName: string } | undefined {
	if (!params || typeof params !== 'object') return undefined;
	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (BINARY_PROPERTY_PARAM_NAMES.has(key) && typeof value === 'string' && value.length > 0) {
			if (!value.startsWith('=')) return { propertyName: value };
			// `={{ "image" }}` style — extract the literal if we can; otherwise
			// fall back to `data` (the n8n default) so we still attach SOMETHING
			// for the upload node to read.
			const literal = extractLiteralFromExpression(value);
			return { propertyName: literal ?? 'data' };
		}
		if (typeof value === 'object' && value !== null) {
			const nested = findBinaryPropertyNameParam(value);
			if (nested) return nested;
		}
	}
	return undefined;
}

/**
 * Find the binary-attachment requirement for the workflow's trigger, if any
 * downstream node consumes a binary attachment from it. Walks every node
 * parameter looking for (a) `$binary.<key>` expressions, (b) literal
 * `binaryPropertyName: '<key>'` parameters used by upload-flavored operations,
 * or (c) a node type allowlist (Extract from File, Read Binary File, etc.).
 *
 * Returns `undefined` when no downstream consumer reads binary, in which case
 * the trigger emits only its `json` payload.
 */
export function detectBinaryDependencies(
	workflow: IWorkflowBase,
): TriggerBinaryRequirement | undefined {
	let match: { propertyName: string; nodeType: string } | undefined;

	for (const node of workflow.nodes) {
		if (node.disabled) continue;

		const serialized = JSON.stringify(node.parameters ?? {});
		const exprMatch = BINARY_EXPRESSION_RE.exec(serialized);
		if (exprMatch && !match) {
			match = { propertyName: exprMatch[1], nodeType: node.type };
			continue;
		}

		// Literal `binaryPropertyName: 'image'` style — common on upload operations
		// (Slack files.upload, S3 PutObject, Telegram sendVoice, etc.) where the
		// node reads `binary[<value>]` from the input item directly.
		const paramMatch = findBinaryPropertyNameParam(node.parameters);
		if (paramMatch && !match) {
			match = { propertyName: paramMatch.propertyName, nodeType: node.type };
		}
	}

	if (match) {
		const defaults = BINARY_CONSUMER_NODE_TYPES[match.nodeType] ??
			PREFERRED_BINARY_DEFAULTS[match.nodeType] ?? {
				contentType: 'application/octet-stream',
				filename: 'input.bin',
			};
		return { propertyName: match.propertyName, ...defaults };
	}

	for (const node of workflow.nodes) {
		if (node.disabled) continue;
		const defaults = BINARY_CONSUMER_NODE_TYPES[node.type];
		if (defaults) {
			return { propertyName: 'data', ...defaults };
		}
	}

	return undefined;
}

export type AutoPinReason =
	| 'protocol_binary'
	| 'unsupported_vendor_llm'
	| 'unsafe_baseurl_override'
	| 'shared_vendor_llm_subnode';

export interface AutoPinEntry {
	root: string;
	subNode: string;
	subNodeType: string;
	reason: AutoPinReason;
}

// Routing maps for vendor SDK interception. `partitionAiRoots` auto-pins
// shared-sub-node topologies, so each remaining sub-node maps to one root.
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
						// Self-map the root: `LmChatOpenAi.supplyData()` reads
						// `getCredentials('openAiApi')` from a context whose
						// `executeData.node` is sometimes the parent Agent rather
						// than the LLM sub-node — observed empirically against a
						// real LangChain Agent. Without this entry the credential
						// helper's lookup misses, falls back to the no-root URL,
						// and the wire server's loud-fail handler rejects the
						// SDK call. Self-mapping the root keeps the lookup honest
						// regardless of which side of the supplyData boundary
						// asked for the credential.
						subNodeToRoot.set(rootName, rootName);
					}
				}
			}
		}
	}

	return { subNodeToRoot, rootToSubNode };
}

export interface PartitionedAiRoots {
	/** Names of AI roots that will run through the wire-server interception path. */
	unpinNodes: string[];
	/** Names of AI roots that will remain pinned — explicit `pinNodes` + auto-pinned roots. */
	pinNodes: string[];
	/** Per-(root, sub-node) reasons a root was auto-pinned, for diagnostic logging. */
	autoPinned: AutoPinEntry[];
}

/**
 * Default-on partition: every AI root in the workflow runs through the wire
 * server unless one of these applies:
 *   - It's in the caller-supplied `explicitPinNodes` list (opt-out for nodes
 *     the caller wants to keep pinned, e.g. for an A/B comparison).
 *   - One of its inbound `ai_*` sub-nodes is incompatible (protocol-binary
 *     memory/vector store, unsupported vendor LLM, configured
 *     `options.baseURL` that bypasses the credential rewrite).
 *   - It shares a supported vendor LLM sub-node with another root — wire-
 *     server attribution is path-based and first-wins, so multiple roots
 *     fanning into the same sub-node would mis-attribute later turns. Both
 *     sides get auto-pinned.
 *
 * `explicitPinNodes` is validated up front: unknown / disabled / non-AI-root
 * entries throw a `UserError` to surface typos as actionable errors instead
 * of being silently ignored.
 */
export function partitionAiRoots(
	workflow: IWorkflowBase,
	explicitPinNodes: string[] = [],
): PartitionedAiRoots {
	const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]));
	const connectionsByDestination = mapConnectionsByDestination(workflow.connections);
	const allRoots = findAiRootNodeNames(workflow.connections);

	validateExplicitPinNodes(nodesByName, allRoots, explicitPinNodes);

	const explicitPinSet = new Set(explicitPinNodes);
	const sharedSupportedSubNodes = trackSharedSupportedSubNodes(
		connectionsByDestination,
		nodesByName,
		allRoots,
		explicitPinSet,
	);

	const autoPinned: AutoPinEntry[] = [];
	const pinSet = new Set<string>(explicitPinNodes);

	for (const rootName of allRoots) {
		if (explicitPinSet.has(rootName)) continue;

		const inbound = connectionsByDestination[rootName];
		if (!inbound) continue;

		for (const [connType, groups] of Object.entries(inbound)) {
			if (!connType.startsWith('ai_') || !Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					const sourceNode = nodesByName.get(conn.node);
					if (!sourceNode || sourceNode.disabled) continue;

					const reason = categorizeSubNodeIncompatibility(sourceNode, sharedSupportedSubNodes);
					if (reason === null) continue;

					autoPinned.push({
						root: rootName,
						subNode: sourceNode.name,
						subNodeType: sourceNode.type,
						reason,
					});
					pinSet.add(rootName);
				}
			}
		}
	}

	const unpinNodes: string[] = [];
	const pinNodes: string[] = [];
	for (const rootName of allRoots) {
		if (pinSet.has(rootName)) pinNodes.push(rootName);
		else unpinNodes.push(rootName);
	}

	return { unpinNodes, pinNodes, autoPinned };
}

/** Throw `UserError` if any explicit pin entry isn't a real, enabled AI root in the workflow. */
function validateExplicitPinNodes(
	nodesByName: Map<string, INode>,
	aiRootNodes: Set<string>,
	explicitPinNodes: string[],
): void {
	const unknownRoots: string[] = [];
	const disabledRoots: string[] = [];
	const nonAiRoots: string[] = [];
	for (const rootName of explicitPinNodes) {
		const node = nodesByName.get(rootName);
		if (!node) unknownRoots.push(rootName);
		else if (node.disabled) disabledRoots.push(rootName);
		else if (!aiRootNodes.has(rootName) && !isAiRootNodeType(node.type)) {
			nonAiRoots.push(rootName);
		}
	}
	if (unknownRoots.length || disabledRoots.length || nonAiRoots.length) {
		const formatNames = (names: string[]) => names.map((n) => `"${n}"`).join(', ');
		const parts: string[] = [];
		if (unknownRoots.length) parts.push(`not found in workflow: ${formatNames(unknownRoots)}`);
		if (disabledRoots.length) parts.push(`disabled: ${formatNames(disabledRoots)}`);
		if (nonAiRoots.length) parts.push(`not AI root nodes: ${formatNames(nonAiRoots)}`);
		throw new UserError(`Cannot pin — ${parts.join('; ')}.`);
	}
}

/**
 * Walk every AI root in the workflow and record which supported vendor LLM
 * sub-nodes feed more than one root. Used by `categorizeSubNodeIncompatibility`
 * so both sides of a shared sub-node get auto-pinned (attribution would be
 * ambiguous otherwise). Roots in `explicitPinSet` don't contribute — pinning
 * them removes the ambiguity.
 */
function trackSharedSupportedSubNodes(
	connectionsByDestination: ReturnType<typeof mapConnectionsByDestination>,
	nodesByName: Map<string, INode>,
	allRoots: Set<string>,
	explicitPinSet: Set<string>,
): Set<string> {
	const usage = new Map<string, Set<string>>();
	for (const rootName of allRoots) {
		if (explicitPinSet.has(rootName)) continue;
		const inbound = connectionsByDestination[rootName];
		if (!inbound) continue;
		for (const [connType, groups] of Object.entries(inbound)) {
			if (!connType.startsWith('ai_') || !Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					const sourceNode = nodesByName.get(conn.node);
					if (!sourceNode || sourceNode.disabled) continue;
					if (!SUPPORTED_VENDOR_LLM_SUB_NODE_TYPES.has(sourceNode.type)) continue;
					const tracked = usage.get(sourceNode.name) ?? new Set<string>();
					tracked.add(rootName);
					usage.set(sourceNode.name, tracked);
				}
			}
		}
	}
	const shared = new Set<string>();
	for (const [subNodeName, roots] of usage) {
		if (roots.size >= 2) shared.add(subNodeName);
	}
	return shared;
}

/**
 * Return the auto-pin reason for a sub-node, or null if it's safe to intercept.
 * Order: protocol-binary (HTTP can't reach it) → shared (attribution ambiguous) →
 * supported-vendor-with-baseURL-override (SDK bypasses the rewrite) → unsupported
 * vendor LLM (no URL-rewrite mapping yet).
 */
function categorizeSubNodeIncompatibility(
	sourceNode: INode,
	sharedSupportedSubNodes: Set<string>,
): AutoPinReason | null {
	if (PROTOCOL_BINARY_SUB_NODE_TYPES.has(sourceNode.type)) return 'protocol_binary';
	if (isMcpRegistryNode(sourceNode.type)) return 'protocol_binary';
	if (SUPPORTED_VENDOR_LLM_SUB_NODE_TYPES.has(sourceNode.type)) {
		if (sharedSupportedSubNodes.has(sourceNode.name)) return 'shared_vendor_llm_subnode';
		return hasUnsafeBaseUrlOverride(sourceNode) ? 'unsafe_baseurl_override' : null;
	}
	if (isVendorLlmSubNode(sourceNode.type)) return 'unsupported_vendor_llm';
	return null;
}

/** Nodes that should receive mock hints — excludes AI sub-nodes (handled via root) and pinned nodes. */
export function identifyNodesForHints(workflow: IWorkflowBase): INode[] {
	const aiSubNodes = findAiSubNodeNames(workflow);
	const aiRootNodes = findAiRootNodeNames(workflow.connections);
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
