import type { HelperManager } from "../HelperManager";
import type { Options } from "../index";
import type NameManager from "../NameManager";
import type TokenProcessor from "../TokenProcessor";
import type ReactHotLoaderTransformer from "./ReactHotLoaderTransformer";
import Transformer from "./Transformer";
/**
 * Class for editing import statements when we are keeping the code as ESM. We still need to remove
 * type-only imports in TypeScript and Flow.
 */
export default class ESMImportTransformer extends Transformer {
    readonly tokens: TokenProcessor;
    readonly nameManager: NameManager;
    readonly helperManager: HelperManager;
    readonly reactHotLoaderTransformer: ReactHotLoaderTransformer | null;
    readonly isTypeScriptTransformEnabled: boolean;
    readonly isFlowTransformEnabled: boolean;
    readonly keepUnusedImports: boolean;
    private nonTypeIdentifiers;
    private declarationInfo;
    private injectCreateRequireForImportRequire;
    constructor(tokens: TokenProcessor, nameManager: NameManager, helperManager: HelperManager, reactHotLoaderTransformer: ReactHotLoaderTransformer | null, isTypeScriptTransformEnabled: boolean, isFlowTransformEnabled: boolean, keepUnusedImports: boolean, options: Options);
    process(): boolean;
    private processImportEquals;
    private processImport;
    /**
     * Remove type bindings from this import, leaving the rest of the import intact.
     *
     * Return true if this import was ONLY types, and thus is eligible for removal. This will bail out
     * of the replacement operation, so we can return early here.
     */
    private removeImportTypeBindings;
    private shouldAutomaticallyElideImportedName;
    private processExportDefault;
    /**
     * Handle a statement with one of these forms:
     * export {a, type b};
     * export {c, type d} from 'foo';
     *
     * In both cases, any explicit type exports should be removed. In the first
     * case, we also need to handle implicit export elision for names declared as
     * types. In the second case, we must NOT do implicit named export elision,
     * but we must remove the runtime import if all exports are type exports.
     */
    private processNamedExports;
    /**
     * ESM elides all imports with the rule that we only elide if we see that it's
     * a type and never see it as a value. This is in contrast to CJS, which
     * elides imports that are completely unknown.
     */
    private shouldElideExportedName;
}
