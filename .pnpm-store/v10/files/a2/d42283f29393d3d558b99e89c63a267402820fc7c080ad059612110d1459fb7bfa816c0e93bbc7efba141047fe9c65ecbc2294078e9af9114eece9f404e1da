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
exports.DeclarationReferenceGenerator = void 0;
/* eslint-disable no-bitwise */
const ts = __importStar(require("typescript"));
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const node_core_library_1 = require("@rushstack/node-core-library");
const TypeScriptHelpers_1 = require("../analyzer/TypeScriptHelpers");
const TypeScriptInternals_1 = require("../analyzer/TypeScriptInternals");
const AstNamespaceImport_1 = require("../analyzer/AstNamespaceImport");
class DeclarationReferenceGenerator {
    constructor(collector) {
        this._collector = collector;
    }
    /**
     * Gets the UID for a TypeScript Identifier that references a type.
     */
    getDeclarationReferenceForIdentifier(node) {
        const symbol = this._collector.typeChecker.getSymbolAtLocation(node);
        if (symbol !== undefined) {
            const isExpression = DeclarationReferenceGenerator._isInExpressionContext(node);
            return (this.getDeclarationReferenceForSymbol(symbol, isExpression ? ts.SymbolFlags.Value : ts.SymbolFlags.Type) ||
                this.getDeclarationReferenceForSymbol(symbol, isExpression ? ts.SymbolFlags.Type : ts.SymbolFlags.Value) ||
                this.getDeclarationReferenceForSymbol(symbol, ts.SymbolFlags.Namespace));
        }
    }
    /**
     * Gets the DeclarationReference for a TypeScript Symbol for a given meaning.
     */
    getDeclarationReferenceForSymbol(symbol, meaning) {
        return this._symbolToDeclarationReference(symbol, meaning, /*includeModuleSymbols*/ false);
    }
    static _isInExpressionContext(node) {
        switch (node.parent.kind) {
            case ts.SyntaxKind.TypeQuery:
            case ts.SyntaxKind.ComputedPropertyName:
                return true;
            case ts.SyntaxKind.QualifiedName:
                return DeclarationReferenceGenerator._isInExpressionContext(node.parent);
            default:
                return false;
        }
    }
    static _isExternalModuleSymbol(symbol) {
        return (!!(symbol.flags & ts.SymbolFlags.ValueModule) &&
            symbol.valueDeclaration !== undefined &&
            ts.isSourceFile(symbol.valueDeclaration));
    }
    static _isSameSymbol(left, right) {
        return (left === right ||
            !!(left &&
                left.valueDeclaration &&
                right.valueDeclaration &&
                left.valueDeclaration === right.valueDeclaration));
    }
    _getNavigationToSymbol(symbol) {
        const declaration = TypeScriptHelpers_1.TypeScriptHelpers.tryGetADeclaration(symbol);
        const sourceFile = declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile();
        const parent = TypeScriptInternals_1.TypeScriptInternals.getSymbolParent(symbol);
        // If it's global or from an external library, then use either Members or Exports. It's not possible for
        // global symbols or external library symbols to be Locals.
        const isGlobal = !!sourceFile && !ts.isExternalModule(sourceFile);
        const isFromExternalLibrary = !!sourceFile && this._collector.program.isSourceFileFromExternalLibrary(sourceFile);
        if (isGlobal || isFromExternalLibrary) {
            if (parent &&
                parent.members &&
                DeclarationReferenceGenerator._isSameSymbol(parent.members.get(symbol.escapedName), symbol)) {
                return DeclarationReference_1.Navigation.Members;
            }
            return DeclarationReference_1.Navigation.Exports;
        }
        // Otherwise, this symbol is from the current package. If we've found an associated consumable
        // `CollectorEntity`, then use Exports. We use `consumable` here instead of `exported` because
        // if the symbol is exported from a non-consumable `AstNamespaceImport`, we don't want to use
        // Exports. We should use Locals instead.
        const entity = this._collector.tryGetEntityForSymbol(symbol);
        if (entity === null || entity === void 0 ? void 0 : entity.consumable) {
            return DeclarationReference_1.Navigation.Exports;
        }
        // If its parent symbol is not a source file, then use either Exports or Members. If the parent symbol
        // is a source file, but it wasn't exported from the package entry point (in the check above), then the
        // symbol is a local, so fall through below.
        if (parent && !DeclarationReferenceGenerator._isExternalModuleSymbol(parent)) {
            if (parent.members &&
                DeclarationReferenceGenerator._isSameSymbol(parent.members.get(symbol.escapedName), symbol)) {
                return DeclarationReference_1.Navigation.Members;
            }
            return DeclarationReference_1.Navigation.Exports;
        }
        // Otherwise, we have a local symbol, so use a Locals navigation. These are either:
        //
        // 1. Symbols that are exported from a file module but not the package entry point.
        // 2. Symbols that are not exported from their parent module.
        return DeclarationReference_1.Navigation.Locals;
    }
    static _getMeaningOfSymbol(symbol, meaning) {
        if (symbol.flags & meaning & ts.SymbolFlags.Class) {
            return DeclarationReference_1.Meaning.Class;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Enum) {
            return DeclarationReference_1.Meaning.Enum;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Interface) {
            return DeclarationReference_1.Meaning.Interface;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.TypeAlias) {
            return DeclarationReference_1.Meaning.TypeAlias;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Function) {
            return DeclarationReference_1.Meaning.Function;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Variable) {
            return DeclarationReference_1.Meaning.Variable;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Module) {
            return DeclarationReference_1.Meaning.Namespace;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.ClassMember) {
            return DeclarationReference_1.Meaning.Member;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Constructor) {
            return DeclarationReference_1.Meaning.Constructor;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.EnumMember) {
            return DeclarationReference_1.Meaning.Member;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Signature) {
            if (symbol.escapedName === ts.InternalSymbolName.Call) {
                return DeclarationReference_1.Meaning.CallSignature;
            }
            if (symbol.escapedName === ts.InternalSymbolName.New) {
                return DeclarationReference_1.Meaning.ConstructSignature;
            }
            if (symbol.escapedName === ts.InternalSymbolName.Index) {
                return DeclarationReference_1.Meaning.IndexSignature;
            }
        }
        if (symbol.flags & meaning & ts.SymbolFlags.TypeParameter) {
            // This should have already been handled in `getDeclarationReferenceOfSymbol`.
            throw new node_core_library_1.InternalError('Not supported.');
        }
        return undefined;
    }
    _symbolToDeclarationReference(symbol, meaning, includeModuleSymbols) {
        const declaration = TypeScriptHelpers_1.TypeScriptHelpers.tryGetADeclaration(symbol);
        const sourceFile = declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile();
        let followedSymbol = symbol;
        if (followedSymbol.flags & ts.SymbolFlags.ExportValue) {
            followedSymbol = this._collector.typeChecker.getExportSymbolOfSymbol(followedSymbol);
        }
        if (followedSymbol.flags & ts.SymbolFlags.Alias) {
            followedSymbol = this._collector.typeChecker.getAliasedSymbol(followedSymbol);
            // Without this logic, we end up following the symbol `ns` in `import * as ns from './file'` to
            // the actual file `file.ts`. We don't want to do this, so revert to the original symbol.
            if (followedSymbol.flags & ts.SymbolFlags.ValueModule) {
                followedSymbol = symbol;
            }
        }
        if (DeclarationReferenceGenerator._isExternalModuleSymbol(followedSymbol)) {
            if (!includeModuleSymbols) {
                return undefined;
            }
            return new DeclarationReference_1.DeclarationReference(this._sourceFileToModuleSource(sourceFile));
        }
        // Do not generate a declaration reference for a type parameter.
        if (followedSymbol.flags & ts.SymbolFlags.TypeParameter) {
            return undefined;
        }
        let parentRef = this._getParentReference(followedSymbol);
        if (!parentRef) {
            return undefined;
        }
        let localName = followedSymbol.name;
        const entity = this._collector.tryGetEntityForSymbol(followedSymbol);
        if (entity === null || entity === void 0 ? void 0 : entity.nameForEmit) {
            localName = entity.nameForEmit;
        }
        if (followedSymbol.escapedName === ts.InternalSymbolName.Constructor) {
            localName = 'constructor';
        }
        else {
            const wellKnownName = TypeScriptHelpers_1.TypeScriptHelpers.tryDecodeWellKnownSymbolName(followedSymbol.escapedName);
            if (wellKnownName) {
                // TypeScript binds well-known ECMAScript symbols like 'Symbol.iterator' as '__@iterator'.
                // This converts a string like '__@iterator' into the property name '[Symbol.iterator]'.
                localName = wellKnownName;
            }
            else if (TypeScriptHelpers_1.TypeScriptHelpers.isUniqueSymbolName(followedSymbol.escapedName)) {
                for (const decl of followedSymbol.declarations || []) {
                    const declName = ts.getNameOfDeclaration(decl);
                    if (declName && ts.isComputedPropertyName(declName)) {
                        const lateName = TypeScriptHelpers_1.TypeScriptHelpers.tryGetLateBoundName(declName);
                        if (lateName !== undefined) {
                            localName = lateName;
                            break;
                        }
                    }
                }
            }
        }
        const navigation = this._getNavigationToSymbol(followedSymbol);
        // If the symbol is a global, ensure the source is global.
        if (sourceFile && !ts.isExternalModule(sourceFile) && parentRef.source !== DeclarationReference_1.GlobalSource.instance) {
            parentRef = new DeclarationReference_1.DeclarationReference(DeclarationReference_1.GlobalSource.instance);
        }
        return parentRef
            .addNavigationStep(navigation, localName)
            .withMeaning(DeclarationReferenceGenerator._getMeaningOfSymbol(followedSymbol, meaning));
    }
    _getParentReference(symbol) {
        var _a;
        const declaration = TypeScriptHelpers_1.TypeScriptHelpers.tryGetADeclaration(symbol);
        const sourceFile = declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile();
        // Note that it's possible for a symbol to be exported from an entry point as well as one or more
        // namespaces. In that case, it's not clear what to choose as its parent. Today's logic is neither
        // perfect nor particularly stable to API items being renamed and shuffled around.
        const entity = this._collector.tryGetEntityForSymbol(symbol);
        if (entity) {
            if (entity.exportedFromEntryPoint) {
                return new DeclarationReference_1.DeclarationReference(this._sourceFileToModuleSource(sourceFile));
            }
            const firstExportingConsumableParent = entity.getFirstExportingConsumableParent();
            if (firstExportingConsumableParent &&
                firstExportingConsumableParent.astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
                const parentSymbol = TypeScriptInternals_1.TypeScriptInternals.tryGetSymbolForDeclaration(firstExportingConsumableParent.astEntity.declaration, this._collector.typeChecker);
                if (parentSymbol) {
                    return this._symbolToDeclarationReference(parentSymbol, parentSymbol.flags, 
                    /*includeModuleSymbols*/ true);
                }
            }
        }
        // Next, try to find a parent symbol via the symbol tree.
        const parentSymbol = TypeScriptInternals_1.TypeScriptInternals.getSymbolParent(symbol);
        if (parentSymbol) {
            return this._symbolToDeclarationReference(parentSymbol, parentSymbol.flags, 
            /*includeModuleSymbols*/ true);
        }
        // If that doesn't work, try to find a parent symbol via the node tree. As far as we can tell,
        // this logic is only needed for local symbols within namespaces. For example:
        //
        // ```
        // export namespace n {
        //   type SomeType = number;
        //   export function someFunction(): SomeType { return 5; }
        // }
        // ```
        //
        // In the example above, `SomeType` doesn't have a parent symbol per the TS internal API above,
        // but its reference still needs to be qualified with the parent reference for `n`.
        const grandParent = (_a = declaration === null || declaration === void 0 ? void 0 : declaration.parent) === null || _a === void 0 ? void 0 : _a.parent;
        if (grandParent && ts.isModuleDeclaration(grandParent)) {
            const grandParentSymbol = TypeScriptInternals_1.TypeScriptInternals.tryGetSymbolForDeclaration(grandParent, this._collector.typeChecker);
            if (grandParentSymbol) {
                return this._symbolToDeclarationReference(grandParentSymbol, grandParentSymbol.flags, 
                /*includeModuleSymbols*/ true);
            }
        }
        // At this point, we have a local symbol in a module.
        if (sourceFile && ts.isExternalModule(sourceFile)) {
            return new DeclarationReference_1.DeclarationReference(this._sourceFileToModuleSource(sourceFile));
        }
        else {
            return new DeclarationReference_1.DeclarationReference(DeclarationReference_1.GlobalSource.instance);
        }
    }
    _getPackageName(sourceFile) {
        if (this._collector.program.isSourceFileFromExternalLibrary(sourceFile)) {
            const packageJson = this._collector.packageJsonLookup.tryLoadNodePackageJsonFor(sourceFile.fileName);
            if (packageJson && packageJson.name) {
                return packageJson.name;
            }
            return DeclarationReferenceGenerator.unknownReference;
        }
        return this._collector.workingPackage.name;
    }
    _sourceFileToModuleSource(sourceFile) {
        if (sourceFile && ts.isExternalModule(sourceFile)) {
            const packageName = this._getPackageName(sourceFile);
            if (this._collector.bundledPackageNames.has(packageName)) {
                // The api-extractor.json config file has a "bundledPackages" setting, which causes imports from
                // certain NPM packages to be treated as part of the working project.  In this case, we need to
                // substitute the working package name.
                return new DeclarationReference_1.ModuleSource(this._collector.workingPackage.name);
            }
            else {
                return new DeclarationReference_1.ModuleSource(packageName);
            }
        }
        return DeclarationReference_1.GlobalSource.instance;
    }
}
exports.DeclarationReferenceGenerator = DeclarationReferenceGenerator;
DeclarationReferenceGenerator.unknownReference = '?';
//# sourceMappingURL=DeclarationReferenceGenerator.js.map