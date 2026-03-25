"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipSourceZodSchema = void 0;
const zod_1 = require("zod");
const membershipSourceTypes_1 = require("./membershipSourceTypes");
const membershipTypes_1 = require("./membershipTypes");
/**
 * Zod schema for validating a membership source.
 */
exports.membershipSourceZodSchema = zod_1.z.object({
    sourceType: membershipSourceTypes_1.membershipSourceTypeZodSchema,
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
    membershipType: membershipTypes_1.membershipTypeZodSchema,
    teamGroupId: zod_1.z.string().min(1).optional(),
    tenantId: zod_1.z.string().min(1).optional(),
});
//# sourceMappingURL=membershipSource.js.map