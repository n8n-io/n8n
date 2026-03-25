import { captureException } from '../../exports.js';
import { SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '../../semanticAttributes.js';
import { SPAN_STATUS_ERROR } from '../spanstatus.js';
import { startSpanManual } from '../trace.js';
import { GEN_AI_REQUEST_MODEL_ATTRIBUTE, GEN_AI_OPERATION_NAME_ATTRIBUTE } from '../ai/gen-ai-attributes.js';
import { LANGCHAIN_ORIGIN } from './constants.js';
import { extractLlmResponseAttributes, getInvocationParams, extractChatModelRequestAttributes, extractLLMRequestAttributes } from './utils.js';

/**
 * Creates a Sentry callback handler for LangChain
 * Returns a plain object that LangChain will call via duck-typing
 *
 * This is a stateful handler that tracks spans across multiple LangChain executions.
 */
function createLangChainCallbackHandler(options = {}) {
  const recordInputs = options.recordInputs ?? false;
  const recordOutputs = options.recordOutputs ?? false;

  // Internal state - single instance tracks all spans
  const spanMap = new Map();

  /**
   * Exit a span and clean up
   */
  const exitSpan = (runId) => {
    const span = spanMap.get(runId);
    if (span?.isRecording()) {
      span.end();
      spanMap.delete(runId);
    }
  };

  /**
   * Handler for LLM Start
   * This handler will be called by LangChain's callback handler when an LLM event is detected.
   */
  const handler = {
    // Required LangChain BaseCallbackHandler properties
    lc_serializable: false,
    lc_namespace: ['langchain_core', 'callbacks', 'sentry'],
    lc_secrets: undefined,
    lc_attributes: undefined,
    lc_aliases: undefined,
    lc_serializable_keys: undefined,
    lc_id: ['langchain_core', 'callbacks', 'sentry'],
    lc_kwargs: {},
    name: 'SentryCallbackHandler',

    // BaseCallbackHandlerInput boolean flags
    ignoreLLM: false,
    ignoreChain: false,
    ignoreAgent: false,
    ignoreRetriever: false,
    ignoreCustomEvent: false,
    raiseError: false,
    awaitHandlers: true,

    handleLLMStart(
      llm,
      prompts,
      runId,
      _parentRunId,
      _extraParams,
      tags,
      metadata,
      _runName,
    ) {
      const invocationParams = getInvocationParams(tags);
      const attributes = extractLLMRequestAttributes(
        llm ,
        prompts,
        recordInputs,
        invocationParams,
        metadata,
      );
      const modelName = attributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE];
      const operationName = attributes[GEN_AI_OPERATION_NAME_ATTRIBUTE];

      startSpanManual(
        {
          name: `${operationName} ${modelName}`,
          op: 'gen_ai.pipeline',
          attributes: {
            ...attributes,
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'gen_ai.pipeline',
          },
        },
        span => {
          spanMap.set(runId, span);
          return span;
        },
      );
    },

    // Chat Model Start Handler
    handleChatModelStart(
      llm,
      messages,
      runId,
      _parentRunId,
      _extraParams,
      tags,
      metadata,
      _runName,
    ) {
      const invocationParams = getInvocationParams(tags);
      const attributes = extractChatModelRequestAttributes(
        llm ,
        messages ,
        recordInputs,
        invocationParams,
        metadata,
      );
      const modelName = attributes[GEN_AI_REQUEST_MODEL_ATTRIBUTE];
      const operationName = attributes[GEN_AI_OPERATION_NAME_ATTRIBUTE];

      startSpanManual(
        {
          name: `${operationName} ${modelName}`,
          op: 'gen_ai.chat',
          attributes: {
            ...attributes,
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'gen_ai.chat',
          },
        },
        span => {
          spanMap.set(runId, span);
          return span;
        },
      );
    },

    // LLM End Handler - note: handleLLMEnd with capital LLM (used by both LLMs and chat models!)
    handleLLMEnd(
      output,
      runId,
      _parentRunId,
      _tags,
      _extraParams,
    ) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        const attributes = extractLlmResponseAttributes(output , recordOutputs);
        if (attributes) {
          span.setAttributes(attributes);
        }
        exitSpan(runId);
      }
    },

    // LLM Error Handler - note: handleLLMError with capital LLM
    handleLLMError(error, runId) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        span.setStatus({ code: SPAN_STATUS_ERROR, message: 'llm_error' });
        exitSpan(runId);
      }

      captureException(error, {
        mechanism: {
          handled: false,
          type: `${LANGCHAIN_ORIGIN}.llm_error_handler`,
        },
      });
    },

    // Chain Start Handler
    handleChainStart(chain, inputs, runId, _parentRunId) {
      const chainName = chain.name || 'unknown_chain';
      const attributes = {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ai.langchain',
        'langchain.chain.name': chainName,
      };

      // Add inputs if recordInputs is enabled
      if (recordInputs) {
        attributes['langchain.chain.inputs'] = JSON.stringify(inputs);
      }

      startSpanManual(
        {
          name: `chain ${chainName}`,
          op: 'gen_ai.invoke_agent',
          attributes: {
            ...attributes,
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'gen_ai.invoke_agent',
          },
        },
        span => {
          spanMap.set(runId, span);
          return span;
        },
      );
    },

    // Chain End Handler
    handleChainEnd(outputs, runId) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        // Add outputs if recordOutputs is enabled
        if (recordOutputs) {
          span.setAttributes({
            'langchain.chain.outputs': JSON.stringify(outputs),
          });
        }
        exitSpan(runId);
      }
    },

    // Chain Error Handler
    handleChainError(error, runId) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        span.setStatus({ code: SPAN_STATUS_ERROR, message: 'chain_error' });
        exitSpan(runId);
      }

      captureException(error, {
        mechanism: {
          handled: false,
          type: `${LANGCHAIN_ORIGIN}.chain_error_handler`,
        },
      });
    },

    // Tool Start Handler
    handleToolStart(tool, input, runId, _parentRunId) {
      const toolName = tool.name || 'unknown_tool';
      const attributes = {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: LANGCHAIN_ORIGIN,
        'gen_ai.tool.name': toolName,
      };

      // Add input if recordInputs is enabled
      if (recordInputs) {
        attributes['gen_ai.tool.input'] = input;
      }

      startSpanManual(
        {
          name: `execute_tool ${toolName}`,
          op: 'gen_ai.execute_tool',
          attributes: {
            ...attributes,
            [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'gen_ai.execute_tool',
          },
        },
        span => {
          spanMap.set(runId, span);
          return span;
        },
      );
    },

    // Tool End Handler
    handleToolEnd(output, runId) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        // Add output if recordOutputs is enabled
        if (recordOutputs) {
          span.setAttributes({
            'gen_ai.tool.output': JSON.stringify(output),
          });
        }
        exitSpan(runId);
      }
    },

    // Tool Error Handler
    handleToolError(error, runId) {
      const span = spanMap.get(runId);
      if (span?.isRecording()) {
        span.setStatus({ code: SPAN_STATUS_ERROR, message: 'tool_error' });
        exitSpan(runId);
      }

      captureException(error, {
        mechanism: {
          handled: false,
          type: `${LANGCHAIN_ORIGIN}.tool_error_handler`,
        },
      });
    },

    // LangChain BaseCallbackHandler required methods
    copy() {
      return handler;
    },

    toJSON() {
      return {
        lc: 1,
        type: 'not_implemented',
        id: handler.lc_id,
      };
    },

    toJSONNotImplemented() {
      return {
        lc: 1,
        type: 'not_implemented',
        id: handler.lc_id,
      };
    },
  };

  return handler;
}

export { createLangChainCallbackHandler };
//# sourceMappingURL=index.js.map
