"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticActionZodSchema = void 0;
const zod_1 = require("zod");
const entity_1 = require("../entity/entity");
const semanticActionStateTypes_1 = require("./semanticActionStateTypes");
/**
 * Zod schema for validating SemanticAction.
 */
exports.semanticActionZodSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    state: zod_1.z.union([semanticActionStateTypes_1.semanticActionStateTypesZodSchema, zod_1.z.string().min(1)]),
    entities: zod_1.z.record(entity_1.entityZodSchema)
});
//# sourceMappingURL=semanticAction.js.map