/* tslint:disable */
/* eslint-disable */
/**
 * Create a new instrumentation matcher from an array of instrumentation configs.
 */
export function create(configs: InstrumentationConfig[], dc_module?: string | null): InstrumentationMatcher;
/**
 * Output of a transformation operation
 */
export interface TransformOutput {
    /**
     * The transformed JavaScript code
     */
    code: string;
    /**
     * The sourcemap for the transformation (if generated)
     */
    map: string | undefined;
}

/**
 * Configuration for injecting instrumentation code
 */
export interface InstrumentationConfig {
    /**
     * The name of the diagnostics channel to publish to
     */
    channelName: string;
    /**
     * The module matcher to identify the module and file to instrument
     */
    module: ModuleMatcher;
    /**
     * The function query to identify the function to instrument
     */
    functionQuery: FunctionQuery;
}

/**
 * Describes the module and file path you would like to match
 */
export interface ModuleMatcher {
    /**
     * The name of the module you want to match
     */
    name: string;
    /**
     * The semver range that you want to match
     */
    versionRange: string;
    /**
     * The path of the file you want to match from the module root
     */
    filePath: string;
}

/**
 * Describes which function to instrument
 */
export type FunctionQuery = { className: string; methodName: string; kind: FunctionKind; index?: number } | { className: string; index?: number } | { methodName: string; kind: FunctionKind; index?: number } | { functionName: string; kind: FunctionKind; index?: number } | { expressionName: string; kind: FunctionKind; index?: number };

/**
 * The kind of function - Sync or returns a promise
 */
export type FunctionKind = "Sync" | "Async";

/**
 * The type of module being passed - ESM, CJS or unknown
 */
export type ModuleType = "esm" | "cjs" | "unknown";

/**
 * The InstrumentationMatcher is responsible for matching specific modules
 */
export class InstrumentationMatcher {
  private constructor();
  free(): void;
  /**
   * Get a transformer for the given module name, version and file path.
   * Returns `undefined` if no matching instrumentations are found.
   */
  getTransformer(module_name: string, version: string, file_path: string): Transformer | undefined;
}
/**
 * The Transformer is responsible for transforming JavaScript code.
 */
export class Transformer {
  private constructor();
  free(): void;
  /**
   * Transform JavaScript code and optionally sourcemap.
   *
   * # Errors
   * Returns an error if the transformation fails to find injection points.
   */
  transform(code: string, module_type: ModuleType, sourcemap?: string | null): TransformOutput;
}
