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
}): string;
export declare function generateModuleMetadataInjectorCode(metadata: any): string;
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
export {};
//# sourceMappingURL=utils.d.ts.map