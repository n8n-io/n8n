import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { LanguageModel, Output } from 'ai';

import type { AgentRuntimeConfig } from './agent-runtime';
import type {
	AgentExecutionCounter,
	AnthropicThinkingConfig,
	BuiltTool,
	GoogleThinkingConfig,
	JSONObject,
	OpenAIThinkingConfig,
	XaiThinkingConfig,
} from '../../types';
import type { AgentPersistenceOptions, ExecutionOptions, ModelConfig } from '../../types/sdk/agent';
import { lockAdditionalProperties } from '../../utils/json-schema';
import { isZodSchema } from '../../utils/zod';
import {
	createRecallMemoryTool,
	getEpisodicMemoryScope,
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	RECALL_MEMORY_TOOL_NAME,
} from '../memory/episodic-memory';
import { loadAi } from '../model/lazy-ai';
import type { AgentMessageList } from '../model/message-list';
import { createModel } from '../model/model-factory';
import {
	buildCallPromptCacheOptions,
	getModelProvider,
	mergeProviderOptions,
} from '../model/prompt-cache';
import type { DeferredToolManager } from '../tools/deferred-tool-manager';
import { buildToolMap, toAiSdkProviderTools, toAiSdkTools } from '../tools/tool-adapter';

/** Wrap tool-instruction fragments in a `<built_in_rules>` block, or `undefined` when there are none. */
function wrapBuiltInRules(fragments: string[]): string | undefined {
	if (fragments.length === 0) return undefined;
	return `<built_in_rules>\n${fragments.map((f) => `- ${f}`).join('\n')}\n</built_in_rules>`;
}

/** Resolve a model config to its canonical `provider/model` id string. */
export function getModelIdString(model: ModelConfig): string {
	if (typeof model === 'string') return model;
	if ('id' in model && typeof model.id === 'string') return model.id;
	if ('modelId' in model && typeof model.modelId === 'string') {
		const rawProvider = 'provider' in model ? String(model.provider) : 'unknown';
		// AI SDK providers stamp a dotted sub-namespace (e.g. 'anthropic.messages',
		// 'openai.chat'); strip it so the id matches the canonical 'provider/model'
		// the billing rate table is keyed on.
		const provider = rawProvider.split('.')[0];
		return `${provider}/${model.modelId}`;
	}
	return 'unknown';
}

export interface StaticLoopContext {
	model: LanguageModel;
	aiProviderTools: ReturnType<typeof toAiSdkProviderTools>;
	providerOptions?: Record<string, JSONObject>;
	outputSpec?: ReturnType<typeof Output.object>;
}

/**
 * Builds the per-run and per-iteration dependencies the agentic loop hands to
 * the LLM call: the model instance, provider/thinking options, structured
 * output spec, and the effective tool surface (base + deferred + recall tools,
 * mapped to AI SDK shapes). Keeps tool/model assembly out of the loop body.
 */
export class RuntimeContextBuilder {
	constructor(
		private readonly config: AgentRuntimeConfig,
		private readonly deferredToolManager: DeferredToolManager | undefined,
	) {}

	get modelId(): string {
		return getModelIdString(this.config.model);
	}

	/** Build run-stable LLM call dependencies shared by all iterations. */
	buildStaticLoopContext(
		execOptions?: ExecutionOptions & { persistence?: AgentPersistenceOptions },
	): StaticLoopContext {
		const { Output, jsonSchema } = loadAi();
		const aiProviderTools = toAiSdkProviderTools(this.config.providerTools);
		const model = createModel(this.config.model, this.config.modelFetch);
		const outputSchema = this.config.structuredOutput;
		const isRawJsonSchemaOutput = outputSchema !== undefined && !isZodSchema(outputSchema);
		const providerOptions = this.relaxStrictJsonSchemaIfNeeded(
			this.buildCallProviderOptions(execOptions?.providerOptions),
			isRawJsonSchemaOutput,
		);

		const outputSpec = outputSchema
			? Output.object({
					// Zod schemas pass through directly; a raw JSON Schema gets
					// `additionalProperties: false` locked onto every object (required by Anthropic)
					// and wrapped with the AI SDK's `jsonSchema()` helper.
					schema: isZodSchema(outputSchema)
						? outputSchema
						: jsonSchema(lockAdditionalProperties(outputSchema)),
				})
			: undefined;

		return {
			model,
			aiProviderTools,
			providerOptions: providerOptions as Record<string, JSONObject> | undefined,
			outputSpec,
		};
	}

	/** Build the current local tool view; deferred loads can change this between iterations. */
	buildToolLoopContext(
		aiProviderTools: ReturnType<typeof toAiSdkProviderTools>,
		persistence?: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
	) {
		const allUserTools = this.getCurrentTools(persistence, executionCounter);
		const aiTools = toAiSdkTools(allUserTools);
		const allTools = { ...aiTools, ...aiProviderTools };
		const aiToolCount = Object.keys(allTools).length;
		const toolMap = buildToolMap(allUserTools);
		const { instructions: effectiveInstructions, volatileInstructions } =
			this.composeEffectiveInstructions(allUserTools);

		return {
			toolMap,
			aiTools: allTools,
			hasTools: aiToolCount > 0,
			effectiveInstructions,
			volatileInstructions,
			staticToolCacheName: this.getStaticToolCacheName(allUserTools),
		};
	}

	/**
	 * Name of the tool eligible for an Anthropic tool-definitions cache
	 * breakpoint, or `undefined` if the tool set isn't fully static. Deferred
	 * (controller/loaded) tools can appear mid-conversation via `load_tool`, so
	 * they disqualify caching — marking a tool block that later changes would
	 * invalidate the cache.
	 */
	private getStaticToolCacheName(allUserTools: BuiltTool[]): string | undefined {
		if (this.deferredToolManager?.hasTools) return undefined;
		return allUserTools.at(-1)?.name;
	}

	getCurrentTools(
		persistence?: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
	): BuiltTool[] {
		const baseTools = this.config.tools ?? [];
		const tools = [
			...baseTools,
			...(this.deferredToolManager?.hasTools
				? [
						...this.deferredToolManager.getControllerTools(),
						...this.deferredToolManager.getLoadedTools(),
					]
				: []),
		];

		const recallTool = this.createRecallMemoryToolForRun(persistence, tools, executionCounter);
		return recallTool ? [...tools, recallTool] : tools;
	}

	hydrateDeferredToolsFromList(list: AgentMessageList): void {
		if (!this.deferredToolManager?.hasTools) return;
		this.deferredToolManager.hydrateLoadedToolsFromMessages(list.serialize().messages);
	}

	/**
	 * When structured output is driven by a raw JSON Schema (e.g. one a user
	 * typed into a workflow node), opt out of strict JSON Schema validation for
	 * the providers that default to it (OpenAI, Groq). Their strict mode rejects
	 * schemas whose objects don't list every property in `required` or that use
	 * keywords it doesn't allow — common in hand-written schemas. With strict off
	 * the provider still steers generation toward the schema, and the runtime
	 * validates the model's output against it afterwards.
	 *
	 * Zod-defined output keeps strict mode (zod-to-json-schema already produces a
	 * strict-compliant schema). Providers that hardcode strict (e.g. xAI) or use
	 * a different namespace (e.g. Azure) are unaffected and remain strict.
	 */
	private relaxStrictJsonSchemaIfNeeded(
		providerOptions: Record<string, Record<string, unknown>> | undefined,
		isRawJsonSchemaOutput: boolean,
	): Record<string, Record<string, unknown>> | undefined {
		if (!isRawJsonSchemaOutput) return providerOptions;

		const result: Record<string, Record<string, unknown>> = { ...providerOptions };
		for (const provider of ['openai', 'groq']) {
			// Keep any caller-provided value (spread last so it wins).
			result[provider] = { strictJsonSchema: false, ...result[provider] };
		}
		return result;
	}

	private createRecallMemoryToolForRun(
		persistence: AgentPersistenceOptions | undefined,
		existingTools: BuiltTool[],
		executionCounter?: AgentExecutionCounter,
	): BuiltTool | undefined {
		const { memory, episodicMemory } = this.config;
		if (
			!memory ||
			!episodicMemory ||
			!isEpisodicMemoryEnabled(episodicMemory) ||
			!hasEpisodicMemoryStore(memory)
		) {
			return undefined;
		}
		const scope = getEpisodicMemoryScope(persistence);
		if (!scope) return undefined;
		if (existingTools.some((tool) => tool.name === RECALL_MEMORY_TOOL_NAME)) {
			throw new Error(
				`Tool name "${RECALL_MEMORY_TOOL_NAME}" is reserved while episodic memory is enabled.`,
			);
		}
		return createRecallMemoryTool({ memory, config: episodicMemory, scope, executionCounter });
	}

	/**
	 * Merge tool-attached `systemInstruction` fragments into the agent's
	 * configured instructions, split by stability:
	 *
	 * - `instructions`: fragments from tools present for the life of the run
	 *   (base tools, deferred-tool controllers, the recall tool) plus the
	 *   user's instructions. Sent as the cached system message.
	 * - `volatileInstructions`: fragments from deferred tools loaded mid-
	 *   conversation via `load_tool`. Kept out of the cached message —
	 *   growing it the moment a tool loads would invalidate the whole
	 *   prefix (OpenAI's automatic cache, and the Anthropic breakpoint) for
	 *   the rest of the conversation. Sent as the uncached system message
	 *   instead (see `buildSystemMessages`).
	 */
	private composeEffectiveInstructions(tools: BuiltTool[]): {
		instructions: string;
		volatileInstructions: string | undefined;
	} {
		const loadedToolNames = new Set(
			this.deferredToolManager?.getLoadedTools().map((t) => t.name) ?? [],
		);
		const stableFragments: string[] = [];
		const volatileFragments: string[] = [];
		for (const tool of tools) {
			if (
				typeof tool.systemInstruction !== 'string' ||
				tool.systemInstruction.trim().length === 0
			) {
				continue;
			}
			(loadedToolNames.has(tool.name) ? volatileFragments : stableFragments).push(
				tool.systemInstruction,
			);
		}

		const userInstructions = this.config.instructions;
		const stableBlock = wrapBuiltInRules(stableFragments);
		const instructions = stableBlock
			? userInstructions
				? `${stableBlock}\n\n${userInstructions}`
				: stableBlock
			: userInstructions;

		return {
			instructions,
			volatileInstructions: wrapBuiltInRules(volatileFragments),
		};
	}

	/** Build the providerOptions object for thinking/reasoning config. */
	private buildThinkingProviderOptions(): Record<string, Record<string, unknown>> | undefined {
		if (!this.config.thinking) return undefined;

		const provider = getModelProvider(this.modelId);
		const thinking = this.config.thinking;

		switch (provider) {
			case 'anthropic': {
				const cfg = thinking as AnthropicThinkingConfig;
				if (cfg.mode === 'adaptive') {
					return {
						anthropic: {
							thinking: {
								type: 'adaptive',
								display: cfg.display ?? 'summarized',
							},
						},
					};
				}
				return {
					anthropic: {
						thinking: { type: 'enabled', budgetTokens: cfg.budgetTokens ?? 10000 },
					},
				};
			}
			case 'openai': {
				const cfg = thinking as OpenAIThinkingConfig;
				return { openai: { reasoningEffort: cfg.reasoningEffort ?? 'medium' } };
			}
			case 'google': {
				const cfg = thinking as GoogleThinkingConfig;
				return {
					google: {
						thinkingConfig: {
							...(cfg.thinkingBudget !== undefined && { thinkingBudget: cfg.thinkingBudget }),
							...(cfg.thinkingLevel !== undefined && { thinkingLevel: cfg.thinkingLevel }),
						},
					},
				};
			}
			case 'xai': {
				const cfg = thinking as XaiThinkingConfig;
				return { xai: { reasoningEffort: cfg.reasoningEffort ?? 'high' } };
			}
			default:
				return undefined;
		}
	}

	/**
	 * Merge thinking providerOptions, generated OpenAI cache options, and
	 * caller-supplied providerOptions. Per-provider keys are merged shallowly
	 * (later wins) so `.thinking()` + prompt caching + caller overrides coexist.
	 */
	private buildCallProviderOptions(
		runProviderOptions?: ProviderOptions,
	): Record<string, Record<string, unknown>> | undefined {
		const thinkingOpts = this.buildThinkingProviderOptions() as ProviderOptions | undefined;
		const cacheOpts = buildCallPromptCacheOptions(this.config.promptCaching, this.modelId, {
			agentName: this.config.name,
			instructions: this.config.instructions,
		});
		return mergeProviderOptions(thinkingOpts, cacheOpts, runProviderOptions) as
			| Record<string, Record<string, unknown>>
			| undefined;
	}
}
