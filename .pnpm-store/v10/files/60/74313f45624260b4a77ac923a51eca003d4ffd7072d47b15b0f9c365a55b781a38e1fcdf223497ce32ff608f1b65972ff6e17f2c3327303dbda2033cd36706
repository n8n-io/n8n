"use strict";
/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticActionStateTypesZodSchema = exports.SemanticActionStateTypes = void 0;
const zod_1 = require("zod");
/**
 * Enum representing the state types of a semantic action.
 */
var SemanticActionStateTypes;
(function (SemanticActionStateTypes) {
    /**
     * Indicates the start of a semantic action.
     */
    SemanticActionStateTypes["Start"] = "start";
    /**
     * Indicates the continuation of a semantic action.
     */
    SemanticActionStateTypes["Continue"] = "continue";
    /**
     * Indicates the completion of a semantic action.
     */
    SemanticActionStateTypes["Done"] = "done";
})(SemanticActionStateTypes || (exports.SemanticActionStateTypes = SemanticActionStateTypes = {}));
/**
 * Zod schema for validating SemanticActionStateTypes.
 */
exports.semanticActionStateTypesZodSchema = zod_1.z.enum(['start', 'continue', 'done']);
//# sourceMappingURL=semanticActionStateTypes.js.map