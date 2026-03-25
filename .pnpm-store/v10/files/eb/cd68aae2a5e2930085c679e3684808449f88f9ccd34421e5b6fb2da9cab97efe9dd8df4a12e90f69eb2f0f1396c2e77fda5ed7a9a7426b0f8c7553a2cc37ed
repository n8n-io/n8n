import type * as _ts from 'typescript';
/**
 * Common TypeScript interfaces between versions.  We endeavour to write ts-node's own code against these types instead
 * of against `import "typescript"`, though we are not yet doing this consistently.
 *
 * Sometimes typescript@next adds an API we need to use.  But we build ts-node against typescript@latest.
 * In these cases, we must declare that API explicitly here.  Our declarations include the newer typescript@next APIs.
 * Importantly, these re-declarations are *not* TypeScript internals.  They are public APIs that only exist in
 * pre-release versions of typescript.
 */
export interface TSCommon {
    version: typeof _ts.version;
    sys: typeof _ts.sys;
    ScriptSnapshot: typeof _ts.ScriptSnapshot;
    displayPartsToString: typeof _ts.displayPartsToString;
    createLanguageService: typeof _ts.createLanguageService;
    getDefaultLibFilePath: typeof _ts.getDefaultLibFilePath;
    getPreEmitDiagnostics: typeof _ts.getPreEmitDiagnostics;
    flattenDiagnosticMessageText: typeof _ts.flattenDiagnosticMessageText;
    transpileModule: typeof _ts.transpileModule;
    ModuleKind: TSCommon.ModuleKindEnum;
    ScriptTarget: typeof _ts.ScriptTarget;
    findConfigFile: typeof _ts.findConfigFile;
    readConfigFile: typeof _ts.readConfigFile;
    parseJsonConfigFileContent: typeof _ts.parseJsonConfigFileContent;
    formatDiagnostics: typeof _ts.formatDiagnostics;
    formatDiagnosticsWithColorAndContext: typeof _ts.formatDiagnosticsWithColorAndContext;
    createDocumentRegistry: typeof _ts.createDocumentRegistry;
    JsxEmit: typeof _ts.JsxEmit;
    createModuleResolutionCache: typeof _ts.createModuleResolutionCache;
    resolveModuleName: typeof _ts.resolveModuleName;
    resolveModuleNameFromCache: typeof _ts.resolveModuleNameFromCache;
    resolveTypeReferenceDirective: typeof _ts.resolveTypeReferenceDirective;
    createIncrementalCompilerHost: typeof _ts.createIncrementalCompilerHost;
    createSourceFile: typeof _ts.createSourceFile;
    getDefaultLibFileName: typeof _ts.getDefaultLibFileName;
    createIncrementalProgram: typeof _ts.createIncrementalProgram;
    createEmitAndSemanticDiagnosticsBuilderProgram: typeof _ts.createEmitAndSemanticDiagnosticsBuilderProgram;
    Extension: typeof _ts.Extension;
    ModuleResolutionKind: typeof _ts.ModuleResolutionKind;
}
export declare namespace TSCommon {
    interface LanguageServiceHost extends _ts.LanguageServiceHost {
    }
    type ModuleResolutionHost = _ts.ModuleResolutionHost;
    type ParsedCommandLine = _ts.ParsedCommandLine;
    type ResolvedModule = _ts.ResolvedModule;
    type ResolvedTypeReferenceDirective = _ts.ResolvedTypeReferenceDirective;
    type CompilerOptions = _ts.CompilerOptions;
    type ResolvedProjectReference = _ts.ResolvedProjectReference;
    type ResolvedModuleWithFailedLookupLocations = _ts.ResolvedModuleWithFailedLookupLocations;
    type FileReference = _ts.FileReference;
    type SourceFile = _ts.SourceFile;
    type ModuleKindEnum = typeof _ts.ModuleKind & {
        Node16: typeof _ts.ModuleKind extends {
            Node16: any;
        } ? typeof _ts.ModuleKind['Node16'] : 100;
    };
    namespace ModuleKind {
        type CommonJS = _ts.ModuleKind.CommonJS;
        type ESNext = _ts.ModuleKind.ESNext;
    }
}
