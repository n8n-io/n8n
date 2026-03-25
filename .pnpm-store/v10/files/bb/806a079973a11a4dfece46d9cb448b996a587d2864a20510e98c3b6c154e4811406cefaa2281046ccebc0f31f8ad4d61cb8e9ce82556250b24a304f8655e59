"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfConversationCodesZodSchema = exports.EndOfConversationCodes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing the different end of conversation codes.
 */
var EndOfConversationCodes;
(function (EndOfConversationCodes) {
    /**
     * The end of conversation reason is unknown.
     */
    EndOfConversationCodes["Unknown"] = "unknown";
    /**
     * The conversation completed successfully.
     */
    EndOfConversationCodes["CompletedSuccessfully"] = "completedSuccessfully";
    /**
     * The user cancelled the conversation.
     */
    EndOfConversationCodes["UserCancelled"] = "userCancelled";
    /**
     * The agent timed out during the conversation.
     */
    EndOfConversationCodes["AgentTimedOut"] = "agentTimedOut";
    /**
     * The agent issued an invalid message.
     */
    EndOfConversationCodes["AgentIssuedInvalidMessage"] = "agentIssuedInvalidMessage";
    /**
     * The channel failed during the conversation.
     */
    EndOfConversationCodes["ChannelFailed"] = "channelFailed";
})(EndOfConversationCodes || (exports.EndOfConversationCodes = EndOfConversationCodes = {}));
/**
 * Zod schema for validating end of conversation codes.
 */
exports.endOfConversationCodesZodSchema = zod_1.z.enum(['unknown', 'completedSuccessfully', 'userCancelled', 'agentTimedOut', 'agentIssuedInvalidMessage', 'channelFailed']);
//# sourceMappingURL=endOfConversationCodes.js.map