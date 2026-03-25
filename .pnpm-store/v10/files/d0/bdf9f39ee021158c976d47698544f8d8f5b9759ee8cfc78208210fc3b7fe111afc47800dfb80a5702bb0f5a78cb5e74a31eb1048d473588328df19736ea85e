"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveCardInvokeActionZodSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schema for validating an adaptive card invoke action.
 */
exports.adaptiveCardInvokeActionZodSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    id: zod_1.z.string().optional(),
    verb: zod_1.z.string().min(1),
    data: zod_1.z.record(zod_1.z.string().min(1), zod_1.z.any())
});
//# sourceMappingURL=adaptiveCardInvokeAction.js.map