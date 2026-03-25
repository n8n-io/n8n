import * as ts from 'typescript';
import { PackageJsonLookup } from '@rushstack/node-core-library';
import { CollectorEntity } from './CollectorEntity';
import { AstSymbolTable } from '../analyzer/AstSymbolTable';
import type { AstEntity } from '../analyzer/AstEntity';
import { AstSymbol } from '../analyzer/AstSymbol';
import type { AstDeclaration } from '../analyzer/AstDeclaration';
import { WorkingPackage } from './WorkingPackage';
import { type DeclarationMetadata } from './DeclarationMetadata';
import { ApiItemMetadata } from './ApiItemMetadata';
import { SymbolMetadata } from './SymbolMetadata';
import { type IGlobalVariableAnalyzer } from '../analyzer/TypeScriptInternals';
import type { MessageRouter } from './MessageRouter';
import { AstReferenceResolver } from '../analyzer/AstReferenceResolver';
import { ExtractorConfig } from '../api/ExtractorConfig';
import type { SourceMapper } from './SourceMapper';
/**
 * Options for Collector constructor.
 */
export interface ICollectorOptions {
    /**
     * Configuration for the TypeScript compiler.  The most important options to set are:
     *
     * - target: ts.ScriptTarget.ES5
     * - module: ts.ModuleKind.CommonJS
     * - moduleResolution: ts.ModuleResolutionKind.NodeJs
     * - rootDir: inputFolder
     */
    program: ts.Program;
    messageRouter: MessageRouter;
    extractorConfig: ExtractorConfig;
    sourceMapper: SourceMapper;
}
/**
 * The `Collector` manages the overall data set that is used by `ApiModelGenerator`,
 * `DtsRollupGenerator`, and `ApiReportGenerator`.  Starting from the working package's entry point,
 * the `Collector` collects all exported symbols, determines how to import any symbols they reference,
 * assigns unique names, and sorts everything into a normalized alphabetical ordering.
 */
export declare class Collector {
    readonly program: ts.Program;
    readonly typeChecker: ts.TypeChecker;
    readonly globalVariableAnalyzer: IGlobalVariableAnalyzer;
    readonly astSymbolTable: AstSymbolTable;
    readonly astReferenceResolver: AstReferenceResolver;
    readonly packageJsonLookup: PackageJsonLookup;
    readonly messageRouter: MessageRouter;
    readonly workingPackage: WorkingPackage;
    readonly extractorConfig: ExtractorConfig;
    readonly sourceMapper: SourceMapper;
    /**
     * The `ExtractorConfig.bundledPackages` names in a set.
     */
    readonly bundledPackageNames: ReadonlySet<string>;
    private readonly _program;
    private readonly _tsdocParser;
    private _astEntryPoint;
    private readonly _entities;
    private readonly _entitiesByAstEntity;
    private readonly _entitiesBySymbol;
    private readonly _starExportedExternalModulePaths;
    private readonly _dtsTypeReferenceDirectives;
    private readonly _dtsLibReferenceDirectives;
    private readonly _cachedOverloadIndexesByDeclaration;
    constructor(options: ICollectorOptions);
    /**
     * Resolve provided `bundledPackages` names and glob patterns to a list of explicit package names.
     *
     * @remarks
     * Explicit package names will be included in the output unconditionally. However, wildcard patterns will
     * only be matched against the various dependencies listed in the provided package.json (if there was one).
     * Patterns will be matched against `dependencies`, `devDependencies`, `optionalDependencies`, and `peerDependencies`.
     *
     * @param bundledPackages - The list of package names and/or glob patterns to resolve.
     * @param packageJson - The package.json of the package being processed (if there is one).
     * @returns The set of resolved package names to be bundled during analysis.
     */
    private static _resolveBundledPackagePatterns;
    /**a
     * Returns a list of names (e.g. "example-library") that should appear in a reference like this:
     *
     * ```
     * /// <reference types="example-library" />
     * ```
     */
    get dtsTypeReferenceDirectives(): ReadonlySet<string>;
    /**
     * A list of names (e.g. "runtime-library") that should appear in a reference like this:
     *
     * ```
     * /// <reference lib="runtime-library" />
     * ```
     */
    get dtsLibReferenceDirectives(): ReadonlySet<string>;
    get entities(): ReadonlyArray<CollectorEntity>;
    /**
     * A list of module specifiers (e.g. `"@rushstack/node-core-library/lib/FileSystem"`) that should be emitted
     * as star exports (e.g. `export * from "@rushstack/node-core-library/lib/FileSystem"`).
     */
    get starExportedExternalModulePaths(): ReadonlyArray<string>;
    /**
     * Perform the analysis.
     */
    analyze(): void;
    /**
     * For a given ts.Identifier that is part of an AstSymbol that we analyzed, return the CollectorEntity that
     * it refers to.  Returns undefined if it doesn't refer to anything interesting.
     * @remarks
     * Throws an Error if the ts.Identifier is not part of node tree that was analyzed.
     */
    tryGetEntityForNode(identifier: ts.Identifier | ts.ImportTypeNode): CollectorEntity | undefined;
    /**
     * For a given analyzed ts.Symbol, return the CollectorEntity that it refers to. Returns undefined if it
     * doesn't refer to anything interesting.
     */
    tryGetEntityForSymbol(symbol: ts.Symbol): CollectorEntity | undefined;
    /**
     * Returns the associated `CollectorEntity` for the given `astEntity`, if one was created during analysis.
     */
    tryGetCollectorEntity(astEntity: AstEntity): CollectorEntity | undefined;
    fetchSymbolMetadata(astSymbol: AstSymbol): SymbolMetadata;
    fetchDeclarationMetadata(astDeclaration: AstDeclaration): DeclarationMetadata;
    fetchApiItemMetadata(astDeclaration: AstDeclaration): ApiItemMetadata;
    tryFetchMetadataForAstEntity(astEntity: AstEntity): SymbolMetadata | undefined;
    isAncillaryDeclaration(astDeclaration: AstDeclaration): boolean;
    getNonAncillaryDeclarations(astSymbol: AstSymbol): ReadonlyArray<AstDeclaration>;
    /**
     * Removes the leading underscore, for example: "_Example" --> "example*Example*_"
     *
     * @remarks
     * This causes internal definitions to sort alphabetically case-insensitive, then case-sensitive, and
     * initially ignoring the underscore prefix, while still deterministically comparing it.
     * The star is used as a delimiter because it is not a legal  identifier character.
     */
    static getSortKeyIgnoringUnderscore(identifier: string | undefined): string;
    /**
     * For function-like signatures, this returns the TSDoc "overload index" which can be used to identify
     * a specific overload.
     */
    getOverloadIndex(astDeclaration: AstDeclaration): number;
    private _createCollectorEntity;
    private _recursivelyCreateEntities;
    /**
     * Ensures a unique name for each item in the package typings file.
     */
    private _makeUniqueNames;
    private _fetchSymbolMetadata;
    private _calculateDeclarationMetadataForDeclarations;
    private _addAncillaryDeclaration;
    private _calculateApiItemMetadata;
    private _parseTsdocForAstDeclaration;
    private _collectReferenceDirectives;
    private _collectReferenceDirectivesFromSourceFiles;
    private _getReferenceDirectiveFromSourceFile;
}
//# sourceMappingURL=Collector.d.ts.map