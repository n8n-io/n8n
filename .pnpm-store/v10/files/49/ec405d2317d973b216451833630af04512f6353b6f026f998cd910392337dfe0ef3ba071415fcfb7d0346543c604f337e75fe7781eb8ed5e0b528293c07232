"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSynonymMapFromFile = createSynonymMapFromFile;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const util_1 = require("util");
const readFileAsync = (0, util_1.promisify)(fs.readFile);
/**
 * Helper method to create a SynonymMap object. This is a NodeJS only method.
 *
 * @param name - Name of the SynonymMap.
 * @param filePath - Path of the file that contains the Synonyms (seperated by new lines)
 * @returns SynonymMap object
 */
async function createSynonymMapFromFile(name, filePath) {
    const synonyms = (await readFileAsync(filePath, "utf-8"))
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    return {
        name,
        synonyms,
    };
}
//# sourceMappingURL=synonymMapHelper.js.map