// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as ts from 'typescript';
import { InternalError } from '@rushstack/node-core-library';
import { TypeScriptHelpers } from './TypeScriptHelpers';
import { AstSymbol } from './AstSymbol';
import { AstImport, AstImportKind } from './AstImport';
import { AstModule } from './AstModule';
import { TypeScriptInternals } from './TypeScriptInternals';
import { SourceFileLocationFormatter } from './SourceFileLocationFormatter';
import { AstNamespaceImport } from './AstNamespaceImport';
import { SyntaxHelpers } from './SyntaxHelpers';
import { AstNamespaceExport } from './AstNamespaceExport';
/**
 * The ExportAnalyzer is an internal part of AstSymbolTable that has been moved out into its own source file
 * because it is a complex and mostly self-contained algorithm.
 *
 * Its job is to build up AstModule objects by crawling import statements to discover where declarations come from.
 * This is conceptually the same as the compiler's own TypeChecker.getExportsOfModule(), except that when
 * ExportAnalyzer encounters a declaration that was imported from an external package, it remembers how it was imported
 * (i.e. the AstImport object).  Today the compiler API does not expose this information, which is crucial for
 * generating .d.ts rollups.
 */
export class ExportAnalyzer {
    constructor(program, typeChecker, bundledPackageNames, astSymbolTable) {
        this._astModulesByModuleSymbol = new Map();
        // Used with isImportableAmbientSourceFile()
        this._importableAmbientSourceFiles = new Set();
        this._astImportsByKey = new Map();
        this._astNamespaceImportByModule = new Map();
        this._program = program;
        this._typeChecker = typeChecker;
        this._bundledPackageNames = bundledPackageNames;
        this._astSymbolTable = astSymbolTable;
    }
    /**
     * For a given source file, this analyzes all of its exports and produces an AstModule object.
     *
     * @param moduleReference - contextual information about the import statement that took us to this source file.
     * or `undefined` if this source file is the initial entry point
     * @param isExternal - whether the given `moduleReference` is external.
     */
    fetchAstModuleFromSourceFile(sourceFile, moduleReference, isExternal) {
        const moduleSymbol = this._getModuleSymbolFromSourceFile(sourceFile, moduleReference);
        // Don't traverse into a module that we already processed before:
        // The compiler allows m1 to have "export * from 'm2'" and "export * from 'm3'",
        // even if m2 and m3 both have "export * from 'm4'".
        let astModule = this._astModulesByModuleSymbol.get(moduleSymbol);
        if (!astModule) {
            // (If moduleReference === undefined, then this is the entry point of the local project being analyzed.)
            const externalModulePath = moduleReference !== undefined && isExternal ? moduleReference.moduleSpecifier : undefined;
            astModule = new AstModule({ sourceFile, moduleSymbol, externalModulePath });
            this._astModulesByModuleSymbol.set(moduleSymbol, astModule);
            if (astModule.isExternal) {
                // It's an external package, so do the special simplified analysis that doesn't crawl into referenced modules
                for (const exportedSymbol of this._typeChecker.getExportsOfModule(moduleSymbol)) {
                    if (externalModulePath === undefined) {
                        throw new InternalError('Failed assertion: externalModulePath=undefined but astModule.isExternal=true');
                    }
                    const followedSymbol = TypeScriptHelpers.followAliases(exportedSymbol, this._typeChecker);
                    // Ignore virtual symbols that don't have any declarations
                    const arbitraryDeclaration = TypeScriptHelpers.tryGetADeclaration(followedSymbol);
                    if (arbitraryDeclaration) {
                        const astSymbol = this._astSymbolTable.fetchAstSymbol({
                            followedSymbol: followedSymbol,
                            isExternal: astModule.isExternal,
                            includeNominalAnalysis: true,
                            addIfMissing: true
                        });
                        if (!astSymbol) {
                            throw new Error(`Unsupported export ${JSON.stringify(exportedSymbol.name)}:\n` +
                                SourceFileLocationFormatter.formatDeclaration(arbitraryDeclaration));
                        }
                        astModule.cachedExportedEntities.set(exportedSymbol.name, astSymbol);
                    }
                }
            }
            else {
                // The module is part of the local project, so do the full analysis
                if (moduleSymbol.exports) {
                    // The "export * from 'module-name';" declarations are all attached to a single virtual symbol
                    // whose name is InternalSymbolName.ExportStar
                    const exportStarSymbol = moduleSymbol.exports.get(ts.InternalSymbolName.ExportStar);
                    if (exportStarSymbol) {
                        for (const exportStarDeclaration of exportStarSymbol.getDeclarations() || []) {
                            if (ts.isExportDeclaration(exportStarDeclaration)) {
                                const starExportedModule = this._fetchSpecifierAstModule(exportStarDeclaration, exportStarSymbol);
                                if (starExportedModule !== undefined) {
                                    astModule.starExportedModules.add(starExportedModule);
                                }
                            }
                            else {
                                // Ignore ExportDeclaration nodes that don't match the expected pattern
                                // TODO: Should we report a warning?
                            }
                        }
                    }
                }
            }
        }
        return astModule;
    }
    /**
     * Retrieves the symbol for the module corresponding to the ts.SourceFile that is being imported/exported.
     *
     * @remarks
     * The `module` keyword can be used to declare multiple TypeScript modules inside a single source file.
     * (This is a deprecated construct and mainly used for typings such as `@types/node`.)  In this situation,
     * `moduleReference` helps us to fish out the correct module symbol.
     */
    _getModuleSymbolFromSourceFile(sourceFile, moduleReference) {
        const moduleSymbol = TypeScriptInternals.tryGetSymbolForDeclaration(sourceFile, this._typeChecker);
        if (moduleSymbol !== undefined) {
            // This is the normal case.  The SourceFile acts is a module and has a symbol.
            return moduleSymbol;
        }
        if (moduleReference !== undefined) {
            // But there is also an elaborate case where the source file contains one or more "module" declarations,
            // and our moduleReference took us to one of those.
            // eslint-disable-next-line no-bitwise
            if ((moduleReference.moduleSpecifierSymbol.flags & ts.SymbolFlags.Alias) !== 0) {
                // Follow the import/export declaration to one hop the exported item inside the target module
                let followedSymbol = TypeScriptInternals.getImmediateAliasedSymbol(moduleReference.moduleSpecifierSymbol, this._typeChecker);
                if (followedSymbol === undefined) {
                    // This is a workaround for a compiler bug where getImmediateAliasedSymbol() sometimes returns undefined
                    followedSymbol = this._typeChecker.getAliasedSymbol(moduleReference.moduleSpecifierSymbol);
                }
                if (followedSymbol !== undefined && followedSymbol !== moduleReference.moduleSpecifierSymbol) {
                    // The parent of the exported symbol will be the module that we're importing from
                    const parent = TypeScriptInternals.getSymbolParent(followedSymbol);
                    if (parent !== undefined) {
                        // Make sure the thing we found is a module
                        // eslint-disable-next-line no-bitwise
                        if ((parent.flags & ts.SymbolFlags.ValueModule) !== 0) {
                            // Record that that this is an ambient module that can also be imported from
                            this._importableAmbientSourceFiles.add(sourceFile);
                            return parent;
                        }
                    }
                }
            }
        }
        throw new InternalError('Unable to determine module for: ' + sourceFile.fileName);
    }
    /**
     * Implementation of {@link AstSymbolTable.fetchAstModuleExportInfo}.
     */
    fetchAstModuleExportInfo(entryPointAstModule) {
        if (entryPointAstModule.isExternal) {
            throw new Error('fetchAstModuleExportInfo() is not supported for external modules');
        }
        if (entryPointAstModule.astModuleExportInfo === undefined) {
            const astModuleExportInfo = {
                visitedAstModules: new Set(),
                exportedLocalEntities: new Map(),
                starExportedExternalModules: new Set()
            };
            this._collectAllExportsRecursive(astModuleExportInfo, entryPointAstModule);
            entryPointAstModule.astModuleExportInfo = astModuleExportInfo;
        }
        return entryPointAstModule.astModuleExportInfo;
    }
    /**
     * Returns true if the module specifier refers to an external package.  Ignores packages listed in the
     * "bundledPackages" setting from the api-extractor.json config file.
     */
    _isExternalModulePath(importOrExportDeclaration, moduleSpecifier) {
        var _a;
        let specifier = ts.isImportTypeNode(importOrExportDeclaration)
            ? importOrExportDeclaration.argument
            : importOrExportDeclaration.moduleSpecifier;
        if (specifier && ts.isLiteralTypeNode(specifier)) {
            specifier = specifier.literal;
        }
        const mode = specifier && ts.isStringLiteralLike(specifier)
            ? TypeScriptInternals.getModeForUsageLocation(importOrExportDeclaration.getSourceFile(), specifier, this._program.getCompilerOptions())
            : undefined;
        const resolvedModule = TypeScriptInternals.getResolvedModule(this._program, importOrExportDeclaration.getSourceFile(), moduleSpecifier, mode);
        if (resolvedModule === undefined) {
            // The TS compiler API `getResolvedModule` cannot resolve ambient modules. Thus, to match API Extractor's
            // previous behavior, simply treat all ambient modules as external. This bug is tracked by
            // https://github.com/microsoft/rushstack/issues/3335.
            return true;
        }
        // Either something like `jquery` or `@microsoft/api-extractor`.
        const packageName = (_a = resolvedModule.packageId) === null || _a === void 0 ? void 0 : _a.name;
        if (packageName !== undefined && this._bundledPackageNames.has(packageName)) {
            return false;
        }
        if (resolvedModule.isExternalLibraryImport === undefined) {
            // This presumably means the compiler couldn't figure out whether the module was external, but we're not
            // sure how this can happen.
            throw new InternalError(`Cannot determine whether the module ${JSON.stringify(moduleSpecifier)} is external\n` +
                SourceFileLocationFormatter.formatDeclaration(importOrExportDeclaration));
        }
        return resolvedModule.isExternalLibraryImport;
    }
    /**
     * Returns true if when we analyzed sourceFile, we found that it contains an "export=" statement that allows
     * it to behave /either/ as an ambient module /or/ as a regular importable module.  In this case,
     * `AstSymbolTable._fetchAstSymbol()` will analyze its symbols even though `TypeScriptHelpers.isAmbient()`
     * returns true.
     */
    isImportableAmbientSourceFile(sourceFile) {
        return this._importableAmbientSourceFiles.has(sourceFile);
    }
    _collectAllExportsRecursive(astModuleExportInfo, astModule) {
        const { visitedAstModules, starExportedExternalModules, exportedLocalEntities } = astModuleExportInfo;
        if (visitedAstModules.has(astModule)) {
            return;
        }
        visitedAstModules.add(astModule);
        if (astModule.isExternal) {
            starExportedExternalModules.add(astModule);
        }
        else {
            // Fetch each of the explicit exports for this module
            if (astModule.moduleSymbol.exports) {
                astModule.moduleSymbol.exports.forEach((exportSymbol, exportName) => {
                    switch (exportName) {
                        case ts.InternalSymbolName.ExportStar:
                        case ts.InternalSymbolName.ExportEquals:
                            break;
                        default:
                            // Don't collect the "export default" symbol unless this is the entry point module
                            if (exportName !== ts.InternalSymbolName.Default || visitedAstModules.size === 1) {
                                if (!exportedLocalEntities.has(exportSymbol.name)) {
                                    const astEntity = this._getExportOfAstModule(exportSymbol.name, astModule);
                                    if (astEntity instanceof AstSymbol && !astEntity.isExternal) {
                                        this._astSymbolTable.analyze(astEntity);
                                    }
                                    if (astEntity instanceof AstNamespaceImport && !astEntity.astModule.isExternal) {
                                        this._astSymbolTable.analyze(astEntity);
                                    }
                                    exportedLocalEntities.set(exportSymbol.name, astEntity);
                                }
                            }
                            break;
                    }
                });
            }
            for (const starExportedModule of astModule.starExportedModules) {
                this._collectAllExportsRecursive(astModuleExportInfo, starExportedModule);
            }
        }
    }
    /**
     * For a given symbol (which was encountered in the specified sourceFile), this fetches the AstEntity that it
     * refers to.  For example, if a particular interface describes the return value of a function, this API can help
     * us determine a TSDoc declaration reference for that symbol (if the symbol is exported).
     */
    fetchReferencedAstEntity(symbol, referringModuleIsExternal) {
        // eslint-disable-next-line no-bitwise
        if ((symbol.flags & ts.SymbolFlags.FunctionScopedVariable) !== 0) {
            // If a symbol refers back to part of its own definition, don't follow that rabbit hole
            // Example:
            //
            // function f(x: number): typeof x {
            //    return 123;
            // }
            return undefined;
        }
        let current = symbol;
        if (referringModuleIsExternal) {
            current = TypeScriptHelpers.followAliases(symbol, this._typeChecker);
        }
        else {
            for (;;) {
                // Is this symbol an import/export that we need to follow to find the real declaration?
                for (const declaration of current.declarations || []) {
                    let matchedAstEntity;
                    matchedAstEntity = this._tryMatchExportDeclaration(declaration, current);
                    if (matchedAstEntity !== undefined) {
                        return matchedAstEntity;
                    }
                    matchedAstEntity = this._tryMatchImportDeclaration(declaration, current);
                    if (matchedAstEntity !== undefined) {
                        return matchedAstEntity;
                    }
                }
                // eslint-disable-next-line no-bitwise
                if (!(current.flags & ts.SymbolFlags.Alias)) {
                    break;
                }
                const currentAlias = TypeScriptInternals.getImmediateAliasedSymbol(current, this._typeChecker);
                // Stop if we reach the end of the chain
                if (!currentAlias || currentAlias === current) {
                    break;
                }
                current = currentAlias;
            }
        }
        // Otherwise, assume it is a normal declaration
        const astSymbol = this._astSymbolTable.fetchAstSymbol({
            followedSymbol: current,
            isExternal: referringModuleIsExternal,
            includeNominalAnalysis: false,
            addIfMissing: true
        });
        return astSymbol;
    }
    fetchReferencedAstEntityFromImportTypeNode(node, referringModuleIsExternal) {
        const externalModulePath = this._tryGetExternalModulePath(node);
        if (externalModulePath) {
            let exportName;
            if (node.qualifier) {
                // Example input:
                //   import('api-extractor-lib1-test').Lib1GenericType<number>
                //
                // Extracted qualifier:
                //   Lib1GenericType
                exportName = node.qualifier.getText().trim();
            }
            else {
                // Example input:
                //   import('api-extractor-lib1-test')
                //
                // Extracted qualifier:
                //   apiExtractorLib1Test
                exportName = SyntaxHelpers.makeCamelCaseIdentifier(externalModulePath);
            }
            return this._fetchAstImport(undefined, {
                importKind: AstImportKind.ImportType,
                exportName: exportName,
                modulePath: externalModulePath,
                isTypeOnly: false
            });
        }
        // Internal reference: AstSymbol
        const rightMostToken = node.qualifier
            ? node.qualifier.kind === ts.SyntaxKind.QualifiedName
                ? node.qualifier.right
                : node.qualifier
            : node;
        // There is no symbol property in a ImportTypeNode, obtain the associated export symbol
        const exportSymbol = this._typeChecker.getSymbolAtLocation(rightMostToken);
        if (!exportSymbol) {
            throw new InternalError(`Symbol not found for identifier: ${node.getText()}\n` +
                SourceFileLocationFormatter.formatDeclaration(node));
        }
        let followedSymbol = exportSymbol;
        for (;;) {
            const referencedAstEntity = this.fetchReferencedAstEntity(followedSymbol, referringModuleIsExternal);
            if (referencedAstEntity) {
                return referencedAstEntity;
            }
            const followedSymbolNode = followedSymbol.declarations && followedSymbol.declarations[0];
            if (followedSymbolNode && followedSymbolNode.kind === ts.SyntaxKind.ImportType) {
                return this.fetchReferencedAstEntityFromImportTypeNode(followedSymbolNode, referringModuleIsExternal);
            }
            // eslint-disable-next-line no-bitwise
            if (!(followedSymbol.flags & ts.SymbolFlags.Alias)) {
                break;
            }
            const currentAlias = this._typeChecker.getAliasedSymbol(followedSymbol);
            if (!currentAlias || currentAlias === followedSymbol) {
                break;
            }
            followedSymbol = currentAlias;
        }
        const astSymbol = this._astSymbolTable.fetchAstSymbol({
            followedSymbol: followedSymbol,
            isExternal: referringModuleIsExternal,
            includeNominalAnalysis: false,
            addIfMissing: true
        });
        return astSymbol;
    }
    _tryMatchExportDeclaration(declaration, declarationSymbol) {
        const exportDeclaration = TypeScriptHelpers.findFirstParent(declaration, ts.SyntaxKind.ExportDeclaration);
        if (exportDeclaration) {
            let exportName = undefined;
            if (declaration.kind === ts.SyntaxKind.ExportSpecifier) {
                // EXAMPLE:
                // "export { A } from './file-a';"
                //
                // ExportDeclaration:
                //   ExportKeyword:  pre=[export] sep=[ ]
                //   NamedExports:
                //     FirstPunctuation:  pre=[{] sep=[ ]
                //     SyntaxList:
                //       ExportSpecifier:  <------------- declaration
                //         Identifier:  pre=[A] sep=[ ]
                //     CloseBraceToken:  pre=[}] sep=[ ]
                //   FromKeyword:  pre=[from] sep=[ ]
                //   StringLiteral:  pre=['./file-a']
                //   SemicolonToken:  pre=[;]
                // Example: " ExportName as RenamedName"
                const exportSpecifier = declaration;
                exportName = (exportSpecifier.propertyName || exportSpecifier.name).getText().trim();
            }
            else if (declaration.kind === ts.SyntaxKind.NamespaceExport) {
                // EXAMPLE:
                // "export * as theLib from 'the-lib';"
                //
                // ExportDeclaration:
                //   ExportKeyword:  pre=[export] sep=[ ]
                //   NamespaceExport:
                //     AsteriskToken:  pre=[*] sep=[ ]
                //     AsKeyword:  pre=[as] sep=[ ]
                //     Identifier:  pre=[theLib] sep=[ ]
                //   FromKeyword:  pre=[from] sep=[ ]
                //   StringLiteral:  pre=['the-lib']
                //   SemicolonToken:  pre=[;]
                // Issue tracking this feature: https://github.com/microsoft/rushstack/issues/2780
                const astModule = this._fetchSpecifierAstModule(exportDeclaration, declarationSymbol);
                return this._getAstNamespaceExport(astModule, declarationSymbol, declaration);
            }
            else {
                throw new InternalError(`Unimplemented export declaration kind: ${declaration.getText()}\n` +
                    SourceFileLocationFormatter.formatDeclaration(declaration));
            }
            // Ignore "export { A }" without a module specifier
            if (exportDeclaration.moduleSpecifier) {
                const externalModulePath = this._tryGetExternalModulePath(exportDeclaration);
                if (externalModulePath !== undefined) {
                    return this._fetchAstImport(declarationSymbol, {
                        importKind: AstImportKind.NamedImport,
                        modulePath: externalModulePath,
                        exportName: exportName,
                        isTypeOnly: false
                    });
                }
                return this._getExportOfSpecifierAstModule(exportName, exportDeclaration, declarationSymbol);
            }
        }
        return undefined;
    }
    _getAstNamespaceExport(astModule, declarationSymbol, declaration) {
        const imoprtNamespace = this._getAstNamespaceImport(astModule, declarationSymbol, declaration);
        return new AstNamespaceExport({
            namespaceName: imoprtNamespace.localName,
            astModule: astModule,
            declaration,
            symbol: declarationSymbol
        });
    }
    _tryMatchImportDeclaration(declaration, declarationSymbol) {
        const importDeclaration = TypeScriptHelpers.findFirstParent(declaration, ts.SyntaxKind.ImportDeclaration);
        if (importDeclaration) {
            const externalModulePath = this._tryGetExternalModulePath(importDeclaration);
            if (declaration.kind === ts.SyntaxKind.NamespaceImport) {
                // EXAMPLE:
                // "import * as theLib from 'the-lib';"
                //
                // ImportDeclaration:
                //   ImportKeyword:  pre=[import] sep=[ ]
                //   ImportClause:
                //     NamespaceImport:  <------------- declaration
                //       AsteriskToken:  pre=[*] sep=[ ]
                //       AsKeyword:  pre=[as] sep=[ ]
                //       Identifier:  pre=[theLib] sep=[ ]
                //   FromKeyword:  pre=[from] sep=[ ]
                //   StringLiteral:  pre=['the-lib']
                //   SemicolonToken:  pre=[;]
                if (externalModulePath === undefined) {
                    const astModule = this._fetchSpecifierAstModule(importDeclaration, declarationSymbol);
                    return this._getAstNamespaceImport(astModule, declarationSymbol, declaration);
                }
                // Here importSymbol=undefined because {@inheritDoc} and such are not going to work correctly for
                // a package or source file.
                return this._fetchAstImport(undefined, {
                    importKind: AstImportKind.StarImport,
                    exportName: declarationSymbol.name,
                    modulePath: externalModulePath,
                    isTypeOnly: ExportAnalyzer._getIsTypeOnly(importDeclaration)
                });
            }
            if (declaration.kind === ts.SyntaxKind.ImportSpecifier) {
                // EXAMPLE:
                // "import { A, B } from 'the-lib';"
                //
                // ImportDeclaration:
                //   ImportKeyword:  pre=[import] sep=[ ]
                //   ImportClause:
                //     NamedImports:
                //       FirstPunctuation:  pre=[{] sep=[ ]
                //       SyntaxList:
                //         ImportSpecifier:  <------------- declaration
                //           Identifier:  pre=[A]
                //         CommaToken:  pre=[,] sep=[ ]
                //         ImportSpecifier:
                //           Identifier:  pre=[B] sep=[ ]
                //       CloseBraceToken:  pre=[}] sep=[ ]
                //   FromKeyword:  pre=[from] sep=[ ]
                //   StringLiteral:  pre=['the-lib']
                //   SemicolonToken:  pre=[;]
                // Example: " ExportName as RenamedName"
                const importSpecifier = declaration;
                const exportName = (importSpecifier.propertyName || importSpecifier.name).getText().trim();
                if (externalModulePath !== undefined) {
                    return this._fetchAstImport(declarationSymbol, {
                        importKind: AstImportKind.NamedImport,
                        modulePath: externalModulePath,
                        exportName: exportName,
                        isTypeOnly: ExportAnalyzer._getIsTypeOnly(importDeclaration)
                    });
                }
                return this._getExportOfSpecifierAstModule(exportName, importDeclaration, declarationSymbol);
            }
            else if (declaration.kind === ts.SyntaxKind.ImportClause) {
                // EXAMPLE:
                // "import A, { B } from './A';"
                //
                // ImportDeclaration:
                //   ImportKeyword:  pre=[import] sep=[ ]
                //   ImportClause:  <------------- declaration (referring to A)
                //     Identifier:  pre=[A]
                //     CommaToken:  pre=[,] sep=[ ]
                //     NamedImports:
                //       FirstPunctuation:  pre=[{] sep=[ ]
                //       SyntaxList:
                //         ImportSpecifier:
                //           Identifier:  pre=[B] sep=[ ]
                //       CloseBraceToken:  pre=[}] sep=[ ]
                //   FromKeyword:  pre=[from] sep=[ ]
                //   StringLiteral:  pre=['./A']
                //   SemicolonToken:  pre=[;]
                const importClause = declaration;
                const exportName = importClause.name
                    ? importClause.name.getText().trim()
                    : ts.InternalSymbolName.Default;
                if (externalModulePath !== undefined) {
                    return this._fetchAstImport(declarationSymbol, {
                        importKind: AstImportKind.DefaultImport,
                        modulePath: externalModulePath,
                        exportName,
                        isTypeOnly: ExportAnalyzer._getIsTypeOnly(importDeclaration)
                    });
                }
                return this._getExportOfSpecifierAstModule(ts.InternalSymbolName.Default, importDeclaration, declarationSymbol);
            }
            else {
                throw new InternalError(`Unimplemented import declaration kind: ${declaration.getText()}\n` +
                    SourceFileLocationFormatter.formatDeclaration(declaration));
            }
        }
        if (ts.isImportEqualsDeclaration(declaration)) {
            // EXAMPLE:
            // import myLib = require('my-lib');
            //
            // ImportEqualsDeclaration:
            //   ImportKeyword:  pre=[import] sep=[ ]
            //   Identifier:  pre=[myLib] sep=[ ]
            //   FirstAssignment:  pre=[=] sep=[ ]
            //   ExternalModuleReference:
            //     RequireKeyword:  pre=[require]
            //     OpenParenToken:  pre=[(]
            //     StringLiteral:  pre=['my-lib']
            //     CloseParenToken:  pre=[)]
            //   SemicolonToken:  pre=[;]
            if (ts.isExternalModuleReference(declaration.moduleReference)) {
                if (ts.isStringLiteralLike(declaration.moduleReference.expression)) {
                    const variableName = TypeScriptInternals.getTextOfIdentifierOrLiteral(declaration.name);
                    const externalModuleName = TypeScriptInternals.getTextOfIdentifierOrLiteral(declaration.moduleReference.expression);
                    return this._fetchAstImport(declarationSymbol, {
                        importKind: AstImportKind.EqualsImport,
                        modulePath: externalModuleName,
                        exportName: variableName,
                        isTypeOnly: false
                    });
                }
            }
        }
        return undefined;
    }
    _getAstNamespaceImport(astModule, declarationSymbol, declaration) {
        let namespaceImport = this._astNamespaceImportByModule.get(astModule);
        if (namespaceImport === undefined) {
            namespaceImport = new AstNamespaceImport({
                namespaceName: declarationSymbol.name,
                astModule: astModule,
                declaration: declaration,
                symbol: declarationSymbol
            });
            this._astNamespaceImportByModule.set(astModule, namespaceImport);
        }
        return namespaceImport;
    }
    static _getIsTypeOnly(importDeclaration) {
        if (importDeclaration.importClause) {
            return !!importDeclaration.importClause.isTypeOnly;
        }
        return false;
    }
    _getExportOfSpecifierAstModule(exportName, importOrExportDeclaration, exportSymbol) {
        const specifierAstModule = this._fetchSpecifierAstModule(importOrExportDeclaration, exportSymbol);
        const astEntity = this._getExportOfAstModule(exportName, specifierAstModule);
        return astEntity;
    }
    _getExportOfAstModule(exportName, astModule) {
        const visitedAstModules = new Set();
        const astEntity = this._tryGetExportOfAstModule(exportName, astModule, visitedAstModules);
        if (astEntity === undefined) {
            throw new InternalError(`Unable to analyze the export ${JSON.stringify(exportName)} in\n` + astModule.sourceFile.fileName);
        }
        return astEntity;
    }
    /**
     * Implementation of {@link AstSymbolTable.tryGetExportOfAstModule}.
     */
    tryGetExportOfAstModule(exportName, astModule) {
        const visitedAstModules = new Set();
        return this._tryGetExportOfAstModule(exportName, astModule, visitedAstModules);
    }
    _tryGetExportOfAstModule(exportName, astModule, visitedAstModules) {
        if (visitedAstModules.has(astModule)) {
            return undefined;
        }
        visitedAstModules.add(astModule);
        let astEntity = astModule.cachedExportedEntities.get(exportName);
        if (astEntity !== undefined) {
            return astEntity;
        }
        // Try the explicit exports
        const escapedExportName = ts.escapeLeadingUnderscores(exportName);
        if (astModule.moduleSymbol.exports) {
            const exportSymbol = astModule.moduleSymbol.exports.get(escapedExportName);
            if (exportSymbol) {
                astEntity = this.fetchReferencedAstEntity(exportSymbol, astModule.isExternal);
                if (astEntity !== undefined) {
                    astModule.cachedExportedEntities.set(exportName, astEntity); // cache for next time
                    return astEntity;
                }
            }
        }
        // Try each of the star imports
        for (const starExportedModule of astModule.starExportedModules) {
            astEntity = this._tryGetExportOfAstModule(exportName, starExportedModule, visitedAstModules);
            if (astEntity !== undefined) {
                if (starExportedModule.externalModulePath !== undefined) {
                    // This entity was obtained from an external module, so return an AstImport instead
                    const astSymbol = astEntity;
                    return this._fetchAstImport(astSymbol.followedSymbol, {
                        importKind: AstImportKind.NamedImport,
                        modulePath: starExportedModule.externalModulePath,
                        exportName: exportName,
                        isTypeOnly: false
                    });
                }
                return astEntity;
            }
        }
        return undefined;
    }
    _tryGetExternalModulePath(importOrExportDeclaration) {
        const moduleSpecifier = this._getModuleSpecifier(importOrExportDeclaration);
        if (this._isExternalModulePath(importOrExportDeclaration, moduleSpecifier)) {
            return moduleSpecifier;
        }
        return undefined;
    }
    /**
     * Given an ImportDeclaration of the form `export { X } from "___";`, this interprets the module specifier (`"___"`)
     * and fetches the corresponding AstModule object.
     */
    _fetchSpecifierAstModule(importOrExportDeclaration, exportSymbol) {
        const moduleSpecifier = this._getModuleSpecifier(importOrExportDeclaration);
        const mode = importOrExportDeclaration.moduleSpecifier &&
            ts.isStringLiteralLike(importOrExportDeclaration.moduleSpecifier)
            ? TypeScriptInternals.getModeForUsageLocation(importOrExportDeclaration.getSourceFile(), importOrExportDeclaration.moduleSpecifier, this._program.getCompilerOptions())
            : undefined;
        const resolvedModule = TypeScriptInternals.getResolvedModule(this._program, importOrExportDeclaration.getSourceFile(), moduleSpecifier, mode);
        if (resolvedModule === undefined) {
            // Encountered in https://github.com/microsoft/rushstack/issues/1914.
            //
            // It's also possible for this to occur with ambient modules. However, in practice this doesn't happen
            // as API Extractor treats all ambient modules as external per the logic in `_isExternalModulePath`, and
            // thus this code path is never reached for ambient modules.
            throw new InternalError(`getResolvedModule() could not resolve module name ${JSON.stringify(moduleSpecifier)}\n` +
                SourceFileLocationFormatter.formatDeclaration(importOrExportDeclaration));
        }
        // Map the filename back to the corresponding SourceFile. This circuitous approach is needed because
        // we have no way to access the compiler's internal resolveExternalModuleName() function
        const moduleSourceFile = this._program.getSourceFile(resolvedModule.resolvedFileName);
        if (!moduleSourceFile) {
            // This should not happen, since getResolvedModule() specifically looks up names that the compiler
            // found in export declarations for this source file
            throw new InternalError(`getSourceFile() failed to locate ${JSON.stringify(resolvedModule.resolvedFileName)}\n` +
                SourceFileLocationFormatter.formatDeclaration(importOrExportDeclaration));
        }
        const isExternal = this._isExternalModulePath(importOrExportDeclaration, moduleSpecifier);
        const moduleReference = {
            moduleSpecifier: moduleSpecifier,
            moduleSpecifierSymbol: exportSymbol
        };
        const specifierAstModule = this.fetchAstModuleFromSourceFile(moduleSourceFile, moduleReference, isExternal);
        return specifierAstModule;
    }
    _fetchAstImport(importSymbol, options) {
        const key = AstImport.getKey(options);
        let astImport = this._astImportsByKey.get(key);
        if (!astImport) {
            astImport = new AstImport(options);
            this._astImportsByKey.set(key, astImport);
            if (importSymbol) {
                const followedSymbol = TypeScriptHelpers.followAliases(importSymbol, this._typeChecker);
                astImport.astSymbol = this._astSymbolTable.fetchAstSymbol({
                    followedSymbol: followedSymbol,
                    isExternal: true,
                    includeNominalAnalysis: false,
                    addIfMissing: true
                });
            }
        }
        else {
            // If we encounter at least one import that does not use the type-only form,
            // then the .d.ts rollup will NOT use "import type".
            if (!options.isTypeOnly) {
                astImport.isTypeOnlyEverywhere = false;
            }
        }
        return astImport;
    }
    _getModuleSpecifier(importOrExportDeclaration) {
        // The name of the module, which could be like "./SomeLocalFile' or like 'external-package/entry/point'
        const moduleSpecifier = TypeScriptHelpers.getModuleSpecifier(importOrExportDeclaration);
        if (!moduleSpecifier) {
            throw new InternalError('Unable to parse module specifier\n' +
                SourceFileLocationFormatter.formatDeclaration(importOrExportDeclaration));
        }
        return moduleSpecifier;
    }
}
//# sourceMappingURL=ExportAnalyzer.js.map