"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLangChainMessage = isLangChainMessage;
exports.convertLangChainMessageToExample = convertLangChainMessageToExample;
function isLangChainMessage(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
message) {
    return typeof message?._getType === "function";
}
function convertLangChainMessageToExample(message) {
    const converted = {
        type: message._getType(),
        data: { content: message.content },
    };
    // Check for presence of keys in additional_kwargs
    if (message?.additional_kwargs &&
        Object.keys(message.additional_kwargs).length > 0) {
        converted.data.additional_kwargs = { ...message.additional_kwargs };
    }
    return converted;
}
