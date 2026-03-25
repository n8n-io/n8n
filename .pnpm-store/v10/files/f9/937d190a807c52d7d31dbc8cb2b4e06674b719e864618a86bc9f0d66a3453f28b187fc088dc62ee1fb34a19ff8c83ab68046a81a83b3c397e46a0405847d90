"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinishReasonEnum = exports.UploadFileOptionsType = exports.ContextOptionsType = exports.ChatCompletionOptionsType = exports.ChatOptionsType = exports.ChatModelEnum = exports.AssistantFileStatusEnum = exports.ListFilesOptionsType = void 0;
exports.ListFilesOptionsType = ['filter'];
/**
 * Enum representing the possible statuses of an assistant file.
 *
 * - `Processing`: The file is currently being processed and is not yet available.
 * - `Available`: The file has been processed and is ready for use.
 * - `Deleting`: The file is in the process of being deleted.
 * - `ProcessingFailed`: There was an error encountered will processing.
 */
exports.AssistantFileStatusEnum = {
    Processing: 'Processing',
    Available: 'Available',
    Deleting: 'Deleting',
    ProcessingFailed: 'ProcessingFailed',
};
/**
 * An enum representing the models that can be used for chatting with an assistant. The default is 'gpt-4o'.
 */
exports.ChatModelEnum = {
    Gpt4o: 'gpt-4o',
    Claude35Sonnet: 'claude-3-5-sonnet',
};
exports.ChatOptionsType = [
    'messages',
    'model',
    'filter',
    'jsonResponse',
    'includeHighlights',
];
exports.ChatCompletionOptionsType = [
    'messages',
    'model',
    'filter',
];
exports.ContextOptionsType = [
    'query',
    'filter',
    'messages',
    'topK',
];
exports.UploadFileOptionsType = [
    'path',
    'metadata',
];
/**
 * Enum representing the reasons why a response generation may finish.
 *
 * - `Stop`: The response was completed normally.
 * - `Length`: The response was truncated due to length constraints.
 * - `ContentFilter`: The response was stopped by a content filter.
 * - `FunctionCall`: The response generation was interrupted by a function call.
 */
exports.FinishReasonEnum = {
    Stop: 'stop',
    Length: 'length',
    ContentFilter: 'content_filter',
    FunctionCall: 'function_call',
};
//# sourceMappingURL=types.js.map