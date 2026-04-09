Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

// Global map to track tool call IDs to their corresponding span contexts.
// This allows us to capture tool errors and link them to the correct span
// without keeping full Span objects (and their potentially large attributes) alive.
const toolCallSpanContextMap = new Map();

// Operation sets for efficient mapping to OpenTelemetry semantic convention values
const INVOKE_AGENT_OPS = new Set(['ai.generateText', 'ai.streamText', 'ai.generateObject', 'ai.streamObject']);

const GENERATE_CONTENT_OPS = new Set([
  'ai.generateText.doGenerate',
  'ai.streamText.doStream',
  'ai.generateObject.doGenerate',
  'ai.streamObject.doStream',
]);

const EMBEDDINGS_OPS = new Set(['ai.embed.doEmbed', 'ai.embedMany.doEmbed']);

const RERANK_OPS = new Set(['ai.rerank.doRerank']);

const DO_SPAN_NAME_PREFIX = {
  'ai.embed.doEmbed': 'embeddings',
  'ai.embedMany.doEmbed': 'embeddings',
  'ai.rerank.doRerank': 'rerank',
};

exports.DO_SPAN_NAME_PREFIX = DO_SPAN_NAME_PREFIX;
exports.EMBEDDINGS_OPS = EMBEDDINGS_OPS;
exports.GENERATE_CONTENT_OPS = GENERATE_CONTENT_OPS;
exports.INVOKE_AGENT_OPS = INVOKE_AGENT_OPS;
exports.RERANK_OPS = RERANK_OPS;
exports.toolCallSpanContextMap = toolCallSpanContextMap;
//# sourceMappingURL=constants.js.map
