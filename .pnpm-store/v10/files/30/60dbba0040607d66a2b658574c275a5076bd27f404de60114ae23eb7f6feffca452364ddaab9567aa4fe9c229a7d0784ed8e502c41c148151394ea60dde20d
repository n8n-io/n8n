"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleTypeZodSchema = exports.RoleTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing the different role types in a conversation.
 */
var RoleTypes;
(function (RoleTypes) {
    /**
     * Represents a user in the conversation.
     */
    RoleTypes["User"] = "user";
    /**
     * Represents an agent or bot in the conversation.
     */
    RoleTypes["Agent"] = "bot";
    /**
     * Represents a skill in the conversation.
     */
    RoleTypes["Skill"] = "skill";
    /**
     * Agentic AI - AAI role
     */
    RoleTypes["AgenticIdentity"] = "agenticAppInstance";
    /**
     * Agentic AI - AAI role.
     */
    RoleTypes["AgenticUser"] = "agenticUser";
})(RoleTypes || (exports.RoleTypes = RoleTypes = {}));
/**
 * Zod schema for validating role types.
 */
exports.roleTypeZodSchema = zod_1.z.enum(['user', 'bot', 'skill', 'agenticAppInstance', 'agenticUser']);
//# sourceMappingURL=roleTypes.js.map