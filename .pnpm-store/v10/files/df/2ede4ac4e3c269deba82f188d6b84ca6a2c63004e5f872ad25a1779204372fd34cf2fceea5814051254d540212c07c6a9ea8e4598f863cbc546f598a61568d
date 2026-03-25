import { getClient } from '../../currentScopes.js';
import { captureException } from '../../exports.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../../semanticAttributes.js';
import { SPAN_STATUS_ERROR } from '../spanstatus.js';
import { startSpanManual, startSpan } from '../trace.js';
import { handleCallbackErrors } from '../../utils/handleCallbackErrors.js';
import { GEN_AI_OPERATION_NAME_ATTRIBUTE, GEN_AI_REQUEST_MODEL_ATTRIBUTE, GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, GEN_AI_RESPONSE_MODEL_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE, GEN_AI_RESPONSE_TEXT_ATTRIBUTE, GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, GEN_AI_SYSTEM_ATTRIBUTE, GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE, GEN_AI_REQUEST_TOP_P_ATTRIBUTE, GEN_AI_REQUEST_TOP_K_ATTRIBUTE, GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE, GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE, GEN_AI_REQUEST_PRESENCE_PENALTY_ATTRIBUTE } from '../ai/gen-ai-attributes.js';
import { truncateGenAiMessages } from '../ai/messageTruncation.js';
import { buildMethodPath, getFinalOperationName, getSpanOperation } from '../ai/utils.js';
import { CHATS_CREATE_METHOD, CHAT_PATH, GOOGLE_GENAI_SYSTEM_NAME } from './constants.js';
import { instrumentStream } from './streaming.js';
import { shouldInstrument, isStreamingMethod, contentUnionToMessages } from './utils.js';

/**
 * Extract model from parameters or chat context object
 * For chat instances, the model is available on the chat object as 'model' (older versions) or 'modelVersion' (newer versions)
 */
function extractModel(params, context) {
  if ('model' in params && typeof params.model === 'string') {
    return params.model;
  }

  // Try to get model from chat context object (chat instance has model property)
  if (context && typeof context === 'object') {
    const contextObj = context ;

    // Check for 'model' property (older versions, and streaming)
    if ('model' in contextObj && typeof contextObj.model === 'string') {
      return contextObj.model;
    }

    // Check for 'modelVersion' property (newer versions)
    if ('modelVersion' in contextObj && typeof contextObj.modelVersion === 'string') {
      return contextObj.modelVersion;
    }
  }

  return 'unknown';
}

/**
 * Extract generation config parameters
 */
function extractConfigAttributes(config) {
  const attributes = {};

  if ('temperature' in config && typeof config.temperature === 'number') {
    attributes[GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE] = config.temperature;
  }
  if ('topP' in config && typeof config.topP === 'number') {
    attributes[GEN_AI_REQUEST_TOP_P_ATTRIBUTE] = config.topP;
  }
  if ('topK' in config && typeof config.topK === 'number') {
    attributes[GEN_AI_REQUEST_TOP_K_ATTRIBUTE] = config.topK;
  }
  if ('maxOutputTokens' in config && typeof config.maxOutputTokens === 'number') {
    attributes[GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE] = config.maxOutputTokens;
  }
  if ('frequencyPenalty' in config && typeof config.frequencyPenalty === 'number') {
    attributes[GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE] = config.frequencyPenalty;
  }
  if ('presencePenalty' in config && typeof config.presencePenalty === 'number') {
    attributes[GEN_AI_REQUEST_PRESENCE_PENALTY_ATTRIBUTE] = config.presencePenalty;
  }

  return attributes;
}

/**
 * Extract request attributes from method arguments
 * Builds the base attributes for span creation including system info, model, and config
 */
function extractRequestAttributes(
  methodPath,
  params,
  context,
) {
  const attributes = {
    [GEN_AI_SYSTEM_ATTRIBUTE]: GOOGLE_GENAI_SYSTEM_NAME,
    [GEN_AI_OPERATION_NAME_ATTRIBUTE]: getFinalOperationName(methodPath),
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.google_genai',
  };

  if (params) {
    attributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE] = extractModel(params, context);

    // Extract generation config parameters
    if ('config' in params && typeof params.config === 'object' && params.config) {
      const config = params.config ;
      Object.assign(attributes, extractConfigAttributes(config));

      // Extract available tools from config
      if ('tools' in config && Array.isArray(config.tools)) {
        const functionDeclarations = config.tools.flatMap(
          (tool) => tool.functionDeclarations,
        );
        attributes[GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE] = JSON.stringify(functionDeclarations);
      }
    }
  } else {
    attributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE] = extractModel({}, context);
  }

  return attributes;
}

/**
 * Add private request attributes to spans.
 * This is only recorded if recordInputs is true.
 * Handles different parameter formats for different Google GenAI methods.
 */
function addPrivateRequestAttributes(span, params) {
  const messages = [];

  // config.systemInstruction: ContentUnion
  if (
    'config' in params &&
    params.config &&
    typeof params.config === 'object' &&
    'systemInstruction' in params.config &&
    params.config.systemInstruction
  ) {
    messages.push(...contentUnionToMessages(params.config.systemInstruction , 'system'));
  }

  // For chats.create: history contains the conversation history
  if ('history' in params) {
    messages.push(...contentUnionToMessages(params.history , 'user'));
  }

  // For models.generateContent: ContentListUnion
  if ('contents' in params) {
    messages.push(...contentUnionToMessages(params.contents , 'user'));
  }

  // For chat.sendMessage: message can be PartListUnion
  if ('message' in params) {
    messages.push(...contentUnionToMessages(params.message , 'user'));
  }

  if (Array.isArray(messages) && messages.length) {
    span.setAttributes({
      [GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE]: messages.length,
      [GEN_AI_REQUEST_MESSAGES_ATTRIBUTE]: JSON.stringify(truncateGenAiMessages(messages)),
    });
  }
}

/**
 * Add response attributes from the Google GenAI response
 * @see https://github.com/googleapis/js-genai/blob/v1.19.0/src/types.ts#L2313
 */
function addResponseAttributes(span, response, recordOutputs) {
  if (!response || typeof response !== 'object') return;

  if (response.modelVersion) {
    span.setAttribute(GEN_AI_RESPONSE_MODEL_ATTRIBUTE, response.modelVersion);
  }

  // Add usage metadata if present
  if (response.usageMetadata && typeof response.usageMetadata === 'object') {
    const usage = response.usageMetadata;
    if (typeof usage.promptTokenCount === 'number') {
      span.setAttributes({
        [GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE]: usage.promptTokenCount,
      });
    }
    if (typeof usage.candidatesTokenCount === 'number') {
      span.setAttributes({
        [GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE]: usage.candidatesTokenCount,
      });
    }
    if (typeof usage.totalTokenCount === 'number') {
      span.setAttributes({
        [GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE]: usage.totalTokenCount,
      });
    }
  }

  // Add response text if recordOutputs is enabled
  if (recordOutputs && Array.isArray(response.candidates) && response.candidates.length > 0) {
    const responseTexts = response.candidates
      .map((candidate) => {
        if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
          return candidate.content.parts
            .map((part) => (typeof part.text === 'string' ? part.text : ''))
            .filter((text) => text.length > 0)
            .join('');
        }
        return '';
      })
      .filter((text) => text.length > 0);

    if (responseTexts.length > 0) {
      span.setAttributes({
        [GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: responseTexts.join(''),
      });
    }
  }

  // Add tool calls if recordOutputs is enabled
  if (recordOutputs && response.functionCalls) {
    const functionCalls = response.functionCalls;
    if (Array.isArray(functionCalls) && functionCalls.length > 0) {
      span.setAttributes({
        [GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE]: JSON.stringify(functionCalls),
      });
    }
  }
}

/**
 * Instrument any async or synchronous genai method with Sentry spans
 * Handles operations like models.generateContent and chat.sendMessage and chats.create
 * @see https://docs.sentry.io/platforms/javascript/guides/node/tracing/instrumentation/ai-agents-module/#manual-instrumentation
 */
function instrumentMethod(
  originalMethod,
  methodPath,
  context,
  options,
) {
  const isSyncCreate = methodPath === CHATS_CREATE_METHOD;

  return new Proxy(originalMethod, {
    apply(target, _, args) {
      const params = args[0] ;
      const requestAttributes = extractRequestAttributes(methodPath, params, context);
      const model = requestAttributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE] ?? 'unknown';
      const operationName = getFinalOperationName(methodPath);

      // Check if this is a streaming method
      if (isStreamingMethod(methodPath)) {
        // Use startSpanManual for streaming methods to control span lifecycle
        return startSpanManual(
          {
            name: `${operationName} ${model} stream-response`,
            op: getSpanOperation(methodPath),
            attributes: requestAttributes,
          },
          async (span) => {
            try {
              if (options.recordInputs && params) {
                addPrivateRequestAttributes(span, params);
              }
              const stream = await target.apply(context, args);
              return instrumentStream(stream, span, Boolean(options.recordOutputs)) ;
            } catch (error) {
              span.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
              captureException(error, {
                mechanism: {
                  handled: false,
                  type: 'auto.ai.google_genai',
                  data: { function: methodPath },
                },
              });
              span.end();
              throw error;
            }
          },
        );
      }
      // Single span for both sync and async operations
      return startSpan(
        {
          name: isSyncCreate ? `${operationName} ${model} create` : `${operationName} ${model}`,
          op: getSpanOperation(methodPath),
          attributes: requestAttributes,
        },
        (span) => {
          if (options.recordInputs && params) {
            addPrivateRequestAttributes(span, params);
          }

          return handleCallbackErrors(
            () => target.apply(context, args),
            error => {
              captureException(error, {
                mechanism: { handled: false, type: 'auto.ai.google_genai', data: { function: methodPath } },
              });
            },
            () => {},
            result => {
              // Only add response attributes for content-producing methods, not for chats.create
              if (!isSyncCreate) {
                addResponseAttributes(span, result, options.recordOutputs);
              }
            },
          );
        },
      );
    },
  }) ;
}

/**
 * Create a deep proxy for Google GenAI client instrumentation
 * Recursively instruments methods and handles special cases like chats.create
 */
function createDeepProxy(target, currentPath = '', options) {
  return new Proxy(target, {
    get: (t, prop, receiver) => {
      const value = Reflect.get(t, prop, receiver);
      const methodPath = buildMethodPath(currentPath, String(prop));

      if (typeof value === 'function' && shouldInstrument(methodPath)) {
        // Special case: chats.create is synchronous but needs both instrumentation AND result proxying
        if (methodPath === CHATS_CREATE_METHOD) {
          const instrumentedMethod = instrumentMethod(value , methodPath, t, options);
          return function instrumentedAndProxiedCreate(...args) {
            const result = instrumentedMethod(...args);
            // If the result is an object (like a chat instance), proxy it too
            if (result && typeof result === 'object') {
              return createDeepProxy(result, CHAT_PATH, options);
            }
            return result;
          };
        }

        return instrumentMethod(value , methodPath, t, options);
      }

      if (typeof value === 'function') {
        // Bind non-instrumented functions to preserve the original `this` context
        return value.bind(t);
      }

      if (value && typeof value === 'object') {
        return createDeepProxy(value, methodPath, options);
      }

      return value;
    },
  });
}

/**
 * Instrument a Google GenAI client with Sentry tracing
 * Can be used across Node.js, Cloudflare Workers, and Vercel Edge
 *
 * @template T - The type of the client that extends client object
 * @param client - The Google GenAI client to instrument
 * @param options - Optional configuration for recording inputs and outputs
 * @returns The instrumented client with the same type as the input
 *
 * @example
 * ```typescript
 * import { GoogleGenAI } from '@google/genai';
 * import { instrumentGoogleGenAIClient } from '@sentry/core';
 *
 * const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
 * const instrumentedClient = instrumentGoogleGenAIClient(genAI);
 *
 * // Now both chats.create and sendMessage will be instrumented
 * const chat = instrumentedClient.chats.create({ model: 'gemini-1.5-pro' });
 * const response = await chat.sendMessage({ message: 'Hello' });
 * ```
 */
function instrumentGoogleGenAIClient(client, options) {
  const sendDefaultPii = Boolean(getClient()?.getOptions().sendDefaultPii);

  const _options = {
    recordInputs: sendDefaultPii,
    recordOutputs: sendDefaultPii,
    ...options,
  };
  return createDeepProxy(client, '', _options);
}

export { extractModel, instrumentGoogleGenAIClient };
//# sourceMappingURL=index.js.map
