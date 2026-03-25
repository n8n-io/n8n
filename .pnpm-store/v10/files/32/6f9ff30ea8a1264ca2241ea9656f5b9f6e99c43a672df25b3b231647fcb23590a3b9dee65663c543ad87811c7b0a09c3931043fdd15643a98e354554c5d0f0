import { SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../../semanticAttributes.js';
import { spanToJSON } from '../../utils/spanUtils.js';
import { GEN_AI_RESPONSE_MODEL_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE, GEN_AI_OPERATION_NAME_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, GEN_AI_REQUEST_MODEL_ATTRIBUTE } from '../ai/gen-ai-attributes.js';
import { toolCallSpanMap } from './constants.js';
import { accumulateTokensForParent, applyAccumulatedTokens, requestMessagesFromPrompt, getSpanOpFromName, convertAvailableToolsToJsonString } from './utils.js';
import { AI_TOOL_CALL_NAME_ATTRIBUTE, AI_TOOL_CALL_ID_ATTRIBUTE, AI_OPERATION_ID_ATTRIBUTE, AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE, AI_MODEL_ID_ATTRIBUTE, AI_PROMPT_TOOLS_ATTRIBUTE, AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE, AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE, AI_USAGE_PROMPT_TOKENS_ATTRIBUTE, AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE, OPERATION_NAME_ATTRIBUTE, AI_PROMPT_MESSAGES_ATTRIBUTE, AI_RESPONSE_TEXT_ATTRIBUTE, AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, AI_RESPONSE_OBJECT_ATTRIBUTE, AI_TOOL_CALL_ARGS_ATTRIBUTE, AI_TOOL_CALL_RESULT_ATTRIBUTE, AI_SCHEMA_ATTRIBUTE } from './vercel-ai-attributes.js';

function addOriginToSpan(span, origin) {
  span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, origin);
}

/**
 * Post-process spans emitted by the Vercel AI SDK.
 * This is supposed to be used in `client.on('spanStart', ...)
 */
function onVercelAiSpanStart(span) {
  const { data: attributes, description: name } = spanToJSON(span);

  if (!name) {
    return;
  }

  // Tool call spans
  // https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
  if (attributes[AI_TOOL_CALL_NAME_ATTRIBUTE] && attributes[AI_TOOL_CALL_ID_ATTRIBUTE] && name === 'ai.toolCall') {
    processToolCallSpan(span, attributes);
    return;
  }

  // V6+ Check if this is a Vercel AI span by checking if the operation ID attribute is present.
  // V5+ Check if this is a Vercel AI span by name pattern.
  if (!attributes[AI_OPERATION_ID_ATTRIBUTE] && !name.startsWith('ai.')) {
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
      accumulateTokensForParent(span, tokenAccumulator);
    }

    // Second pass: apply accumulated token data to parent spans
    for (const span of event.spans) {
      if (span.op !== 'gen_ai.invoke_agent') {
        continue;
      }

      applyAccumulatedTokens(span, tokenAccumulator);
    }

    // Also apply to root when it is the invoke_agent pipeline
    const trace = event.contexts?.trace;
    if (trace && trace.op === 'gen_ai.invoke_agent') {
      applyAccumulatedTokens(trace, tokenAccumulator);
    }
  }

  return event;
}
/**
 * Post-process spans emitted by the Vercel AI SDK.
 */
function processEndedVercelAiSpan(span) {
  const { data: attributes, origin } = span;

  if (origin !== 'auto.vercelai.otel') {
    return;
  }

  renameAttributeKey(attributes, AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, AI_USAGE_PROMPT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE);

  // Input tokens is the sum of prompt tokens and cached input tokens
  if (
    typeof attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number' &&
    typeof attributes[GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE] === 'number'
  ) {
    attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] =
      attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] + attributes[GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE];
  }

  if (
    typeof attributes[GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] === 'number' &&
    typeof attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number'
  ) {
    attributes['gen_ai.usage.total_tokens'] =
      attributes[GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] + attributes[GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE];
  }

  // Convert the available tools array to a JSON string
  if (attributes[AI_PROMPT_TOOLS_ATTRIBUTE] && Array.isArray(attributes[AI_PROMPT_TOOLS_ATTRIBUTE])) {
    attributes[AI_PROMPT_TOOLS_ATTRIBUTE] = convertAvailableToolsToJsonString(
      attributes[AI_PROMPT_TOOLS_ATTRIBUTE] ,
    );
  }

  // Rename AI SDK attributes to standardized gen_ai attributes
  renameAttributeKey(attributes, OPERATION_NAME_ATTRIBUTE, GEN_AI_OPERATION_NAME_ATTRIBUTE);
  renameAttributeKey(attributes, AI_PROMPT_MESSAGES_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE);
  renameAttributeKey(attributes, AI_RESPONSE_TEXT_ATTRIBUTE, 'gen_ai.response.text');
  renameAttributeKey(attributes, AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, 'gen_ai.response.tool_calls');
  renameAttributeKey(attributes, AI_RESPONSE_OBJECT_ATTRIBUTE, 'gen_ai.response.object');
  renameAttributeKey(attributes, AI_PROMPT_TOOLS_ATTRIBUTE, 'gen_ai.request.available_tools');

  renameAttributeKey(attributes, AI_TOOL_CALL_ARGS_ATTRIBUTE, 'gen_ai.tool.input');
  renameAttributeKey(attributes, AI_TOOL_CALL_RESULT_ATTRIBUTE, 'gen_ai.tool.output');

  renameAttributeKey(attributes, AI_SCHEMA_ATTRIBUTE, 'gen_ai.request.schema');
  renameAttributeKey(attributes, AI_MODEL_ID_ATTRIBUTE, GEN_AI_REQUEST_MODEL_ATTRIBUTE);

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
  addOriginToSpan(span, 'auto.vercelai.otel');
  span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, 'gen_ai.execute_tool');
  renameAttributeKey(attributes, AI_TOOL_CALL_NAME_ATTRIBUTE, 'gen_ai.tool.name');
  renameAttributeKey(attributes, AI_TOOL_CALL_ID_ATTRIBUTE, 'gen_ai.tool.call.id');

  // Store the span in our global map using the tool call ID
  // This allows us to capture tool errors and link them to the correct span
  const toolCallId = attributes['gen_ai.tool.call.id'];

  if (typeof toolCallId === 'string') {
    toolCallSpanMap.set(toolCallId, span);
  }

  // https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/#gen-ai-tool-type
  if (!attributes['gen_ai.tool.type']) {
    span.setAttribute('gen_ai.tool.type', 'function');
  }
  const toolName = attributes['gen_ai.tool.name'];
  if (toolName) {
    span.updateName(`execute_tool ${toolName}`);
  }
}

function processGenerateSpan(span, name, attributes) {
  addOriginToSpan(span, 'auto.vercelai.otel');

  const nameWthoutAi = name.replace('ai.', '');
  span.setAttribute('ai.pipeline.name', nameWthoutAi);
  span.updateName(nameWthoutAi);

  // If a telemetry name is set and the span represents a pipeline, use it as the operation name.
  // This name can be set at the request level by adding `experimental_telemetry.functionId`.
  const functionId = attributes[AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE];
  if (functionId && typeof functionId === 'string') {
    span.updateName(`${nameWthoutAi} ${functionId}`);
    span.setAttribute('gen_ai.function_id', functionId);
  }

  requestMessagesFromPrompt(span, attributes);

  if (attributes[AI_MODEL_ID_ATTRIBUTE] && !attributes[GEN_AI_RESPONSE_MODEL_ATTRIBUTE]) {
    span.setAttribute(GEN_AI_RESPONSE_MODEL_ATTRIBUTE, attributes[AI_MODEL_ID_ATTRIBUTE]);
  }
  span.setAttribute('ai.streaming', name.includes('stream'));

  // Set the op based on the span name
  const op = getSpanOpFromName(name);
  if (op) {
    span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, op);
  }

  // Update span names for .do* spans to include the model ID (only if model ID exists)
  const modelId = attributes[AI_MODEL_ID_ATTRIBUTE];
  if (modelId) {
    switch (name) {
      case 'ai.generateText.doGenerate':
        span.updateName(`generate_text ${modelId}`);
        break;
      case 'ai.streamText.doStream':
        span.updateName(`stream_text ${modelId}`);
        break;
      case 'ai.generateObject.doGenerate':
        span.updateName(`generate_object ${modelId}`);
        break;
      case 'ai.streamObject.doStream':
        span.updateName(`stream_object ${modelId}`);
        break;
      case 'ai.embed.doEmbed':
        span.updateName(`embed ${modelId}`);
        break;
      case 'ai.embedMany.doEmbed':
        span.updateName(`embed_many ${modelId}`);
        break;
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
  const providerMetadata = attributes[AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE] ;
  if (providerMetadata) {
    try {
      const providerMetadataObject = JSON.parse(providerMetadata) ;

      // Handle OpenAI metadata (v5 uses 'openai', v6 Azure Responses API uses 'azure')
      const openaiMetadata =
        providerMetadataObject.openai ?? providerMetadataObject.azure;
      if (openaiMetadata) {
        setAttributeIfDefined(
          attributes,
          GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
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
        setAttributeIfDefined(attributes, 'gen_ai.conversation.id', openaiMetadata.responseId);
      }

      if (providerMetadataObject.anthropic) {
        const cachedInputTokens =
          providerMetadataObject.anthropic.usage?.cache_read_input_tokens ??
          providerMetadataObject.anthropic.cacheReadInputTokens;
        setAttributeIfDefined(attributes, GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE, cachedInputTokens);

        const cacheWriteInputTokens =
          providerMetadataObject.anthropic.usage?.cache_creation_input_tokens ??
          providerMetadataObject.anthropic.cacheCreationInputTokens;
        setAttributeIfDefined(attributes, GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE, cacheWriteInputTokens);
      }

      if (providerMetadataObject.bedrock?.usage) {
        setAttributeIfDefined(
          attributes,
          GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
          providerMetadataObject.bedrock.usage.cacheReadInputTokens,
        );
        setAttributeIfDefined(
          attributes,
          GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE,
          providerMetadataObject.bedrock.usage.cacheWriteInputTokens,
        );
      }

      if (providerMetadataObject.deepseek) {
        setAttributeIfDefined(
          attributes,
          GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE,
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

export { addVercelAiProcessors };
//# sourceMappingURL=index.js.map
