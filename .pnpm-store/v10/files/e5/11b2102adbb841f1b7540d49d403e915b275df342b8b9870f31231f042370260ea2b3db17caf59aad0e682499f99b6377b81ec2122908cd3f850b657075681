"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationReferenceZodSchema = void 0;
const zod_1 = require("zod");
const channelAccount_1 = require("./channelAccount");
const conversationAccount_1 = require("./conversationAccount");
/**
 * Zod schema for validating a conversation reference.
 */
exports.conversationReferenceZodSchema = zod_1.z.object({
    activityId: zod_1.z.string().min(1).optional(),
    user: channelAccount_1.channelAccountZodSchema.optional(),
    locale: zod_1.z.string().min(1).optional(),
    agent: channelAccount_1.channelAccountZodSchema.optional().nullable(),
    conversation: conversationAccount_1.conversationAccountZodSchema,
    channelId: zod_1.z.string().min(1),
    serviceUrl: zod_1.z.string().min(1).optional()
});
//# sourceMappingURL=conversationReference.js.map