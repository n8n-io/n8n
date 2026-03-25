import type { HelperManager } from "./HelperManager";
import type { Options } from "./index";
import type NameManager from "./NameManager";
import type TokenProcessor from "./TokenProcessor";
/**
 * Class responsible for preprocessing and bookkeeping import and export declarations within the
 * file.
 *
 * TypeScript uses a simpler mechanism that does not use functions like interopRequireDefault and
 * interopRequireWildcard, so we also allow that mode for compatibility.
 */
export default class CJSImportProcessor {
    readonly nameManager: NameManager;
    readonly tokens: TokenProcessor;
    readonly enableLegacyTypeScriptModuleInterop: boolean;
    readonly options: Options;
    readonly isTypeScriptTransformEnabled: boolean;
    readonly keepUnusedImports: boolean;
    readonly helperManager: HelperManager;
    private nonTypeIdentifiers;
    private importInfoByPath;
    private importsToReplace;
    private identifierReplacements;
    private exportBindingsByLocalName;
    constructor(nameManager: NameManager, tokens: TokenProcessor, enableLegacyTypeScriptModuleInterop: boolean, options: Options, isTypeScriptTransformEnabled: boolean, keepUnusedImports: boolean, helperManager: HelperManager);
    preprocessTokens(): void;
    /**
     * In TypeScript, import statements that only import types should be removed.
     * This includes `import {} from 'foo';`, but not `import 'foo';`.
     */
    pruneTypeOnlyImports(): void;
    shouldAutomaticallyElideImportedName(name: string): boolean;
    private generateImportReplacements;
    getFreeIdentifierForPath(path: string): string;
    private preprocessImportAtIndex;
    private preprocessExportAtIndex;
    private preprocessVarExportAtIndex;
    /**
     * Walk this export statement just in case it's an export...from statement.
     * If it is, combine it into the import info for that path. Otherwise, just
     * bail out; it'll be handled later.
     */
    private preprocessNamedExportAtIndex;
    private preprocessExportStarAtIndex;
    private getNamedImports;
    /**
     * Get a mutable import info object for this path, creating one if it doesn't
     * exist yet.
     */
    private getImportInfo;
    private addExportBinding;
    /**
     * Return the code to use for the import for this path, or the empty string if
     * the code has already been "claimed" by a previous import.
     */
    claimImportCode(importPath: string): string;
    getIdentifierReplacement(identifierName: string): string | null;
    /**
     * Return a string like `exports.foo = exports.bar`.
     */
    resolveExportBinding(assignedName: string): string | null;
    /**
     * Return all imported/exported names where we might be interested in whether usages of those
     * names are shadowed.
     */
    getGlobalNames(): Set<string>;
}
