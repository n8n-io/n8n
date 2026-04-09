// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as path from 'node:path';
import * as fs from 'node:fs';
import nodeResolve from 'resolve';
// These helpers avoid taking dependencies on other NPM packages
export class Helpers {
    static async nodeResolveAsync(id, opts) {
        return await new Promise((resolve, reject) => {
            nodeResolve(id, opts, (error, result) => {
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
// Based on Path.isDownwardRelative() from @rushstack/node-core-library
Helpers._upwardPathSegmentRegex = /([\/\\]|^)\.\.([\/\\]|$)/;
//# sourceMappingURL=Helpers.js.map