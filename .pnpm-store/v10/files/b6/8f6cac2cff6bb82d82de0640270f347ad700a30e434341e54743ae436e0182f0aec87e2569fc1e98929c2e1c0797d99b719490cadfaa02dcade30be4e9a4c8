Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../../debug-build.js');
const _exports = require('../../exports.js');
const semanticAttributes = require('../../semanticAttributes.js');
const debugLogger = require('../../utils/debug-logger.js');
const spanstatus = require('../spanstatus.js');
const trace = require('../trace.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const utils = require('../ai/utils.js');
const streaming = require('./streaming.js');
const utils$1 = require('./utils.js');

/**
 * Extract available tools from request parameters
 */
function extractAvailableTools(params) {
  const tools = Array.isArray(params.tools) ? params.tools : [];
  const hasWebSearchOptions = params.web_search_options && typeof params.web_search_options === 'object';
  const webSearchOptions = hasWebSearchOptions
    ? [{ type: 'web_search_options', ...(params.web_search_options ) }]
    : [];

  const availableTools = [...tools, ...webSearchOptions];
  if (availableTools.length === 0) {
    return undefined;
  }

  try {
    return JSON.stringify(availableTools);
  } catch (error) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.error('Failed to serialize OpenAI tools:', error);
    return undefined;
  }
}

/**
 * Extract request attributes from method arguments
 */
function extractRequestAttributes(args, methodPath) {
  const attributes = {
    [genAiAttributes.GEN_AI_SYSTEM_ATTRIBUTE]: 'openai',
    [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: utils$1.getOperationName(methodPath),
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.openai',
  };

  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    const params = args[0] ;

    const availableTools = extractAvailableTools(params);
    if (availableTools) {
      attributes[genAiAttributes.GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE] = availableTools;
    }

    Object.assign(attributes, utils$1.extractRequestParameters(params));
  } else {
    attributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] = 'unknown';
  }

  return attributes;
}

/**
 * Add response attributes to spans
 * This supports Chat Completion, Responses API, Embeddings, and Conversations API responses
 */
function addResponseAttributes(span, result, recordOutputs) {
  if (!result || typeof result !== 'object') return;

  const response = result ;

  if (utils$1.isChatCompletionResponse(response)) {
    utils$1.addChatCompletionAttributes(span, response, recordOutputs);
    if (recordOutputs && response.choices?.length) {
      const responseTexts = response.choices.map(choice => choice.message?.content || '');
      span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: JSON.stringify(responseTexts) });
    }
  } else if (utils$1.isResponsesApiResponse(response)) {
    utils$1.addResponsesApiAttributes(span, response, recordOutputs);
    if (recordOutputs && response.output_text) {
      span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: response.output_text });
    }
  } else if (utils$1.isEmbeddingsResponse(response)) {
    utils$1.addEmbeddingsAttributes(span, response);
  } else if (utils$1.isConversationResponse(response)) {
    utils$1.addConversationAttributes(span, response);
  }
}

// Extract and record AI request inputs, if present. This is intentionally separate from response attributes.
function addRequestAttributes(span, params, operationName) {
  // Store embeddings input on a separate attribute and do not truncate it
  if (operationName === genAiAttributes.OPENAI_OPERATIONS.EMBEDDINGS && 'input' in params) {
    const input = params.input;

    // No input provided
    if (input == null) {
      return;
    }

    // Empty input string
    if (typeof input === 'string' && input.length === 0) {
      return;
    }

    // Empty array input
    if (Array.isArray(input) && input.length === 0) {
      return;
    }

    // Store strings as-is, arrays/objects as JSON
    span.setAttribute(genAiAttributes.GEN_AI_EMBEDDINGS_INPUT_ATTRIBUTE, typeof input === 'string' ? input : JSON.stringify(input));
    return;
  }

  const src = 'input' in params ? params.input : 'messages' in params ? params.messages : undefined;

  if (!src) {
    return;
  }

  if (Array.isArray(src) && src.length === 0) {
    return;
  }

  const { systemInstructions, filteredMessages } = utils.extractSystemInstructions(src);

  if (systemInstructions) {
    span.setAttribute(genAiAttributes.GEN_AI_SYSTEM_INSTRUCTIONS_ATTRIBUTE, systemInstructions);
  }

  const truncatedInput = utils.getTruncatedJsonString(filteredMessages);
  span.setAttribute(genAiAttributes.GEN_AI_INPUT_MESSAGES_ATTRIBUTE, truncatedInput);

  if (Array.isArray(filteredMessages)) {
    span.setAttribute(genAiAttributes.GEN_AI_INPUT_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, filteredMessages.length);
  } else {
    span.setAttribute(genAiAttributes.GEN_AI_INPUT_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, 1);
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
  return function instrumentedMethod(...args) {
    const requestAttributes = extractRequestAttributes(args, methodPath);
    const model = (requestAttributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] ) || 'unknown';
    const operationName = utils$1.getOperationName(methodPath);

    const params = args[0] ;
    const isStreamRequested = params && typeof params === 'object' && params.stream === true;

    const spanConfig = {
      name: `${operationName} ${model}`,
      op: utils$1.getSpanOperation(methodPath),
      attributes: requestAttributes ,
    };

    if (isStreamRequested) {
      let originalResult;

      const instrumentedPromise = trace.startSpanManual(spanConfig, (span) => {
        originalResult = originalMethod.apply(context, args);

        if (options.recordInputs && params) {
          addRequestAttributes(span, params, operationName);
        }

        // Return async processing
        return (async () => {
          try {
            const result = await originalResult;
            return streaming.instrumentStream(
              result ,
              span,
              options.recordOutputs ?? false,
            ) ;
          } catch (error) {
            span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
            _exports.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.ai.openai.stream',
                data: { function: methodPath },
              },
            });
            span.end();
            throw error;
          }
        })();
      });

      return utils.wrapPromiseWithMethods(originalResult, instrumentedPromise, 'auto.ai.openai');
    }

    // Non-streaming
    let originalResult;

    const instrumentedPromise = trace.startSpan(spanConfig, (span) => {
      // Call synchronously to capture the promise
      originalResult = originalMethod.apply(context, args);

      if (options.recordInputs && params) {
        addRequestAttributes(span, params, operationName);
      }

      return originalResult.then(
        result => {
          addResponseAttributes(span, result, options.recordOutputs);
          return result;
        },
        error => {
          _exports.captureException(error, {
            mechanism: {
              handled: false,
              type: 'auto.ai.openai',
              data: { function: methodPath },
            },
          });
          throw error;
        },
      );
    });

    return utils.wrapPromiseWithMethods(originalResult, instrumentedPromise, 'auto.ai.openai');
  };
}

/**
 * Create a deep proxy for OpenAI client instrumentation
 */
function createDeepProxy(target, currentPath = '', options) {
  return new Proxy(target, {
    get(obj, prop) {
      const value = (obj )[prop];
      const methodPath = utils.buildMethodPath(currentPath, String(prop));

      if (typeof value === 'function' && utils$1.shouldInstrument(methodPath)) {
        return instrumentMethod(value , methodPath, obj, options);
      }

      if (typeof value === 'function') {
        // Bind non-instrumented functions to preserve the original `this` context,
        // which is required for accessing private class fields (e.g. #baseURL) in OpenAI SDK v5.
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
 * Instrument an OpenAI client with Sentry tracing
 * Can be used across Node.js, Cloudflare Workers, and Vercel Edge
 */
function instrumentOpenAiClient(client, options) {
  return createDeepProxy(client, '', utils.resolveAIRecordingOptions(options));
}

exports.instrumentOpenAiClient = instrumentOpenAiClient;
//# sourceMappingURL=index.js.map
