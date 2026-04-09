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
exports.SourceFileLocationFormatter = void 0;
const path = __importStar(require("node:path"));
const node_core_library_1 = require("@rushstack/node-core-library");
class SourceFileLocationFormatter {
    /**
     * Returns a string such as this, based on the context information in the provided node:
     *   "[C:\Folder\File.ts#123]"
     */
    static formatDeclaration(node, workingPackageFolderPath) {
        const sourceFile = node.getSourceFile();
        const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        return SourceFileLocationFormatter.formatPath(sourceFile.fileName, {
            sourceFileLine: lineAndCharacter.line + 1,
            sourceFileColumn: lineAndCharacter.character + 1,
            workingPackageFolderPath
        });
    }
    static formatPath(sourceFilePath, options) {
        if (!options) {
            options = {};
        }
        let result = '';
        // Make the path relative to the workingPackageFolderPath
        let scrubbedPath = sourceFilePath;
        if (options.workingPackageFolderPath) {
            // If it's under the working folder, make it a relative path
            if (node_core_library_1.Path.isUnderOrEqual(sourceFilePath, options.workingPackageFolderPath)) {
                scrubbedPath = path.relative(options.workingPackageFolderPath, sourceFilePath);
            }
        }
        // Convert it to a Unix-style path
        scrubbedPath = node_core_library_1.Text.replaceAll(scrubbedPath, '\\', '/');
        result += scrubbedPath;
        if (options.sourceFileLine) {
            result += `:${options.sourceFileLine}`;
            if (options.sourceFileColumn) {
                result += `:${options.sourceFileColumn}`;
            }
        }
        return result;
    }
}
exports.SourceFileLocationFormatter = SourceFileLocationFormatter;
//# sourceMappingURL=SourceFileLocationFormatter.js.map