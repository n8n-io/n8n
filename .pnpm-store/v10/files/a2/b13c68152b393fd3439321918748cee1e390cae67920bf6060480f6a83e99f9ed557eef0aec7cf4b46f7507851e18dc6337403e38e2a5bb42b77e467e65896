Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const OPENAI_INTEGRATION_NAME = 'OpenAI';

// https://platform.openai.com/docs/quickstart?api-mode=responses
// https://platform.openai.com/docs/quickstart?api-mode=chat
// https://platform.openai.com/docs/api-reference/conversations
const INSTRUMENTED_METHODS = [
  'responses.create',
  'chat.completions.create',
  'embeddings.create',
  // Conversations API - for conversation state management
  // https://platform.openai.com/docs/guides/conversation-state
  'conversations.create',
] ;
const RESPONSES_TOOL_CALL_EVENT_TYPES = [
  'response.output_item.added',
  'response.function_call_arguments.delta',
  'response.function_call_arguments.done',
  'response.output_item.done',
] ;
const RESPONSE_EVENT_TYPES = [
  'response.created',
  'response.in_progress',
  'response.failed',
  'response.completed',
  'response.incomplete',
  'response.queued',
  'response.output_text.delta',
  ...RESPONSES_TOOL_CALL_EVENT_TYPES,
] ;

exports.INSTRUMENTED_METHODS = INSTRUMENTED_METHODS;
exports.OPENAI_INTEGRATION_NAME = OPENAI_INTEGRATION_NAME;
exports.RESPONSES_TOOL_CALL_EVENT_TYPES = RESPONSES_TOOL_CALL_EVENT_TYPES;
exports.RESPONSE_EVENT_TYPES = RESPONSE_EVENT_TYPES;
//# sourceMappingURL=constants.js.map
