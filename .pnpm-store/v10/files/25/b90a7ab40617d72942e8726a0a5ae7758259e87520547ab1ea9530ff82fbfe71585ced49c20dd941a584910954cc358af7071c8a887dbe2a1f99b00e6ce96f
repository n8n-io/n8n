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
exports.AstDeclaration = void 0;
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const Span_1 = require("./Span");
/**
 * The AstDeclaration and AstSymbol classes are API Extractor's equivalent of the compiler's
 * ts.Declaration and ts.Symbol objects.  They are created by the `AstSymbolTable` class.
 *
 * @remarks
 * The AstDeclaration represents one or more syntax components of a symbol.  Usually there is
 * only one AstDeclaration per AstSymbol, but certain TypeScript constructs can have multiple
 * declarations (e.g. overloaded functions, merged declarations, etc.).
 *
 * Because of this, the `AstDeclaration` manages the parent/child nesting hierarchy (e.g. with
 * declaration merging, each declaration has its own children) and becomes the main focus
 * of analyzing AEDoc and emitting *.d.ts files.
 *
 * The AstDeclarations correspond to items from the compiler's ts.Node hierarchy, but
 * omitting/skipping any nodes that don't match the AstDeclaration.isSupportedSyntaxKind()
 * criteria.  This simplification makes the other API Extractor stages easier to implement.
 */
class AstDeclaration {
    constructor(options) {
        // NOTE: This array becomes immutable after astSymbol.analyze() sets astSymbol.analyzed=true
        this._analyzedChildren = [];
        this._analyzedReferencedAstEntitiesSet = new Set();
        // Reverse lookup used by findChildrenWithName()
        this._childrenByName = undefined;
        this.declaration = options.declaration;
        this.astSymbol = options.astSymbol;
        this.parent = options.parent;
        this.astSymbol._notifyDeclarationAttach(this);
        if (this.parent) {
            this.parent._notifyChildAttach(this);
        }
        this.modifierFlags = ts.getCombinedModifierFlags(this.declaration);
        // Check for ECMAScript private fields, for example:
        //
        //    class Person { #name: string; }
        //
        const declarationName = ts.getNameOfDeclaration(this.declaration);
        if (declarationName) {
            if (ts.isPrivateIdentifier(declarationName)) {
                // eslint-disable-next-line no-bitwise
                this.modifierFlags |= ts.ModifierFlags.Private;
            }
        }
    }
    /**
     * Returns the children for this AstDeclaration.
     * @remarks
     * The collection will be empty until AstSymbol.analyzed is true.
     */
    get children() {
        return this.astSymbol.analyzed ? this._analyzedChildren : [];
    }
    /**
     * Returns the AstEntity objects referenced by this node.
     * @remarks
     * NOTE: The collection will be empty until AstSymbol.analyzed is true.
     *
     * Since we assume references are always collected by a traversal starting at the
     * root of the nesting declarations, this array omits the following items because they
     * would be redundant:
     * - symbols corresponding to parents of this declaration (e.g. a method that returns its own class)
     * - symbols already listed in the referencedAstSymbols property for parents of this declaration
     *   (e.g. a method that returns its own class's base class)
     * - symbols that are referenced only by nested children of this declaration
     *   (e.g. if a method returns an enum, this doesn't imply that the method's class references that enum)
     */
    get referencedAstEntities() {
        return this.astSymbol.analyzed ? [...this._analyzedReferencedAstEntitiesSet] : [];
    }
    /**
     * This is an internal callback used when the AstSymbolTable attaches a new
     * child AstDeclaration to this object.
     * @internal
     */
    _notifyChildAttach(child) {
        if (child.parent !== this) {
            throw new node_core_library_1.InternalError('Invalid call to notifyChildAttach()');
        }
        if (this.astSymbol.analyzed) {
            throw new node_core_library_1.InternalError('_notifyChildAttach() called after analysis is already complete');
        }
        this._analyzedChildren.push(child);
    }
    /**
     * Returns a diagnostic dump of the tree, which reports the hierarchy of
     * AstDefinition objects.
     */
    getDump(indent = '') {
        const declarationKind = ts.SyntaxKind[this.declaration.kind];
        let result = indent + `+ ${this.astSymbol.localName} (${declarationKind})`;
        if (this.astSymbol.nominalAnalysis) {
            result += ' (nominal)';
        }
        result += '\n';
        for (const referencedAstEntity of this._analyzedReferencedAstEntitiesSet.values()) {
            result += indent + `  ref: ${referencedAstEntity.localName}\n`;
        }
        for (const child of this.children) {
            result += child.getDump(indent + '  ');
        }
        return result;
    }
    /**
     * Returns a diagnostic dump using Span.getDump(), which reports the detailed
     * compiler structure.
     */
    getSpanDump(indent = '') {
        const span = new Span_1.Span(this.declaration);
        return span.getDump(indent);
    }
    /**
     * This is an internal callback used when AstSymbolTable.analyze() discovers a new
     * type reference associated with this declaration.
     * @internal
     */
    _notifyReferencedAstEntity(referencedAstEntity) {
        if (this.astSymbol.analyzed) {
            throw new node_core_library_1.InternalError('_notifyReferencedAstEntity() called after analysis is already complete');
        }
        for (let current = this; current; current = current.parent) {
            // Don't add references to symbols that are already referenced by a parent
            if (current._analyzedReferencedAstEntitiesSet.has(referencedAstEntity)) {
                return;
            }
            // Don't add the symbols of parents either
            if (referencedAstEntity === current.astSymbol) {
                return;
            }
        }
        this._analyzedReferencedAstEntitiesSet.add(referencedAstEntity);
    }
    /**
     * Visits all the current declaration and all children recursively in a depth-first traversal,
     * and performs the specified action for each one.
     */
    forEachDeclarationRecursive(action) {
        action(this);
        for (const child of this.children) {
            child.forEachDeclarationRecursive(action);
        }
    }
    /**
     * Returns the list of child declarations whose `AstSymbol.localName` matches the provided `name`.
     *
     * @remarks
     * This is an efficient O(1) lookup.
     */
    findChildrenWithName(name) {
        // The children property returns:
        //
        //    return this.astSymbol.analyzed ? this._analyzedChildren : [];
        //
        if (!this.astSymbol.analyzed || this._analyzedChildren.length === 0) {
            return [];
        }
        if (this._childrenByName === undefined) {
            // Build the lookup table
            const childrenByName = new Map();
            for (const child of this._analyzedChildren) {
                const childName = child.astSymbol.localName;
                let array = childrenByName.get(childName);
                if (array === undefined) {
                    array = [];
                    childrenByName.set(childName, array);
                }
                array.push(child);
            }
            this._childrenByName = childrenByName;
        }
        return this._childrenByName.get(name) || [];
    }
    /**
     * This function determines which ts.Node kinds will generate an AstDeclaration.
     * These correspond to the definitions that we can add AEDoc to.
     */
    static isSupportedSyntaxKind(kind) {
        // (alphabetical order)
        switch (kind) {
            case ts.SyntaxKind.CallSignature:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.ConstructSignature: // Example: "new(x: number): IMyClass"
            case ts.SyntaxKind.Constructor: // Example: "constructor(x: number)"
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.FunctionDeclaration: // Example: "(x: number): number"
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.IndexSignature: // Example: "[key: string]: string"
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.ModuleDeclaration: // Used for both "module" and "namespace" declarations
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.TypeAliasDeclaration: // Example: "type Shape = Circle | Square"
            case ts.SyntaxKind.VariableDeclaration:
                return true;
            // NOTE: Prior to TypeScript 3.7, in the emitted .d.ts files, the compiler would merge a GetAccessor/SetAccessor
            // pair into a single PropertyDeclaration.
            // NOTE: In contexts where a source file is treated as a module, we do create "nominal analysis"
            // AstSymbol objects corresponding to a ts.SyntaxKind.SourceFile node.  However, a source file
            // is NOT considered a nesting structure, and it does NOT act as a root for the declarations
            // appearing in the file.  This is because the *.d.ts generator is in the business of rolling up
            // source files, and thus wants to ignore them in general.
        }
        return false;
    }
}
exports.AstDeclaration = AstDeclaration;
//# sourceMappingURL=AstDeclaration.js.map