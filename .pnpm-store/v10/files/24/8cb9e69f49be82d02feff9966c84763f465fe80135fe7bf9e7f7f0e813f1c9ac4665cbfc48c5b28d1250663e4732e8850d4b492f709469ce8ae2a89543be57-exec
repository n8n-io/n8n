/// <reference types="node" />
import { RepoMappings } from './repository';
/**
 * Class that provides methods for resolving Bazel runfiles.
 */
export declare class Runfiles {
    private _env;
    manifest: Map<string, string> | undefined;
    runfilesDir: string | undefined;
    /**
     * If the environment gives us enough hints, we can know the workspace name
     */
    workspace: string | undefined;
    /**
     * If the environment gives us enough hints, we can know the package path
     */
    package: string | undefined;
    /**
     * If the environment has repo mappings, we can use them to resolve repo relative paths.
     */
    repoMappings: RepoMappings | undefined;
    private _runfilesResolutionError;
    constructor(_env?: NodeJS.ProcessEnv);
    private _assertRunfilesResolved;
    /** Resolves the given path from the runfile manifest. */
    private _resolveFromManifest;
    /**
     * The runfiles manifest maps from short_path
     * https://docs.bazel.build/versions/main/skylark/lib/File.html#short_path
     * to the actual location on disk where the file can be read.
     *
     * In a sandboxed execution, it does not exist. In that case, runfiles must be
     * resolved from a symlink tree under the runfiles dir.
     * See https://github.com/bazelbuild/bazel/issues/3726
     */
    loadRunfilesManifest(manifestPath: string): Map<any, any>;
    parseRepoMapping(runfilesDir: string): RepoMappings | undefined;
    /** Resolves the given module path. */
    resolve(modulePath: string, sourceRepo?: string): string;
    /** Resolves the given path relative to the current Bazel workspace. */
    resolveWorkspaceRelative(modulePath: string): string;
    /** Resolves the given path relative to the current Bazel package. */
    resolvePackageRelative(modulePath: string): string;
    /**
     * Patches the default Node.js resolution to support runfile resolution.
     * @deprecated Use the runfile helpers directly instead.
     **/
    patchRequire(): void;
    /** Helper for resolving a given module recursively in the runfiles. */
    private _resolve;
}
