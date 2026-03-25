"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityTypesZodSchema = exports.ActivityTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing activity types.
 */
var ActivityTypes;
(function (ActivityTypes) {
    /**
     * A message activity.
     */
    ActivityTypes["Message"] = "message";
    /**
     * An update to a contact relationship.
     */
    ActivityTypes["ContactRelationUpdate"] = "contactRelationUpdate";
    /**
     * An update to a conversation.
     */
    ActivityTypes["ConversationUpdate"] = "conversationUpdate";
    /**
     * A typing indicator activity.
     */
    ActivityTypes["Typing"] = "typing";
    /**
     * Indicates the end of a conversation.
     */
    ActivityTypes["EndOfConversation"] = "endOfConversation";
    /**
     * An event activity.
     */
    ActivityTypes["Event"] = "event";
    /**
     * An invoke activity.
     */
    ActivityTypes["Invoke"] = "invoke";
    /**
     * A response to an invoke activity.
     */
    ActivityTypes["InvokeResponse"] = "invokeResponse";
    /**
     * An activity to delete user data.
     */
    ActivityTypes["DeleteUserData"] = "deleteUserData";
    /**
     * An update to a message.
     */
    ActivityTypes["MessageUpdate"] = "messageUpdate";
    /**
     * A deletion of a message.
     */
    ActivityTypes["MessageDelete"] = "messageDelete";
    /**
     * An update to an installation.
     */
    ActivityTypes["InstallationUpdate"] = "installationUpdate";
    /**
     * A reaction to a message.
     */
    ActivityTypes["MessageReaction"] = "messageReaction";
    /**
     * A suggestion activity.
     */
    ActivityTypes["Suggestion"] = "suggestion";
    /**
     * A trace activity for debugging.
     */
    ActivityTypes["Trace"] = "trace";
    /**
     * A handoff activity to another bot or human.
     */
    ActivityTypes["Handoff"] = "handoff";
    /**
     * A command activity.
     */
    ActivityTypes["Command"] = "command";
    /**
     * A result of a command activity.
     */
    ActivityTypes["CommandResult"] = "commandResult";
})(ActivityTypes || (exports.ActivityTypes = ActivityTypes = {}));
/**
 * Zod schema for validating an ActivityTypes enum.
 */
exports.activityTypesZodSchema = zod_1.z.enum([
    'message',
    'contactRelationUpdate',
    'conversationUpdate',
    'typing',
    'endOfConversation',
    'event',
    'invoke',
    'invokeResponse',
    'deleteUserData',
    'messageUpdate',
    'messageDelete',
    'installationUpdate',
    'messageReaction',
    'suggestion',
    'trace',
    'handoff',
    'command',
    'commandResult',
]);
//# sourceMappingURL=activityTypes.js.map