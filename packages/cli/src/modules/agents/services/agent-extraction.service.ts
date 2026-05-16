import type {
	AgentJsonConfig,
	AgentJsonMemoryConfig,
	AgentJsonToolConfig,
	ExtractAgentWarning,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode, INodeCredentials, INodeParameters } from 'n8n-workflow';
import { mapConnectionsByDestination, NodeConnectionTypes, UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
const AGENT_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.agentTool';
const TOOL_WORKFLOW_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';

/**
 * LM node type → AgentJsonConfig `provider` slug. Slugs match the catalog ids
 * accepted by `AgentJsonConfig.model` (format: `provider/model-name`) and the
 * defaults in `builder/interactive/llm-provider-defaults.ts`.
 *
 * Nodes not in this map produce a warning and the agent is created with an
 * empty `model` string (still a valid draft per `DraftAgentModelSchema`).
 */
const LM_NODE_TO_PROVIDER: Record<string, string> = {
	'@n8n/n8n-nodes-langchain.lmChatAnthropic': 'anthropic',
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': 'openai',
	'@n8n/n8n-nodes-langchain.lmChatGoogleGemini': 'google',
	'@n8n/n8n-nodes-langchain.lmChatGoogleVertex': 'google-vertex',
	'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi': 'azure',
	'@n8n/n8n-nodes-langchain.lmChatAwsBedrock': 'bedrock',
	'@n8n/n8n-nodes-langchain.lmChatOllama': 'ollama',
	'@n8n/n8n-nodes-langchain.lmChatVercelAiGateway': 'vercel',
	'@n8n/n8n-nodes-langchain.lmChatXAiGrok': 'xai',
	'@n8n/n8n-nodes-langchain.lmChatGroq': 'groq',
	'@n8n/n8n-nodes-langchain.lmChatOpenRouter': 'openrouter',
	'@n8n/n8n-nodes-langchain.lmChatDeepSeek': 'deepseek',
	'@n8n/n8n-nodes-langchain.lmChatCohere': 'cohere',
	'@n8n/n8n-nodes-langchain.lmChatMistralCloud': 'mistral',
};

/**
 * Memory node type → `AgentJsonMemoryConfig.storage`. Storage backends with
 * portable connection info (postgres) are mapped 1:1; in-memory backends
 * collapse to `'n8n'`. Other backends (Redis, Mongo, Xata, Zep, Motorhead)
 * fall back to `'n8n'` with a warning so the connection config isn't
 * silently dropped.
 */
const MEMORY_NODE_TO_STORAGE: Record<string, AgentJsonMemoryConfig['storage']> = {
	'@n8n/n8n-nodes-langchain.memoryBufferWindow': 'n8n',
	'@n8n/n8n-nodes-langchain.memoryPostgresChat': 'postgres',
};

export interface ExtractAgentInput {
	workflowId: string;
	nodeName: string;
	projectId: string;
	name?: string;
	description?: string;
}

export interface ExtractAgentMappingResult {
	config: AgentJsonConfig;
	provider: string | null;
	model: string | null;
	credentialId: string | null;
	warnings: ExtractAgentWarning[];
}

@Service()
export class AgentExtractionService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * Build an `AgentJsonConfig` (plus denormalized provider/model/credential)
	 * from an Agent node inside a workflow. Pure mapping — does not persist.
	 *
	 * The caller is responsible for verifying that the workflow is reachable in
	 * `projectId` and that the user has the right scopes. This method only
	 * validates the workflow exists and that the named node is an Agent node.
	 */
	async buildConfig(input: ExtractAgentInput): Promise<ExtractAgentMappingResult> {
		const { workflowId, nodeName, projectId } = input;

		this.logger.debug('Building agent config from workflow node', {
			workflowId,
			nodeName,
			projectId,
		});

		const workflow = await this.workflowRepository.findById(workflowId);
		if (!workflow) {
			throw new NotFoundError(`Workflow "${workflowId}" not found`);
		}

		const sharedInProject = workflow.shared?.some((s) => s.projectId === projectId);
		if (!sharedInProject) {
			throw new NotFoundError(`Workflow "${workflowId}" not found in project`);
		}

		const agentNode = workflow.nodes.find((n) => n.name === nodeName);
		if (!agentNode) {
			throw new NotFoundError(`Node "${nodeName}" not found in workflow`);
		}

		if (agentNode.type !== AGENT_NODE_TYPE) {
			throw new UserError(
				`Node "${nodeName}" is of type "${agentNode.type}", expected "${AGENT_NODE_TYPE}"`,
			);
		}

		const nodesByName = new Map(workflow.nodes.map((n) => [n.name, n]));
		const connectionsByDest = mapConnectionsByDestination(workflow.connections);

		const warnings: ExtractAgentWarning[] = [];

		const lmInfo = this.resolveLanguageModel(agentNode, nodesByName, connectionsByDest, warnings);
		const memory = this.resolveMemory(agentNode, nodesByName, connectionsByDest, warnings);
		const tools = this.resolveTools(agentNode, nodesByName, connectionsByDest);
		this.resolveOutputParser(agentNode, connectionsByDest, warnings);

		const instructions = extractInstructions(agentNode);

		const config: AgentJsonConfig = {
			name: input.name?.trim() || agentNode.name,
			description: input.description?.trim() || undefined,
			model: lmInfo.model ?? '',
			credential: lmInfo.credentialId ?? undefined,
			instructions,
			tools,
			skills: [],
			...(memory ? { memory } : {}),
		};

		return {
			config,
			provider: lmInfo.provider,
			model: lmInfo.modelName,
			credentialId: lmInfo.credentialId,
			warnings,
		};
	}

	private resolveLanguageModel(
		agentNode: INode,
		nodesByName: Map<string, INode>,
		connectionsByDest: IConnections,
		warnings: ExtractAgentWarning[],
	): {
		/** Full `provider/model-name` string for AgentJsonConfig.model, or null. */
		model: string | null;
		/** Bare model name (e.g. `claude-sonnet-4-6`), for the entity column. */
		modelName: string | null;
		provider: string | null;
		credentialId: string | null;
	} {
		const lmConnections = getParentsByType(
			connectionsByDest,
			agentNode.name,
			NodeConnectionTypes.AiLanguageModel,
		);

		if (lmConnections.length === 0) {
			warnings.push({
				code: 'lm_missing',
				message:
					'No language model connected to the Agent node. The new agent will be created without a model — set one before publishing.',
				nodeName: agentNode.name,
			});
			return { model: null, modelName: null, provider: null, credentialId: null };
		}

		if (lmConnections.length > 1) {
			warnings.push({
				code: 'fallback_model_dropped',
				message: `Agent had ${lmConnections.length} language models (primary + fallback). Only the primary was extracted — first-class agents do not yet support a fallback model.`,
				nodeName: agentNode.name,
			});
		}

		const lmNode = nodesByName.get(lmConnections[0]);
		if (!lmNode) {
			return { model: null, modelName: null, provider: null, credentialId: null };
		}

		const provider = LM_NODE_TO_PROVIDER[lmNode.type];
		if (!provider) {
			warnings.push({
				code: 'unknown_lm_provider',
				message: `Language model node type "${lmNode.type}" is not supported by first-class agents. Pick a model manually on the new agent.`,
				nodeName: lmNode.name,
			});
		}

		const modelName = extractModelName(lmNode);
		const credentialId = firstCredentialId(lmNode.credentials);

		if (provider && !modelName) {
			warnings.push({
				code: 'model_missing',
				message: `Language model node "${lmNode.name}" has no model selected. Set one on the new agent.`,
				nodeName: lmNode.name,
			});
		}

		if (provider && !credentialId) {
			warnings.push({
				code: 'lm_credential_missing',
				message: `Language model node "${lmNode.name}" has no credential set. Attach one on the new agent.`,
				nodeName: lmNode.name,
			});
		}

		const fullModel = provider && modelName ? `${provider}/${modelName}` : null;

		return { model: fullModel, modelName, provider: provider ?? null, credentialId };
	}

	private resolveMemory(
		agentNode: INode,
		nodesByName: Map<string, INode>,
		connectionsByDest: IConnections,
		warnings: ExtractAgentWarning[],
	): AgentJsonMemoryConfig | null {
		const memConnections = getParentsByType(
			connectionsByDest,
			agentNode.name,
			NodeConnectionTypes.AiMemory,
		);

		if (memConnections.length === 0) return null;

		const memNode = nodesByName.get(memConnections[0]);
		if (!memNode) return null;

		const knownStorage = MEMORY_NODE_TO_STORAGE[memNode.type];
		const storage: AgentJsonMemoryConfig['storage'] = knownStorage ?? 'n8n';

		if (!knownStorage) {
			warnings.push({
				code: 'memory_type_unsupported',
				message: `Memory node "${memNode.name}" of type "${memNode.type}" is not directly supported by first-class agents — memory was set to "n8n" in-memory. Reconfigure on the new agent if you need persistent storage.`,
				nodeName: memNode.name,
			});
		}

		const memory: AgentJsonMemoryConfig = { enabled: true, storage };
		const lastMessages = readNumberParam(memNode.parameters, 'contextWindowLength');
		if (typeof lastMessages === 'number' && lastMessages >= 1) {
			memory.lastMessages = Math.min(lastMessages, 200);
		}
		return memory;
	}

	private resolveTools(
		agentNode: INode,
		nodesByName: Map<string, INode>,
		connectionsByDest: IConnections,
	): AgentJsonToolConfig[] {
		const toolNames = getParentsByType(
			connectionsByDest,
			agentNode.name,
			NodeConnectionTypes.AiTool,
		);

		const tools: AgentJsonToolConfig[] = [];
		for (const toolName of toolNames) {
			const toolNode = nodesByName.get(toolName);
			if (!toolNode) continue;

			if (toolNode.type === AGENT_TOOL_NODE_TYPE || toolNode.type === AGENT_NODE_TYPE) {
				throw new UserError(
					`Nested agents are not supported. Tool node "${toolNode.name}" is an Agent — extract or remove it before extracting the parent agent.`,
				);
			}

			tools.push(buildToolConfig(toolNode));
		}

		return tools;
	}

	private resolveOutputParser(
		agentNode: INode,
		connectionsByDest: IConnections,
		warnings: ExtractAgentWarning[],
	): void {
		const parsers = getParentsByType(
			connectionsByDest,
			agentNode.name,
			NodeConnectionTypes.AiOutputParser,
		);
		if (parsers.length > 0) {
			warnings.push({
				code: 'output_parser_dropped',
				message: `Agent had an output parser connected (${parsers.length} node${parsers.length > 1 ? 's' : ''}). First-class agents do not yet model output parsers — the parser was dropped.`,
				nodeName: agentNode.name,
			});
		}
	}
}

function getParentsByType(
	connectionsByDest: IConnections,
	nodeName: string,
	type: string,
): string[] {
	const slots = connectionsByDest[nodeName]?.[type];
	if (!slots) return [];
	const names: string[] = [];
	for (const slot of slots) {
		for (const conn of slot ?? []) {
			names.push(conn.node);
		}
	}
	return names;
}

function extractInstructions(agentNode: INode): string {
	const params = agentNode.parameters ?? {};
	const promptType = params.promptType;
	const text = params.text;
	const systemMessage = readNestedString(params, ['options', 'systemMessage']);
	// `text` is the user message when promptType === 'define'; `systemMessage`
	// (under `options`) is the canonical instructions slot. Prefer
	// systemMessage; fall back to `text` only if it looks like a system prompt
	// (promptType === 'define' with no systemMessage means the user wrote the
	// "instructions" into the user-message field).
	if (typeof systemMessage === 'string' && systemMessage.trim().length > 0) {
		return systemMessage;
	}
	if (promptType === 'define' && typeof text === 'string' && text.trim().length > 0) {
		return text;
	}
	return '';
}

function extractModelName(lmNode: INode): string | null {
	const value = lmNode.parameters?.model;
	if (typeof value === 'string' && value.trim().length > 0) return value.trim();
	if (value && typeof value === 'object' && 'value' in value) {
		const inner = (value as { value: unknown }).value;
		if (typeof inner === 'string' && inner.trim().length > 0) return inner.trim();
	}
	// Some providers store the model name under `modelName` or under
	// `options.modelName` — try both before giving up.
	const modelName = lmNode.parameters?.modelName;
	if (typeof modelName === 'string' && modelName.trim().length > 0) return modelName.trim();
	const nestedModelName = readNestedString(lmNode.parameters, ['options', 'modelName']);
	if (typeof nestedModelName === 'string' && nestedModelName.trim().length > 0) {
		return nestedModelName.trim();
	}
	return null;
}

function firstCredentialId(credentials: INodeCredentials | undefined): string | null {
	if (!credentials) return null;
	for (const entry of Object.values(credentials)) {
		if (entry?.id) return entry.id;
	}
	return null;
}

function readNumberParam(params: INodeParameters | undefined, key: string): number | null {
	const value = params?.[key];
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function readNestedString(params: INodeParameters | undefined, path: string[]): string | null {
	let current: unknown = params;
	for (const key of path) {
		if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
			current = (current as Record<string, unknown>)[key];
		} else {
			return null;
		}
	}
	return typeof current === 'string' ? current : null;
}

function buildToolConfig(toolNode: INode): AgentJsonToolConfig {
	const toolDescription = readToolDescription(toolNode);

	if (toolNode.type === TOOL_WORKFLOW_NODE_TYPE) {
		const workflowId = extractWorkflowId(toolNode);
		// Without a workflow id the tool reference is unusable; fall through to
		// `node` so the user at least sees the original node configuration.
		if (workflowId) {
			const name = readStringParam(toolNode.parameters, 'name') ?? toolNode.name;
			return {
				type: 'workflow',
				workflow: workflowId,
				name,
				...(toolDescription ? { description: toolDescription } : {}),
			};
		}
	}

	return {
		type: 'node',
		name: toolNode.name,
		...(toolDescription ? { description: toolDescription } : {}),
		node: {
			nodeType: toolNode.type,
			nodeTypeVersion: toolNode.typeVersion,
			nodeParameters: toolNode.parameters ?? {},
			...(toolNode.credentials
				? { credentials: pickCredentialsForNodeConfig(toolNode.credentials) }
				: {}),
		},
	};
}

function readToolDescription(toolNode: INode): string | undefined {
	const direct = readStringParam(toolNode.parameters, 'toolDescription');
	if (direct) return direct;
	const description = readStringParam(toolNode.parameters, 'description');
	if (description) return description;
	return undefined;
}

function readStringParam(params: INodeParameters | undefined, key: string): string | null {
	const value = params?.[key];
	if (typeof value === 'string' && value.trim().length > 0) return value;
	return null;
}

function extractWorkflowId(toolNode: INode): string | null {
	const direct = readStringParam(toolNode.parameters, 'workflowId');
	if (direct) return direct;
	const value = toolNode.parameters?.workflowId;
	if (value && typeof value === 'object' && 'value' in value) {
		const inner = (value as { value: unknown }).value;
		if (typeof inner === 'string' && inner.trim().length > 0) return inner.trim();
	}
	return null;
}

function pickCredentialsForNodeConfig(
	credentials: INodeCredentials,
): Record<string, { id: string; name: string }> {
	const result: Record<string, { id: string; name: string }> = {};
	for (const [credType, entry] of Object.entries(credentials)) {
		if (entry?.id) {
			result[credType] = { id: entry.id, name: entry.name };
		}
	}
	return result;
}
