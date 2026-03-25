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
exports.AstSymbolTable = void 0;
/* eslint-disable no-bitwise */ // for ts.SymbolFlags
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const AstDeclaration_1 = require("./AstDeclaration");
const TypeScriptHelpers_1 = require("./TypeScriptHelpers");
const AstSymbol_1 = require("./AstSymbol");
const PackageMetadataManager_1 = require("./PackageMetadataManager");
const ExportAnalyzer_1 = require("./ExportAnalyzer");
const AstNamespaceImport_1 = require("./AstNamespaceImport");
const TypeScriptInternals_1 = require("./TypeScriptInternals");
const SyntaxHelpers_1 = require("./SyntaxHelpers");
const SourceFileLocationFormatter_1 = require("./SourceFileLocationFormatter");
/**
 * AstSymbolTable is the workhorse that builds AstSymbol and AstDeclaration objects.
 * It maintains a cache of already constructed objects.  AstSymbolTable constructs
 * AstModule objects, but otherwise the state that it maintains is agnostic of
 * any particular entry point.  (For example, it does not track whether a given AstSymbol
 * is "exported" or not.)
 *
 * Internally, AstSymbolTable relies on ExportAnalyzer to crawl import statements and determine where symbols
 * are declared (i.e. the AstImport information needed to import them).
 */
class AstSymbolTable {
    constructor(program, typeChecker, packageJsonLookup, bundledPackageNames, messageRouter) {
        /**
         * A mapping from ts.Symbol --> AstSymbol
         * NOTE: The AstSymbol.followedSymbol will always be a lookup key, but additional keys
         * are possible.
         *
         * After following type aliases, we use this map to look up the corresponding AstSymbol.
         */
        this._astSymbolsBySymbol = new Map();
        /**
         * A mapping from ts.Declaration --> AstDeclaration
         */
        this._astDeclarationsByDeclaration = new Map();
        // Note that this is a mapping from specific AST nodes that we analyzed, based on the underlying symbol
        // for that node.
        this._entitiesByNode = new Map();
        this._program = program;
        this._typeChecker = typeChecker;
        this._messageRouter = messageRouter;
        this._globalVariableAnalyzer = TypeScriptInternals_1.TypeScriptInternals.getGlobalVariableAnalyzer(program);
        this._packageMetadataManager = new PackageMetadataManager_1.PackageMetadataManager(packageJsonLookup, messageRouter);
        this._exportAnalyzer = new ExportAnalyzer_1.ExportAnalyzer(this._program, this._typeChecker, bundledPackageNames, {
            analyze: this.analyze.bind(this),
            fetchAstSymbol: this._fetchAstSymbol.bind(this)
        });
        this._alreadyWarnedGlobalNames = new Set();
    }
    /**
     * Used to analyze an entry point that belongs to the working package.
     */
    fetchAstModuleFromWorkingPackage(sourceFile) {
        return this._exportAnalyzer.fetchAstModuleFromSourceFile(sourceFile, undefined, false);
    }
    /**
     * This crawls the specified entry point and collects the full set of exported AstSymbols.
     */
    fetchAstModuleExportInfo(astModule) {
        return this._exportAnalyzer.fetchAstModuleExportInfo(astModule);
    }
    /**
     * Attempts to retrieve an export by name from the specified `AstModule`.
     * Returns undefined if no match was found.
     */
    tryGetExportOfAstModule(exportName, astModule) {
        return this._exportAnalyzer.tryGetExportOfAstModule(exportName, astModule);
    }
    /**
     * Ensures that AstSymbol.analyzed is true for the provided symbol.  The operation
     * starts from the root symbol and then fills out all children of all declarations, and
     * also calculates AstDeclaration.referencedAstSymbols for all declarations.
     * If the symbol is not imported, any non-imported references are also analyzed.
     *
     * @remarks
     * This is an expensive operation, so we only perform it for top-level exports of an
     * the AstModule.  For example, if some code references a nested class inside
     * a namespace from another library, we do not analyze any of that class's siblings
     * or members.  (We do always construct its parents however, since AstDefinition.parent
     * is immutable, and needed e.g. to calculate release tag inheritance.)
     */
    analyze(astEntity) {
        if (astEntity instanceof AstSymbol_1.AstSymbol) {
            return this._analyzeAstSymbol(astEntity);
        }
        if (astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
            return this._analyzeAstNamespaceImport(astEntity);
        }
    }
    /**
     * For a given astDeclaration, this efficiently finds the child corresponding to the
     * specified ts.Node.  It is assumed that AstDeclaration.isSupportedSyntaxKind() would return true for
     * that node type, and that the node is an immediate child of the provided AstDeclaration.
     */
    // NOTE: This could be a method of AstSymbol if it had a backpointer to its AstSymbolTable.
    getChildAstDeclarationByNode(node, parentAstDeclaration) {
        if (!parentAstDeclaration.astSymbol.analyzed) {
            throw new Error('getChildDeclarationByNode() cannot be used for an AstSymbol that was not analyzed');
        }
        const childAstDeclaration = this._astDeclarationsByDeclaration.get(node);
        if (!childAstDeclaration) {
            throw new Error('Child declaration not found for the specified node');
        }
        if (childAstDeclaration.parent !== parentAstDeclaration) {
            throw new node_core_library_1.InternalError('The found child is not attached to the parent AstDeclaration');
        }
        return childAstDeclaration;
    }
    /**
     * For a given ts.Identifier that is part of an AstSymbol that we analyzed, return the AstEntity that
     * it refers to.  Returns undefined if it doesn't refer to anything interesting.
     * @remarks
     * Throws an Error if the ts.Identifier is not part of node tree that was analyzed.
     */
    tryGetEntityForNode(identifier) {
        if (!this._entitiesByNode.has(identifier)) {
            throw new node_core_library_1.InternalError('tryGetEntityForIdentifier() called for an identifier that was not analyzed');
        }
        return this._entitiesByNode.get(identifier);
    }
    /**
     * Builds an AstSymbol.localName for a given ts.Symbol.  In the current implementation, the localName is
     * a TypeScript-like expression that may be a string literal or ECMAScript symbol expression.
     *
     * ```ts
     * class X {
     *   // localName="identifier"
     *   public identifier: number = 1;
     *   // localName="\"identifier\""
     *   public "quoted string!": number = 2;
     *   // localName="[MyNamespace.MySymbol]"
     *   public [MyNamespace.MySymbol]: number = 3;
     * }
     * ```
     */
    static getLocalNameForSymbol(symbol) {
        // TypeScript binds well-known ECMAScript symbols like "[Symbol.iterator]" as "__@iterator".
        // Decode it back into "[Symbol.iterator]".
        const wellKnownSymbolName = TypeScriptHelpers_1.TypeScriptHelpers.tryDecodeWellKnownSymbolName(symbol.escapedName);
        if (wellKnownSymbolName) {
            return wellKnownSymbolName;
        }
        const isUniqueSymbol = TypeScriptHelpers_1.TypeScriptHelpers.isUniqueSymbolName(symbol.escapedName);
        // We will try to obtain the name from a declaration; otherwise we'll fall back to the symbol name.
        let unquotedName = symbol.name;
        for (const declaration of symbol.declarations || []) {
            // Handle cases such as "export default class X { }" where the symbol name is "default"
            // but the local name is "X".
            const localSymbol = TypeScriptInternals_1.TypeScriptInternals.tryGetLocalSymbol(declaration);
            if (localSymbol) {
                unquotedName = localSymbol.name;
            }
            // If it is a non-well-known symbol, then return the late-bound name.  For example, "X.Y.z" in this example:
            //
            //   namespace X {
            //     export namespace Y {
            //       export const z: unique symbol = Symbol("z");
            //     }
            //  }
            //
            //  class C {
            //    public [X.Y.z](): void { }
            //  }
            //
            if (isUniqueSymbol) {
                const declarationName = ts.getNameOfDeclaration(declaration);
                if (declarationName && ts.isComputedPropertyName(declarationName)) {
                    const lateBoundName = TypeScriptHelpers_1.TypeScriptHelpers.tryGetLateBoundName(declarationName);
                    if (lateBoundName) {
                        // Here the string may contain an expression such as "[X.Y.z]".  Names starting with "[" are always
                        // expressions.  If a string literal contains those characters, the code below will JSON.stringify() it
                        // to avoid a collision.
                        return lateBoundName;
                    }
                }
            }
        }
        // Otherwise that name may come from a quoted string or pseudonym like `__constructor`.
        // If the string is not a safe identifier, then we must add quotes.
        // Note that if it was quoted but did not need to be quoted, here we will remove the quotes.
        if (!SyntaxHelpers_1.SyntaxHelpers.isSafeUnquotedMemberIdentifier(unquotedName)) {
            // For API Extractor's purposes, a canonical form is more appropriate than trying to reflect whatever
            // appeared in the source code.  The code is not even guaranteed to be consistent, for example:
            //
            //   class X {
            //     public "f1"(x: string): void;
            //     public f1(x: boolean): void;
            //     public 'f1'(x: string | boolean): void { }
            //   }
            return JSON.stringify(unquotedName);
        }
        return unquotedName;
    }
    _analyzeAstNamespaceImport(astNamespaceImport) {
        if (astNamespaceImport.analyzed) {
            return;
        }
        // mark before actual analyzing, to handle module cyclic reexport
        astNamespaceImport.analyzed = true;
        const exportedLocalEntities = this.fetchAstModuleExportInfo(astNamespaceImport.astModule).exportedLocalEntities;
        for (const exportedEntity of exportedLocalEntities.values()) {
            this.analyze(exportedEntity);
        }
    }
    _analyzeAstSymbol(astSymbol) {
        if (astSymbol.analyzed) {
            return;
        }
        if (astSymbol.nominalAnalysis) {
            // We don't analyze nominal symbols
            astSymbol._notifyAnalyzed();
            return;
        }
        // Start at the root of the tree
        const rootAstSymbol = astSymbol.rootAstSymbol;
        // Calculate the full child tree for each definition
        for (const astDeclaration of rootAstSymbol.astDeclarations) {
            this._analyzeChildTree(astDeclaration.declaration, astDeclaration);
        }
        rootAstSymbol._notifyAnalyzed();
        if (!astSymbol.isExternal) {
            // If this symbol is non-external (i.e. it belongs to the working package), then we also analyze any
            // referencedAstSymbols that are non-external.  For example, this ensures that forgotten exports
            // get analyzed.
            rootAstSymbol.forEachDeclarationRecursive((astDeclaration) => {
                for (const referencedAstEntity of astDeclaration.referencedAstEntities) {
                    // Walk up to the root of the tree, looking for any imports along the way
                    if (referencedAstEntity instanceof AstSymbol_1.AstSymbol) {
                        if (!referencedAstEntity.isExternal) {
                            this._analyzeAstSymbol(referencedAstEntity);
                        }
                    }
                    if (referencedAstEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
                        if (!referencedAstEntity.astModule.isExternal) {
                            this._analyzeAstNamespaceImport(referencedAstEntity);
                        }
                    }
                }
            });
        }
    }
    /**
     * Used by analyze to recursively analyze the entire child tree.
     */
    _analyzeChildTree(node, governingAstDeclaration) {
        switch (node.kind) {
            case ts.SyntaxKind.JSDocComment: // Skip JSDoc comments - TS considers @param tags TypeReference nodes
                return;
            // Is this a reference to another AstSymbol?
            case ts.SyntaxKind.TypeReference: // general type references
            case ts.SyntaxKind.ExpressionWithTypeArguments: // special case for e.g. the "extends" keyword
            case ts.SyntaxKind.ComputedPropertyName: // used for EcmaScript "symbols", e.g. "[toPrimitive]".
            case ts.SyntaxKind.TypeQuery: // represents for "typeof X" as a type
                {
                    // Sometimes the type reference will involve multiple identifiers, e.g. "a.b.C".
                    // In this case, we only need to worry about importing the first identifier,
                    // so do a depth-first search for it:
                    const identifierNode = TypeScriptHelpers_1.TypeScriptHelpers.findFirstChildNode(node, ts.SyntaxKind.Identifier);
                    if (identifierNode) {
                        let referencedAstEntity = this._entitiesByNode.get(identifierNode);
                        if (!referencedAstEntity) {
                            const symbol = this._typeChecker.getSymbolAtLocation(identifierNode);
                            if (!symbol) {
                                throw new Error('Symbol not found for identifier: ' + identifierNode.getText());
                            }
                            // Normally we expect getSymbolAtLocation() to take us to a declaration within the same source
                            // file, or else to an explicit "import" statement within the same source file.  But in certain
                            // situations (e.g. a global variable) the symbol will refer to a declaration in some other
                            // source file.  We'll call that case a "displaced symbol".
                            //
                            // For more info, see this discussion:
                            // https://github.com/microsoft/rushstack/issues/1765#issuecomment-595559849
                            let displacedSymbol = true;
                            for (const declaration of symbol.declarations || []) {
                                if (declaration.getSourceFile() === identifierNode.getSourceFile()) {
                                    displacedSymbol = false;
                                    break;
                                }
                            }
                            if (displacedSymbol) {
                                if (this._globalVariableAnalyzer.hasGlobalName(identifierNode.text)) {
                                    // If the displaced symbol is a global variable, then API Extractor simply ignores it.
                                    // Ambient declarations typically describe the runtime environment (provided by an API consumer),
                                    // so we don't bother analyzing them as an API contract.  (There are probably some packages
                                    // that include interesting global variables in their API, but API Extractor doesn't support
                                    // that yet; it would be a feature request.)
                                    if (this._messageRouter.showDiagnostics) {
                                        if (!this._alreadyWarnedGlobalNames.has(identifierNode.text)) {
                                            this._alreadyWarnedGlobalNames.add(identifierNode.text);
                                            this._messageRouter.logDiagnostic(`Ignoring reference to global variable "${identifierNode.text}"` +
                                                ` in ` +
                                                SourceFileLocationFormatter_1.SourceFileLocationFormatter.formatDeclaration(identifierNode));
                                        }
                                    }
                                }
                                else {
                                    // If you encounter this, please report a bug with a repro.  We're interested to know
                                    // how it can occur.
                                    throw new node_core_library_1.InternalError(`Unable to follow symbol for "${identifierNode.text}"`);
                                }
                            }
                            else {
                                referencedAstEntity = this._exportAnalyzer.fetchReferencedAstEntity(symbol, governingAstDeclaration.astSymbol.isExternal);
                                this._entitiesByNode.set(identifierNode, referencedAstEntity);
                            }
                        }
                        if (referencedAstEntity) {
                            governingAstDeclaration._notifyReferencedAstEntity(referencedAstEntity);
                        }
                    }
                }
                break;
            // Is this the identifier for the governingAstDeclaration?
            case ts.SyntaxKind.Identifier:
                {
                    const identifierNode = node;
                    if (!this._entitiesByNode.has(identifierNode)) {
                        const symbol = this._typeChecker.getSymbolAtLocation(identifierNode);
                        let referencedAstEntity = undefined;
                        if (symbol === governingAstDeclaration.astSymbol.followedSymbol) {
                            referencedAstEntity = this._fetchEntityForNode(identifierNode, governingAstDeclaration);
                        }
                        this._entitiesByNode.set(identifierNode, referencedAstEntity);
                    }
                }
                break;
            case ts.SyntaxKind.ImportType:
                {
                    const importTypeNode = node;
                    let referencedAstEntity = this._entitiesByNode.get(importTypeNode);
                    if (!this._entitiesByNode.has(importTypeNode)) {
                        referencedAstEntity = this._fetchEntityForNode(importTypeNode, governingAstDeclaration);
                        if (!referencedAstEntity) {
                            // This should never happen
                            throw new Error('Failed to fetch entity for import() type node: ' + importTypeNode.getText());
                        }
                        this._entitiesByNode.set(importTypeNode, referencedAstEntity);
                    }
                    if (referencedAstEntity) {
                        governingAstDeclaration._notifyReferencedAstEntity(referencedAstEntity);
                    }
                }
                break;
        }
        // Is this node declaring a new AstSymbol?
        const newGoverningAstDeclaration = this._fetchAstDeclaration(node, governingAstDeclaration.astSymbol.isExternal);
        for (const childNode of node.getChildren()) {
            this._analyzeChildTree(childNode, newGoverningAstDeclaration || governingAstDeclaration);
        }
    }
    _fetchEntityForNode(node, governingAstDeclaration) {
        let referencedAstEntity = this._entitiesByNode.get(node);
        if (!referencedAstEntity) {
            if (node.kind === ts.SyntaxKind.ImportType) {
                referencedAstEntity = this._exportAnalyzer.fetchReferencedAstEntityFromImportTypeNode(node, governingAstDeclaration.astSymbol.isExternal);
            }
            else {
                const symbol = this._typeChecker.getSymbolAtLocation(node);
                if (!symbol) {
                    throw new Error('Symbol not found for identifier: ' + node.getText());
                }
                referencedAstEntity = this._exportAnalyzer.fetchReferencedAstEntity(symbol, governingAstDeclaration.astSymbol.isExternal);
            }
            this._entitiesByNode.set(node, referencedAstEntity);
        }
        return referencedAstEntity;
    }
    _fetchAstDeclaration(node, isExternal) {
        if (!AstDeclaration_1.AstDeclaration.isSupportedSyntaxKind(node.kind)) {
            return undefined;
        }
        const symbol = TypeScriptHelpers_1.TypeScriptHelpers.getSymbolForDeclaration(node, this._typeChecker);
        if (!symbol) {
            throw new node_core_library_1.InternalError('Unable to find symbol for node');
        }
        const astSymbol = this._fetchAstSymbol({
            followedSymbol: symbol,
            isExternal: isExternal,
            includeNominalAnalysis: true,
            addIfMissing: true
        });
        if (!astSymbol) {
            return undefined;
        }
        const astDeclaration = this._astDeclarationsByDeclaration.get(node);
        if (!astDeclaration) {
            throw new node_core_library_1.InternalError('Unable to find constructed AstDeclaration');
        }
        return astDeclaration;
    }
    _fetchAstSymbol(options) {
        const followedSymbol = options.followedSymbol;
        // Filter out symbols representing constructs that we don't care about
        const arbitraryDeclaration = TypeScriptHelpers_1.TypeScriptHelpers.tryGetADeclaration(followedSymbol);
        if (!arbitraryDeclaration) {
            return undefined;
        }
        if (followedSymbol.flags &
            (ts.SymbolFlags.TypeParameter | ts.SymbolFlags.TypeLiteral | ts.SymbolFlags.Transient)) {
            if (!TypeScriptInternals_1.TypeScriptInternals.isLateBoundSymbol(followedSymbol)) {
                return undefined;
            }
        }
        // API Extractor doesn't analyze ambient declarations at all
        if (TypeScriptHelpers_1.TypeScriptHelpers.isAmbient(followedSymbol, this._typeChecker)) {
            // We make a special exemption for ambient declarations that appear in a source file containing
            // an "export=" declaration that allows them to be imported as non-ambient.
            if (!this._exportAnalyzer.isImportableAmbientSourceFile(arbitraryDeclaration.getSourceFile())) {
                return undefined;
            }
        }
        // Make sure followedSymbol isn't an alias for something else
        if (TypeScriptHelpers_1.TypeScriptHelpers.isFollowableAlias(followedSymbol, this._typeChecker)) {
            // We expect the caller to have already followed any aliases
            throw new node_core_library_1.InternalError('AstSymbolTable._fetchAstSymbol() cannot be called with a symbol alias');
        }
        let astSymbol = this._astSymbolsBySymbol.get(followedSymbol);
        if (!astSymbol) {
            // None of the above lookups worked, so create a new entry...
            let nominalAnalysis = false;
            if (options.isExternal) {
                // If the file is from an external package that does not support AEDoc, normally we ignore it completely.
                // But in some cases (e.g. checking star exports of an external package) we need an AstSymbol to
                // represent it, but we don't need to analyze its sibling/children.
                const followedSymbolSourceFileName = arbitraryDeclaration.getSourceFile().fileName;
                if (!this._packageMetadataManager.isAedocSupportedFor(followedSymbolSourceFileName)) {
                    nominalAnalysis = true;
                    if (!options.includeNominalAnalysis) {
                        return undefined;
                    }
                }
            }
            let parentAstSymbol = undefined;
            if (!nominalAnalysis) {
                for (const declaration of followedSymbol.declarations || []) {
                    if (!AstDeclaration_1.AstDeclaration.isSupportedSyntaxKind(declaration.kind)) {
                        throw new node_core_library_1.InternalError(`The "${followedSymbol.name}" symbol has a` +
                            ` ts.SyntaxKind.${ts.SyntaxKind[declaration.kind]} declaration which is not (yet?)` +
                            ` supported by API Extractor`);
                    }
                }
                // We always fetch the entire chain of parents for each declaration.
                // (Children/siblings are only analyzed on demand.)
                // Key assumptions behind this squirrely logic:
                //
                // IF a given symbol has two declarations D1 and D2; AND
                // If D1 has a parent P1, then
                // - D2 will also have a parent P2; AND
                // - P1 and P2's symbol will be the same
                // - but P1 and P2 may be different (e.g. merged namespaces containing merged interfaces)
                // Is there a parent AstSymbol?  First we check to see if there is a parent declaration:
                if (arbitraryDeclaration) {
                    const arbitraryParentDeclaration = this._tryFindFirstAstDeclarationParent(arbitraryDeclaration);
                    if (arbitraryParentDeclaration) {
                        const parentSymbol = TypeScriptHelpers_1.TypeScriptHelpers.getSymbolForDeclaration(arbitraryParentDeclaration, this._typeChecker);
                        parentAstSymbol = this._fetchAstSymbol({
                            followedSymbol: parentSymbol,
                            isExternal: options.isExternal,
                            includeNominalAnalysis: false,
                            addIfMissing: true
                        });
                        if (!parentAstSymbol) {
                            throw new node_core_library_1.InternalError('Unable to construct a parent AstSymbol for ' + followedSymbol.name);
                        }
                    }
                }
            }
            const localName = options.localName || AstSymbolTable.getLocalNameForSymbol(followedSymbol);
            astSymbol = new AstSymbol_1.AstSymbol({
                followedSymbol: followedSymbol,
                localName: localName,
                isExternal: options.isExternal,
                nominalAnalysis: nominalAnalysis,
                parentAstSymbol: parentAstSymbol,
                rootAstSymbol: parentAstSymbol ? parentAstSymbol.rootAstSymbol : undefined
            });
            this._astSymbolsBySymbol.set(followedSymbol, astSymbol);
            // Okay, now while creating the declarations we will wire them up to the
            // their corresponding parent declarations
            for (const declaration of followedSymbol.declarations || []) {
                let parentAstDeclaration = undefined;
                if (parentAstSymbol) {
                    const parentDeclaration = this._tryFindFirstAstDeclarationParent(declaration);
                    if (!parentDeclaration) {
                        throw new node_core_library_1.InternalError('Missing parent declaration');
                    }
                    parentAstDeclaration = this._astDeclarationsByDeclaration.get(parentDeclaration);
                    if (!parentAstDeclaration) {
                        throw new node_core_library_1.InternalError('Missing parent AstDeclaration');
                    }
                }
                const astDeclaration = new AstDeclaration_1.AstDeclaration({
                    declaration,
                    astSymbol,
                    parent: parentAstDeclaration
                });
                this._astDeclarationsByDeclaration.set(declaration, astDeclaration);
            }
        }
        if (options.isExternal !== astSymbol.isExternal) {
            throw new node_core_library_1.InternalError(`Cannot assign isExternal=${options.isExternal} for` +
                ` the symbol ${astSymbol.localName} because it was previously registered` +
                ` with isExternal=${astSymbol.isExternal}`);
        }
        return astSymbol;
    }
    /**
     * Returns the first parent satisfying isAstDeclaration(), or undefined if none is found.
     */
    _tryFindFirstAstDeclarationParent(node) {
        let currentNode = node.parent;
        while (currentNode) {
            if (AstDeclaration_1.AstDeclaration.isSupportedSyntaxKind(currentNode.kind)) {
                return currentNode;
            }
            currentNode = currentNode.parent;
        }
        return undefined;
    }
}
exports.AstSymbolTable = AstSymbolTable;
//# sourceMappingURL=AstSymbolTable.js.map