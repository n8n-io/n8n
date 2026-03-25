"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstImport = exports.AstImportKind = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
const AstEntity_1 = require("./AstEntity");
/**
 * Indicates the import kind for an `AstImport`.
 */
var AstImportKind;
(function (AstImportKind) {
    /**
     * An import statement such as `import X from "y";`.
     */
    AstImportKind[AstImportKind["DefaultImport"] = 0] = "DefaultImport";
    /**
     * An import statement such as `import { X } from "y";`.
     */
    AstImportKind[AstImportKind["NamedImport"] = 1] = "NamedImport";
    /**
     * An import statement such as `import * as x from "y";`.
     */
    AstImportKind[AstImportKind["StarImport"] = 2] = "StarImport";
    /**
     * An import statement such as `import x = require("y");`.
     */
    AstImportKind[AstImportKind["EqualsImport"] = 3] = "EqualsImport";
    /**
     * An import statement such as `interface foo { foo: import("bar").a.b.c }`.
     */
    AstImportKind[AstImportKind["ImportType"] = 4] = "ImportType";
})(AstImportKind || (exports.AstImportKind = AstImportKind = {}));
/**
 * For a symbol that was imported from an external package, this tracks the import
 * statement that was used to reach it.
 */
class AstImport extends AstEntity_1.AstSyntheticEntity {
    constructor(options) {
        super();
        this.importKind = options.importKind;
        this.modulePath = options.modulePath;
        this.exportName = options.exportName;
        // We start with this assumption, but it may get changed later if non-type-only import is encountered.
        this.isTypeOnlyEverywhere = options.isTypeOnly;
        this.key = AstImport.getKey(options);
    }
    /** {@inheritdoc} */
    get localName() {
        // abstract
        return this.exportName;
    }
    /**
     * Calculates the lookup key used with `AstImport.key`
     */
    static getKey(options) {
        switch (options.importKind) {
            case AstImportKind.DefaultImport:
                return `${options.modulePath}:${options.exportName}`;
            case AstImportKind.NamedImport:
                return `${options.modulePath}:${options.exportName}`;
            case AstImportKind.StarImport:
                return `${options.modulePath}:*`;
            case AstImportKind.EqualsImport:
                return `${options.modulePath}:=`;
            case AstImportKind.ImportType: {
                const subKey = !options.exportName
                    ? '*' // Equivalent to StarImport
                    : options.exportName.includes('.') // Equivalent to a named export
                        ? options.exportName.split('.')[0]
                        : options.exportName;
                return `${options.modulePath}:${subKey}`;
            }
            default:
                throw new node_core_library_1.InternalError('Unknown AstImportKind');
        }
    }
}
exports.AstImport = AstImport;
//# sourceMappingURL=AstImport.js.map