"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingPackage = void 0;
/**
 * Information about the working package for a particular invocation of API Extractor.
 *
 * @remarks
 * API Extractor tries to model the world as a collection of NPM packages, such that each
 * .d.ts file belongs to at most one package.  When API Extractor is invoked on a project,
 * we refer to that project as being the "working package".  There is exactly one
 * "working package" for the duration of this analysis.  Any files that do not belong to
 * the working package are referred to as "external":  external declarations belonging to
 * external packages.
 *
 * If API Extractor is invoked on a standalone .d.ts file, the "working package" may not
 * have an actual package.json file on disk, but we still refer to it in concept.
 */
class WorkingPackage {
    constructor(options) {
        this.packageFolder = options.packageFolder;
        this.packageJson = options.packageJson;
        this.entryPointSourceFile = options.entryPointSourceFile;
    }
    /**
     * Returns the full name of the working package.
     */
    get name() {
        return this.packageJson.name;
    }
}
exports.WorkingPackage = WorkingPackage;
//# sourceMappingURL=WorkingPackage.js.map