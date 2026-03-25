"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardActionZodSchema = void 0;
const zod_1 = require("zod");
const actionTypes_1 = require("./actionTypes");
/**
 * Zod schema for validating CardAction.
 */
exports.cardActionZodSchema = zod_1.z.object({
    type: zod_1.z.union([actionTypes_1.actionTypesZodSchema, zod_1.z.string().min(1)]),
    title: zod_1.z.string().min(1),
    image: zod_1.z.string().min(1).optional(),
    text: zod_1.z.string().min(1).optional(),
    displayText: zod_1.z.string().min(1).optional(),
    value: zod_1.z.any().optional(),
    channelData: zod_1.z.unknown().optional(),
    imageAltText: zod_1.z.string().min(1).optional()
});
//# sourceMappingURL=cardAction.js.map