Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const exports$1 = require('../../exports.js');
const semanticAttributes = require('../../semanticAttributes.js');
const spanstatus = require('../spanstatus.js');
const trace = require('../trace.js');
const genAiAttributes = require('../ai/gen-ai-attributes.js');
const messageTruncation = require('../ai/messageTruncation.js');
const utils$1 = require('../langchain/utils.js');
const constants = require('./constants.js');
const utils = require('./utils.js');

/**
 * Instruments StateGraph's compile method to create spans for agent creation and invocation
 *
 * Wraps the compile() method to:
 * - Create a `gen_ai.create_agent` span when compile() is called
 * - Automatically wrap the invoke() method on the returned compiled graph with a `gen_ai.invoke_agent` span
 *
 */
function instrumentStateGraphCompile(
  originalCompile,
  options,
) {
  return new Proxy(originalCompile, {
    apply(target, thisArg, args) {
      return trace.startSpan(
        {
          op: 'gen_ai.create_agent',
          name: 'create_agent',
          attributes: {
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: constants.LANGGRAPH_ORIGIN,
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'gen_ai.create_agent',
            [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: 'create_agent',
          },
        },
        span => {
          try {
            const compiledGraph = Reflect.apply(target, thisArg, args);
            const compileOptions = args.length > 0 ? (args[0] ) : {};

            // Extract graph name
            if (compileOptions?.name && typeof compileOptions.name === 'string') {
              span.setAttribute(genAiAttributes.GEN_AI_AGENT_NAME_ATTRIBUTE, compileOptions.name);
              span.updateName(`create_agent ${compileOptions.name}`);
            }

            // Instrument agent invoke method on the compiled graph
            const originalInvoke = compiledGraph.invoke;
            if (originalInvoke && typeof originalInvoke === 'function') {
              compiledGraph.invoke = instrumentCompiledGraphInvoke(
                originalInvoke.bind(compiledGraph) ,
                compiledGraph,
                compileOptions,
                options,
              ) ;
            }

            return compiledGraph;
          } catch (error) {
            span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
            exports$1.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.ai.langgraph.error',
              },
            });
            throw error;
          }
        },
      );
    },
  }) ;
}

/**
 * Instruments CompiledGraph's invoke method to create spans for agent invocation
 *
 * Creates a `gen_ai.invoke_agent` span when invoke() is called
 */
function instrumentCompiledGraphInvoke(
  originalInvoke,
  graphInstance,
  compileOptions,
  options,
) {
  return new Proxy(originalInvoke, {
    apply(target, thisArg, args) {
      return trace.startSpan(
        {
          op: 'gen_ai.invoke_agent',
          name: 'invoke_agent',
          attributes: {
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: constants.LANGGRAPH_ORIGIN,
            [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP]: genAiAttributes.GEN_AI_INVOKE_AGENT_OPERATION_ATTRIBUTE,
            [genAiAttributes.GEN_AI_OPERATION_NAME_ATTRIBUTE]: 'invoke_agent',
          },
        },
        async span => {
          try {
            const graphName = compileOptions?.name;

            if (graphName && typeof graphName === 'string') {
              span.setAttribute(genAiAttributes.GEN_AI_PIPELINE_NAME_ATTRIBUTE, graphName);
              span.setAttribute(genAiAttributes.GEN_AI_AGENT_NAME_ATTRIBUTE, graphName);
              span.updateName(`invoke_agent ${graphName}`);
            }

            // Extract thread_id from the config (second argument)
            // LangGraph uses config.configurable.thread_id for conversation/session linking
            const config = args.length > 1 ? (args[1] ) : undefined;
            const configurable = config?.configurable ;
            const threadId = configurable?.thread_id;
            if (threadId && typeof threadId === 'string') {
              span.setAttribute(genAiAttributes.GEN_AI_CONVERSATION_ID_ATTRIBUTE, threadId);
            }

            // Extract available tools from the graph instance
            const tools = utils.extractToolsFromCompiledGraph(graphInstance);
            if (tools) {
              span.setAttribute(genAiAttributes.GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE, JSON.stringify(tools));
            }

            // Parse input messages
            const recordInputs = options.recordInputs;
            const recordOutputs = options.recordOutputs;
            const inputMessages =
              args.length > 0 ? ((args[0] ).messages ?? []) : [];

            if (inputMessages && recordInputs) {
              const normalizedMessages = utils$1.normalizeLangChainMessages(inputMessages);
              const truncatedMessages = messageTruncation.truncateGenAiMessages(normalizedMessages);
              span.setAttributes({
                [genAiAttributes.GEN_AI_REQUEST_MESSAGES_ATTRIBUTE]: JSON.stringify(truncatedMessages),
                [genAiAttributes.GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE]: normalizedMessages.length,
              });
            }

            // Call original invoke
            const result = await Reflect.apply(target, thisArg, args);

            // Set response attributes
            if (recordOutputs) {
              utils.setResponseAttributes(span, inputMessages ?? null, result);
            }

            return result;
          } catch (error) {
            span.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message: 'internal_error' });
            exports$1.captureException(error, {
              mechanism: {
                handled: false,
                type: 'auto.ai.langgraph.error',
              },
            });
            throw error;
          }
        },
      );
    },
  }) ;
}

/**
 * Directly instruments a StateGraph instance to add tracing spans
 *
 * This function can be used to manually instrument LangGraph StateGraph instances
 * in environments where automatic instrumentation is not available or desired.
 *
 * @param stateGraph - The StateGraph instance to instrument
 * @param options - Optional configuration for recording inputs/outputs
 *
 * @example
 * ```typescript
 * import { instrumentLangGraph } from '@sentry/cloudflare';
 * import { StateGraph } from '@langchain/langgraph';
 *
 * const graph = new StateGraph(MessagesAnnotation)
 *   .addNode('agent', mockLlm)
 *   .addEdge(START, 'agent')
 *   .addEdge('agent', END);
 *
 * instrumentLangGraph(graph, { recordInputs: true, recordOutputs: true });
 * const compiled = graph.compile({ name: 'my_agent' });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instrumentLangGraph(
  stateGraph,
  options,
) {
  const _options = options || {};

  stateGraph.compile = instrumentStateGraphCompile(stateGraph.compile.bind(stateGraph), _options);

  return stateGraph;
}

exports.instrumentLangGraph = instrumentLangGraph;
exports.instrumentStateGraphCompile = instrumentStateGraphCompile;
//# sourceMappingURL=index.js.map
