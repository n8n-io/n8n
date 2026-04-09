Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const _exports = require('../../exports.js');
const spanstatus = require('../spanstatus.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const constants = require('./constants.js');
const utils = require('./utils.js');

/**
 * State object used to accumulate information from a stream of OpenAI events/chunks.
 */

/**
 * Processes tool calls from a chat completion chunk delta.
 * Follows the pattern: accumulate by index, then convert to array at the end.
 *
 * @param toolCalls - Array of tool calls from the delta.
 * @param state - The current streaming state to update.
 *
 *  @see https://platform.openai.com/docs/guides/function-calling#streaming
 */
function processChatCompletionToolCalls(toolCalls, state) {
  for (const toolCall of toolCalls) {
    const index = toolCall.index;
    if (index === undefined || !toolCall.function) continue;

    // Initialize tool call if this is the first chunk for this index
    if (!(index in state.chatCompletionToolCalls)) {
      state.chatCompletionToolCalls[index] = {
        ...toolCall,
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments || '',
        },
      };
    } else {
      // Accumulate function arguments from subsequent chunks
      const existingToolCall = state.chatCompletionToolCalls[index];
      if (toolCall.function.arguments && existingToolCall?.function) {
        existingToolCall.function.arguments += toolCall.function.arguments;
      }
    }
  }
}

/**
 * Processes a single OpenAI ChatCompletionChunk event, updating the streaming state.
 *
 * @param chunk - The ChatCompletionChunk event to process.
 * @param state - The current streaming state to update.
 * @param recordOutputs - Whether to record output text fragments.
 */
function processChatCompletionChunk(chunk, state, recordOutputs) {
  state.responseId = chunk.id ?? state.responseId;
  state.responseModel = chunk.model ?? state.responseModel;
  state.responseTimestamp = chunk.created ?? state.responseTimestamp;

  if (chunk.usage) {
    // For stream responses, the input tokens remain constant across all events in the stream.
    // Output tokens, however, are only finalized in the last event.
    // Since we can't guarantee that the last event will include usage data or even be a typed event,
    // we update the output token values on every event that includes them.
    // This ensures that output token usage is always set, even if the final event lacks it.
    state.promptTokens = chunk.usage.prompt_tokens;
    state.completionTokens = chunk.usage.completion_tokens;
    state.totalTokens = chunk.usage.total_tokens;
  }

  for (const choice of chunk.choices ?? []) {
    if (recordOutputs) {
      if (choice.delta?.content) {
        state.responseTexts.push(choice.delta.content);
      }

      // Handle tool calls from delta
      if (choice.delta?.tool_calls) {
        processChatCompletionToolCalls(choice.delta.tool_calls, state);
      }
    }
    if (choice.finish_reason) {
      state.finishReasons.push(choice.finish_reason);
    }
  }
}

/**
 * Processes a single OpenAI Responses API streaming event, updating the streaming state and span.
 *
 * @param streamEvent - The event to process (may be an error or unknown object).
 * @param state - The current streaming state to update.
 * @param recordOutputs - Whether to record output text fragments.
 * @param span - The span to update with error status if needed.
 */
function processResponsesApiEvent(
  streamEvent,
  state,
  recordOutputs,
  span,
) {
  if (!(streamEvent && typeof streamEvent === 'object')) {
    state.eventTypes.push('unknown:non-object');
    return;
  }
  if (streamEvent instanceof Error) {
    span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
    _exports.captureException(streamEvent, {
      mechanism: {
        handled: false,
        type: 'auto.ai.openai.stream-response',
      },
    });
    return;
  }

  if (!('type' in streamEvent)) return;
  const event = streamEvent ;

  if (!constants.RESPONSE_EVENT_TYPES.includes(event.type)) {
    state.eventTypes.push(event.type);
    return;
  }

  // Handle output text delta
  if (recordOutputs) {
    // Handle tool call events for Responses API
    if (event.type === 'response.output_item.done' && 'item' in event) {
      state.responsesApiToolCalls.push(event.item);
    }

    if (event.type === 'response.output_text.delta' && 'delta' in event && event.delta) {
      state.responseTexts.push(event.delta);
      return;
    }
  }

  if ('response' in event) {
    const { response } = event ;
    state.responseId = response.id ?? state.responseId;
    state.responseModel = response.model ?? state.responseModel;
    state.responseTimestamp = response.created_at ?? state.responseTimestamp;

    if (response.usage) {
      // For stream responses, the input tokens remain constant across all events in the stream.
      // Output tokens, however, are only finalized in the last event.
      // Since we can't guarantee that the last event will include usage data or even be a typed event,
      // we update the output token values on every event that includes them.
      // This ensures that output token usage is always set, even if the final event lacks it.
      state.promptTokens = response.usage.input_tokens;
      state.completionTokens = response.usage.output_tokens;
      state.totalTokens = response.usage.total_tokens;
    }

    if (response.status) {
      state.finishReasons.push(response.status);
    }

    if (recordOutputs && response.output_text) {
      state.responseTexts.push(response.output_text);
    }
  }
}

/**
 * Instruments a stream of OpenAI events, updating the provided span with relevant attributes and
 * optionally recording output text. This function yields each event from the input stream as it is processed.
 *
 * @template T - The type of events in the stream.
 * @param stream - The async iterable stream of events to instrument.
 * @param span - The span to add attributes to and to finish at the end of the stream.
 * @param recordOutputs - Whether to record output text fragments in the span.
 * @returns An async generator yielding each event from the input stream.
 */
async function* instrumentStream(
  stream,
  span,
  recordOutputs,
) {
  const state = {
    eventTypes: [],
    responseTexts: [],
    finishReasons: [],
    responseId: '',
    responseModel: '',
    responseTimestamp: 0,
    promptTokens: undefined,
    completionTokens: undefined,
    totalTokens: undefined,
    chatCompletionToolCalls: {},
    responsesApiToolCalls: [],
  };

  try {
    for await (const event of stream) {
      if (utils.isChatCompletionChunk(event)) {
        processChatCompletionChunk(event , state, recordOutputs);
      } else if (utils.isResponsesApiStreamEvent(event)) {
        processResponsesApiEvent(event , state, recordOutputs, span);
      }
      yield event;
    }
  } finally {
    utils.setCommonResponseAttributes(span, state.responseId, state.responseModel, state.responseTimestamp);
    utils.setTokenUsageAttributes(span, state.promptTokens, state.completionTokens, state.totalTokens);

    span.setAttributes({
      [genAiAttributes.GEN_AI_RESPONSE_STREAMING_ATTRIBUTE]: true,
    });

    if (state.finishReasons.length) {
      span.setAttributes({
        [genAiAttributes.GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE]: JSON.stringify(state.finishReasons),
      });
    }

    if (recordOutputs && state.responseTexts.length) {
      span.setAttributes({
        [genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE]: state.responseTexts.join(''),
      });
    }

    // Set tool calls attribute if any were accumulated
    const chatCompletionToolCallsArray = Object.values(state.chatCompletionToolCalls);
    const allToolCalls = [...chatCompletionToolCallsArray, ...state.responsesApiToolCalls];

    if (allToolCalls.length > 0) {
      span.setAttributes({
        [genAiAttributes.GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE]: JSON.stringify(allToolCalls),
      });
    }

    span.end();
  }
}

exports.instrumentStream = instrumentStream;
//# sourceMappingURL=streaming.js.map
