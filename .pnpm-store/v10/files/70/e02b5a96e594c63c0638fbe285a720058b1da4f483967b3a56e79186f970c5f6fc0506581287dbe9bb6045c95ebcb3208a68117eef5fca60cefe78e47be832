Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const semanticAttributes = require('../../semanticAttributes.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const mediaStripping = require('../ai/mediaStripping.js');
const messageTruncation = require('../ai/messageTruncation.js');
const utils = require('../ai/utils.js');
const constants = require('./constants.js');

/**
 * Assigns an attribute only when the value is neither `undefined` nor `null`.
 *
 * We keep this tiny helper because call sites are repetitive and easy to miswrite.
 * It also preserves falsy-but-valid values like `0` and `""`.
 */
const setIfDefined = (target, key, value) => {
  if (value != null) target[key] = value ;
};

/**
 * Like `setIfDefined`, but converts the value with `Number()` and skips only when the
 * result is `NaN`. This ensures numeric 0 makes it through (unlike truthy checks).
 */
const setNumberIfDefined = (target, key, value) => {
  const n = Number(value);
  if (!Number.isNaN(n)) target[key] = n;
};

/**
 * Converts a value to a string. Avoids double-quoted JSON strings where a plain
 * string is desired, but still handles objects/arrays safely.
 */
function asString(v) {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Converts message content to a string, stripping inline media (base64 images, audio, etc.)
 * from multimodal content before stringification so downstream media stripping can't miss it.
 *
 * @example
 * // String content passes through unchanged:
 * normalizeContent("Hello") // => "Hello"
 *
 * // Multimodal array content — media is replaced with "[Blob substitute]" before JSON.stringify:
 * normalizeContent([
 *   { type: "text", text: "What color?" },
 *   { type: "image_url", image_url: { url: "data:image/png;base64,iVBOR..." } }
 * ])
 * // => '[{"type":"text","text":"What color?"},{"type":"image_url","image_url":{"url":"[Blob substitute]"}}]'
 *
 * // Without this, asString() would JSON.stringify the raw array and the base64 blob
 * // would end up in span attributes, since downstream stripping only works on objects.
 */
function normalizeContent(v) {
  if (Array.isArray(v)) {
    try {
      const stripped = v.map(part =>
        part && typeof part === 'object' && mediaStripping.isContentMedia(part) ? mediaStripping.stripInlineMediaFromSingleMessage(part) : part,
      );
      return JSON.stringify(stripped);
    } catch {
      return String(v);
    }
  }
  return asString(v);
}

/**
 * Normalizes a single role token to our canonical set.
 *
 * @param role Incoming role value (free-form, any casing)
 * @returns Canonical role: 'user' | 'assistant' | 'system' | 'function' | 'tool' | <passthrough>
 */
function normalizeMessageRole(role) {
  const normalized = role.toLowerCase();
  return constants.ROLE_MAP[normalized] ?? normalized;
}

/**
 * Infers a role from a LangChain message constructor name.
 *
 * Checks for substrings like "System", "Human", "AI", etc.
 */
function normalizeRoleNameFromCtor(name) {
  if (name.includes('System')) return 'system';
  if (name.includes('Human')) return 'user';
  if (name.includes('AI') || name.includes('Assistant')) return 'assistant';
  if (name.includes('Function')) return 'function';
  if (name.includes('Tool')) return 'tool';
  return 'user';
}

/**
 * Returns invocation params from a LangChain `tags` object.
 *
 * LangChain often passes runtime parameters (model, temperature, etc.) via the
 * `tags.invocation_params` bag. If `tags` is an array (LangChain sometimes uses
 * string tags), we return `undefined`.
 *
 * @param tags LangChain tags (string[] or record)
 * @returns The `invocation_params` object, if present
 */
function getInvocationParams(tags) {
  if (!tags || Array.isArray(tags)) return undefined;
  return tags.invocation_params ;
}

/**
 * Normalizes a heterogeneous set of LangChain messages to `{ role, content }`.
 *
 * Why so many branches? LangChain messages can arrive in several shapes:
 *  - Message classes with `_getType()` (most reliable)
 *  - Classes with meaningful constructor names (e.g. `SystemMessage`)
 *  - Plain objects with `type`, or `{ role, content }`
 *  - Serialized format with `{ lc: 1, id: [...], kwargs: { content } }`
 * We preserve the prioritization to minimize behavioral drift.
 *
 * @param messages Mixed LangChain messages
 * @returns Array of normalized `{ role, content }`
 */
function normalizeLangChainMessages(messages) {
  return messages.map(message => {
    // 1) Prefer _getType() when present
    const maybeGetType = (message )._getType;
    if (typeof maybeGetType === 'function') {
      const messageType = maybeGetType.call(message);
      return {
        role: normalizeMessageRole(messageType),
        content: normalizeContent(message.content),
      };
    }

    // 2) Serialized LangChain format (lc: 1) - check before constructor name
    // This is more reliable than constructor.name which can be lost during serialization
    if (message.lc === 1 && message.kwargs) {
      const id = message.id;
      const messageType = Array.isArray(id) && id.length > 0 ? id[id.length - 1] : '';
      const role = typeof messageType === 'string' ? normalizeRoleNameFromCtor(messageType) : 'user';

      return {
        role: normalizeMessageRole(role),
        content: normalizeContent(message.kwargs?.content),
      };
    }

    // 3) Then objects with `type`
    if (message.type) {
      const role = String(message.type).toLowerCase();
      return {
        role: normalizeMessageRole(role),
        content: normalizeContent(message.content),
      };
    }

    // 4) Then objects with `{ role, content }` - check before constructor name
    // Plain objects have constructor.name="Object" which would incorrectly default to "user"
    if (message.role) {
      return {
        role: normalizeMessageRole(String(message.role)),
        content: normalizeContent(message.content),
      };
    }

    // 5) Then try constructor name (SystemMessage / HumanMessage / ...)
    // Only use this if we haven't matched a more specific case
    const ctor = (message ).constructor?.name;
    if (ctor && ctor !== 'Object') {
      return {
        role: normalizeMessageRole(normalizeRoleNameFromCtor(ctor)),
        content: normalizeContent(message.content),
      };
    }

    // 6) Fallback: treat as user text
    return {
      role: 'user',
      content: normalizeContent(message.content),
    };
  });
}

/**
 * Extracts request attributes common to both LLM and ChatModel invocations.
 *
 * Source precedence:
 * 1) `invocationParams` (highest)
 * 2) `langSmithMetadata`
 *
 * Numeric values are set even when 0 (e.g. `temperature: 0`), but skipped if `NaN`.
 */
function extractCommonRequestAttributes(
  serialized,
  invocationParams,
  langSmithMetadata,
) {
  const attrs = {};

  // Get kwargs if available (from constructor type)
  const kwargs = 'kwargs' in serialized ? serialized.kwargs : undefined;

  const temperature = invocationParams?.temperature ?? langSmithMetadata?.ls_temperature ?? kwargs?.temperature;
  setNumberIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE, temperature);

  const maxTokens = invocationParams?.max_tokens ?? langSmithMetadata?.ls_max_tokens ?? kwargs?.max_tokens;
  setNumberIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE, maxTokens);

  const topP = invocationParams?.top_p ?? kwargs?.top_p;
  setNumberIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_TOP_P_ATTRIBUTE, topP);

  const frequencyPenalty = invocationParams?.frequency_penalty;
  setNumberIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE, frequencyPenalty);

  const presencePenalty = invocationParams?.presence_penalty;
  setNumberIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_PRESENCE_PENALTY_ATTRIBUTE, presencePenalty);

  // LangChain uses `stream`. We only set the attribute if the key actually exists
  // (some callbacks report `false` even on streamed requests, this stems from LangChain's callback handler).
  if (invocationParams && 'stream' in invocationParams) {
    setIfDefined(attrs, genAiAttributes.GEN_AI_REQUEST_STREAM_ATTRIBUTE, Boolean(invocationParams.stream));
  }

  return attrs;
}

/**
 * Small helper to assemble boilerplate attributes shared by both request extractors.
 * Always uses 'chat' as the operation type for all LLM and chat model operations.
 */
function baseRequestAttributes(
  system,
  modelName,
  serialized,
  invocationParams,
  langSmithMetadata,
) {
  return {
    [genAiAttributes.GEN_AI_SYSTEM_ATTRIBUTE]: asString(system ?? 'langchain'),
    [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: 'chat',
    [genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE]: asString(modelName),
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: constants.LANGCHAIN_ORIGIN,
    ...extractCommonRequestAttributes(serialized, invocationParams, langSmithMetadata),
  };
}

/**
 * Extracts attributes for plain LLM invocations (string prompts).
 *
 * - Operation is tagged as `chat` following OpenTelemetry semantic conventions.
 *   LangChain LLM operations are treated as chat operations.
 * - When `recordInputs` is true, string prompts are wrapped into `{role:"user"}`
 *   messages to align with the chat schema used elsewhere.
 */
function extractLLMRequestAttributes(
  llm,
  prompts,
  recordInputs,
  invocationParams,
  langSmithMetadata,
) {
  const system = langSmithMetadata?.ls_provider;
  const modelName = invocationParams?.model ?? langSmithMetadata?.ls_model_name ?? 'unknown';

  const attrs = baseRequestAttributes(system, modelName, llm, invocationParams, langSmithMetadata);

  if (recordInputs && Array.isArray(prompts) && prompts.length > 0) {
    setIfDefined(attrs, genAiAttributes.GEN_AI_INPUT_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, prompts.length);
    const messages = prompts.map(p => ({ role: 'user', content: p }));
    setIfDefined(attrs, genAiAttributes.GEN_AI_INPUT_MESSAGES_ATTRIBUTE, asString(messages));
  }

  return attrs;
}

/**
 * Extracts attributes for ChatModel invocations (array-of-arrays of messages).
 *
 * - Operation is tagged as `chat` following OpenTelemetry semantic conventions.
 *   LangChain chat model operations are chat operations.
 * - We flatten LangChain's `LangChainMessage[][]` and normalize shapes into a
 *   consistent `{ role, content }` array when `recordInputs` is true.
 * - Provider system value falls back to `serialized.id?.[2]`.
 */
function extractChatModelRequestAttributes(
  llm,
  langChainMessages,
  recordInputs,
  invocationParams,
  langSmithMetadata,
) {
  const system = langSmithMetadata?.ls_provider ?? llm.id?.[2];
  const modelName = invocationParams?.model ?? langSmithMetadata?.ls_model_name ?? 'unknown';

  const attrs = baseRequestAttributes(system, modelName, llm, invocationParams, langSmithMetadata);

  if (recordInputs && Array.isArray(langChainMessages) && langChainMessages.length > 0) {
    const normalized = normalizeLangChainMessages(langChainMessages.flat());

    const { systemInstructions, filteredMessages } = utils.extractSystemInstructions(normalized);

    if (systemInstructions) {
      setIfDefined(attrs, genAiAttributes.GEN_AI_SYSTEM_INSTRUCTIONS_ATTRIBUTE, systemInstructions);
    }

    const filteredLength = Array.isArray(filteredMessages) ? filteredMessages.length : 0;
    setIfDefined(attrs, genAiAttributes.GEN_AI_INPUT_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, filteredLength);

    const truncated = messageTruncation.truncateGenAiMessages(filteredMessages );
    setIfDefined(attrs, genAiAttributes.GEN_AI_INPUT_MESSAGES_ATTRIBUTE, asString(truncated));
  }

  return attrs;
}

/**
 * Scans generations for Anthropic-style `tool_use` items and records them.
 *
 * LangChain represents some provider messages (e.g., Anthropic) with a `message.content`
 * array that may include objects `{ type: 'tool_use', ... }`. We collect and attach
 * them as a JSON array on `gen_ai.response.tool_calls` for downstream consumers.
 */
function addToolCallsAttributes(generations, attrs) {
  const toolCalls = [];
  const flatGenerations = generations.flat();

  for (const gen of flatGenerations) {
    const content = gen.message?.content;
    if (Array.isArray(content)) {
      for (const item of content) {
        const t = item ;
        if (t.type === 'tool_use') toolCalls.push(t);
      }
    }
  }

  if (toolCalls.length > 0) {
    setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, asString(toolCalls));
  }
}

/**
 * Adds token usage attributes, supporting both OpenAI (`tokenUsage`) and Anthropic (`usage`) formats.
 * - Preserve zero values (0 tokens) by avoiding truthy checks.
 * - Compute a total for Anthropic when not explicitly provided.
 * - Include cache token metrics when present.
 */
function addTokenUsageAttributes(
  llmOutput,
  attrs,
) {
  if (!llmOutput) return;

  const tokenUsage = llmOutput.tokenUsage

;
  const anthropicUsage = llmOutput.usage

;

  if (tokenUsage) {
    setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, tokenUsage.promptTokens);
    setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, tokenUsage.completionTokens);
    setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE, tokenUsage.totalTokens);
  } else if (anthropicUsage) {
    setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, anthropicUsage.input_tokens);
    setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, anthropicUsage.output_tokens);

    // Compute total when not provided by the provider.
    const input = Number(anthropicUsage.input_tokens);
    const output = Number(anthropicUsage.output_tokens);
    const total = (Number.isNaN(input) ? 0 : input) + (Number.isNaN(output) ? 0 : output);
    if (total > 0) setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE, total);

    // Extra Anthropic cache metrics (present only when caching is enabled)
    if (anthropicUsage.cache_creation_input_tokens !== undefined)
      setNumberIfDefined(
        attrs,
        genAiAttributes.GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS_ATTRIBUTE,
        anthropicUsage.cache_creation_input_tokens,
      );
    if (anthropicUsage.cache_read_input_tokens !== undefined)
      setNumberIfDefined(attrs, genAiAttributes.GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS_ATTRIBUTE, anthropicUsage.cache_read_input_tokens);
  }
}

/**
 * Extracts response-related attributes based on a `LangChainLLMResult`.
 *
 * - Records finish reasons when present on generations (e.g., OpenAI)
 * - When `recordOutputs` is true, captures textual response content and any
 *   tool calls.
 * - Also propagates model name (`model_name` or `model`), response `id`, and
 *   `stop_reason` (for providers that use it).
 */
function extractLlmResponseAttributes(
  llmResult,
  recordOutputs,
) {
  if (!llmResult) return;

  const attrs = {};

  if (Array.isArray(llmResult.generations)) {
    const finishReasons = llmResult.generations
      .flat()
      .map(g => {
        // v1 uses generationInfo.finish_reason
        if (g.generationInfo?.finish_reason) {
          return g.generationInfo.finish_reason;
        }
        // v0.3+ uses generation_info.finish_reason
        if (g.generation_info?.finish_reason) {
          return g.generation_info.finish_reason;
        }
        return null;
      })
      .filter((r) => typeof r === 'string');

    if (finishReasons.length > 0) {
      setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE, asString(finishReasons));
    }

    // Tool calls metadata (names, IDs) are not PII, so capture them regardless of recordOutputs
    addToolCallsAttributes(llmResult.generations , attrs);

    if (recordOutputs) {
      const texts = llmResult.generations
        .flat()
        .map(gen => gen.text ?? gen.message?.content)
        .filter(t => typeof t === 'string');

      if (texts.length > 0) {
        setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE, asString(texts));
      }
    }
  }

  addTokenUsageAttributes(llmResult.llmOutput, attrs);

  const llmOutput = llmResult.llmOutput;

  // Extract from v1 generations structure if available
  const firstGeneration = llmResult.generations?.[0]?.[0];
  const v1Message = firstGeneration?.message;

  // Provider model identifier: `model_name` (OpenAI-style) or `model` (others)
  // v1 stores this in message.response_metadata.model_name
  const modelName = llmOutput?.model_name ?? llmOutput?.model ?? v1Message?.response_metadata?.model_name;
  if (modelName) setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE, modelName);

  // Response ID: v1 stores this in message.id
  const responseId = llmOutput?.id ?? v1Message?.id;
  if (responseId) {
    setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_ID_ATTRIBUTE, responseId);
  }

  // Stop reason: v1 stores this in message.response_metadata.finish_reason
  const stopReason = llmOutput?.stop_reason ?? v1Message?.response_metadata?.finish_reason;
  if (stopReason) {
    setIfDefined(attrs, genAiAttributes.GEN_AI_RESPONSE_STOP_REASON_ATTRIBUTE, asString(stopReason));
  }

  return attrs;
}

exports.extractChatModelRequestAttributes = extractChatModelRequestAttributes;
exports.extractLLMRequestAttributes = extractLLMRequestAttributes;
exports.extractLlmResponseAttributes = extractLlmResponseAttributes;
exports.getInvocationParams = getInvocationParams;
exports.normalizeLangChainMessages = normalizeLangChainMessages;
//# sourceMappingURL=utils.js.map
