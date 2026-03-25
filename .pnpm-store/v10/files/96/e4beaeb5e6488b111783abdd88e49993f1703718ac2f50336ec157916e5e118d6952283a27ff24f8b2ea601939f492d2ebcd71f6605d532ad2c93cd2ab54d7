"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstNamespaceImport = void 0;
const AstEntity_1 = require("./AstEntity");
/**
 * `AstNamespaceImport` represents a namespace that is created implicitly by a statement
 * such as `import * as example from "./file";`
 *
 * @remarks
 *
 * A typical input looks like this:
 * ```ts
 * // Suppose that example.ts exports two functions f1() and f2().
 * import * as example from "./file";
 * export { example };
 * ```
 *
 * API Extractor's .d.ts rollup will transform it into an explicit namespace, like this:
 * ```ts
 * declare f1(): void;
 * declare f2(): void;
 *
 * declare namespace example {
 *   export {
 *     f1,
 *     f2
 *   }
 * }
 * ```
 *
 * The current implementation does not attempt to relocate f1()/f2() to be inside the `namespace`
 * because other type signatures may reference them directly (without using the namespace qualifier).
 * The `declare namespace example` is a synthetic construct represented by `AstNamespaceImport`.
 */
class AstNamespaceImport extends AstEntity_1.AstSyntheticEntity {
    constructor(options) {
        super();
        /**
         * Returns true if the AstSymbolTable.analyze() was called for this object.
         * See that function for details.
         */
        this.analyzed = false;
        this.astModule = options.astModule;
        this.namespaceName = options.namespaceName;
        this.declaration = options.declaration;
        this.symbol = options.symbol;
    }
    /** {@inheritdoc} */
    get localName() {
        // abstract
        return this.namespaceName;
    }
    fetchAstModuleExportInfo(collector) {
        const astModuleExportInfo = collector.astSymbolTable.fetchAstModuleExportInfo(this.astModule);
        return astModuleExportInfo;
    }
}
exports.AstNamespaceImport = AstNamespaceImport;
//# sourceMappingURL=AstNamespaceImport.js.map