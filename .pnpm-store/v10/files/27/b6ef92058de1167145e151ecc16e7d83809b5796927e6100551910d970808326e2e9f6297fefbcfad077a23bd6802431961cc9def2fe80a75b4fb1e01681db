import { getClient } from '../../currentScopes.js';
import { captureException } from '../../exports.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../../semanticAttributes.js';
import { SPAN_STATUS_ERROR } from '../spanstatus.js';
import { startSpanManual, startSpan } from '../trace.js';
import { GEN_AI_OPERATION_NAME_ATTRIBUTE, GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE, GEN_AI_REQUEST_MODEL_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, GEN_AI_RESPONSE_TEXT_ATTRIBUTE, GEN_AI_SYSTEM_ATTRIBUTE } from '../ai/gen-ai-attributes.js';
import { getTruncatedJsonString } from '../ai/utils.js';
import { instrumentStream } from './streaming.js';
import { shouldInstrument, getOperationName, getSpanOperation, extractRequestParameters, isChatCompletionResponse, addChatCompletionAttributes, isResponsesApiResponse, addResponsesApiAttributes, isEmbeddingsResponse, addEmbeddingsAttributes, isConversationResponse, addConversationAttributes, buildMethodPath } from './utils.js';

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
    [GEN_AI_SYSTEM_ATTRIBUTE]: 'openai',
    [GEN_AI_OPERATION_NAME_ATTRIBUTE]: getOperationName(methodPath),
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.openai',
  };

  if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
    const params = args[0] ;

    const availableTools = extractAvailableTools(params);
    if (availableTools) {
      attributes[GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE] = availableTools;
    }

    Object.assign(attributes, extractRequestParameters(params));
  } else {
    attributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE] = 'unknown';
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

  if (isChatCompletionResponse(response)) {
    addChatCompletionAttributes(span, response, recordOutputs);
    if (recordOutputs && response.choices?.length) {
      const responseTexts = response.choices.map(choice => choice.message?.content || '');
      span.setAttributes({ [GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: JSON.stringify(responseTexts) });
    }
  } else if (isResponsesApiResponse(response)) {
    addResponsesApiAttributes(span, response, recordOutputs);
    if (recordOutputs && response.output_text) {
      span.setAttributes({ [GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: response.output_text });
    }
  } else if (isEmbeddingsResponse(response)) {
    addEmbeddingsAttributes(span, response);
  } else if (isConversationResponse(response)) {
    addConversationAttributes(span, response);
  }
}

// Extract and record AI request inputs, if present. This is intentionally separate from response attributes.
function addRequestAttributes(span, params) {
  const src = 'input' in params ? params.input : 'messages' in params ? params.messages : undefined;
  // typically an array, but can be other types. skip if an empty array.
  const length = Array.isArray(src) ? src.length : undefined;
  if (src && length !== 0) {
    const truncatedInput = getTruncatedJsonString(src);
    span.setAttribute(GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, truncatedInput);
    if (length) {
      span.setAttribute(GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, length);
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
    const model = (requestAttributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE] ) || 'unknown';
    const operationName = getOperationName(methodPath);

    const params = args[0] ;
    const isStreamRequested = params && typeof params === 'object' && params.stream === true;

    if (isStreamRequested) {
      // For streaming responses, use manual span management to properly handle the async generator lifecycle
      return startSpanManual(
        {
          name: `${operationName} ${model} stream-response`,
          op: getSpanOperation(methodPath),
          attributes: requestAttributes ,
        },
        async (span) => {
          try {
            if (options.recordInputs && params) {
              addRequestAttributes(span, params);
            }

            const result = await originalMethod.apply(context, args);

            return instrumentStream(
              result ,
              span,
              options.recordOutputs ?? false,
            ) ;
          } catch (error) {
            // For streaming requests that fail before stream creation, we still want to record
            // them as streaming requests but end the span gracefully
            span.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
            captureException(error, {
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
      return startSpan(
        {
          name: `${operationName} ${model}`,
          op: getSpanOperation(methodPath),
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
            captureException(error, {
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
      const methodPath = buildMethodPath(currentPath, String(prop));

      if (typeof value === 'function' && shouldInstrument(methodPath)) {
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
  const sendDefaultPii = Boolean(getClient()?.getOptions().sendDefaultPii);

  const _options = {
    recordInputs: sendDefaultPii,
    recordOutputs: sendDefaultPii,
    ...options,
  };

  return createDeepProxy(client, '', _options);
}

export { instrumentOpenAiClient };
//# sourceMappingURL=index.js.map
