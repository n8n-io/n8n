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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helpers = void 0;
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const resolve_1 = __importDefault(require("resolve"));
// These helpers avoid taking dependencies on other NPM packages
class Helpers {
    static async nodeResolveAsync(id, opts) {
        return await new Promise((resolve, reject) => {
            (0, resolve_1.default)(id, opts, (error, result) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    static async fsExistsAsync(filesystemPath) {
        return await new Promise((resolve) => {
            fs.exists(filesystemPath, (exists) => {
                resolve(exists);
            });
        });
    }
    // Based on Path.isDownwardRelative() from @rushstack/node-core-library
    static isDownwardRelative(inputPath) {
        if (path.isAbsolute(inputPath)) {
            return false;
        }
        // Does it contain ".."
        if (Helpers._upwardPathSegmentRegex.test(inputPath)) {
            return false;
        }
        return true;
    }
}
exports.Helpers = Helpers;
// Based on Path.isDownwardRelative() from @rushstack/node-core-library
Helpers._upwardPathSegmentRegex = /([\/\\]|^)\.\.([\/\\]|$)/;
//# sourceMappingURL=Helpers.js.map