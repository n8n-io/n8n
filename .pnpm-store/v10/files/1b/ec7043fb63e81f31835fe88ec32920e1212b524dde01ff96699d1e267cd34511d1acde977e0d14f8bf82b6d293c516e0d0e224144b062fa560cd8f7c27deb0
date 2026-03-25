"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputHintsZodSchema = exports.InputHints = void 0;
const zod_1 = require("zod");
/**
 * Enum representing input hints.
 */
var InputHints;
(function (InputHints) {
    /**
     * Indicates that the bot is ready to accept input from the user.
     */
    InputHints["AcceptingInput"] = "acceptingInput";
    /**
     * Indicates that the bot is ignoring input from the user.
     */
    InputHints["IgnoringInput"] = "ignoringInput";
    /**
     * Indicates that the bot is expecting input from the user.
     */
    InputHints["ExpectingInput"] = "expectingInput";
})(InputHints || (exports.InputHints = InputHints = {}));
/**
 * Zod schema for validating an InputHints enum.
 */
exports.inputHintsZodSchema = zod_1.z.enum(['acceptingInput', 'ignoringInput', 'expectingInput']);
//# sourceMappingURL=inputHints.js.map