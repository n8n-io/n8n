Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const exports$1 = require('../../exports.js');
const semanticAttributes = require('../../semanticAttributes.js');
const spanstatus = require('../spanstatus.js');
const trace = require('../trace.js');
const handleCallbackErrors = require('../../utils/handleCallbackErrors.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const utils$1 = require('../ai/utils.js');
const streaming = require('./streaming.js');
const utils = require('./utils.js');

/**
 * Extract request attributes from method arguments
 */
function extractRequestAttributes(args, methodPath) {
  const attributes = {
    [genAiAttributes.GEN_AI_SYSTEM_ATTRIBUTE]: 'anthropic',
    [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: utils$1.getFinalOperationName(methodPath),
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.anthropic',
  };

  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    const params = args[0] ;
    if (params.tools && Array.isArray(params.tools)) {
      attributes[genAiAttributes.GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE] = JSON.stringify(params.tools);
    }

    attributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] = params.model ?? 'unknown';
    if ('temperature' in params) attributes[genAiAttributes.GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE] = params.temperature;
    if ('top_p' in params) attributes[genAiAttributes.GEN_AI_REQUEST_TOP_P_ATTRIBUTE] = params.top_p;
    if ('stream' in params) attributes[genAiAttributes.GEN_AI_REQUEST_STREAM_ATTRIBUTE] = params.stream;
    if ('top_k' in params) attributes[genAiAttributes.GEN_AI_REQUEST_TOP_K_ATTRIBUTE] = params.top_k;
    if ('frequency_penalty' in params)
      attributes[genAiAttributes.GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE] = params.frequency_penalty;
    if ('max_tokens' in params) attributes[genAiAttributes.GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE] = params.max_tokens;
  } else {
    if (methodPath === 'models.retrieve' || methodPath === 'models.get') {
      // models.retrieve(model-id) and models.get(model-id)
      attributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] = args[0];
    } else {
      attributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] = 'unknown';
    }
  }

  return attributes;
}

/**
 * Add private request attributes to spans.
 * This is only recorded if recordInputs is true.
 */
function addPrivateRequestAttributes(span, params) {
  const messages = utils.messagesFromParams(params);
  utils.setMessagesAttribute(span, messages);

  if ('prompt' in params) {
    span.setAttributes({ [genAiAttributes.GEN_AI_PROMPT_ATTRIBUTE]: JSON.stringify(params.prompt) });
  }
}

/**
 * Add content attributes when recordOutputs is enabled
 */
function addContentAttributes(span, response) {
  // Messages.create
  if ('content' in response) {
    if (Array.isArray(response.content)) {
      span.setAttributes({
        [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: response.content
          .map((item) => item.text)
          .filter(text => !!text)
          .join(''),
      });

      const toolCalls = [];

      for (const item of response.content) {
        if (item.type === 'tool_use' || item.type === 'server_tool_use') {
          toolCalls.push(item);
        }
      }
      if (toolCalls.length > 0) {
        span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE]: JSON.stringify(toolCalls) });
      }
    }
  }
  // Completions.create
  if ('completion' in response) {
    span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: response.completion });
  }
  // Models.countTokens
  if ('input_tokens' in response) {
    span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: JSON.stringify(response.input_tokens) });
  }
}

/**
 * Add basic metadata attributes from the response
 */
function addMetadataAttributes(span, response) {
  if ('id' in response && 'model' in response) {
    span.setAttributes({
      [genAiAttributes.GEN_AI_RESPONSE_ID_ATTRIBUTE]: response.id,
      [genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE]: response.model,
    });

    if ('created' in response && typeof response.created === 'number') {
      span.setAttributes({
        [genAiAttributes.ANTHROPIC_AI_RESPONSE_TIMESTAMP_ATTRIBUTE]: new Date(response.created * 1000).toISOString(),
      });
    }
    if ('created_at' in response && typeof response.created_at === 'number') {
      span.setAttributes({
        [genAiAttributes.ANTHROPIC_AI_RESPONSE_TIMESTAMP_ATTRIBUTE]: new Date(response.created_at * 1000).toISOString(),
      });
    }

    if ('usage' in response && response.usage) {
      utils$1.setTokenUsageAttributes(
        span,
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.usage.cache_creation_input_tokens,
        response.usage.cache_read_input_tokens,
      );
    }
  }
}

/**
 * Add response attributes to spans
 */
function addResponseAttributes(span, response, recordOutputs) {
  if (!response || typeof response !== 'object') return;

  // capture error, do not add attributes if error (they shouldn't exist)
  if ('type' in response && response.type === 'error') {
    utils.handleResponseError(span, response);
    return;
  }

  // Private response attributes that are only recorded if recordOutputs is true.
  if (recordOutputs) {
    addContentAttributes(span, response);
  }

  // Add basic metadata attributes
  addMetadataAttributes(span, response);
}

/**
 * Handle common error catching and reporting for streaming requests
 */
function handleStreamingError(error, span, methodPath) {
  exports$1.captureException(error, {
    mechanism: { handled: false, type: 'auto.ai.anthropic', data: { function: methodPath } },
  });

  if (span.isRecording()) {
    span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
    span.end();
  }
  throw error;
}

/**
 * Handle streaming cases with common logic
 */
function handleStreamingRequest(
  originalMethod,
  target,
  context,
  args,
  requestAttributes,
  operationName,
  methodPath,
  params,
  options,
  isStreamRequested,
  isStreamingMethod,
) {
  const model = requestAttributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] ?? 'unknown';
  const spanConfig = {
    name: `${operationName} ${model} stream-response`,
    op: utils$1.getSpanOperation(methodPath),
    attributes: requestAttributes ,
  };

  // messages.stream() always returns a sync MessageStream, even with stream: true param
  if (isStreamRequested && !isStreamingMethod) {
    return trace.startSpanManual(spanConfig, async span => {
      try {
        if (options.recordInputs && params) {
          addPrivateRequestAttributes(span, params);
        }
        const result = await originalMethod.apply(context, args);
        return streaming.instrumentAsyncIterableStream(
          result ,
          span,
          options.recordOutputs ?? false,
        ) ;
      } catch (error) {
        return handleStreamingError(error, span, methodPath);
      }
    });
  } else {
    return trace.startSpanManual(spanConfig, span => {
      try {
        if (options.recordInputs && params) {
          addPrivateRequestAttributes(span, params);
        }
        const messageStream = target.apply(context, args);
        return streaming.instrumentMessageStream(messageStream, span, options.recordOutputs ?? false);
      } catch (error) {
        return handleStreamingError(error, span, methodPath);
      }
    });
  }
}

/**
 * Instrument a method with Sentry spans
 * Following Sentry AI Agents Manual Instrumentation conventions
 * @see https://docs.sentry.io/platforms/javascript/guides/node/tracing/instrumentation/ai-agents-module/#manual-instrumentation
 */
function instrumentMethod(
  originalMethod,
  methodPath,
  context,
  options,
) {
  return new Proxy(originalMethod, {
    apply(target, thisArg, args) {
      const requestAttributes = extractRequestAttributes(args, methodPath);
      const model = requestAttributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] ?? 'unknown';
      const operationName = utils$1.getFinalOperationName(methodPath);

      const params = typeof args[0] === 'object' ? (args[0] ) : undefined;
      const isStreamRequested = Boolean(params?.stream);
      const isStreamingMethod = methodPath === 'messages.stream';

      if (isStreamRequested || isStreamingMethod) {
        return handleStreamingRequest(
          originalMethod,
          target,
          context,
          args,
          requestAttributes,
          operationName,
          methodPath,
          params,
          options,
          isStreamRequested,
          isStreamingMethod,
        );
      }

      return trace.startSpan(
        {
          name: `${operationName} ${model}`,
          op: utils$1.getSpanOperation(methodPath),
          attributes: requestAttributes ,
        },
        span => {
          if (options.recordInputs && params) {
            addPrivateRequestAttributes(span, params);
          }

          return handleCallbackErrors.handleCallbackErrors(
            () => target.apply(context, args),
            error => {
              exports$1.captureException(error, {
                mechanism: {
                  handled: false,
                  type: 'auto.ai.anthropic',
                  data: {
                    function: methodPath,
                  },
                },
              });
            },
            () => {},
            result => addResponseAttributes(span, result , options.recordOutputs),
          );
        },
      );
    },
  }) ;
}

/**
 * Create a deep proxy for Anthropic AI client instrumentation
 */
function createDeepProxy(target, currentPath = '', options) {
  return new Proxy(target, {
    get(obj, prop) {
      const value = (obj )[prop];
      const methodPath = utils$1.buildMethodPath(currentPath, String(prop));

      if (typeof value === 'function' && utils.shouldInstrument(methodPath)) {
        return instrumentMethod(value , methodPath, obj, options);
      }

      if (typeof value === 'function') {
        // Bind non-instrumented functions to preserve the original `this` context,
        return value.bind(obj);
      }

      if (value && typeof value === 'object') {
        return createDeepProxy(value, methodPath, options);
      }

      return value;
    },
  }) ;
}

/**
 * Instrument an Anthropic AI client with Sentry tracing
 * Can be used across Node.js, Cloudflare Workers, and Vercel Edge
 *
 * @template T - The type of the client that extends object
 * @param client - The Anthropic AI client to instrument
 * @param options - Optional configuration for recording inputs and outputs
 * @returns The instrumented client with the same type as the input
 */
function instrumentAnthropicAiClient(anthropicAiClient, options) {
  const sendDefaultPii = Boolean(currentScopes.getClient()?.getOptions().sendDefaultPii);

  const _options = {
    recordInputs: sendDefaultPii,
    recordOutputs: sendDefaultPii,
    ...options,
  };
  return createDeepProxy(anthropicAiClient, '', _options);
}

exports.instrumentAnthropicAiClient = instrumentAnthropicAiClient;
//# sourceMappingURL=index.js.map
