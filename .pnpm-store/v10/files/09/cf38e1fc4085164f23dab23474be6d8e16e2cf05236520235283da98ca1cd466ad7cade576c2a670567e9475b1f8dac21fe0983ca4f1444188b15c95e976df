import * as ts from 'typescript';
import { AstSymbol } from './AstSymbol';
import { AstModule, type IAstModuleExportInfo } from './AstModule';
import type { IFetchAstSymbolOptions } from './AstSymbolTable';
import type { AstEntity } from './AstEntity';
/**
 * Exposes the minimal APIs from AstSymbolTable that are needed by ExportAnalyzer.
 *
 * In particular, we want ExportAnalyzer to be able to call AstSymbolTable._fetchAstSymbol() even though it
 * is a very private API that should not be exposed to any other components.
 */
export interface IAstSymbolTable {
    fetchAstSymbol(options: IFetchAstSymbolOptions): AstSymbol | undefined;
    analyze(astEntity: AstEntity): void;
}
/**
 * Used with ExportAnalyzer.fetchAstModuleBySourceFile() to provide contextual information about how the source file
 * was imported.
 */
interface IAstModuleReference {
    /**
     * For example, if we are following a statement like `import { X } from 'some-package'`, this will be the
     * string `"some-package"`.
     */
    moduleSpecifier: string;
    /**
     * For example, if we are following a statement like `import { X } from 'some-package'`, this will be the
     * symbol for `X`.
     */
    moduleSpecifierSymbol: ts.Symbol;
}
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
export declare class ExportAnalyzer {
    private readonly _program;
    private readonly _typeChecker;
    private readonly _bundledPackageNames;
    private readonly _astSymbolTable;
    private readonly _astModulesByModuleSymbol;
    private readonly _importableAmbientSourceFiles;
    private readonly _astImportsByKey;
    private readonly _astNamespaceImportByModule;
    constructor(program: ts.Program, typeChecker: ts.TypeChecker, bundledPackageNames: ReadonlySet<string>, astSymbolTable: IAstSymbolTable);
    /**
     * For a given source file, this analyzes all of its exports and produces an AstModule object.
     *
     * @param moduleReference - contextual information about the import statement that took us to this source file.
     * or `undefined` if this source file is the initial entry point
     * @param isExternal - whether the given `moduleReference` is external.
     */
    fetchAstModuleFromSourceFile(sourceFile: ts.SourceFile, moduleReference: IAstModuleReference | undefined, isExternal: boolean): AstModule;
    /**
     * Retrieves the symbol for the module corresponding to the ts.SourceFile that is being imported/exported.
     *
     * @remarks
     * The `module` keyword can be used to declare multiple TypeScript modules inside a single source file.
     * (This is a deprecated construct and mainly used for typings such as `@types/node`.)  In this situation,
     * `moduleReference` helps us to fish out the correct module symbol.
     */
    private _getModuleSymbolFromSourceFile;
    /**
     * Implementation of {@link AstSymbolTable.fetchAstModuleExportInfo}.
     */
    fetchAstModuleExportInfo(entryPointAstModule: AstModule): IAstModuleExportInfo;
    /**
     * Returns true if the module specifier refers to an external package.  Ignores packages listed in the
     * "bundledPackages" setting from the api-extractor.json config file.
     */
    private _isExternalModulePath;
    /**
     * Returns true if when we analyzed sourceFile, we found that it contains an "export=" statement that allows
     * it to behave /either/ as an ambient module /or/ as a regular importable module.  In this case,
     * `AstSymbolTable._fetchAstSymbol()` will analyze its symbols even though `TypeScriptHelpers.isAmbient()`
     * returns true.
     */
    isImportableAmbientSourceFile(sourceFile: ts.SourceFile): boolean;
    private _collectAllExportsRecursive;
    /**
     * For a given symbol (which was encountered in the specified sourceFile), this fetches the AstEntity that it
     * refers to.  For example, if a particular interface describes the return value of a function, this API can help
     * us determine a TSDoc declaration reference for that symbol (if the symbol is exported).
     */
    fetchReferencedAstEntity(symbol: ts.Symbol, referringModuleIsExternal: boolean): AstEntity | undefined;
    fetchReferencedAstEntityFromImportTypeNode(node: ts.ImportTypeNode, referringModuleIsExternal: boolean): AstEntity | undefined;
    private _tryMatchExportDeclaration;
    private _getAstNamespaceExport;
    private _tryMatchImportDeclaration;
    private _getAstNamespaceImport;
    private static _getIsTypeOnly;
    private _getExportOfSpecifierAstModule;
    private _getExportOfAstModule;
    /**
     * Implementation of {@link AstSymbolTable.tryGetExportOfAstModule}.
     */
    tryGetExportOfAstModule(exportName: string, astModule: AstModule): AstEntity | undefined;
    private _tryGetExportOfAstModule;
    private _tryGetExternalModulePath;
    /**
     * Given an ImportDeclaration of the form `export { X } from "___";`, this interprets the module specifier (`"___"`)
     * and fetches the corresponding AstModule object.
     */
    private _fetchSpecifierAstModule;
    private _fetchAstImport;
    private _getModuleSpecifier;
}
export {};
//# sourceMappingURL=ExportAnalyzer.d.ts.map