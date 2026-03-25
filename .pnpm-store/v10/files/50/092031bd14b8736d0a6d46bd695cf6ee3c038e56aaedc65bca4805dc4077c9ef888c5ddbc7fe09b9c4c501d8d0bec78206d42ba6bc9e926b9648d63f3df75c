"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomArgumentParser = exports.CommandLineParserExitError = void 0;
const argparse = __importStar(require("argparse"));
class CommandLineParserExitError extends Error {
    constructor(exitCode, message) {
        super(message);
        // Manually set the prototype, as we can no longer extend built-in classes like Error, Array, Map, etc
        // https://github.com/microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        //
        // Note: the prototype must also be set on any classes which extend this one
        this.__proto__ = CommandLineParserExitError.prototype; // eslint-disable-line @typescript-eslint/no-explicit-any
        this.exitCode = exitCode;
    }
}
exports.CommandLineParserExitError = CommandLineParserExitError;
class CustomArgumentParser extends argparse.ArgumentParser {
    exit(status, message) {
        // override
        throw new CommandLineParserExitError(status, message);
    }
    error(err) {
        // override
        // Ensure the ParserExitError bubbles up to the top without any special processing
        if (err instanceof CommandLineParserExitError) {
            throw err;
        }
        super.error(err);
    }
}
exports.CustomArgumentParser = CustomArgumentParser;
//# sourceMappingURL=CommandLineParserExitError.js.map