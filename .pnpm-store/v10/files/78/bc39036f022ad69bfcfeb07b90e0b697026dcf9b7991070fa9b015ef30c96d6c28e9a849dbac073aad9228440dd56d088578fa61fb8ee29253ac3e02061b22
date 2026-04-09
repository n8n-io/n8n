// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/* eslint-disable no-bitwise */
import * as ts from 'typescript';
import { DeclarationReference, ModuleSource, GlobalSource, Navigation, Meaning } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { InternalError } from '@rushstack/node-core-library';
import { TypeScriptHelpers } from '../analyzer/TypeScriptHelpers';
import { TypeScriptInternals } from '../analyzer/TypeScriptInternals';
import { AstNamespaceImport } from '../analyzer/AstNamespaceImport';
export class DeclarationReferenceGenerator {
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
        const declaration = TypeScriptHelpers.tryGetADeclaration(symbol);
        const sourceFile = declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile();
        const parent = TypeScriptInternals.getSymbolParent(symbol);
        // If it's global or from an external library, then use either Members or Exports. It's not possible for
        // global symbols or external library symbols to be Locals.
        const isGlobal = !!sourceFile && !ts.isExternalModule(sourceFile);
        const isFromExternalLibrary = !!sourceFile && this._collector.program.isSourceFileFromExternalLibrary(sourceFile);
        if (isGlobal || isFromExternalLibrary) {
            if (parent &&
                parent.members &&
                DeclarationReferenceGenerator._isSameSymbol(parent.members.get(symbol.escapedName), symbol)) {
                return Navigation.Members;
            }
            return Navigation.Exports;
        }
        // Otherwise, this symbol is from the current package. If we've found an associated consumable
        // `CollectorEntity`, then use Exports. We use `consumable` here instead of `exported` because
        // if the symbol is exported from a non-consumable `AstNamespaceImport`, we don't want to use
        // Exports. We should use Locals instead.
        const entity = this._collector.tryGetEntityForSymbol(symbol);
        if (entity === null || entity === void 0 ? void 0 : entity.consumable) {
            return Navigation.Exports;
        }
        // If its parent symbol is not a source file, then use either Exports or Members. If the parent symbol
        // is a source file, but it wasn't exported from the package entry point (in the check above), then the
        // symbol is a local, so fall through below.
        if (parent && !DeclarationReferenceGenerator._isExternalModuleSymbol(parent)) {
            if (parent.members &&
                DeclarationReferenceGenerator._isSameSymbol(parent.members.get(symbol.escapedName), symbol)) {
                return Navigation.Members;
            }
            return Navigation.Exports;
        }
        // Otherwise, we have a local symbol, so use a Locals navigation. These are either:
        //
        // 1. Symbols that are exported from a file module but not the package entry point.
        // 2. Symbols that are not exported from their parent module.
        return Navigation.Locals;
    }
    static _getMeaningOfSymbol(symbol, meaning) {
        if (symbol.flags & meaning & ts.SymbolFlags.Class) {
            return Meaning.Class;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Enum) {
            return Meaning.Enum;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Interface) {
            return Meaning.Interface;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.TypeAlias) {
            return Meaning.TypeAlias;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Function) {
            return Meaning.Function;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Variable) {
            return Meaning.Variable;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Module) {
            return Meaning.Namespace;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.ClassMember) {
            return Meaning.Member;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Constructor) {
            return Meaning.Constructor;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.EnumMember) {
            return Meaning.Member;
        }
        if (symbol.flags & meaning & ts.SymbolFlags.Signature) {
            if (symbol.escapedName === ts.InternalSymbolName.Call) {
                return Meaning.CallSignature;
            }
            if (symbol.escapedName === ts.InternalSymbolName.New) {
                return Meaning.ConstructSignature;
            }
            if (symbol.escapedName === ts.InternalSymbolName.Index) {
                return Meaning.IndexSignature;
            }
        }
        if (symbol.flags & meaning & ts.SymbolFlags.TypeParameter) {
            // This should have already been handled in `getDeclarationReferenceOfSymbol`.
            throw new InternalError('Not supported.');
        }
        return undefined;
    }
    _symbolToDeclarationReference(symbol, meaning, includeModuleSymbols) {
        const declaration = TypeScriptHelpers.tryGetADeclaration(symbol);
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
            return new DeclarationReference(this._sourceFileToModuleSource(sourceFile));
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
            const wellKnownName = TypeScriptHelpers.tryDecodeWellKnownSymbolName(followedSymbol.escapedName);
            if (wellKnownName) {
                // TypeScript binds well-known ECMAScript symbols like 'Symbol.iterator' as '__@iterator'.
                // This converts a string like '__@iterator' into the property name '[Symbol.iterator]'.
                localName = wellKnownName;
            }
            else if (TypeScriptHelpers.isUniqueSymbolName(followedSymbol.escapedName)) {
                for (const decl of followedSymbol.declarations || []) {
                    const declName = ts.getNameOfDeclaration(decl);
                    if (declName && ts.isComputedPropertyName(declName)) {
                        const lateName = TypeScriptHelpers.tryGetLateBoundName(declName);
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
        if (sourceFile && !ts.isExternalModule(sourceFile) && parentRef.source !== GlobalSource.instance) {
            parentRef = new DeclarationReference(GlobalSource.instance);
        }
        return parentRef
            .addNavigationStep(navigation, localName)
            .withMeaning(DeclarationReferenceGenerator._getMeaningOfSymbol(followedSymbol, meaning));
    }
    _getParentReference(symbol) {
        var _a;
        const declaration = TypeScriptHelpers.tryGetADeclaration(symbol);
        const sourceFile = declaration === null || declaration === void 0 ? void 0 : declaration.getSourceFile();
        // Note that it's possible for a symbol to be exported from an entry point as well as one or more
        // namespaces. In that case, it's not clear what to choose as its parent. Today's logic is neither
        // perfect nor particularly stable to API items being renamed and shuffled around.
        const entity = this._collector.tryGetEntityForSymbol(symbol);
        if (entity) {
            if (entity.exportedFromEntryPoint) {
                return new DeclarationReference(this._sourceFileToModuleSource(sourceFile));
            }
            const firstExportingConsumableParent = entity.getFirstExportingConsumableParent();
            if (firstExportingConsumableParent &&
                firstExportingConsumableParent.astEntity instanceof AstNamespaceImport) {
                const parentSymbol = TypeScriptInternals.tryGetSymbolForDeclaration(firstExportingConsumableParent.astEntity.declaration, this._collector.typeChecker);
                if (parentSymbol) {
                    return this._symbolToDeclarationReference(parentSymbol, parentSymbol.flags, 
                    /*includeModuleSymbols*/ true);
                }
            }
        }
        // Next, try to find a parent symbol via the symbol tree.
        const parentSymbol = TypeScriptInternals.getSymbolParent(symbol);
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
            const grandParentSymbol = TypeScriptInternals.tryGetSymbolForDeclaration(grandParent, this._collector.typeChecker);
            if (grandParentSymbol) {
                return this._symbolToDeclarationReference(grandParentSymbol, grandParentSymbol.flags, 
                /*includeModuleSymbols*/ true);
            }
        }
        // At this point, we have a local symbol in a module.
        if (sourceFile && ts.isExternalModule(sourceFile)) {
            return new DeclarationReference(this._sourceFileToModuleSource(sourceFile));
        }
        else {
            return new DeclarationReference(GlobalSource.instance);
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
                return new ModuleSource(this._collector.workingPackage.name);
            }
            else {
                return new ModuleSource(packageName);
            }
        }
        return GlobalSource.instance;
    }
}
DeclarationReferenceGenerator.unknownReference = '?';
//# sourceMappingURL=DeclarationReferenceGenerator.js.map