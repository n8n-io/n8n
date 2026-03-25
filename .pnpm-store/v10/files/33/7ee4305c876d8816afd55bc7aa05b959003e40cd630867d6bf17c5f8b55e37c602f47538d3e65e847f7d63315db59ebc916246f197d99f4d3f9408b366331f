"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.condenseZepMemoryIntoHumanMessage = exports.getZepMessageRoleType = void 0;
const messages_1 = require("@langchain/core/messages");
const getZepMessageRoleType = (role) => {
    switch (role) {
        case "human":
            return "user";
        case "ai":
            return "assistant";
        case "system":
            return "system";
        case "function":
            return "function";
        case "tool":
            return "tool";
        default:
            return "norole";
    }
};
exports.getZepMessageRoleType = getZepMessageRoleType;
const condenseZepMemoryIntoHumanMessage = (memory) => {
    var _a;
    let systemPrompt = "";
    if (memory.facts) {
        systemPrompt += memory.facts.join("\n");
    }
    // Extract summary, if present, and messages
    if (memory.summary && ((_a = memory.summary) === null || _a === void 0 ? void 0 : _a.content)) {
        systemPrompt += memory.summary.content;
    }
    let concatMessages = "";
    if (memory.messages) {
        concatMessages = memory.messages
            .map((msg) => {
            var _a;
            return `${(_a = msg.role) !== null && _a !== void 0 ? _a : msg.roleType}: ${msg.content}`;
        })
            .join("\n");
    }
    return new messages_1.HumanMessage(systemPrompt + "\n" + concatMessages);
};
exports.condenseZepMemoryIntoHumanMessage = condenseZepMemoryIntoHumanMessage;
