"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageReactionZodSchema = void 0;
const zod_1 = require("zod");
const messageReactionTypes_1 = require("./messageReactionTypes");
/**
 * Zod schema for validating a MessageReaction object.
 */
exports.messageReactionZodSchema = zod_1.z.object({
    type: zod_1.z.union([messageReactionTypes_1.messageReactionTypesZodSchema, zod_1.z.string().min(1)])
});
//# sourceMappingURL=messageReaction.js.map