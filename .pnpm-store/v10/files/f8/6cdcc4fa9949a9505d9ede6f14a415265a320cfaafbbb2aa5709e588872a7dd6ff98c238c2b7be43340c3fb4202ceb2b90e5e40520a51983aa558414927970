"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationAccountZodSchema = void 0;
const zod_1 = require("zod");
const roleTypes_1 = require("./roleTypes");
/**
 * Zod schema for validating a conversation account.
 */
exports.conversationAccountZodSchema = zod_1.z.object({
    isGroup: zod_1.z.boolean().optional(),
    conversationType: zod_1.z.string().min(1).optional(),
    tenantId: zod_1.z.string().min(1).optional(),
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).optional(),
    aadObjectId: zod_1.z.string().min(1).optional(),
    role: zod_1.z.union([roleTypes_1.roleTypeZodSchema, zod_1.z.string().min(1)]).optional(),
    properties: zod_1.z.unknown().optional()
});
//# sourceMappingURL=conversationAccount.js.map