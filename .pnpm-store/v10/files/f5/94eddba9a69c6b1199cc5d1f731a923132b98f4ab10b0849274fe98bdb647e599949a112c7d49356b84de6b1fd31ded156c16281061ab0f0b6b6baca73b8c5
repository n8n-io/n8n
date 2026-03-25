import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { convertToOpenAIImageBlock, convertToProviderContentBlock, isBase64ContentBlock, isDataContentBlock, isIDContentBlock, isPlainTextContentBlock, isURLContentBlock, parseBase64DataUrl, parseMimeType } from "./content/data.js";
import { isMessage } from "./message.js";
import { BaseMessage, BaseMessageChunk, DEFAULT_MERGE_IGNORE_KEYS, _isMessageFieldWithRole, _mergeDicts, _mergeLists, _mergeObj, _mergeStatus, isBaseMessage, isBaseMessageChunk, isOpenAIToolCallArray, mergeContent } from "./base.js";
import { mergeResponseMetadata, mergeUsageMetadata } from "./metadata.js";
import { ToolMessage, ToolMessageChunk, defaultToolCallParser, isDirectToolOutput, isToolMessage, isToolMessageChunk } from "./tool.js";
import { AIMessage, AIMessageChunk, isAIMessage, isAIMessageChunk } from "./ai.js";
import { ChatMessage, ChatMessageChunk, isChatMessage, isChatMessageChunk } from "./chat.js";
import { FunctionMessage, FunctionMessageChunk, isFunctionMessage, isFunctionMessageChunk } from "./function.js";
import { HumanMessage, HumanMessageChunk, isHumanMessage, isHumanMessageChunk } from "./human.js";
import { RemoveMessage } from "./modifier.js";
import { SystemMessage, SystemMessageChunk, isSystemMessage, isSystemMessageChunk } from "./system.js";
import { coerceMessageLikeToMessage, collapseToolCallChunks, convertToChunk, getBufferString, iife, mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, mapStoredMessagesToChatMessages } from "./utils.js";
import { defaultTextSplitter, filterMessages, mergeMessageRuns, trimMessages } from "./transformers.js";
import { KNOWN_BLOCK_TYPES } from "./content/index.js";
//#region src/messages/index.ts
var messages_exports = /* @__PURE__ */ __exportAll({
	AIMessage: () => AIMessage,
	AIMessageChunk: () => AIMessageChunk,
	BaseMessage: () => BaseMessage,
	BaseMessageChunk: () => BaseMessageChunk,
	ChatMessage: () => ChatMessage,
	ChatMessageChunk: () => ChatMessageChunk,
	DEFAULT_MERGE_IGNORE_KEYS: () => DEFAULT_MERGE_IGNORE_KEYS,
	FunctionMessage: () => FunctionMessage,
	FunctionMessageChunk: () => FunctionMessageChunk,
	HumanMessage: () => HumanMessage,
	HumanMessageChunk: () => HumanMessageChunk,
	KNOWN_BLOCK_TYPES: () => KNOWN_BLOCK_TYPES,
	RemoveMessage: () => RemoveMessage,
	SystemMessage: () => SystemMessage,
	SystemMessageChunk: () => SystemMessageChunk,
	ToolMessage: () => ToolMessage,
	ToolMessageChunk: () => ToolMessageChunk,
	_isMessageFieldWithRole: () => _isMessageFieldWithRole,
	_mergeDicts: () => _mergeDicts,
	_mergeLists: () => _mergeLists,
	_mergeObj: () => _mergeObj,
	_mergeStatus: () => _mergeStatus,
	coerceMessageLikeToMessage: () => coerceMessageLikeToMessage,
	collapseToolCallChunks: () => collapseToolCallChunks,
	convertToChunk: () => convertToChunk,
	convertToOpenAIImageBlock: () => convertToOpenAIImageBlock,
	convertToProviderContentBlock: () => convertToProviderContentBlock,
	defaultTextSplitter: () => defaultTextSplitter,
	defaultToolCallParser: () => defaultToolCallParser,
	filterMessages: () => filterMessages,
	getBufferString: () => getBufferString,
	iife: () => iife,
	isAIMessage: () => isAIMessage,
	isAIMessageChunk: () => isAIMessageChunk,
	isBase64ContentBlock: () => isBase64ContentBlock,
	isBaseMessage: () => isBaseMessage,
	isBaseMessageChunk: () => isBaseMessageChunk,
	isChatMessage: () => isChatMessage,
	isChatMessageChunk: () => isChatMessageChunk,
	isDataContentBlock: () => isDataContentBlock,
	isDirectToolOutput: () => isDirectToolOutput,
	isFunctionMessage: () => isFunctionMessage,
	isFunctionMessageChunk: () => isFunctionMessageChunk,
	isHumanMessage: () => isHumanMessage,
	isHumanMessageChunk: () => isHumanMessageChunk,
	isIDContentBlock: () => isIDContentBlock,
	isMessage: () => isMessage,
	isOpenAIToolCallArray: () => isOpenAIToolCallArray,
	isPlainTextContentBlock: () => isPlainTextContentBlock,
	isSystemMessage: () => isSystemMessage,
	isSystemMessageChunk: () => isSystemMessageChunk,
	isToolMessage: () => isToolMessage,
	isToolMessageChunk: () => isToolMessageChunk,
	isURLContentBlock: () => isURLContentBlock,
	mapChatMessagesToStoredMessages: () => mapChatMessagesToStoredMessages,
	mapStoredMessageToChatMessage: () => mapStoredMessageToChatMessage,
	mapStoredMessagesToChatMessages: () => mapStoredMessagesToChatMessages,
	mergeContent: () => mergeContent,
	mergeMessageRuns: () => mergeMessageRuns,
	mergeResponseMetadata: () => mergeResponseMetadata,
	mergeUsageMetadata: () => mergeUsageMetadata,
	parseBase64DataUrl: () => parseBase64DataUrl,
	parseMimeType: () => parseMimeType,
	trimMessages: () => trimMessages
});
//#endregion
export { AIMessage, AIMessageChunk, BaseMessage, BaseMessageChunk, ChatMessage, ChatMessageChunk, DEFAULT_MERGE_IGNORE_KEYS, FunctionMessage, FunctionMessageChunk, HumanMessage, HumanMessageChunk, KNOWN_BLOCK_TYPES, RemoveMessage, SystemMessage, SystemMessageChunk, ToolMessage, ToolMessageChunk, _isMessageFieldWithRole, _mergeDicts, _mergeLists, _mergeObj, _mergeStatus, coerceMessageLikeToMessage, collapseToolCallChunks, convertToChunk, convertToOpenAIImageBlock, convertToProviderContentBlock, defaultTextSplitter, defaultToolCallParser, filterMessages, getBufferString, iife, isAIMessage, isAIMessageChunk, isBase64ContentBlock, isBaseMessage, isBaseMessageChunk, isChatMessage, isChatMessageChunk, isDataContentBlock, isDirectToolOutput, isFunctionMessage, isFunctionMessageChunk, isHumanMessage, isHumanMessageChunk, isIDContentBlock, isMessage, isOpenAIToolCallArray, isPlainTextContentBlock, isSystemMessage, isSystemMessageChunk, isToolMessage, isToolMessageChunk, isURLContentBlock, mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, mapStoredMessagesToChatMessages, mergeContent, mergeMessageRuns, mergeResponseMetadata, mergeUsageMetadata, messages_exports, parseBase64DataUrl, parseMimeType, trimMessages };

//# sourceMappingURL=index.js.map