/**
 * Generates stored mock output items for a node tool (AGENT-716): one LLM
 * call produces realistic pin-data-shaped items for the tool's node type,
 * falling back to schema-derived placeholder values when generation is
 * unavailable or fails — mocking must never hard-fail, since it exists
 * precisely to unblock preview when the "real" path (a configured node) isn't
 * available either.
 *
 * Reuses the pure prompt/parse/validate building blocks from
 * `@n8n/workflow-sdk` (`mock-data/`) — the same substrate
 * `modules/instance-ai/eval/pin-data-generator.ts` uses for full-workflow pin
 * data — but is implemented independently here rather than importing from
 * that module, which is an intentionally eval-only boundary.
 */

import type {
	AgentJsonConfig,
	AgentJsonNodeToolConfig,
	AgentJsonNodeToolMockConfig,
	AgentJsonToolConfig,
} from '@n8n/api-types';
import { MAX_TOOL_MOCK_ITEMS_SIZE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import type {
	IDataObject,
	NodeSchemaContext,
	OutputSchemaLookup,
	WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	buildDateAnchors,
	buildPinDataUserPrompt,
	buildSchemaContexts,
	buildFieldViolationRetryMessage,
	collectPinFieldViolations,
	parsePinDataResponse,
	PIN_DATA_SYSTEM_PROMPT,
	repairStructuredOutput,
} from '@n8n/workflow-sdk';
import type { JsonValue } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { AgentConfigService } from './agent-config.service';

/**
 * Hang guard for the mock-generation LLM call. A single-tool prompt is small
 * relative to the full-workflow eval generator, so this stays well under that
 * generator's 180s budget while still tolerating normal model latency.
 */
const MOCK_GENERATION_TIMEOUT_MS = 60_000;

export interface GenerateMockItemsResult {
	items: Array<Record<string, unknown>>;
	/** True when generation was unavailable/failed and a placeholder item was used instead. */
	fallbackUsed: boolean;
}

export interface GenerateAgentToolMockResult {
	toolName: string;
	mock: AgentJsonNodeToolMockConfig;
	fallbackUsed: boolean;
	config: AgentJsonConfig;
	updatedAt: string;
	versionId: string | null;
}

@Service()
export class AgentToolMockService {
	constructor(
		private readonly logger: Logger,
		private readonly agentConfigService: AgentConfigService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	/**
	 * Generate (or regenerate) mock items for a node tool and persist them via
	 * `AgentConfigService.updateConfig` — the single config write path, so the
	 * runtime cache is invalidated and the same validation/sanitization the UI
	 * config editor goes through applies here too.
	 */
	async generateAndPersist(
		agentId: string,
		projectId: string,
		toolName: string,
		user: User,
		source: 'user' | 'builder',
	): Promise<GenerateAgentToolMockResult> {
		const config = await this.agentConfigService.getConfig(agentId, projectId);
		const tools = config.tools ?? [];
		const toolIndex = tools.findIndex((t) => isNodeTool(t) && t.name === toolName);
		if (toolIndex === -1) {
			throw new NotFoundError(`Node tool "${toolName}" not found on this agent`);
		}
		const tool = tools[toolIndex];
		if (!isNodeTool(tool)) {
			// Unreachable: `toolIndex` above only matches entries `isNodeTool` accepts.
			throw new NotFoundError(`Node tool "${toolName}" not found on this agent`);
		}

		const { items: rawItems, fallbackUsed } = await this.generateMockItems(config, tool);
		const items = rawItems.map(toJsonRecord);

		const size = new TextEncoder().encode(JSON.stringify(items)).length;
		if (size > MAX_TOOL_MOCK_ITEMS_SIZE) {
			// Defense-in-depth: the config schema enforces this cap too, but a
			// dedicated check here gives the caller a precise error instead of a
			// generic "Invalid agent config" message from the config write path.
			throw new UserError(
				`Generated mock data for tool "${toolName}" exceeds the ${String(MAX_TOOL_MOCK_ITEMS_SIZE)}-byte limit.`,
			);
		}

		const mock: AgentJsonNodeToolMockConfig = {
			enabled: true,
			items,
			generatedAt: new Date().toISOString(),
			source,
		};

		const nextTools = [...tools];
		nextTools[toolIndex] = { ...tool, mock };

		const {
			config: savedConfig,
			updatedAt,
			versionId,
		} = await this.agentConfigService.updateConfig(
			agentId,
			projectId,
			{ ...config, tools: nextTools },
			user,
			{ modifiedBy: source },
		);

		return { toolName, mock, fallbackUsed, config: savedConfig, updatedAt, versionId };
	}

	/**
	 * Generate mock items for a node tool without persisting — split out so
	 * generation itself is directly testable. Never hard-fails: on any
	 * generation issue a schema-derived placeholder item is returned instead.
	 */
	async generateMockItems(
		agentConfig: AgentJsonConfig,
		tool: AgentJsonNodeToolConfig,
	): Promise<GenerateMockItemsResult> {
		const outputSchemaLookup = this.buildOutputSchemaLookup();
		const node = buildSyntheticNode(tool);
		const workflow = buildSyntheticWorkflow(agentConfig, node);
		const contexts = buildSchemaContexts([node], outputSchemaLookup);

		try {
			const items = await this.generateWithLlm(agentConfig, tool, workflow, contexts);
			if (items.length > 0) {
				return { items, fallbackUsed: false };
			}
		} catch (error) {
			this.logger.warn('Tool mock generation failed; using placeholder fallback', {
				toolName: tool.name,
				nodeType: tool.node.nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return { items: [buildPlaceholderItem(contexts[0]?.schema)], fallbackUsed: true };
	}

	/**
	 * `__schema__` lookup, tolerant of node tool configs storing the generated
	 * `*Tool` LangChain wrapper type (n8n mirrors every `usableAsTool` node
	 * under a `<type>Tool` name at runtime) — its schema files live under the
	 * base node's own directory, so retry without the suffix on a miss.
	 */
	private buildOutputSchemaLookup(): OutputSchemaLookup {
		const lookup = this.loadNodesAndCredentials.createOutputSchemaLookup();
		return (node) => {
			const direct = lookup(node);
			if (direct) return direct;
			if (!node.type.endsWith('Tool')) return undefined;
			return lookup({ ...node, type: node.type.slice(0, -'Tool'.length) });
		};
	}

	private async generateWithLlm(
		agentConfig: AgentJsonConfig,
		tool: AgentJsonNodeToolConfig,
		workflow: WorkflowJSON,
		contexts: NodeSchemaContext[],
	): Promise<Array<Record<string, unknown>>> {
		const userPrompt = buildPinDataUserPrompt(workflow, contexts, {
			instructions: { dataDescription: buildScenarioDescription(agentConfig, tool) },
			dateAnchors: buildDateAnchors(new Date()),
		});

		// Instance-AI billing for now (this is a low-volume preview affordance,
		// not a customer-facing generation feature). No explicit model: the
		// instance's own lane (N8N_INSTANCE_AI_EVAL_MODEL → N8N_INSTANCE_AI_MODEL
		// → default) must resolve, since only that lane carries the custom
		// endpoint URL/headers gateway-routed instances authenticate with. A
		// later change may retarget this to the agent's own configured model —
		// see the pattern in `agent-eval-case-generation.service.ts:164-233`.
		const agent = createEvalAgent('agent-tool-mock-generator', {
			instructions: PIN_DATA_SYSTEM_PROMPT,
		});

		const generateOnce = async (prompt: string) => {
			const result = await agent.generate(prompt, {
				providerOptions: { anthropic: { maxTokens: 2048 } },
				abortSignal: AbortSignal.timeout(MOCK_GENERATION_TIMEOUT_MS),
			});
			const pinData = parsePinDataResponse(extractText(result), [tool.name]);
			const items = pinData[tool.name];
			if (!items || items.length === 0) {
				throw new UserError(`Mock generation returned no data for tool "${tool.name}"`);
			}
			return repairStructuredOutput(pinData, workflow, contexts);
		};

		let pinData = await generateOnce(userPrompt);

		// Field-name drift (declared schema says "total_amount", the model wrote
		// "invoice_amount") silently breaks builder/user edits keyed on the real
		// field names — regenerate once with explicit corrections rather than
		// renaming keys in place, matching the eval pin-data generator's policy.
		const violations = collectPinFieldViolations(pinData, contexts);
		if (violations.length > 0) {
			const retryPrompt = `${userPrompt}\n\n## Correction required\n\n${buildFieldViolationRetryMessage(violations)}`;
			pinData = await generateOnce(retryPrompt);
		}

		const items = pinData[tool.name] ?? [];
		return items.map((item) => (isRecord(item.json) ? item.json : {}));
	}
}

function isNodeTool(tool: AgentJsonToolConfig): tool is AgentJsonNodeToolConfig {
	return tool.type === 'node';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Sanitize a parsed-JSON item into the config schema's `JsonValue` shape.
 * Every item here originates from `JSON.parse`-d LLM output or the
 * placeholder builder below, so this never actually encounters a
 * non-JSON-safe value in practice — it exists so the mock config's stricter
 * `Record<string, JsonValue>` type doesn't need an unchecked cast.
 */
function toJsonValue(value: unknown): JsonValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return value;
	}
	if (Array.isArray(value)) return value.map(toJsonValue);
	if (isRecord(value)) {
		const result: Record<string, JsonValue> = {};
		for (const [key, val] of Object.entries(value)) result[key] = toJsonValue(val);
		return result;
	}
	return null;
}

function toJsonRecord(value: Record<string, unknown>): Record<string, JsonValue> {
	const result: Record<string, JsonValue> = {};
	for (const [key, val] of Object.entries(value)) result[key] = toJsonValue(val);
	return result;
}

function buildSyntheticNode(tool: AgentJsonNodeToolConfig): WorkflowJSON['nodes'][number] {
	return {
		id: 'mock-tool',
		name: tool.name,
		type: tool.node.nodeType,
		typeVersion: tool.node.nodeTypeVersion,
		position: [0, 0],
		// The config schema stores parameters as an unknown-valued record (they
		// are arbitrary, already-validated node parameters); n8n's own JSON data
		// shape (`IDataObject`) is the same thing under a narrower value union.
		parameters: tool.node.nodeParameters as IDataObject,
	};
}

function buildSyntheticWorkflow(
	agentConfig: AgentJsonConfig,
	node: WorkflowJSON['nodes'][number],
): WorkflowJSON {
	return {
		name: agentConfig.name,
		nodes: [node],
		connections: {},
	};
}

/** Seed context so generated items read as scenario-coherent, not generic. */
function buildScenarioDescription(
	agentConfig: AgentJsonConfig,
	tool: AgentJsonNodeToolConfig,
): string {
	const lines = [`Agent: ${agentConfig.name}`];
	if (agentConfig.instructions) lines.push(`Agent instructions: ${agentConfig.instructions}`);
	if (tool.description) lines.push(`Tool description: ${tool.description}`);
	lines.push(
		'Generate output this tool would plausibly return to the agent during a realistic conversation.',
	);
	return lines.join('\n');
}

/**
 * Schema-derived placeholder item for the "never hard-fail" fallback: one
 * empty/placeholder value per declared top-level field, or `{}` when no
 * schema resolved. Mirrors `generate-simulation-fixtures.service.ts`'s
 * one-empty-item fallback.
 */
function buildPlaceholderItem(
	schema: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const properties = isRecord(schema?.properties) ? schema.properties : undefined;
	if (!properties) return {};

	const item: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(properties)) {
		item[key] = placeholderValueForType(isRecord(value) ? value.type : undefined);
	}
	return item;
}

function placeholderValueForType(type: unknown): unknown {
	switch (type) {
		case 'integer':
		case 'number':
			return 0;
		case 'boolean':
			return false;
		case 'array':
			return [];
		case 'object':
			return {};
		default:
			return '';
	}
}
