"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelAccountZodSchema = void 0;
const zod_1 = require("zod");
const roleTypes_1 = require("./roleTypes");
/**
 * Zod schema for validating a channel account.
 */
exports.channelAccountZodSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().optional(),
    aadObjectId: zod_1.z.string().min(1).optional(),
    tenantId: zod_1.z.string().min(1).optional(),
    agenticUserId: zod_1.z.string().min(1).optional(),
    agenticAppId: zod_1.z.string().min(1).optional(),
    agenticAppBlueprintId: zod_1.z.string().min(1).optional(),
    role: zod_1.z.union([roleTypes_1.roleTypeZodSchema, zod_1.z.string().min(1)]).optional(),
    properties: zod_1.z.unknown().optional()
});
//# sourceMappingURL=channelAccount.js.map