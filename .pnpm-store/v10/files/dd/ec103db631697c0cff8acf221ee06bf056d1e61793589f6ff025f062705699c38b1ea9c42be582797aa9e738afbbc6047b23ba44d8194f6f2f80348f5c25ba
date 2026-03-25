import type * as ts from 'typescript';
import type { AstEntity } from './AstEntity';
/**
 * Represents information collected by {@link AstSymbolTable.fetchAstModuleExportInfo}
 */
export interface IAstModuleExportInfo {
    readonly visitedAstModules: Set<AstModule>;
    readonly exportedLocalEntities: Map<string, AstEntity>;
    readonly starExportedExternalModules: Set<AstModule>;
}
/**
 * Constructor parameters for AstModule
 *
 * @privateRemarks
 * Our naming convention is to use I____Parameters for constructor options and
 * I____Options for general function options.  However the word "parameters" is
 * confusingly similar to the terminology for function parameters modeled by API Extractor,
 * so we use I____Options for both cases in this code base.
 */
export interface IAstModuleOptions {
    sourceFile: ts.SourceFile;
    moduleSymbol: ts.Symbol;
    externalModulePath: string | undefined;
}
/**
 * An internal data structure that represents a source file that is analyzed by AstSymbolTable.
 */
export declare class AstModule {
    /**
     * The source file that declares this TypeScript module.  In most cases, the source file's
     * top-level exports constitute the module.
     */
    readonly sourceFile: ts.SourceFile;
    /**
     * The symbol for the module.  Typically this corresponds to ts.SourceFile itself, however
     * in some cases the ts.SourceFile may contain multiple modules declared using the `module` keyword.
     */
    readonly moduleSymbol: ts.Symbol;
    /**
     * Example:  "@rushstack/node-core-library/lib/FileSystem"
     * but never: "./FileSystem"
     */
    readonly externalModulePath: string | undefined;
    /**
     * A list of other `AstModule` objects that appear in `export * from "___";` statements.
     */
    readonly starExportedModules: Set<AstModule>;
    /**
     * A partial map of entities exported by this module.  The key is the exported name.
     */
    readonly cachedExportedEntities: Map<string, AstEntity>;
    /**
     * Additional state calculated by `AstSymbolTable.fetchWorkingPackageModule()`.
     */
    astModuleExportInfo: IAstModuleExportInfo | undefined;
    constructor(options: IAstModuleOptions);
    /**
     * If false, then this source file is part of the working package being processed by the `Collector`.
     */
    get isExternal(): boolean;
}
//# sourceMappingURL=AstModule.d.ts.map