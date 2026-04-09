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
exports.Collector = void 0;
const ts = __importStar(require("typescript"));
const minimatch_1 = require("minimatch");
const tsdoc = __importStar(require("@microsoft/tsdoc"));
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const node_core_library_1 = require("@rushstack/node-core-library");
const ExtractorMessageId_1 = require("../api/ExtractorMessageId");
const CollectorEntity_1 = require("./CollectorEntity");
const AstSymbolTable_1 = require("../analyzer/AstSymbolTable");
const AstSymbol_1 = require("../analyzer/AstSymbol");
const TypeScriptHelpers_1 = require("../analyzer/TypeScriptHelpers");
const WorkingPackage_1 = require("./WorkingPackage");
const PackageDocComment_1 = require("../aedoc/PackageDocComment");
const DeclarationMetadata_1 = require("./DeclarationMetadata");
const ApiItemMetadata_1 = require("./ApiItemMetadata");
const SymbolMetadata_1 = require("./SymbolMetadata");
const TypeScriptInternals_1 = require("../analyzer/TypeScriptInternals");
const AstReferenceResolver_1 = require("../analyzer/AstReferenceResolver");
const ExtractorConfig_1 = require("../api/ExtractorConfig");
const AstNamespaceImport_1 = require("../analyzer/AstNamespaceImport");
const AstImport_1 = require("../analyzer/AstImport");
/**
 * The `Collector` manages the overall data set that is used by `ApiModelGenerator`,
 * `DtsRollupGenerator`, and `ApiReportGenerator`.  Starting from the working package's entry point,
 * the `Collector` collects all exported symbols, determines how to import any symbols they reference,
 * assigns unique names, and sorts everything into a normalized alphabetical ordering.
 */
class Collector {
    constructor(options) {
        this._entities = [];
        this._entitiesByAstEntity = new Map();
        this._entitiesBySymbol = new Map();
        this._starExportedExternalModulePaths = [];
        this._dtsTypeReferenceDirectives = new Set();
        this._dtsLibReferenceDirectives = new Set();
        this.packageJsonLookup = new node_core_library_1.PackageJsonLookup();
        this._program = options.program;
        this.extractorConfig = options.extractorConfig;
        this.sourceMapper = options.sourceMapper;
        const entryPointSourceFile = options.program.getSourceFile(this.extractorConfig.mainEntryPointFilePath);
        if (!entryPointSourceFile) {
            throw new Error('Unable to load file: ' + this.extractorConfig.mainEntryPointFilePath);
        }
        if (!this.extractorConfig.packageFolder || !this.extractorConfig.packageJson) {
            // TODO: We should be able to analyze projects that don't have any package.json.
            // The ExtractorConfig class is already designed to allow this.
            throw new Error('Unable to find a package.json file for the project being analyzed');
        }
        this.workingPackage = new WorkingPackage_1.WorkingPackage({
            packageFolder: this.extractorConfig.packageFolder,
            packageJson: this.extractorConfig.packageJson,
            entryPointSourceFile
        });
        this.messageRouter = options.messageRouter;
        this.program = options.program;
        this.typeChecker = options.program.getTypeChecker();
        this.globalVariableAnalyzer = TypeScriptInternals_1.TypeScriptInternals.getGlobalVariableAnalyzer(this.program);
        this._tsdocParser = new tsdoc.TSDocParser(this.extractorConfig.tsdocConfiguration);
        // Resolve package name patterns and store concrete set of bundled package dependency names
        this.bundledPackageNames = Collector._resolveBundledPackagePatterns(this.extractorConfig.bundledPackages, this.extractorConfig.packageJson);
        this.astSymbolTable = new AstSymbolTable_1.AstSymbolTable(this.program, this.typeChecker, this.packageJsonLookup, this.bundledPackageNames, this.messageRouter);
        this.astReferenceResolver = new AstReferenceResolver_1.AstReferenceResolver(this);
        this._cachedOverloadIndexesByDeclaration = new Map();
    }
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
    static _resolveBundledPackagePatterns(bundledPackages, packageJson) {
        var _a, _b, _c, _d;
        if (bundledPackages.length === 0) {
            // If no `bundledPackages` were specified, then there is nothing to resolve.
            // Return an empty set.
            return new Set();
        }
        // Accumulate all declared dependencies.
        // Any wildcard patterns in `bundledPackages` will be resolved against these.
        const dependencyNames = new Set();
        Object.keys((_a = packageJson === null || packageJson === void 0 ? void 0 : packageJson.dependencies) !== null && _a !== void 0 ? _a : {}).forEach((dep) => dependencyNames.add(dep));
        Object.keys((_b = packageJson === null || packageJson === void 0 ? void 0 : packageJson.devDependencies) !== null && _b !== void 0 ? _b : {}).forEach((dep) => dependencyNames.add(dep));
        Object.keys((_c = packageJson === null || packageJson === void 0 ? void 0 : packageJson.peerDependencies) !== null && _c !== void 0 ? _c : {}).forEach((dep) => dependencyNames.add(dep));
        Object.keys((_d = packageJson === null || packageJson === void 0 ? void 0 : packageJson.optionalDependencies) !== null && _d !== void 0 ? _d : {}).forEach((dep) => dependencyNames.add(dep));
        // The set of resolved package names to be populated and returned
        const resolvedPackageNames = new Set();
        for (const packageNameOrPattern of bundledPackages) {
            // If the string is an exact package name, use it regardless of package.json contents
            if (node_core_library_1.PackageName.isValidName(packageNameOrPattern)) {
                resolvedPackageNames.add(packageNameOrPattern);
            }
            else {
                // If the entry isn't an exact package name, assume glob pattern and search for matches
                for (const dependencyName of dependencyNames) {
                    if ((0, minimatch_1.minimatch)(dependencyName, packageNameOrPattern)) {
                        resolvedPackageNames.add(dependencyName);
                    }
                }
            }
        }
        return resolvedPackageNames;
    }
    /**a
     * Returns a list of names (e.g. "example-library") that should appear in a reference like this:
     *
     * ```
     * /// <reference types="example-library" />
     * ```
     */
    get dtsTypeReferenceDirectives() {
        return this._dtsTypeReferenceDirectives;
    }
    /**
     * A list of names (e.g. "runtime-library") that should appear in a reference like this:
     *
     * ```
     * /// <reference lib="runtime-library" />
     * ```
     */
    get dtsLibReferenceDirectives() {
        return this._dtsLibReferenceDirectives;
    }
    get entities() {
        return this._entities;
    }
    /**
     * A list of module specifiers (e.g. `"@rushstack/node-core-library/lib/FileSystem"`) that should be emitted
     * as star exports (e.g. `export * from "@rushstack/node-core-library/lib/FileSystem"`).
     */
    get starExportedExternalModulePaths() {
        return this._starExportedExternalModulePaths;
    }
    /**
     * Perform the analysis.
     */
    analyze() {
        if (this._astEntryPoint) {
            throw new Error('DtsRollupGenerator.analyze() was already called');
        }
        // This runs a full type analysis, and then augments the Abstract Syntax Tree (i.e. declarations)
        // with semantic information (i.e. symbols).  The "diagnostics" are a subset of the everyday
        // compile errors that would result from a full compilation.
        for (const diagnostic of this._program.getSemanticDiagnostics()) {
            this.messageRouter.addCompilerDiagnostic(diagnostic);
        }
        const sourceFiles = this.program.getSourceFiles();
        if (this.messageRouter.showDiagnostics) {
            this.messageRouter.logDiagnosticHeader('Root filenames');
            for (const fileName of this.program.getRootFileNames()) {
                this.messageRouter.logDiagnostic(fileName);
            }
            this.messageRouter.logDiagnosticFooter();
            this.messageRouter.logDiagnosticHeader('Files analyzed by compiler');
            for (const sourceFile of sourceFiles) {
                this.messageRouter.logDiagnostic(sourceFile.fileName);
            }
            this.messageRouter.logDiagnosticFooter();
        }
        // We can throw this error earlier in CompilerState.ts, but intentionally wait until after we've logged the
        // associated diagnostic message above to make debugging easier for developers.
        // Typically there will be many such files -- to avoid too much noise, only report the first one.
        const badSourceFile = sourceFiles.find(({ fileName }) => !ExtractorConfig_1.ExtractorConfig.hasDtsFileExtension(fileName));
        if (badSourceFile) {
            this.messageRouter.addAnalyzerIssueForPosition(ExtractorMessageId_1.ExtractorMessageId.WrongInputFileType, 'Incorrect file type; API Extractor expects to analyze compiler outputs with the .d.ts file extension. ' +
                'Troubleshooting tips: https://api-extractor.com/link/dts-error', badSourceFile, 0);
        }
        // Build the entry point
        const entryPointSourceFile = this.workingPackage.entryPointSourceFile;
        const astEntryPoint = this.astSymbolTable.fetchAstModuleFromWorkingPackage(entryPointSourceFile);
        this._astEntryPoint = astEntryPoint;
        const packageDocCommentTextRange = PackageDocComment_1.PackageDocComment.tryFindInSourceFile(entryPointSourceFile, this);
        if (packageDocCommentTextRange) {
            const range = tsdoc.TextRange.fromStringRange(entryPointSourceFile.text, packageDocCommentTextRange.pos, packageDocCommentTextRange.end);
            this.workingPackage.tsdocParserContext = this._tsdocParser.parseRange(range);
            this.messageRouter.addTsdocMessages(this.workingPackage.tsdocParserContext, entryPointSourceFile);
            this.workingPackage.tsdocComment = this.workingPackage.tsdocParserContext.docComment;
        }
        const { exportedLocalEntities, starExportedExternalModules, visitedAstModules } = this.astSymbolTable.fetchAstModuleExportInfo(astEntryPoint);
        // Create a CollectorEntity for each top-level export.
        const processedAstEntities = [];
        for (const [exportName, astEntity] of exportedLocalEntities) {
            this._createCollectorEntity(astEntity, exportName);
            processedAstEntities.push(astEntity);
        }
        // Recursively create the remaining CollectorEntities after the top-level entities
        // have been processed.
        const alreadySeenAstEntities = new Set();
        for (const astEntity of processedAstEntities) {
            this._recursivelyCreateEntities(astEntity, alreadySeenAstEntities);
            if (astEntity instanceof AstSymbol_1.AstSymbol) {
                this.fetchSymbolMetadata(astEntity);
            }
        }
        // Ensure references are collected from any intermediate files that
        // only include exports
        const nonExternalSourceFiles = new Set();
        for (const { sourceFile, isExternal } of visitedAstModules) {
            if (!nonExternalSourceFiles.has(sourceFile) && !isExternal) {
                nonExternalSourceFiles.add(sourceFile);
            }
        }
        // Here, we're collecting reference directives from all non-external source files
        // that were encountered while looking for exports, but only those references that
        // were explicitly written by the developer and marked with the `preserve="true"`
        // attribute. In TS >= 5.5, only references that are explicitly authored and marked
        // with `preserve="true"` are included in the output. See https://github.com/microsoft/TypeScript/pull/57681
        //
        // The `_collectReferenceDirectives` function pulls in all references in files that
        // contain definitions, but does not examine files that only reexport from other
        // files. Here, we're looking through files that were missed by `_collectReferenceDirectives`,
        // but only collecting references that were explicitly marked with `preserve="true"`.
        // It is intuitive for developers to include references that they explicitly want part of
        // their public API in a file like the entrypoint, which is likely to only contain reexports,
        // and this picks those up.
        this._collectReferenceDirectivesFromSourceFiles(nonExternalSourceFiles, true);
        this._makeUniqueNames();
        for (const starExportedExternalModule of starExportedExternalModules) {
            if (starExportedExternalModule.externalModulePath !== undefined) {
                this._starExportedExternalModulePaths.push(starExportedExternalModule.externalModulePath);
            }
        }
        node_core_library_1.Sort.sortBy(this._entities, (x) => x.getSortKey());
        node_core_library_1.Sort.sortSet(this._dtsTypeReferenceDirectives);
        node_core_library_1.Sort.sortSet(this._dtsLibReferenceDirectives);
        this._starExportedExternalModulePaths.sort();
    }
    /**
     * For a given ts.Identifier that is part of an AstSymbol that we analyzed, return the CollectorEntity that
     * it refers to.  Returns undefined if it doesn't refer to anything interesting.
     * @remarks
     * Throws an Error if the ts.Identifier is not part of node tree that was analyzed.
     */
    tryGetEntityForNode(identifier) {
        const astEntity = this.astSymbolTable.tryGetEntityForNode(identifier);
        if (astEntity) {
            return this._entitiesByAstEntity.get(astEntity);
        }
        return undefined;
    }
    /**
     * For a given analyzed ts.Symbol, return the CollectorEntity that it refers to. Returns undefined if it
     * doesn't refer to anything interesting.
     */
    tryGetEntityForSymbol(symbol) {
        return this._entitiesBySymbol.get(symbol);
    }
    /**
     * Returns the associated `CollectorEntity` for the given `astEntity`, if one was created during analysis.
     */
    tryGetCollectorEntity(astEntity) {
        return this._entitiesByAstEntity.get(astEntity);
    }
    fetchSymbolMetadata(astSymbol) {
        if (astSymbol.symbolMetadata === undefined) {
            this._fetchSymbolMetadata(astSymbol);
        }
        return astSymbol.symbolMetadata;
    }
    fetchDeclarationMetadata(astDeclaration) {
        if (astDeclaration.declarationMetadata === undefined) {
            // Fetching the SymbolMetadata always constructs the DeclarationMetadata
            this._fetchSymbolMetadata(astDeclaration.astSymbol);
        }
        return astDeclaration.declarationMetadata;
    }
    fetchApiItemMetadata(astDeclaration) {
        if (astDeclaration.apiItemMetadata === undefined) {
            // Fetching the SymbolMetadata always constructs the ApiItemMetadata
            this._fetchSymbolMetadata(astDeclaration.astSymbol);
        }
        return astDeclaration.apiItemMetadata;
    }
    tryFetchMetadataForAstEntity(astEntity) {
        if (astEntity instanceof AstSymbol_1.AstSymbol) {
            return this.fetchSymbolMetadata(astEntity);
        }
        if (astEntity instanceof AstImport_1.AstImport) {
            if (astEntity.astSymbol) {
                return this.fetchSymbolMetadata(astEntity.astSymbol);
            }
        }
        return undefined;
    }
    isAncillaryDeclaration(astDeclaration) {
        const declarationMetadata = this.fetchDeclarationMetadata(astDeclaration);
        return declarationMetadata.isAncillary;
    }
    getNonAncillaryDeclarations(astSymbol) {
        const result = [];
        for (const astDeclaration of astSymbol.astDeclarations) {
            const declarationMetadata = this.fetchDeclarationMetadata(astDeclaration);
            if (!declarationMetadata.isAncillary) {
                result.push(astDeclaration);
            }
        }
        return result;
    }
    /**
     * Removes the leading underscore, for example: "_Example" --> "example*Example*_"
     *
     * @remarks
     * This causes internal definitions to sort alphabetically case-insensitive, then case-sensitive, and
     * initially ignoring the underscore prefix, while still deterministically comparing it.
     * The star is used as a delimiter because it is not a legal  identifier character.
     */
    static getSortKeyIgnoringUnderscore(identifier) {
        if (!identifier)
            return '';
        let parts;
        if (identifier[0] === '_') {
            const withoutUnderscore = identifier.substr(1);
            parts = [withoutUnderscore.toLowerCase(), '*', withoutUnderscore, '*', '_'];
        }
        else {
            parts = [identifier.toLowerCase(), '*', identifier];
        }
        return parts.join('');
    }
    /**
     * For function-like signatures, this returns the TSDoc "overload index" which can be used to identify
     * a specific overload.
     */
    getOverloadIndex(astDeclaration) {
        const allDeclarations = astDeclaration.astSymbol.astDeclarations;
        if (allDeclarations.length === 1) {
            return 1; // trivial case
        }
        let overloadIndex = this._cachedOverloadIndexesByDeclaration.get(astDeclaration);
        if (overloadIndex === undefined) {
            // TSDoc index selectors are positive integers counting from 1
            let nextIndex = 1;
            for (const other of allDeclarations) {
                // Filter out other declarations that are not overloads.  For example, an overloaded function can also
                // be a namespace.
                if (other.declaration.kind === astDeclaration.declaration.kind) {
                    this._cachedOverloadIndexesByDeclaration.set(other, nextIndex);
                    ++nextIndex;
                }
            }
            overloadIndex = this._cachedOverloadIndexesByDeclaration.get(astDeclaration);
        }
        if (overloadIndex === undefined) {
            // This should never happen
            throw new node_core_library_1.InternalError('Error calculating overload index for declaration');
        }
        return overloadIndex;
    }
    _createCollectorEntity(astEntity, exportName, parent) {
        let entity = this._entitiesByAstEntity.get(astEntity);
        if (!entity) {
            entity = new CollectorEntity_1.CollectorEntity(astEntity);
            this._entitiesByAstEntity.set(astEntity, entity);
            if (astEntity instanceof AstSymbol_1.AstSymbol) {
                this._entitiesBySymbol.set(astEntity.followedSymbol, entity);
            }
            else if (astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
                this._entitiesBySymbol.set(astEntity.symbol, entity);
            }
            this._entities.push(entity);
            this._collectReferenceDirectives(astEntity);
        }
        if (exportName) {
            if (parent) {
                entity.addLocalExportName(exportName, parent);
            }
            else {
                entity.addExportName(exportName);
            }
        }
        return entity;
    }
    _recursivelyCreateEntities(astEntity, alreadySeenAstEntities) {
        if (alreadySeenAstEntities.has(astEntity))
            return;
        alreadySeenAstEntities.add(astEntity);
        if (astEntity instanceof AstSymbol_1.AstSymbol) {
            astEntity.forEachDeclarationRecursive((astDeclaration) => {
                for (const referencedAstEntity of astDeclaration.referencedAstEntities) {
                    if (referencedAstEntity instanceof AstSymbol_1.AstSymbol) {
                        // We only create collector entities for root-level symbols. For example, if a symbol is
                        // nested inside a namespace, only the namespace gets a collector entity. Note that this
                        // is not true for AstNamespaceImports below.
                        if (referencedAstEntity.parentAstSymbol === undefined) {
                            this._createCollectorEntity(referencedAstEntity);
                        }
                    }
                    else {
                        this._createCollectorEntity(referencedAstEntity);
                    }
                    this._recursivelyCreateEntities(referencedAstEntity, alreadySeenAstEntities);
                }
            });
        }
        if (astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
            const astModuleExportInfo = astEntity.fetchAstModuleExportInfo(this);
            const parentEntity = this._entitiesByAstEntity.get(astEntity);
            if (!parentEntity) {
                // This should never happen, as we've already created entities for all AstNamespaceImports.
                throw new node_core_library_1.InternalError(`Failed to get CollectorEntity for AstNamespaceImport with namespace name "${astEntity.namespaceName}"`);
            }
            for (const [localExportName, localAstEntity] of astModuleExportInfo.exportedLocalEntities) {
                // Create a CollectorEntity for each local export within an AstNamespaceImport entity.
                this._createCollectorEntity(localAstEntity, localExportName, parentEntity);
                this._recursivelyCreateEntities(localAstEntity, alreadySeenAstEntities);
            }
        }
    }
    /**
     * Ensures a unique name for each item in the package typings file.
     */
    _makeUniqueNames() {
        // The following examples illustrate the nameForEmit heuristics:
        //
        // Example 1:
        //   class X { } <--- nameForEmit should be "A" to simplify things and reduce possibility of conflicts
        //   export { X as A };
        //
        // Example 2:
        //   class X { } <--- nameForEmit should be "X" because choosing A or B would be nondeterministic
        //   export { X as A };
        //   export { X as B };
        //
        // Example 3:
        //   class X { } <--- nameForEmit should be "X_1" because Y has a stronger claim to the name
        //   export { X as A };
        //   export { X as B };
        //   class Y { } <--- nameForEmit should be "X"
        //   export { Y as X };
        // Set of names that should NOT be used when generating a unique nameForEmit
        const usedNames = new Set();
        // First collect the names of explicit package exports, and perform a sanity check.
        for (const entity of this._entities) {
            for (const exportName of entity.exportNames) {
                if (usedNames.has(exportName)) {
                    // This should be impossible
                    throw new node_core_library_1.InternalError(`A package cannot have two exports with the name "${exportName}"`);
                }
                usedNames.add(exportName);
            }
        }
        // Ensure that each entity has a unique nameForEmit
        for (const entity of this._entities) {
            // What name would we ideally want to emit it as?
            let idealNameForEmit;
            // If this entity is exported exactly once, then we prefer the exported name
            if (entity.singleExportName !== undefined &&
                entity.singleExportName !== ts.InternalSymbolName.Default) {
                idealNameForEmit = entity.singleExportName;
            }
            else {
                // otherwise use the local name
                idealNameForEmit = entity.astEntity.localName;
            }
            if (idealNameForEmit.includes('.')) {
                // For an ImportType with a namespace chain, only the top namespace is imported.
                idealNameForEmit = idealNameForEmit.split('.')[0];
            }
            // If the idealNameForEmit happens to be the same as one of the exports, then we're safe to use that...
            if (entity.exportNames.has(idealNameForEmit)) {
                // ...except that if it conflicts with a global name, then the global name wins
                if (!this.globalVariableAnalyzer.hasGlobalName(idealNameForEmit)) {
                    // ...also avoid "default" which can interfere with "export { default } from 'some-module;'"
                    if (idealNameForEmit !== 'default') {
                        entity.nameForEmit = idealNameForEmit;
                        continue;
                    }
                }
            }
            // Generate a unique name based on idealNameForEmit
            let suffix = 1;
            let nameForEmit = idealNameForEmit;
            // Choose a name that doesn't conflict with usedNames or a global name
            while (nameForEmit === 'default' ||
                usedNames.has(nameForEmit) ||
                this.globalVariableAnalyzer.hasGlobalName(nameForEmit)) {
                nameForEmit = `${idealNameForEmit}_${++suffix}`;
            }
            entity.nameForEmit = nameForEmit;
            usedNames.add(nameForEmit);
        }
    }
    _fetchSymbolMetadata(astSymbol) {
        if (astSymbol.symbolMetadata) {
            return;
        }
        // When we solve an astSymbol, then we always also solve all of its parents and all of its declarations.
        // The parent is solved first.
        if (astSymbol.parentAstSymbol && astSymbol.parentAstSymbol.symbolMetadata === undefined) {
            this._fetchSymbolMetadata(astSymbol.parentAstSymbol);
        }
        // Construct the DeclarationMetadata objects, and detect any ancillary declarations
        this._calculateDeclarationMetadataForDeclarations(astSymbol);
        // Calculate the ApiItemMetadata objects
        for (const astDeclaration of astSymbol.astDeclarations) {
            this._calculateApiItemMetadata(astDeclaration);
        }
        // The most public effectiveReleaseTag for all declarations
        let maxEffectiveReleaseTag = api_extractor_model_1.ReleaseTag.None;
        for (const astDeclaration of astSymbol.astDeclarations) {
            // We know we solved this above
            const apiItemMetadata = astDeclaration.apiItemMetadata;
            const effectiveReleaseTag = apiItemMetadata.effectiveReleaseTag;
            if (effectiveReleaseTag > maxEffectiveReleaseTag) {
                maxEffectiveReleaseTag = effectiveReleaseTag;
            }
        }
        // Update this last when we're sure no exceptions were thrown
        astSymbol.symbolMetadata = new SymbolMetadata_1.SymbolMetadata({
            maxEffectiveReleaseTag
        });
    }
    _calculateDeclarationMetadataForDeclarations(astSymbol) {
        // Initialize DeclarationMetadata for each declaration
        for (const astDeclaration of astSymbol.astDeclarations) {
            if (astDeclaration.declarationMetadata) {
                throw new node_core_library_1.InternalError('AstDeclaration.declarationMetadata is not expected to have been initialized yet');
            }
            const metadata = new DeclarationMetadata_1.InternalDeclarationMetadata();
            metadata.tsdocParserContext = this._parseTsdocForAstDeclaration(astDeclaration);
            astDeclaration.declarationMetadata = metadata;
        }
        // Detect ancillary declarations
        for (const astDeclaration of astSymbol.astDeclarations) {
            // For a getter/setter pair, make the setter ancillary to the getter
            if (astDeclaration.declaration.kind === ts.SyntaxKind.SetAccessor) {
                let foundGetter = false;
                for (const getterAstDeclaration of astDeclaration.astSymbol.astDeclarations) {
                    if (getterAstDeclaration.declaration.kind === ts.SyntaxKind.GetAccessor) {
                        // Associate it with the getter
                        this._addAncillaryDeclaration(getterAstDeclaration, astDeclaration);
                        foundGetter = true;
                    }
                }
                if (!foundGetter) {
                    this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.MissingGetter, `The property "${astDeclaration.astSymbol.localName}" has a setter but no getter.`, astDeclaration);
                }
            }
        }
    }
    _addAncillaryDeclaration(mainAstDeclaration, ancillaryAstDeclaration) {
        const mainMetadata = mainAstDeclaration.declarationMetadata;
        const ancillaryMetadata = ancillaryAstDeclaration.declarationMetadata;
        if (mainMetadata.ancillaryDeclarations.indexOf(ancillaryAstDeclaration) >= 0) {
            return; // already added
        }
        if (mainAstDeclaration.astSymbol !== ancillaryAstDeclaration.astSymbol) {
            throw new node_core_library_1.InternalError('Invalid call to _addAncillaryDeclaration() because declarations do not' +
                ' belong to the same symbol');
        }
        if (mainMetadata.isAncillary) {
            throw new node_core_library_1.InternalError('Invalid call to _addAncillaryDeclaration() because the target is ancillary itself');
        }
        if (ancillaryMetadata.isAncillary) {
            throw new node_core_library_1.InternalError('Invalid call to _addAncillaryDeclaration() because source is already ancillary' +
                ' to another declaration');
        }
        if (mainAstDeclaration.apiItemMetadata || ancillaryAstDeclaration.apiItemMetadata) {
            throw new node_core_library_1.InternalError('Invalid call to _addAncillaryDeclaration() because the API item metadata' +
                ' has already been constructed');
        }
        ancillaryMetadata.isAncillary = true;
        mainMetadata.ancillaryDeclarations.push(ancillaryAstDeclaration);
    }
    _calculateApiItemMetadata(astDeclaration) {
        const declarationMetadata = astDeclaration.declarationMetadata;
        if (declarationMetadata.isAncillary) {
            if (astDeclaration.declaration.kind === ts.SyntaxKind.SetAccessor) {
                if (declarationMetadata.tsdocParserContext) {
                    this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.SetterWithDocs, `The doc comment for the property "${astDeclaration.astSymbol.localName}"` +
                        ` must appear on the getter, not the setter.`, astDeclaration);
                }
            }
            // We never calculate ApiItemMetadata for an ancillary declaration; instead, it is assigned when
            // the main declaration is processed.
            return;
        }
        const options = {
            declaredReleaseTag: api_extractor_model_1.ReleaseTag.None,
            effectiveReleaseTag: api_extractor_model_1.ReleaseTag.None,
            isEventProperty: false,
            isOverride: false,
            isSealed: false,
            isVirtual: false,
            isPreapproved: false,
            releaseTagSameAsParent: false
        };
        const parserContext = declarationMetadata.tsdocParserContext;
        if (parserContext) {
            const modifierTagSet = parserContext.docComment.modifierTagSet;
            let declaredReleaseTag = api_extractor_model_1.ReleaseTag.None;
            let extraReleaseTags = false;
            if (modifierTagSet.isPublic()) {
                declaredReleaseTag = api_extractor_model_1.ReleaseTag.Public;
            }
            if (modifierTagSet.isBeta()) {
                if (declaredReleaseTag !== api_extractor_model_1.ReleaseTag.None) {
                    extraReleaseTags = true;
                }
                else {
                    declaredReleaseTag = api_extractor_model_1.ReleaseTag.Beta;
                }
            }
            if (modifierTagSet.isAlpha()) {
                if (declaredReleaseTag !== api_extractor_model_1.ReleaseTag.None) {
                    extraReleaseTags = true;
                }
                else {
                    declaredReleaseTag = api_extractor_model_1.ReleaseTag.Alpha;
                }
            }
            if (modifierTagSet.isInternal()) {
                if (declaredReleaseTag !== api_extractor_model_1.ReleaseTag.None) {
                    extraReleaseTags = true;
                }
                else {
                    declaredReleaseTag = api_extractor_model_1.ReleaseTag.Internal;
                }
            }
            if (extraReleaseTags) {
                if (!astDeclaration.astSymbol.isExternal) {
                    // for now, don't report errors for external code
                    this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.ExtraReleaseTag, 'The doc comment should not contain more than one release tag', astDeclaration);
                }
            }
            options.declaredReleaseTag = declaredReleaseTag;
            options.isEventProperty = modifierTagSet.isEventProperty();
            options.isOverride = modifierTagSet.isOverride();
            options.isSealed = modifierTagSet.isSealed();
            options.isVirtual = modifierTagSet.isVirtual();
            const preapprovedTag = this.extractorConfig.tsdocConfiguration.tryGetTagDefinition('@preapproved');
            if (preapprovedTag && modifierTagSet.hasTag(preapprovedTag)) {
                // This feature only makes sense for potentially big declarations.
                switch (astDeclaration.declaration.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.ModuleDeclaration:
                        if (declaredReleaseTag === api_extractor_model_1.ReleaseTag.Internal) {
                            options.isPreapproved = true;
                        }
                        else {
                            this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.PreapprovedBadReleaseTag, `The @preapproved tag cannot be applied to "${astDeclaration.astSymbol.localName}"` +
                                ` without an @internal release tag`, astDeclaration);
                        }
                        break;
                    default:
                        this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.PreapprovedUnsupportedType, `The @preapproved tag cannot be applied to "${astDeclaration.astSymbol.localName}"` +
                            ` because it is not a supported declaration type`, astDeclaration);
                        break;
                }
            }
        }
        // This needs to be set regardless of whether or not a parserContext exists
        if (astDeclaration.parent) {
            const parentApiItemMetadata = this.fetchApiItemMetadata(astDeclaration.parent);
            options.effectiveReleaseTag =
                options.declaredReleaseTag === api_extractor_model_1.ReleaseTag.None
                    ? parentApiItemMetadata.effectiveReleaseTag
                    : options.declaredReleaseTag;
            options.releaseTagSameAsParent =
                parentApiItemMetadata.effectiveReleaseTag === options.effectiveReleaseTag;
        }
        else {
            options.effectiveReleaseTag = options.declaredReleaseTag;
        }
        if (options.effectiveReleaseTag === api_extractor_model_1.ReleaseTag.None) {
            if (!astDeclaration.astSymbol.isExternal) {
                // for now, don't report errors for external code
                // Don't report missing release tags for forgotten exports (unless we're including forgotten exports
                // in either the API report or doc model).
                const astSymbol = astDeclaration.astSymbol;
                const entity = this._entitiesByAstEntity.get(astSymbol.rootAstSymbol);
                if (entity &&
                    (entity.consumable ||
                        this.extractorConfig.apiReportIncludeForgottenExports ||
                        this.extractorConfig.docModelIncludeForgottenExports)) {
                    // We also don't report errors for the default export of an entry point, since its doc comment
                    // isn't easy to obtain from the .d.ts file
                    if (astSymbol.rootAstSymbol.localName !== '_default') {
                        this.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.MissingReleaseTag, `"${entity.astEntity.localName}" is part of the package's API, but it is missing ` +
                            `a release tag (@alpha, @beta, @public, or @internal)`, astSymbol);
                    }
                }
            }
            options.effectiveReleaseTag = api_extractor_model_1.ReleaseTag.Public;
        }
        const apiItemMetadata = new ApiItemMetadata_1.ApiItemMetadata(options);
        if (parserContext) {
            apiItemMetadata.tsdocComment = parserContext.docComment;
        }
        astDeclaration.apiItemMetadata = apiItemMetadata;
        // Lastly, share the result with any ancillary declarations
        for (const ancillaryDeclaration of declarationMetadata.ancillaryDeclarations) {
            ancillaryDeclaration.apiItemMetadata = apiItemMetadata;
        }
    }
    _parseTsdocForAstDeclaration(astDeclaration) {
        const declaration = astDeclaration.declaration;
        let nodeForComment = declaration;
        if (ts.isVariableDeclaration(declaration)) {
            // Variable declarations are special because they can be combined into a list.  For example:
            //
            // /** A */ export /** B */ const /** C */ x = 1, /** D **/ [ /** E */ y, z] = [3, 4];
            //
            // The compiler will only emit comments A and C in the .d.ts file, so in general there isn't a well-defined
            // way to document these parts.  API Extractor requires you to break them into separate exports like this:
            //
            // /** A */ export const x = 1;
            //
            // But _getReleaseTagForDeclaration() still receives a node corresponding to "x", so we need to walk upwards
            // and find the containing statement in order for getJSDocCommentRanges() to read the comment that we expect.
            const statement = TypeScriptHelpers_1.TypeScriptHelpers.findFirstParent(declaration, ts.SyntaxKind.VariableStatement);
            if (statement !== undefined) {
                // For a compound declaration, fall back to looking for C instead of A
                if (statement.declarationList.declarations.length === 1) {
                    nodeForComment = statement;
                }
            }
        }
        const sourceFileText = declaration.getSourceFile().text;
        const ranges = TypeScriptInternals_1.TypeScriptInternals.getJSDocCommentRanges(nodeForComment, sourceFileText) || [];
        if (ranges.length === 0) {
            return undefined;
        }
        // We use the JSDoc comment block that is closest to the definition, i.e.
        // the last one preceding it
        const range = ranges[ranges.length - 1];
        const tsdocTextRange = tsdoc.TextRange.fromStringRange(sourceFileText, range.pos, range.end);
        const parserContext = this._tsdocParser.parseRange(tsdocTextRange);
        this.messageRouter.addTsdocMessages(parserContext, declaration.getSourceFile(), astDeclaration);
        // We delete the @privateRemarks block as early as possible, to ensure that it never leaks through
        // into one of the output files.
        parserContext.docComment.privateRemarks = undefined;
        return parserContext;
    }
    _collectReferenceDirectives(astEntity) {
        // Here, we're collecting reference directives from source files that contain extracted
        // definitions (i.e. - files that contain `export class ...`, `export interface ...`, ...).
        // These references may or may not include the `preserve="true" attribute. In TS < 5.5,
        // references that end up in .D.TS files may or may not be explicity written by the developer.
        // In TS >= 5.5, only references that are explicitly authored and are marked with
        // `preserve="true"` are included in the output. See https://github.com/microsoft/TypeScript/pull/57681
        //
        // The calls to `_collectReferenceDirectivesFromSourceFiles` in this function are
        // preserving existing behavior, which is to include all reference directives
        // regardless of whether they are explicitly authored or not, but only in files that
        // contain definitions.
        if (astEntity instanceof AstSymbol_1.AstSymbol) {
            const sourceFiles = astEntity.astDeclarations.map((astDeclaration) => astDeclaration.declaration.getSourceFile());
            return this._collectReferenceDirectivesFromSourceFiles(sourceFiles, false);
        }
        if (astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
            const sourceFiles = [astEntity.astModule.sourceFile];
            return this._collectReferenceDirectivesFromSourceFiles(sourceFiles, false);
        }
    }
    _collectReferenceDirectivesFromSourceFiles(sourceFiles, onlyIncludeExplicitlyPreserved) {
        const seenFilenames = new Set();
        for (const sourceFile of sourceFiles) {
            if (sourceFile === null || sourceFile === void 0 ? void 0 : sourceFile.fileName) {
                const { fileName, typeReferenceDirectives, libReferenceDirectives, text: sourceFileText } = sourceFile;
                if (!seenFilenames.has(fileName)) {
                    seenFilenames.add(fileName);
                    for (const typeReferenceDirective of typeReferenceDirectives) {
                        const name = this._getReferenceDirectiveFromSourceFile(sourceFileText, typeReferenceDirective, onlyIncludeExplicitlyPreserved);
                        if (name) {
                            this._dtsTypeReferenceDirectives.add(name);
                        }
                    }
                    for (const libReferenceDirective of libReferenceDirectives) {
                        const reference = this._getReferenceDirectiveFromSourceFile(sourceFileText, libReferenceDirective, onlyIncludeExplicitlyPreserved);
                        if (reference) {
                            this._dtsLibReferenceDirectives.add(reference);
                        }
                    }
                }
            }
        }
    }
    _getReferenceDirectiveFromSourceFile(sourceFileText, { pos, end, preserve }, onlyIncludeExplicitlyPreserved) {
        const reference = sourceFileText.substring(pos, end);
        if (preserve || !onlyIncludeExplicitlyPreserved) {
            return reference;
        }
    }
}
exports.Collector = Collector;
//# sourceMappingURL=Collector.js.map