Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const semanticAttributes = require('../../semanticAttributes.js');
const spanUtils = require('../../utils/spanUtils.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const constants = require('./constants.js');
const utils = require('./utils.js');
const vercelAiAttributes = require('./vercel-ai-attributes.js');

function addOriginToSpan(span, origin) {
  span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, origin);
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

    // Second pass: apply accumulated token data to parent spans
    for (const span of event.spans) {
      if (span.op !== 'gen_ai.invoke_agent') {
        continue;
      }

      utils.applyAccumulatedTokens(span, tokenAccumulator);
    }

    // Also apply to root when it is the invoke_agent pipeline
    const trace = event.contexts?.trace;
    if (trace && trace.op === 'gen_ai.invoke_agent') {
      utils.applyAccumulatedTokens(trace, tokenAccumulator);
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

  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_PROMPT_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE, genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE);

  // Input tokens is the sum of prompt tokens and cached input tokens
  if (
    typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number' &&
    typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE] === 'number'
  ) {
    attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] =
      attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] + attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE];
  }

  if (
    typeof attributes[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] === 'number' &&
    typeof attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] === 'number'
  ) {
    attributes['gen_ai.usage.total_tokens'] =
      attributes[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] + attributes[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE];
  }

  // Convert the available tools array to a JSON string
  if (attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] && Array.isArray(attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE])) {
    attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] = utils.convertAvailableToolsToJsonString(
      attributes[vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE] ,
    );
  }

  // Rename AI SDK attributes to standardized gen_ai attributes
  renameAttributeKey(attributes, vercelAiAttributes.OPERATION_NAME_ATTRIBUTE, genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_PROMPT_MESSAGES_ATTRIBUTE, genAiAttributes.GEN_AI_REQUEST_MESSAGES_ATTRIBUTE);
  renameAttributeKey(attributes, vercelAiAttributes.AI_RESPONSE_TEXT_ATTRIBUTE, 'gen_ai.response.text');
  renameAttributeKey(attributes, vercelAiAttributes.AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, 'gen_ai.response.tool_calls');
  renameAttributeKey(attributes, vercelAiAttributes.AI_RESPONSE_OBJECT_ATTRIBUTE, 'gen_ai.response.object');
  renameAttributeKey(attributes, vercelAiAttributes.AI_PROMPT_TOOLS_ATTRIBUTE, 'gen_ai.request.available_tools');

  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_ARGS_ATTRIBUTE, 'gen_ai.tool.input');
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_RESULT_ATTRIBUTE, 'gen_ai.tool.output');

  renameAttributeKey(attributes, vercelAiAttributes.AI_SCHEMA_ATTRIBUTE, 'gen_ai.request.schema');
  renameAttributeKey(attributes, vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE, genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE);

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
  span.setAttribute(semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP, 'gen_ai.execute_tool');
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_NAME_ATTRIBUTE, 'gen_ai.tool.name');
  renameAttributeKey(attributes, vercelAiAttributes.AI_TOOL_CALL_ID_ATTRIBUTE, 'gen_ai.tool.call.id');

  // Store the span in our global map using the tool call ID
  // This allows us to capture tool errors and link them to the correct span
  const toolCallId = attributes['gen_ai.tool.call.id'];

  if (typeof toolCallId === 'string') {
    constants.toolCallSpanMap.set(toolCallId, span);
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
  const functionId = attributes[vercelAiAttributes.AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE];
  if (functionId && typeof functionId === 'string') {
    span.updateName(`${nameWthoutAi} ${functionId}`);
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

  // Update span names for .do* spans to include the model ID (only if model ID exists)
  const modelId = attributes[vercelAiAttributes.AI_MODEL_ID_ATTRIBUTE];
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
        setAttributeIfDefined(attributes, 'gen_ai.conversation.id', openaiMetadata.responseId);
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
