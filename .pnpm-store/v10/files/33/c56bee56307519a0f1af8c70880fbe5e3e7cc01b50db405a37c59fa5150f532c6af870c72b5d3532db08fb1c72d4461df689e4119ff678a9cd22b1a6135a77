const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_client = require('./utils/client.cjs');
const require_misc = require('./utils/misc.cjs');
const require_azure = require('./utils/azure.cjs');
const require_base = require('./chat_models/base.cjs');
const require_completions = require('./converters/completions.cjs');
const require_completions$1 = require('./chat_models/completions.cjs');
const require_completions$2 = require('./azure/chat_models/completions.cjs');
const require_responses = require('./converters/responses.cjs');
const require_responses$1 = require('./chat_models/responses.cjs');
const require_responses$2 = require('./azure/chat_models/responses.cjs');
const require_index = require('./chat_models/index.cjs');
const require_index$1 = require('./azure/chat_models/index.cjs');
const require_llms = require('./llms.cjs');
const require_llms$1 = require('./azure/llms.cjs');
const require_embeddings = require('./embeddings.cjs');
const require_embeddings$1 = require('./azure/embeddings.cjs');
const require_dalle = require('./tools/dalle.cjs');
const require_index$2 = require('./tools/index.cjs');
const require_custom = require('./tools/custom.cjs');
const require_prompts = require('./utils/prompts.cjs');
require('./converters/index.cjs');
const openai = require_rolldown_runtime.__toESM(require("openai"));

exports.AzureChatOpenAI = require_index$1.AzureChatOpenAI;
exports.AzureChatOpenAICompletions = require_completions$2.AzureChatOpenAICompletions;
exports.AzureChatOpenAIResponses = require_responses$2.AzureChatOpenAIResponses;
exports.AzureOpenAI = require_llms$1.AzureOpenAI;
exports.AzureOpenAIEmbeddings = require_embeddings$1.AzureOpenAIEmbeddings;
exports.BaseChatOpenAI = require_base.BaseChatOpenAI;
exports.ChatOpenAI = require_index.ChatOpenAI;
exports.ChatOpenAICompletions = require_completions$1.ChatOpenAICompletions;
exports.ChatOpenAIResponses = require_responses$1.ChatOpenAIResponses;
exports.DallEAPIWrapper = require_dalle.DallEAPIWrapper;
exports.OpenAI = require_llms.OpenAI;
Object.defineProperty(exports, 'OpenAIClient', {
  enumerable: true,
  get: function () {
    return openai.OpenAI;
  }
});
exports.OpenAIEmbeddings = require_embeddings.OpenAIEmbeddings;
exports.completionsApiContentBlockConverter = require_completions.completionsApiContentBlockConverter;
exports.convertCompletionsDeltaToBaseMessageChunk = require_completions.convertCompletionsDeltaToBaseMessageChunk;
exports.convertCompletionsMessageToBaseMessage = require_completions.convertCompletionsMessageToBaseMessage;
exports.convertMessagesToCompletionsMessageParams = require_completions.convertMessagesToCompletionsMessageParams;
exports.convertMessagesToResponsesInput = require_responses.convertMessagesToResponsesInput;
exports.convertPromptToOpenAI = require_prompts.convertPromptToOpenAI;
exports.convertReasoningSummaryToResponsesReasoningItem = require_responses.convertReasoningSummaryToResponsesReasoningItem;
exports.convertResponsesDeltaToChatGenerationChunk = require_responses.convertResponsesDeltaToChatGenerationChunk;
exports.convertResponsesMessageToAIMessage = require_responses.convertResponsesMessageToAIMessage;
exports.convertResponsesUsageToUsageMetadata = require_responses.convertResponsesUsageToUsageMetadata;
exports.convertStandardContentBlockToCompletionsContentPart = require_completions.convertStandardContentBlockToCompletionsContentPart;
exports.convertStandardContentMessageToCompletionsMessage = require_completions.convertStandardContentMessageToCompletionsMessage;
exports.convertStandardContentMessageToResponsesInput = require_responses.convertStandardContentMessageToResponsesInput;
exports.customTool = require_custom.customTool;
exports.getEndpoint = require_azure.getEndpoint;
exports.getFormattedEnv = require_azure.getFormattedEnv;
exports.getHeadersWithUserAgent = require_azure.getHeadersWithUserAgent;
exports.isHeaders = require_azure.isHeaders;
exports.messageToOpenAIRole = require_misc.messageToOpenAIRole;
exports.normalizeHeaders = require_azure.normalizeHeaders;
Object.defineProperty(exports, 'toFile', {
  enumerable: true,
  get: function () {
    return openai.toFile;
  }
});
exports.tools = require_index$2.tools;
exports.wrapOpenAIClientError = require_client.wrapOpenAIClientError;