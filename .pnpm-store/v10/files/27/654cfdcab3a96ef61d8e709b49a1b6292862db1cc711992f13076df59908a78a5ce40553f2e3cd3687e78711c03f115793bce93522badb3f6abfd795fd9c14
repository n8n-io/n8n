// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { InternalError } from '@rushstack/node-core-library';
import { AstSyntheticEntity } from './AstEntity';
/**
 * Indicates the import kind for an `AstImport`.
 */
export var AstImportKind;
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
})(AstImportKind || (AstImportKind = {}));
/**
 * For a symbol that was imported from an external package, this tracks the import
 * statement that was used to reach it.
 */
export class AstImport extends AstSyntheticEntity {
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
                throw new InternalError('Unknown AstImportKind');
        }
    }
}
//# sourceMappingURL=AstImport.js.map