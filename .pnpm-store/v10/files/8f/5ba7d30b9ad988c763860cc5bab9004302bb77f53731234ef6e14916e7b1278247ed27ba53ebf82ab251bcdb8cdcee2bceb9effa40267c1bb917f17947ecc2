import { SourceMap } from "magic-string";
/**
 * Checks whether the given input is already an array, and if it isn't, wraps it in one.
 *
 * @param maybeArray Input to turn into an array, if necessary
 * @returns The input, if already an array, or an array with the input as the only element, if not
 */
export declare function arrayify<T = unknown>(maybeArray: T | T[]): T[];
type PackageJson = Record<string, unknown>;
/**
 * Get the closes package.json from a given starting point upwards.
 * This handles a few edge cases:
 * * Check if a given file package.json appears to be an actual NPM package.json file
 * * Stop at the home dir, to avoid looking too deeply
 */
export declare function getPackageJson({ cwd, stopAt }?: {
    cwd?: string;
    stopAt?: string;
}): PackageJson | undefined;
export declare function parseMajorVersion(version: string): number | undefined;
export declare function getDependencies(packageJson: PackageJson): {
    deps: string[];
    depsVersions: Record<string, number>;
};
/**
 * Deterministically hashes a string and turns the hash into a uuid.
 */
export declare function stringToUUID(str: string): string;
/**
 * Tries to guess a release name based on environmental data.
 */
export declare function determineReleaseName(): string | undefined;
/**
 * Generates code for the global injector which is responsible for setting the global
 * `SENTRY_RELEASE` & `SENTRY_BUILD_INFO` variables.
 */
export declare function generateGlobalInjectorCode({ release, injectBuildInformation, }: {
    release: string;
    injectBuildInformation: boolean;
}): CodeInjection;
export declare function generateModuleMetadataInjectorCode(metadata: any): CodeInjection;
export declare function getBuildInformation(): {
    deps: string[];
    depsVersions: Record<string, number>;
    nodeVersion: number | undefined;
};
export declare function stripQueryAndHashFromPath(path: string): string;
export declare function replaceBooleanFlagsInCode(code: string, replacementValues: Record<string, boolean | undefined>): {
    code: string;
    map: SourceMap;
} | null;
export declare function getTurborepoEnvPassthroughWarning(envVarName: string): string;
/**
 * Gets the projects from the project option. This might be a single project or an array of projects.
 */
export declare function getProjects(project: string | string[] | undefined): string[] | undefined;
/**
 * Inlined functionality from @sentry/cli helper code to add `--ignore` options.
 *
 * Temporary workaround until we expose a function for injecting debug IDs. Currently, we directly call `execute` with CLI args to inject them.
 */
export declare function serializeIgnoreOptions(ignoreValue: string | string[] | undefined): string[];
/**
 * Checks if a chunk contains only import/export statements and no substantial code.
 *
 * In Vite MPA (multi-page application) mode, HTML entry points create "facade" chunks
 * that only contain import statements to load shared modules. These should not have
 * Sentry code injected. However, in SPA mode, the main bundle also has an HTML facade
 * but contains substantial application code that SHOULD have debug IDs injected.
 *
 * @ref https://github.com/getsentry/sentry-javascript-bundler-plugins/issues/829
 * @ref https://github.com/getsentry/sentry-javascript-bundler-plugins/issues/839
 */
export declare function containsOnlyImports(code: string): boolean;
export declare class CodeInjection {
    private body;
    private readonly header;
    private readonly footer;
    constructor(body?: string);
    code(): string;
    isEmpty(): boolean;
    append(code: CodeInjection | string): void;
    clear(): void;
    clone(): CodeInjection;
}
export {};
//# sourceMappingURL=utils.d.ts.map