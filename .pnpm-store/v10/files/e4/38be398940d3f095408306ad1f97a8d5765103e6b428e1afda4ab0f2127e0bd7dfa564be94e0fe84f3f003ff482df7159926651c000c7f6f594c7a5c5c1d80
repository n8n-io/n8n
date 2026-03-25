import { captureException } from '../../exports.js';
import { SPAN_STATUS_ERROR } from '../spanstatus.js';
import { GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE } from '../ai/gen-ai-attributes.js';
import { getTruncatedJsonString } from '../ai/utils.js';
import { ANTHROPIC_AI_INSTRUMENTED_METHODS } from './constants.js';

/**
 * Check if a method path should be instrumented
 */
function shouldInstrument(methodPath) {
  return ANTHROPIC_AI_INSTRUMENTED_METHODS.includes(methodPath );
}

/**
 * Set the messages and messages original length attributes.
 */
function setMessagesAttribute(span, messages) {
  const length = Array.isArray(messages) ? messages.length : undefined;
  if (length !== 0) {
    span.setAttributes({
      [GEN_AI_REQUEST_MESSAGES_ATTRIBUTE]: getTruncatedJsonString(messages),
      [GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE]: length,
    });
  }
}

/**
 * Capture error information from the response
 * @see https://docs.anthropic.com/en/api/errors#error-shapes
 */
function handleResponseError(span, response) {
  if (response.error) {
    span.setStatus({ code: SPAN_STATUS_ERROR, message: response.error.type || 'internal_error' });

    captureException(response.error, {
      mechanism: {
        handled: false,
        type: 'auto.ai.anthropic.anthropic_error',
      },
    });
  }
}

/**
 * Include the system prompt in the messages list, if available
 */
function messagesFromParams(params) {
  const { system, messages, input } = params;

  const systemMessages = typeof system === 'string' ? [{ role: 'system', content: params.system }] : [];

  const inputParamMessages = Array.isArray(input) ? input : input != null ? [input] : undefined;

  const messagesParamMessages = Array.isArray(messages) ? messages : messages != null ? [messages] : [];

  const userMessages = inputParamMessages ?? messagesParamMessages;

  return [...systemMessages, ...userMessages];
}

export { handleResponseError, messagesFromParams, setMessagesAttribute, shouldInstrument };
//# sourceMappingURL=utils.js.map
