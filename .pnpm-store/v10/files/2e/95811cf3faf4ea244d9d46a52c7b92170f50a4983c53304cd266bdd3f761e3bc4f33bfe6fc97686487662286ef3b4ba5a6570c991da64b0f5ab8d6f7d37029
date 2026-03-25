Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const exports$1 = require('../../exports.js');
const spanstatus = require('../spanstatus.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');

/**
 * State object used to accumulate information from a stream of Google GenAI events.
 */

/**
 * Checks if a response chunk contains an error
 * @param chunk - The response chunk to check
 * @param span - The span to update if error is found
 * @returns Whether an error occurred
 */
function isErrorChunk(chunk, span) {
  const feedback = chunk?.promptFeedback;
  if (feedback?.blockReason) {
    const message = feedback.blockReasonMessage ?? feedback.blockReason;
    span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: `Content blocked: ${message}` });
    exports$1.captureException(`Content blocked: ${message}`, {
      mechanism: { handled: false, type: 'auto.ai.google_genai' },
    });
    return true;
  }
  return false;
}

/**
 * Processes response metadata from a chunk
 * @param chunk - The response chunk to process
 * @param state - The state of the streaming process
 */
function handleResponseMetadata(chunk, state) {
  if (typeof chunk.responseId === 'string') state.responseId = chunk.responseId;
  if (typeof chunk.modelVersion === 'string') state.responseModel = chunk.modelVersion;

  const usage = chunk.usageMetadata;
  if (usage) {
    if (typeof usage.promptTokenCount === 'number') state.promptTokens = usage.promptTokenCount;
    if (typeof usage.candidatesTokenCount === 'number') state.completionTokens = usage.candidatesTokenCount;
    if (typeof usage.totalTokenCount === 'number') state.totalTokens = usage.totalTokenCount;
  }
}

/**
 * Processes candidate content from a response chunk
 * @param chunk - The response chunk to process
 * @param state - The state of the streaming process
 * @param recordOutputs - Whether to record outputs
 */
function handleCandidateContent(chunk, state, recordOutputs) {
  if (Array.isArray(chunk.functionCalls)) {
    state.toolCalls.push(...chunk.functionCalls);
  }

  for (const candidate of chunk.candidates ?? []) {
    if (candidate?.finishReason && !state.finishReasons.includes(candidate.finishReason)) {
      state.finishReasons.push(candidate.finishReason);
    }

    for (const part of candidate?.content?.parts ?? []) {
      if (recordOutputs && part.text) state.responseTexts.push(part.text);
      if (part.functionCall) {
        state.toolCalls.push({
          type: 'function',
          id: part.functionCall.id,
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        });
      }
    }
  }
}

/**
 * Processes a single chunk from the Google GenAI stream
 * @param chunk - The chunk to process
 * @param state - The state of the streaming process
 * @param recordOutputs - Whether to record outputs
 * @param span - The span to update
 */
function processChunk(chunk, state, recordOutputs, span) {
  if (!chunk || isErrorChunk(chunk, span)) return;
  handleResponseMetadata(chunk, state);
  handleCandidateContent(chunk, state, recordOutputs);
}

/**
 * Instruments an async iterable stream of Google GenAI response chunks, updates the span with
 * streaming attributes and (optionally) the aggregated output text, and yields
 * each chunk from the input stream unchanged.
 */
async function* instrumentStream(
  stream,
  span,
  recordOutputs,
) {
  const state = {
    responseTexts: [],
    finishReasons: [],
    toolCalls: [],
  };

  try {
    for await (const chunk of stream) {
      processChunk(chunk, state, recordOutputs, span);
      yield chunk;
    }
  } finally {
    const attrs = {
      [genAiAttributes.GEN_AI_RESPONSE_STREAMING_ATTRIBUTE]: true,
    };

    if (state.responseId) attrs[genAiAttributes.GEN_AI_RESPONSE_ID_ATTRIBUTE] = state.responseId;
    if (state.responseModel) attrs[genAiAttributes.GEN_AI_RESPONSE_MODEL_ATTRIBUTE] = state.responseModel;
    if (state.promptTokens !== undefined) attrs[genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE] = state.promptTokens;
    if (state.completionTokens !== undefined) attrs[genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE] = state.completionTokens;
    if (state.totalTokens !== undefined) attrs[genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE] = state.totalTokens;

    if (state.finishReasons.length) {
      attrs[genAiAttributes.GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE] = JSON.stringify(state.finishReasons);
    }
    if (recordOutputs && state.responseTexts.length) {
      attrs[genAiAttributes.GEN_AI_RESPONSE_TEXT_ATTRIBUTE] = state.responseTexts.join('');
    }
    if (recordOutputs && state.toolCalls.length) {
      attrs[genAiAttributes.GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE] = JSON.stringify(state.toolCalls);
    }

    span.setAttributes(attrs);
    span.end();
  }
}

exports.instrumentStream = instrumentStream;
//# sourceMappingURL=streaming.js.map
