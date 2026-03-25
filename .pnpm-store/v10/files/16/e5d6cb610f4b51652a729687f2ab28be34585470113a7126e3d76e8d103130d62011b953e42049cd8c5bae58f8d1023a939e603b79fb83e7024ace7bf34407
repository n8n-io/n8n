"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstSymbol = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
const AstEntity_1 = require("./AstEntity");
/**
 * The AstDeclaration and AstSymbol classes are API Extractor's equivalent of the compiler's
 * ts.Declaration and ts.Symbol objects.  They are created by the `AstSymbolTable` class.
 *
 * @remarks
 * The AstSymbol represents the ts.Symbol information for an AstDeclaration.  For example,
 * if a method has 3 overloads, each overloaded signature will have its own AstDeclaration,
 * but they will all share a common AstSymbol.
 *
 * For nested definitions, the AstSymbol has a unique parent (i.e. AstSymbol.rootAstSymbol),
 * but the parent/children for each AstDeclaration may be different.  Consider this example:
 *
 * ```ts
 * export namespace N {
 *   export function f(): void { }
 * }
 *
 * export interface N {
 *   g(): void;
 * }
 * ```
 *
 * Note how the parent/child relationships are different for the symbol tree versus
 * the declaration tree, and the declaration tree has two roots:
 *
 * ```
 * AstSymbol tree:            AstDeclaration tree:
 * - N                        - N (namespace)
 *   - f                        - f
 *   - g                      - N (interface)
 *                              - g
 * ```
 */
class AstSymbol extends AstEntity_1.AstEntity {
    constructor(options) {
        super();
        // This flag is unused if this is not the root symbol.
        // Being "analyzed" is a property of the root symbol.
        this._analyzed = false;
        this.followedSymbol = options.followedSymbol;
        this.localName = options.localName;
        this.isExternal = options.isExternal;
        this.nominalAnalysis = options.nominalAnalysis;
        this.parentAstSymbol = options.parentAstSymbol;
        this.rootAstSymbol = options.rootAstSymbol || this;
        this._astDeclarations = [];
    }
    /**
     * The one or more declarations for this symbol.
     * @remarks
     * For example, if this symbol is a method, then the declarations might be
     * various method overloads.  If this symbol is a namespace, then the declarations
     * might be separate namespace blocks with the same name that get combined via
     * declaration merging.
     */
    get astDeclarations() {
        return this._astDeclarations;
    }
    /**
     * Returns true if the AstSymbolTable.analyze() was called for this object.
     * See that function for details.
     * @remarks
     * AstSymbolTable.analyze() is always performed on the root AstSymbol.  This function
     * returns true if-and-only-if the root symbol was analyzed.
     */
    get analyzed() {
        return this.rootAstSymbol._analyzed;
    }
    /**
     * This is an internal callback used when the AstSymbolTable attaches a new
     * AstDeclaration to this object.
     * @internal
     */
    _notifyDeclarationAttach(astDeclaration) {
        if (this.analyzed) {
            throw new node_core_library_1.InternalError('_notifyDeclarationAttach() called after analysis is already complete');
        }
        this._astDeclarations.push(astDeclaration);
    }
    /**
     * This is an internal callback used when the AstSymbolTable.analyze()
     * has processed this object.
     * @internal
     */
    _notifyAnalyzed() {
        if (this.parentAstSymbol) {
            throw new node_core_library_1.InternalError('_notifyAnalyzed() called for an AstSymbol which is not the root');
        }
        this._analyzed = true;
    }
    /**
     * Helper that calls AstDeclaration.forEachDeclarationRecursive() for each AstDeclaration.
     */
    forEachDeclarationRecursive(action) {
        for (const astDeclaration of this.astDeclarations) {
            astDeclaration.forEachDeclarationRecursive(action);
        }
    }
}
exports.AstSymbol = AstSymbol;
//# sourceMappingURL=AstSymbol.js.map