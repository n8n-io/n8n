import type { ProviderOptions } from '@ai-sdk/provider-utils';
import {
	isAzureFoundryAnthropicModel,
	isOpenRouterAnthropicModel,
	splitModelId,
} from '@n8n/ai-utilities/agent-config';
import type { LanguageModel, Output } from 'ai';

import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';
import { isRuntimeSkillCatalog, isRuntimeToolCatalog } from '../../sdk/message';
import { renderDynamicSkillCatalog } from '../../skills/prompt';
import { UNTRUSTED_OUTPUT_DOCTRINE } from '../../sdk/untrusted-content';
import type {
	AgentExecutionCounter,
	BuiltTool,
	JSONObject,
	NativeToolDeferralConfig,
} from '../../types';
import type { AgentPersistenceOptions, ExecutionOptions } from '../../types/sdk/agent';
import { lockAdditionalProperties } from '../../utils/json-schema';
import { getCatalogModelId, getModelIdString } from '../../utils/model';
import { isZodSchema } from '../../utils/zod';
import {
	createRecallMemoryTool,
	getEpisodicMemoryScope,
	hasEpisodicMemoryStore,
	isEpisodicMemoryEnabled,
	RECALL_MEMORY_TOOL_NAME,
} from '../memory/episodic-memory';
import {
	createFlagMemoryTool,
	FLAG_MEMORY_TOOL_NAME,
	resolveEpisodicMemoryCapture,
} from '../memory/episodic-memory-capture';
import { getGoogleVertexQuirksProvider } from '../model/google-vertex';
import { loadAi } from '../model/lazy-ai';
import type { AgentMessageList } from '../model/message-list';
import {
	createModel,
	resolveNativeToolDeferral,
	supportsSplitSystemMessages,
	usesOfficialAnthropicApi,
} from '../model/model-factory';
import { applyNativeToolDeferral, type NativeToolDeferral } from '../model/native-tool-deferral';
import { applyOpenRouterPromptCache } from '../model/openrouter-prompt-cache';
import {
	applyRuntimeCacheBreakpoints,
	isAnthropicToolDeferred,
	buildCallPromptCacheOptions,
	buildInstructionPromptCacheOptions,
	buildSkillInstructionCacheOptions,
	mergeProviderOptions,
} from '../model/prompt-cache';
import {
	getProviderQuirks,
	PROVIDER_QUIRKS,
	resolveDefaultMaxOutputTokens,
} from '../model/provider-quirks';
import type { ActiveSkills } from '../skills/active-skills';
import type { ToolCatalog } from '../tools/tool-catalog';
import { buildToolMap, toAiSdkProviderTools, toAiSdkTools } from '../tools/tool-adapter';

/**
 * The memory instructions tell the model to call the runtime memory tools by name,
 * so their input schemas must always be sent. A deferred schema makes the model
 * guess the input. Only tools the runtime created for this run are added, so a
 * user tool with the same name keeps its configured deferral when memory is off.
 */
function withEagerMemoryTools(
	config: NativeToolDeferralConfig,
	memoryTools: BuiltTool[],
): NativeToolDeferralConfig {
	return {
		eagerToolNames: [...config.eagerToolNames, ...memoryTools.map((tool) => tool.name)],
	};
}

/** Wrap tool-instruction fragments in a `<built_in_rules>` block, or `undefined` when there are none. */
function wrapBuiltInRules(fragments: string[]): string | undefined {
	if (fragments.length === 0) return undefined;
	return `<built_in_rules>\n${fragments.map((f) => `- ${f}`).join('\n')}\n</built_in_rules>`;
}

function prependBuiltInRules(fragments: string[], instructions: string): string {
	const rules = wrapBuiltInRules(fragments);
	if (!rules) return instructions;
	if (!instructions) return rules;
	return `${rules}\n\n${instructions}`;
}

export interface StaticLoopContext {
	model: LanguageModel;
	aiProviderTools: ReturnType<typeof toAiSdkProviderTools>;
	reasoning: AgentRuntimeConfig['reasoning'];
	providerOptions?: Record<string, JSONObject>;
	outputSpec?: ReturnType<typeof Output.object>;
	maxOutputTokens?: number;
}

/**
 * Builds the per-run and per-iteration dependencies the agentic loop hands to
 * the LLM call: the model instance, reasoning, provider options, structured
 * output spec, and the effective tool surface (base + deferred + recall tools,
 * mapped to AI SDK shapes). Keeps tool/model assembly out of the loop body.
 */
export class RuntimeContextBuilder {
	private nativeToolDeferral?: NativeToolDeferral;

	constructor(
		private readonly config: AgentRuntimeConfig,
		private readonly toolCatalog: ToolCatalog | undefined,
	) {}

	get modelId(): string {
		return getModelIdString(this.config.model);
	}

	/** Build run-stable LLM call dependencies shared by all iterations. */
	buildStaticLoopContext(
		execOptions?: ExecutionOptions & { persistence?: AgentPersistenceOptions },
	): StaticLoopContext {
		const ai = loadAi();
		const aiProviderTools = toAiSdkProviderTools(this.config.providerTools);
		const model = createModel(
			this.config.model,
			this.config.modelFetch,
			this.config.telemetry ?? execOptions?.telemetry,
		);
		this.nativeToolDeferral = this.config.nativeToolDeferral
			? resolveNativeToolDeferral(this.config.model)
			: undefined;
		const outputSchema = this.config.structuredOutput;
		const isRawJsonSchemaOutput = outputSchema !== undefined && !isZodSchema(outputSchema);
		const providerOptions = this.relaxStrictJsonSchemaIfNeeded(
			this.buildCallProviderOptions(execOptions?.providerOptions),
			isRawJsonSchemaOutput,
		);

		const outputSpec = this.buildOutputSpec(outputSchema, ai);

		return {
			model,
			aiProviderTools,
			reasoning: this.resolveReasoning(),
			providerOptions: providerOptions as Record<string, JSONObject> | undefined,
			outputSpec,
			maxOutputTokens: execOptions?.maxOutputTokens ?? resolveDefaultMaxOutputTokens(this.modelId),
		};
	}

	/**
	 * A Foundry deployment name does not say which Claude model it serves, and the
	 * Anthropic SDK picks the thinking shape from the model id. Without the served
	 * model (a failed lookup) a wrong shape would fail the request, so Foundry
	 * Claude then runs without reasoning.
	 */
	private resolveReasoning(): AgentRuntimeConfig['reasoning'] {
		const servedModelUnknown = getCatalogModelId(this.config.model) === this.modelId;
		if (isAzureFoundryAnthropicModel(this.modelId) && servedModelUnknown) return undefined;
		return this.config.reasoning;
	}

	private buildOutputSpec(
		outputSchema: AgentRuntimeConfig['structuredOutput'],
		{ Output, jsonSchema }: ReturnType<typeof loadAi>,
	): StaticLoopContext['outputSpec'] {
		if (!outputSchema) return undefined;
		// Anthropic requires additionalProperties: false on each raw schema object.
		const schema = isZodSchema(outputSchema)
			? outputSchema
			: jsonSchema(lockAdditionalProperties(outputSchema));
		return Output.object({ schema });
	}

	buildInstructionProviderOptions(): ProviderOptions | undefined {
		// Explicit instruction options take precedence over cache defaults.
		return mergeProviderOptions(
			buildInstructionPromptCacheOptions(this.config.promptCaching, this.modelId),
			this.config.instructionProviderOptions,
		);
	}

	private synchronizeSkillCatalog(list: AgentMessageList): void {
		const source = this.config.skillSource;
		const dynamicIds = new Set(source?.dynamicCatalog?.skillIds);
		const hasDynamicSkills = source?.registry.skills.some(
			(skill) => !skill.parents && dynamicIds.has(skill.id),
		);
		// Empty catalogues only need a snapshot to clear earlier dynamic context.
		if (
			!hasDynamicSkills &&
			!source?.dynamicCatalog?.notice &&
			!list.messages().some(isRuntimeSkillCatalog)
		)
			return;
		const content = renderDynamicSkillCatalog(source);
		const previous = list.llmVisibleMessages().filter(isRuntimeSkillCatalog).at(-1);
		if (previous?.data.content === content) return;
		// Append changes to preserve cached history. Restore snapshots hidden by compaction.
		// Runtime context is input, so generated answers must not include it.
		list.addInput([{ type: 'custom', data: { type: 'n8n:runtime-skill-catalog', content } }]);
	}

	/**
	 * Add the list of catalog tool names to the conversation, ahead of the turn's
	 * input. The first list goes in a `<context>` block; a later change goes in a
	 * `<system-reminder>` that replaces it. An unchanged list adds nothing, so the
	 * system prompt and earlier messages stay byte-for-byte the same.
	 */
	synchronizeToolCatalog(list: AgentMessageList): void {
		const catalog = this.toolCatalog?.hasTools ? this.toolCatalog.renderCatalog() : '';
		const previous = list.llmVisibleMessages().filter(isRuntimeToolCatalog).at(-1);
		if ((previous?.data.catalog ?? '') === catalog) return;
		const section = `# Tool catalog\n${catalog || 'No longer applies. No catalog tools are available.'}`;
		const content = previous
			? `<system-reminder>\nThe tool catalog changed. This list replaces the earlier one.\n\n${section}\n</system-reminder>`
			: `<context>\n${section}\n</context>`;
		list.addInput([
			{ type: 'custom', data: { type: 'n8n:runtime-tool-catalog', catalog, content } },
		]);
	}

	/** Build the current local tool view; deferred loads can change this between iterations. */
	async buildToolLoopContext(
		aiProviderTools: ReturnType<typeof toAiSdkProviderTools>,
		persistence?: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		list?: AgentMessageList,
	) {
		const { tools: allUserTools, memoryTools } = this.collectRunTools(
			persistence,
			executionCounter,
			list,
		);
		const aiTools = toAiSdkTools(allUserTools);
		const catalog = { ...aiTools, ...aiProviderTools };
		const { tools: allTools, searchToolName } = this.config.nativeToolDeferral
			? await applyNativeToolDeferral(
					catalog,
					this.nativeToolDeferral,
					withEagerMemoryTools(this.config.nativeToolDeferral, memoryTools),
				)
			: { tools: catalog, searchToolName: undefined };
		const aiToolCount = Object.keys(allTools).length;
		const toolMap = buildToolMap(allUserTools);
		const { instructions: effectiveInstructions, volatileInstructions } =
			this.composeEffectiveInstructions(allUserTools);

		return {
			toolMap,
			aiTools: allTools,
			searchToolName,
			hasTools: aiToolCount > 0,
			effectiveInstructions,
			volatileInstructions,
			staticToolCacheName: this.getStaticToolCacheName(allTools),
		};
	}

	buildModelPrompt({
		list,
		tools,
		instructionProviderOptions,
		providerOptions,
		hostVolatileInstructions,
		activeSkills,
	}: {
		list: AgentMessageList;
		tools: Awaited<ReturnType<RuntimeContextBuilder['buildToolLoopContext']>>;
		instructionProviderOptions: ProviderOptions | undefined;
		providerOptions?: ProviderOptions;
		hostVolatileInstructions: string | undefined;
		activeSkills: ActiveSkills | undefined;
	}) {
		this.synchronizeSkillCatalog(list);
		const combinedVolatileInstructions = [tools.volatileInstructions, hostVolatileInstructions]
			.map((value) => value?.trim())
			.filter((value): value is string => Boolean(value))
			.join('\n\n');
		const skillContent = activeSkills?.instructions();
		const { system, messages } = list.forLlm(
			tools.effectiveInstructions,
			instructionProviderOptions,
			combinedVolatileInstructions || undefined,
			supportsSplitSystemMessages(this.config.model),
			skillContent
				? {
						content: skillContent,
						cacheOptions: (messages) => {
							if (isOpenRouterAnthropicModel(this.modelId)) return undefined;
							return buildSkillInstructionCacheOptions(
								instructionProviderOptions,
								tools.aiTools,
								messages,
							);
						},
					}
				: undefined,
			splitModelId(this.modelId).provider,
		);
		const preparedMessages =
			this.nativeToolDeferral?.prepareMessages?.(messages, tools.aiTools, tools.searchToolName) ??
			messages;
		// Cache breakpoints apply to this call only. Do not change stored messages or tools.
		const cached = applyRuntimeCacheBreakpoints({
			system,
			messages: activeSkills?.modelMessages(preparedMessages, list) ?? preparedMessages,
			aiTools: tools.aiTools,
			promptCaching: this.config.promptCaching,
			modelId: this.modelId,
			staticToolCacheName: tools.staticToolCacheName,
		});
		const openRouterCache = applyOpenRouterPromptCache({
			system,
			messages: cached.messages,
			providerOptions,
			promptCaching: this.config.promptCaching,
			modelId: this.modelId,
		});
		return { ...cached, ...openRouterCache };
	}

	/** Native search and the tool catalog both keep the tool prefix fixed, so it can carry a cache point. */
	private getStaticToolCacheName(aiTools: ReturnType<typeof toAiSdkTools>): string | undefined {
		return Object.entries(aiTools)
			.filter(([, tool]) => tool.type !== 'provider' && !isAnthropicToolDeferred(tool))
			.at(-1)?.[0];
	}

	getCurrentTools(
		persistence?: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		list?: AgentMessageList,
	): BuiltTool[] {
		return this.collectRunTools(persistence, executionCounter, list).tools;
	}

	/** All tools for this run, plus the memory tools the runtime created for it. */
	private collectRunTools(
		persistence?: AgentPersistenceOptions,
		executionCounter?: AgentExecutionCounter,
		list?: AgentMessageList,
	): { tools: BuiltTool[]; memoryTools: BuiltTool[] } {
		const baseTools = this.config.tools ?? [];
		const tools = [
			...baseTools,
			...(this.config.nativeToolDeferral ? (this.config.deferredTools ?? []) : []),
			...(this.toolCatalog?.getControllerTools() ?? []),
		];

		const memoryTools: BuiltTool[] = [];
		// Catalog-mode deferred tools are not in the toolset but still reserve their names.
		const reservedCheck = [
			...tools,
			...(this.toolCatalog ? (this.config.deferredTools ?? []) : []),
		];
		const recallTool = this.createRecallMemoryToolForRun(
			persistence,
			reservedCheck,
			executionCounter,
		);
		if (recallTool) memoryTools.push(recallTool);
		const flagTool = this.createFlagMemoryToolForRun(
			persistence,
			[...reservedCheck, ...memoryTools],
			list,
		);
		if (flagTool) memoryTools.push(flagTool);
		return { tools: [...tools, ...memoryTools], memoryTools };
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
		for (const [provider, quirks] of Object.entries(PROVIDER_QUIRKS)) {
			if (!quirks.relaxStrictJsonSchemaForRawOutput) continue;
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
		return createRecallMemoryTool({
			memory,
			config: episodicMemory,
			scope,
			executionCounter,
			agentName: this.config.name,
		});
	}

	private createFlagMemoryToolForRun(
		persistence: AgentPersistenceOptions | undefined,
		existingTools: BuiltTool[],
		list?: AgentMessageList,
	): BuiltTool | undefined {
		if (!persistence || !list) return undefined;
		const capture = resolveEpisodicMemoryCapture(this.config, persistence);
		if (!capture) return undefined;
		if (existingTools.some((tool) => tool.name === FLAG_MEMORY_TOOL_NAME)) {
			throw new Error(
				`Tool name "${FLAG_MEMORY_TOOL_NAME}" is reserved while episodic memory is enabled.`,
			);
		}
		return createFlagMemoryTool({
			memory: capture.memory,
			scope: capture.scope,
			persistence,
			list,
			guidance: capture.config.guidance,
		});
	}

	/**
	 * Merge tool-attached `systemInstruction` fragments into the agent's
	 * configured instructions, split by stability:
	 *
	 * - `instructions`: fragments from every tool of the run, including the
	 *   deferred tools behind the catalog, plus the user's instructions. The
	 *   toolset never changes mid-run, so this is the cached system message.
	 * - `volatileInstructions`: tool fragments never change mid-run, so this
	 *   holds nothing today. Kept for callers that read it.
	 */
	private composeEffectiveInstructions(tools: BuiltTool[]): {
		instructions: string;
		volatileInstructions: string | undefined;
	} {
		const fragments = this.collectInstructionFragments([
			...tools,
			// Catalog tools run through `call_tool`, so their rules must be in the prompt too.
			...(this.toolCatalog ? (this.config.deferredTools ?? []) : []),
		]);
		return {
			instructions: prependBuiltInRules(fragments, this.config.instructions),
			volatileInstructions: undefined,
		};
	}

	private collectInstructionFragments(tools: BuiltTool[]): string[] {
		const fragments: string[] = [];
		for (const tool of tools) {
			if (
				typeof tool.systemInstruction !== 'string' ||
				tool.systemInstruction.trim().length === 0
			) {
				continue;
			}
			fragments.push(tool.systemInstruction);
		}

		// Define the untrusted-data boundary ahead of the first wrapped result.
		if (tools.some((tool) => tool.outputTrust === 'untrusted')) {
			fragments.unshift(UNTRUSTED_OUTPUT_DOCTRINE);
		}
		return fragments;
	}

	/** Build the providerOptions object for provider-specific thinking config. */
	private buildThinkingProviderOptions(): Record<string, Record<string, unknown>> | undefined {
		if (!this.config.thinking) return undefined;

		const { provider, model } = splitModelId(this.modelId);
		const modelConfig = this.config.model;
		const sdk =
			typeof modelConfig === 'object' && 'sdk' in modelConfig && typeof modelConfig.sdk === 'string'
				? modelConfig.sdk
				: undefined;
		const quirksProvider =
			provider === 'google-vertex' ? getGoogleVertexQuirksProvider(model, sdk) : provider;
		const quirks = getProviderQuirks(quirksProvider);
		return quirks.thinkingToProviderOptions?.(this.config.thinking, this.modelId, {
			isOfficialApi: usesOfficialAnthropicApi(modelConfig),
		});
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
		return mergeProviderOptions(thinkingOpts, cacheOpts, runProviderOptions);
	}
}
