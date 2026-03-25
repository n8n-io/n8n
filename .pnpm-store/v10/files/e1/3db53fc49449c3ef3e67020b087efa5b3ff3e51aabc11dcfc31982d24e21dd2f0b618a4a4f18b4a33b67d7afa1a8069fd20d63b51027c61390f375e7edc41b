"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestedActionsZodSchema = void 0;
const zod_1 = require("zod");
const cardAction_1 = require("./cardAction");
/**
 * Zod schema for validating SuggestedActions.
 */
exports.suggestedActionsZodSchema = zod_1.z.object({
    to: zod_1.z.array(zod_1.z.string().min(1)),
    actions: zod_1.z.array(cardAction_1.cardActionZodSchema)
});
//# sourceMappingURL=suggestedActions.js.map