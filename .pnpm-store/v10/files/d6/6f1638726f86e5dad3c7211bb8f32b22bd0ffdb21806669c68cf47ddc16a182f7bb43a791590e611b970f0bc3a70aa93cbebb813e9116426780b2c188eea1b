Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const exports$1 = require('../../exports.js');
const semanticAttributes = require('../../semanticAttributes.js');
const spanstatus = require('../spanstatus.js');
const trace = require('../trace.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const utils$1 = require('../ai/utils.js');
const streaming = require('./streaming.js');
const utils = require('./utils.js');

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
  return availableTools.length > 0 ? JSON.stringify(availableTools) : undefined;
}

/**
 * Extract request attributes from method arguments
 */
function extractRequestAttributes(args, methodPath) {
  const attributes = {
    [genAiAttributes.GEN_AI_SYSTEM_ATTRIBUTE]: 'openai',
    [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: utils.getOperationName(methodPath),
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.openai',
  };

  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    const params = args[0] ;

    const availableTools = extractAvailableTools(params);
    if (availableTools) {
      attributes[genAiAttributes.GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE] = availableTools;
    }

    Object.assign(attributes, utils.extractRequestParameters(params));
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

  if (utils.isChatCompletionResponse(response)) {
    utils.addChatCompletionAttributes(span, response, recordOutputs);
    if (recordOutputs && response.choices?.length) {
      const responseTexts = response.choices.map(choice => choice.message?.content || '');
      span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: JSON.stringify(responseTexts) });
    }
  } else if (utils.isResponsesApiResponse(response)) {
    utils.addResponsesApiAttributes(span, response, recordOutputs);
    if (recordOutputs && response.output_text) {
      span.setAttributes({ [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: response.output_text });
    }
  } else if (utils.isEmbeddingsResponse(response)) {
    utils.addEmbeddingsAttributes(span, response);
  } else if (utils.isConversationResponse(response)) {
    utils.addConversationAttributes(span, response);
  }
}

// Extract and record AI request inputs, if present. This is intentionally separate from response attributes.
function addRequestAttributes(span, params) {
  const src = 'input' in params ? params.input : 'messages' in params ? params.messages : undefined;
  // typically an array, but can be other types. skip if an empty array.
  const length = Array.isArray(src) ? src.length : undefined;
  if (src && length !== 0) {
    const truncatedInput = utils$1.getTruncatedJsonString(src);
    span.setAttribute(genAiAttributes.GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, truncatedInput);
    if (length) {
      span.setAttribute(genAiAttributes.GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, length);
    }
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
  return async function instrumentedMethod(...args) {
    const requestAttributes = extractRequestAttributes(args, methodPath);
    const model = (requestAttributes[genAiAttributes.GEN_AI_REQUEST_MODEL_ATTRIBUTE] ) || 'unknown';
    const operationName = utils.getOperationName(methodPath);

    const params = args[0] ;
    const isStreamRequested = params && typeof params === 'object' && params.stream === true;

    if (isStreamRequested) {
      // For streaming responses, use manual span management to properly handle the async generator lifecycle
      return trace.startSpanManual(
        {
          name: `${operationName} ${model} stream-response`,
          op: utils.getSpanOperation(methodPath),
          attributes: requestAttributes ,
        },
        async (span) => {
          try {
            if (options.recordInputs && params) {
              addRequestAttributes(span, params);
            }

            const result = await originalMethod.apply(context, args);

            return streaming.instrumentStream(
              result ,
              span,
              options.recordOutputs ?? false,
            ) ;
          } catch (error) {
            // For streaming requests that fail before stream creation, we still want to record
            // them as streaming requests but end the span gracefully
            span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
            exports$1.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.ai.openai.stream',
                data: {
                  function: methodPath,
                },
              },
            });
            span.end();
            throw error;
          }
        },
      );
    } else {
      //  Non-streaming responses
      return trace.startSpan(
        {
          name: `${operationName} ${model}`,
          op: utils.getSpanOperation(methodPath),
          attributes: requestAttributes ,
        },
        async (span) => {
          try {
            if (options.recordInputs && params) {
              addRequestAttributes(span, params);
            }

            const result = await originalMethod.apply(context, args);
            addResponseAttributes(span, result, options.recordOutputs);
            return result;
          } catch (error) {
            exports$1.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.ai.openai',
                data: {
                  function: methodPath,
                },
              },
            });
            throw error;
          }
        },
      );
    }
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

      if (typeof value === 'function' && utils.shouldInstrument(methodPath)) {
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
  const sendDefaultPii = Boolean(currentScopes.getClient()?.getOptions().sendDefaultPii);

  const _options = {
    recordInputs: sendDefaultPii,
    recordOutputs: sendDefaultPii,
    ...options,
  };

  return createDeepProxy(client, '', _options);
}

exports.instrumentOpenAiClient = instrumentOpenAiClient;
//# sourceMappingURL=index.js.map
