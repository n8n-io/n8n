"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstModule = void 0;
/**
 * An internal data structure that represents a source file that is analyzed by AstSymbolTable.
 */
class AstModule {
    constructor(options) {
        this.sourceFile = options.sourceFile;
        this.moduleSymbol = options.moduleSymbol;
        this.externalModulePath = options.externalModulePath;
        this.starExportedModules = new Set();
        this.cachedExportedEntities = new Map();
        this.astModuleExportInfo = undefined;
    }
    /**
     * If false, then this source file is part of the working package being processed by the `Collector`.
     */
    get isExternal() {
        return this.externalModulePath !== undefined;
    }
}
exports.AstModule = AstModule;
//# sourceMappingURL=AstModule.js.map