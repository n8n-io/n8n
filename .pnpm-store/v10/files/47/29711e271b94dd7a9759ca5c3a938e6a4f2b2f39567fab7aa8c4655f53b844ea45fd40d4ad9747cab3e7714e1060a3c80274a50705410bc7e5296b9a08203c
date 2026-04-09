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
exports.SourceMapper = void 0;
const path = __importStar(require("node:path"));
const source_map_1 = require("source-map");
const node_core_library_1 = require("@rushstack/node-core-library");
class SourceMapper {
    constructor() {
        // Map from .d.ts file path --> ISourceMap if a source map was found, or null if not found
        this._sourceMapByFilePath = new Map();
        // Cache the FileSystem.exists() result for mapped .ts files
        this._originalFileInfoByPath = new Map();
    }
    /**
     * Given a `.d.ts` source file and a specific position within the file, return the corresponding
     * `ISourceLocation`.
     */
    getSourceLocation(options) {
        const lineAndCharacter = options.sourceFile.getLineAndCharacterOfPosition(options.pos);
        const sourceLocation = {
            sourceFilePath: options.sourceFile.fileName,
            sourceFileLine: lineAndCharacter.line + 1,
            sourceFileColumn: lineAndCharacter.character + 1
        };
        if (options.useDtsLocation) {
            return sourceLocation;
        }
        const mappedSourceLocation = this._getMappedSourceLocation(sourceLocation);
        return mappedSourceLocation || sourceLocation;
    }
    _getMappedSourceLocation(sourceLocation) {
        const { sourceFilePath, sourceFileLine, sourceFileColumn } = sourceLocation;
        if (!node_core_library_1.FileSystem.exists(sourceFilePath)) {
            // Sanity check
            throw new node_core_library_1.InternalError('The referenced path was not found: ' + sourceFilePath);
        }
        const sourceMap = this._getSourceMap(sourceFilePath);
        if (!sourceMap)
            return;
        const nearestMappingItem = SourceMapper._findNearestMappingItem(sourceMap.mappingItems, {
            line: sourceFileLine,
            column: sourceFileColumn
        });
        if (!nearestMappingItem)
            return;
        const mappedFilePath = path.resolve(path.dirname(sourceFilePath), nearestMappingItem.source);
        // Does the mapped filename exist?  Use a cache to remember the answer.
        let originalFileInfo = this._originalFileInfoByPath.get(mappedFilePath);
        if (originalFileInfo === undefined) {
            originalFileInfo = {
                fileExists: node_core_library_1.FileSystem.exists(mappedFilePath),
                maxColumnForLine: []
            };
            if (originalFileInfo.fileExists) {
                // Read the file and measure the length of each line
                originalFileInfo.maxColumnForLine = node_core_library_1.FileSystem.readFile(mappedFilePath, {
                    convertLineEndings: node_core_library_1.NewlineKind.Lf
                })
                    .split('\n')
                    .map((x) => x.length + 1); // +1 since columns are 1-based
                originalFileInfo.maxColumnForLine.unshift(0); // Extra item since lines are 1-based
            }
            this._originalFileInfoByPath.set(mappedFilePath, originalFileInfo);
        }
        // Don't translate coordinates to a file that doesn't exist
        if (!originalFileInfo.fileExists)
            return;
        // The nearestMappingItem anchor may be above/left of the real position, due to gaps in the mapping.  Calculate
        // the delta and apply it to the original position.
        const guessedPosition = {
            line: nearestMappingItem.originalLine + sourceFileLine - nearestMappingItem.generatedLine,
            column: nearestMappingItem.originalColumn + sourceFileColumn - nearestMappingItem.generatedColumn
        };
        // Verify that the result is not out of bounds, in cause our heuristic failed
        if (guessedPosition.line >= 1 &&
            guessedPosition.line < originalFileInfo.maxColumnForLine.length &&
            guessedPosition.column >= 1 &&
            guessedPosition.column <= originalFileInfo.maxColumnForLine[guessedPosition.line]) {
            return {
                sourceFilePath: mappedFilePath,
                sourceFileLine: guessedPosition.line,
                sourceFileColumn: guessedPosition.column
            };
        }
        else {
            // The guessed position was out of bounds, so use the nearestMappingItem position instead.
            return {
                sourceFilePath: mappedFilePath,
                sourceFileLine: nearestMappingItem.originalLine,
                sourceFileColumn: nearestMappingItem.originalColumn
            };
        }
    }
    _getSourceMap(sourceFilePath) {
        let sourceMap = this._sourceMapByFilePath.get(sourceFilePath);
        if (sourceMap === undefined) {
            // Normalize the path and redo the lookup
            const normalizedPath = node_core_library_1.FileSystem.getRealPath(sourceFilePath);
            sourceMap = this._sourceMapByFilePath.get(normalizedPath);
            if (sourceMap !== undefined) {
                // Copy the result from the normalized to the non-normalized key
                this._sourceMapByFilePath.set(sourceFilePath, sourceMap);
            }
            else {
                // Given "folder/file.d.ts", check for a corresponding "folder/file.d.ts.map"
                const sourceMapPath = normalizedPath + '.map';
                if (node_core_library_1.FileSystem.exists(sourceMapPath)) {
                    // Load up the source map
                    const rawSourceMap = node_core_library_1.JsonFile.load(sourceMapPath);
                    const sourceMapConsumer = new source_map_1.SourceMapConsumer(rawSourceMap);
                    const mappingItems = [];
                    // Extract the list of mapping items
                    sourceMapConsumer.eachMapping((mappingItem) => {
                        mappingItems.push({
                            ...mappingItem,
                            // The "source-map" package inexplicably uses 1-based line numbers but 0-based column numbers.
                            // Fix that up proactively so we don't have to deal with it later.
                            generatedColumn: mappingItem.generatedColumn + 1,
                            originalColumn: mappingItem.originalColumn + 1
                        });
                    }, this, source_map_1.SourceMapConsumer.GENERATED_ORDER);
                    sourceMap = { sourceMapConsumer, mappingItems };
                }
                else {
                    // No source map for this filename
                    sourceMap = null;
                }
                this._sourceMapByFilePath.set(normalizedPath, sourceMap);
                if (sourceFilePath !== normalizedPath) {
                    // Add both keys to the map
                    this._sourceMapByFilePath.set(sourceFilePath, sourceMap);
                }
            }
        }
        return sourceMap;
    }
    // The `mappingItems` array is sorted by generatedLine/generatedColumn (GENERATED_ORDER).
    // The _findNearestMappingItem() lookup is a simple binary search that returns the previous item
    // if there is no exact match.
    static _findNearestMappingItem(mappingItems, position) {
        if (mappingItems.length === 0) {
            return undefined;
        }
        let startIndex = 0;
        let endIndex = mappingItems.length - 1;
        while (startIndex <= endIndex) {
            const middleIndex = startIndex + Math.floor((endIndex - startIndex) / 2);
            const diff = SourceMapper._compareMappingItem(mappingItems[middleIndex], position);
            if (diff < 0) {
                startIndex = middleIndex + 1;
            }
            else if (diff > 0) {
                endIndex = middleIndex - 1;
            }
            else {
                // Exact match
                return mappingItems[middleIndex];
            }
        }
        // If we didn't find an exact match, then endIndex < startIndex.
        // Take endIndex because it's the smaller value.
        return mappingItems[endIndex];
    }
    static _compareMappingItem(mappingItem, position) {
        const diff = mappingItem.generatedLine - position.line;
        if (diff !== 0) {
            return diff;
        }
        return mappingItem.generatedColumn - position.column;
    }
}
exports.SourceMapper = SourceMapper;
//# sourceMappingURL=SourceMapper.js.map