Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const semanticAttributes = require('../../semanticAttributes.js');
const spanUtils = require('../../utils/spanUtils.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const constants = require('./constants.js');
const utils = require('./utils.js');
const vercelAiAttributes = require('./vercel-ai-attributes.js');

/**
 * Maps Vercel AI SDK operation names to OpenTelemetry semantic convention values
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#llm-request-spans
 */
function mapVercelAiOperationName(operationName) {
  // Top-level pipeline operations map to invoke_agent
  if (constants.INVOKE_AGENT_OPS.has(operationName)) {
    return 'invoke_agent';
  }
  // .do* operations are the actual LLM calls
  if (constants.GENERATE_CONTENT_OPS.has(operationName)) {
    return 'generate_content';
  }
  if (constants.EMBEDDINGS_OPS.has(operationName)) {
    return 'embeddings';
  }
  if (constants.RERANK_OPS.has(operationName)) {
    return 'rerank';
  }
  if (operationName === 'ai.toolCall') {
    return 'execute_tool';
  }
  // Return the original value for unknown operations
  return operationName;
}

/**
 * Post-process spans emitted by the Vercel AI SDK.
 * This is supposed to be used in `client.on('spanStart', ...)
 */
function onVercelAiSpanStart(span) {
  const { data: attributes, description: name } = spanUtils.spanToJSON(span);

  if (!name) {
    return;
  }

  // Tool call spans
  // https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
  if (attributes[vercelAiAttributes.AI_TOOL_CALL_NAME_ATTRIBUTE] && attributes[vercelAiAttributes.AI_TOOL_CALL_ID_ATTRIBUTE] && name === 'ai.toolCall') {
    processToolCallSpan(span, attributes);
    return;
  }

  // V6+ Check if this is a Vercel AI span by checking if the operation ID attribute is present.
  // V5+ Check if this is a Vercel AI span by name pattern.
  if (!attributes[vercelAiAttributes.AI_OPERATION_ID_ATTRIBUTE] && !name.startsWith('ai.')) {
    return;
  }

  processGenerateSpan(span, name, attributes);
}

function vercelAiEventProcessor(event) {
  if (event.type === 'transaction' && event.spans) {
    // Map to accumulate token data by parent span ID
    const tokenAccumulator = new Map();

    // First pass: process all spans and accumulate token data
    for (const span of event.spans) {
      processEndedVercelAiSpan(span);

      // Accumulate token data for parent spans
      utils.accumulateTokensForParent(span, tokenAccumulator);
    }

    // Second pass: apply tool descriptions and accumulated tokens
    utils.applyToolDescriptionsAndTokens(event.spans, tokenAccumulator);

    // Also apply to root when it is the invoke_agent pipeline
    const trace = event.contexts?.trace;
    if (trace?.op === 'gen_ai.invoke_agent') {
      utils.applyAccumulatedTokens(trace, tokenAccumulator);
    }
  }

  return event;
}

/**
 * Tool call structure from Vercel AI SDK
 * Note: V5/V6 use 'input' for arguments, V4 and earlier use 'args'
 */

/**
 * Normalize finish reason to match OpenTelemetry semantic conventions.
 * Valid values: "stop", "length", "content_filter", "tool_call", "error"
 *
 * Vercel AI SDK uses "tool-calls" (plural, with hyphen) which we map to "tool_call".
 */
function normalizeFinishReason(finishReason) {
  if (typeof finishReason !== 'string') {
    return 'stop';
  }

  // Map Vercel AI SDK finish reasons to OpenTelemetry semantic convention values
  switch (finishReason) {
    case 'tool-calls':
      return 'tool_call';
    case 'stop':
    case 'length':
    case 'content_filter':
    case 'error':
      return finishReason;
    default:
      // For unknown values, return as-is (schema allows arbitrary strings)
      return finishReason;
  }
}

/**
 * Build gen_ai.output.messages from ai.response.text and/or ai.response.toolCalls
 *
 * Format follows OpenTelemetry semantic conventions:
 * [{"role": "assistant", "parts": [...], "finish_reason": "stop"}]
 *
 * Parts can be:
 * - {"type": "text", "content": "..."}
 * - {"type": "tool_call", "id": "...", "name": "...", "arguments": "..."}
 */
function buildOutputMessages(attributes) {
  const responseText = attributes[vercelAiAttributes.AI_RESPONSE_TEXT_ATTRIBUTE];
  const responseToolCalls = attributes[vercelAiAttributes.AI_RESPONSE_TOOL_CALLS_ATTRIBUTE];
  const finishReason = attributes[vercelAiAttributes.AI_RESPONSE_FINISH_REASON_ATTRIBUTE];

  // Skip if neither text nor tool calls are present
  if (responseText == null && responseToolCalls == null) {
    return;
  }

  const parts = [];

  // Add text part if present
  if (typeof responseText === 'string' && responseText.length > 0) {
    parts.push({
      type: 'text',
      content: responseText,
    });
  }

  // Add tool call parts if present
  if (responseToolCalls != null) {
    try {
      // Tool calls can be a string (JSON) or already parsed array
      const toolCalls =
        typeof responseToolCalls === 'string' ? JSON.parse(responseToolCalls) : responseToolCalls;

      if (Array.isArray(toolCalls)) {
        for (const toolCall of toolCalls) {
          // V5/V6 use 'input', V4 and earlier use 'args'
          const args = toolCall.input ?? toolCall.args;
          parts.push({
            type: 'tool_call',
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            // Handle undefined args: JSON.stringify(undefined) returns undefined, not a string,
            // which would cause the property to be omitted from the final JSON output
            arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
          });
        }
        // Only delete tool calls attribute if we successfully processed them
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete attributes[vercelAiAttributes.AI_RESPONSE_TOOL_CALLS_ATTRIBUTE];
      }
    } catch {
      // Ignore parsing errors - tool calls attribute is preserved
    }
  }

  // Only set output messages and delete text attribute if we have parts
  if (parts.length > 0) {
    const outputMessage = {
      role: 'assistant',
      parts,
      finish_reason: normalizeFinishReason(finishReason),
    };

    attributes[genAiAttributes.GEN_AI_OUTPUT_MESSAGES_ATTRIBUTE] = JSON.stringify([outputMessage]);

    // Remove the text attribute since it's now captured in gen_ai.output.messages
    // Note: tool calls attribute is deleted above only if successfully parsed
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete attributes[vercelAiAttributes.AI_RESPONSE_TEXT_ATTRIBUTE];
  }
}

/**
 * Post-process spans emitted by the Vercel AI SDK.
 */
function processEndedVercelAiSpan(span) {
  const { data: attributes, origin } = span;

  if (origin !== 'auto.vercelai.otel') {
    return;
  }

  // The Vercel AI SDK sets span status to raw error message strings.
  // Any such value should be normalized to a SpanStatusType value. We pick internal_error as it is the most generic.
  if (span.status && span.status !== 'ok') {
    span.status = 'internal_error';
  }

  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_PROMPT_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE);

  // Parent spans (ai.streamText, ai.streamObject, etc.) use inputTokens/outputTokens instead of promptTokens/completionTokens
  renameAttributeKey(attributes, 'ai.usage.inputTokens', genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, 'ai.usage.outputTokens', genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE);

  // Embedding spans use ai.usage.tokens instead of promptTokens/completionTokens
  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE);

  // AI SDK uses avgOutputTokensPerSecond, map to our expected attribute name
  renameAttributeKey(attributes, 'ai.response.avgOutputTokensPerSecond', 'ai.response.avgCompletionTokensPerSecond');

  // Input tokens is the sum of prompt tokens and cached input tokens
  if (
    typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number' &&
    typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE] === 'number'
  ) {
    attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] =
      attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] + attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE];
  }

  // Compute total tokens from input + output (embeddings may only have input tokens)
  if (typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number') {
    const outputTokens =
      typeof attributes[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] === 'number'
        ? attributes[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE]
        : 0;
    attributes[genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = outputTokens + attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE];
  }

  // Convert the available tools array to a JSON string
  if (attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] && Array.isArray(attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE])) {
    attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] = utils.convertAvailableToolsToJsonString(
      attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] ,
    );
  }

  // Rename AI SDK attributes to standardized gen_ai attributes
  // Map operation.name to OpenTelemetry semantic convention values
  if (attributes[vercelAiAttributes.OPERATION_NAME_ATTRIBUTE]) {
    const operationName = mapVercelAiOperationName(attributes[vercelAiAttributes.OPERATION_NAME_ATTRIBUTE] );
    attributes[genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE] = operationName;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete attributes[vercelAiAttributes.OPERATION_NAME_ATTRIBUTE];
  }
  renameAttributeKey(attributes, vercelAiAttributes.AI_PROMPT_MESSAGES_ATTRIBUTE, genAiAttributes.GEN_AI_INPUT_MESSAGES_ATTRIBUTE);

  // Build gen_ai.output.messages from response text and/or tool calls
  // Note: buildOutputMessages also removes the source attributes when output is successfully generated
  buildOutputMessages(attributes);

  renameAttributeKey(attributes, vercelAiAttributes.AI_RESPONSE_OBJECT_ATTRIBUTE, 'gen_ai.response.object');
  renameAttributeKey(attributes, vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE, 'gen_ai.request.available_tools');

  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_ARGS_ATTRIBUTE, genAiAttributes.GEN_AI_TOOL_INPUT_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_RESULT_ATTRIBUTE, genAiAttributes.GEN_AI_TOOL_OUTPUT_ATTRIBUTE);

  renameAttributeKey(attributes, vercelAiAttributes.AI_SCHEMA_ATTRIBUTE, 'gen_ai.request.schema');
  renameAttributeKey(attributes, vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE, genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE);

  // Map embedding input: ai.values → gen_ai.embeddings.input
  // Vercel AI SDK JSON-stringifies each value individually, so we parse each element back.
  // Single embed gets unwrapped to a plain value; batch embedMany stays as a JSON array.
  if (Array.isArray(attributes[vercelAiAttributes.AI_VALUES_ATTRIBUTE])) {
    const parsed = (attributes[vercelAiAttributes.AI_VALUES_ATTRIBUTE] ).map(v => {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    });
    attributes[genAiAttributes.GEN_AI_EMBEDDINGS_INPUT_ATTRIBUTE] = parsed.length === 1 ? parsed[0] : JSON.stringify(parsed);
  }

  addProviderMetadataToAttributes(attributes);

  // Change attributes namespaced with `ai.X` to `vercel.ai.X`
  for (const key of Object.keys(attributes)) {
    if (key.startsWith('ai.')) {
      renameAttributeKey(attributes, key, `vercel.${key}`);
    }
  }
}

/**
 * Renames an attribute key in the provided attributes object if the old key exists.
 * This function safely handles null and undefined values.
 */
function renameAttributeKey(attributes, oldKey, newKey) {
  if (attributes[oldKey] != null) {
    attributes[newKey] = attributes[oldKey];
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete attributes[oldKey];
  }
}

function processToolCallSpan(span, attributes) {
  span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.vercelai.otel');
  span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP, 'gen_ai.execute_tool');
  span.setAttribute(genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE, 'execute_tool');
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_NAME_ATTRIBUTE, genAiAttributes.GEN_AI_TOOL_NAME_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_ID_ATTRIBUTE, genAiAttributes.GEN_AI_TOOL_CALL_ID_ATTRIBUTE);

  // Store the span context in our global map using the tool call ID.
  // This allows us to capture tool errors and link them to the correct span
  // without retaining the full Span object in memory.
  const toolCallId = attributes[genAiAttributes.GEN_AI_TOOL_CALL_ID_ATTRIBUTE];

  if (typeof toolCallId === 'string') {
    constants.toolCallSpanContextMap.set(toolCallId, span.spanContext());
  }

  // https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/#gen-ai-tool-type
  if (!attributes[genAiAttributes.GEN_AI_TOOL_TYPE_ATTRIBUTE]) {
    span.setAttribute(genAiAttributes.GEN_AI_TOOL_TYPE_ATTRIBUTE, 'function');
  }
  const toolName = attributes[genAiAttributes.GEN_AI_TOOL_NAME_ATTRIBUTE];
  if (toolName) {
    span.updateName(`execute_tool ${toolName}`);
  }
}

function processGenerateSpan(span, name, attributes) {
  span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.vercelai.otel');

  const nameWthoutAi = name.replace('ai.', '');
  span.setAttribute('ai.pipeline.name', nameWthoutAi);
  span.updateName(nameWthoutAi);

  const functionId = attributes[vercelAiAttributes.AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE];
  if (functionId && typeof functionId === 'string') {
    span.setAttribute('gen_ai.function_id', functionId);
  }

  utils.requestMessagesFromPrompt(span, attributes);

  if (attributes[vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE] && !attributes[genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE]) {
    span.setAttribute(genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE, attributes[vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE]);
  }
  span.setAttribute('ai.streaming', name.includes('stream'));

  // Set the op based on the span name
  const op = utils.getSpanOpFromName(name);
  if (op) {
    span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP, op);
  }

  // For invoke_agent pipeline spans, use 'invoke_agent' as the description
  // to be consistent with other AI integrations (e.g. LangGraph)
  if (constants.INVOKE_AGENT_OPS.has(name)) {
    if (functionId && typeof functionId === 'string') {
      span.updateName(`invoke_agent ${functionId}`);
    } else {
      span.updateName('invoke_agent');
    }
    return;
  }

  const modelId = attributes[vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE];
  if (modelId) {
    const doSpanPrefix = constants.GENERATE_CONTENT_OPS.has(name) ? 'generate_content' : constants.DO_SPAN_NAME_PREFIX[name];
    if (doSpanPrefix) {
      span.updateName(`${doSpanPrefix} ${modelId}`);
    }
  }
}

/**
 * Add event processors to the given client to process Vercel AI spans.
 */
function addVercelAiProcessors(client) {
  client.on('spanStart', onVercelAiSpanStart);
  // Note: We cannot do this on `spanEnd`, because the span cannot be mutated anymore at this point
  client.addEventProcessor(Object.assign(vercelAiEventProcessor, { id: 'VercelAiEventProcessor' }));
}

function addProviderMetadataToAttributes(attributes) {
  const providerMetadata = attributes[vercelAiAttributes.AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE] ;
  if (providerMetadata) {
    try {
      const providerMetadataObject = JSON.parse(providerMetadata) ;

      // Handle OpenAI metadata (v5 uses 'openai', v6 Azure Responses API uses 'azure')
      const openaiMetadata =
        providerMetadataObject.openai ?? providerMetadataObject.azure;
      if (openaiMetadata) {
        setAttributeIfDefined(
          attributes,
          genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
          openaiMetadata.cachedPromptTokens,
        );
        setAttributeIfDefined(attributes, 'gen_ai.usage.output_tokens.reasoning', openaiMetadata.reasoningTokens);
        setAttributeIfDefined(
          attributes,
          'gen_ai.usage.output_tokens.prediction_accepted',
          openaiMetadata.acceptedPredictionTokens,
        );
        setAttributeIfDefined(
          attributes,
          'gen_ai.usage.output_tokens.prediction_rejected',
          openaiMetadata.rejectedPredictionTokens,
        );
        if (!attributes['gen_ai.conversation.id']) {
          setAttributeIfDefined(attributes, 'gen_ai.conversation.id', openaiMetadata.responseId);
        }
      }

      if (providerMetadataObject.anthropic) {
        const cachedInputTokens =
          providerMetadataObject.anthropic.usage?.cache_read_input_tokens ??
          providerMetadataObject.anthropic.cacheReadInputTokens;
        setAttributeIfDefined(attributes, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE, cachedInputTokens);

        const cacheWriteInputTokens =
          providerMetadataObject.anthropic.usage?.cache_creation_input_tokens ??
          providerMetadataObject.anthropic.cacheCreationInputTokens;
        setAttributeIfDefined(attributes, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE, cacheWriteInputTokens);
      }

      if (providerMetadataObject.bedrock?.usage) {
        setAttributeIfDefined(
          attributes,
          genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
          providerMetadataObject.bedrock.usage.cacheReadInputTokens,
        );
        setAttributeIfDefined(
          attributes,
          genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE,
          providerMetadataObject.bedrock.usage.cacheWriteInputTokens,
        );
      }

      if (providerMetadataObject.deepseek) {
        setAttributeIfDefined(
          attributes,
          genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
          providerMetadataObject.deepseek.promptCacheHitTokens,
        );
        setAttributeIfDefined(
          attributes,
          'gen_ai.usage.input_tokens.cache_miss',
          providerMetadataObject.deepseek.promptCacheMissTokens,
        );
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Sets an attribute only if the value is not null or undefined.
 */
function setAttributeIfDefined(attributes, key, value) {
  if (value != null) {
    attributes[key] = value;
  }
}

exports.addVercelAiProcessors = addVercelAiProcessors;
//# sourceMappingURL=index.js.map
