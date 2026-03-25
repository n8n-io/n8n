// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs";
import { promisify } from "util";
const readFileAsync = promisify(fs.readFile);
/**
 * Helper method to create a SynonymMap object. This is a NodeJS only method.
 *
 * @param name - Name of the SynonymMap.
 * @param filePath - Path of the file that contains the Synonyms (seperated by new lines)
 * @returns SynonymMap object
 */
export async function createSynonymMapFromFile(name, filePath) {
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