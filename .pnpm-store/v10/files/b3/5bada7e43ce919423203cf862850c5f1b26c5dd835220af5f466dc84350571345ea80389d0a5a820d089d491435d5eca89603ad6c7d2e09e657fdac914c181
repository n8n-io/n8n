type PackageManagerName = "npm" | "yarn" | "pnpm" | "bun" | "deno";
type PackageManager = {
    name: PackageManagerName;
    command: string;
    version?: string;
    buildMeta?: string;
    majorVersion?: string;
    lockFile?: string | string[];
    files?: string[];
};
type OperationOptions = {
    cwd?: string;
    silent?: boolean;
    packageManager?: PackageManager | PackageManagerName;
    installPeerDependencies?: boolean;
    dev?: boolean;
    workspace?: boolean | string;
    global?: boolean;
};

type DetectPackageManagerOptions = {
    /**
     * Whether to ignore the lock file
     *
     * @default false
     */
    ignoreLockFile?: boolean;
    /**
     * Whether to ignore the package.json file
     *
     * @default false
     */
    ignorePackageJSON?: boolean;
    /**
     * Whether to include parent directories
     *
     * @default false
     */
    includeParentDirs?: boolean;
    /**
     * Weather to ignore argv[1] to detect script
     */
    ignoreArgv?: boolean;
};
declare const packageManagers: PackageManager[];
/**
 * Detect the package manager used in a directory (and up) by checking various sources:
 *
 * 1. Use `packageManager` field from package.json
 *
 * 2. Known lock files and other files
 */
declare function detectPackageManager(cwd: string, options?: DetectPackageManagerOptions): Promise<(PackageManager & {
    warnings?: string[];
}) | undefined>;

/**
 * Installs project dependencies.
 *
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.frozenLockFile - Whether to install dependencies with frozen lock file.
 */
declare function installDependencies(options?: Pick<OperationOptions, "cwd" | "silent" | "packageManager"> & {
    frozenLockFile?: boolean;
}): Promise<void>;
/**
 * Adds dependency to the project.
 *
 * @param name - Name of the dependency to add.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.dev - Whether to add the dependency as dev dependency.
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 */
declare function addDependency(name: string | string[], options?: OperationOptions): Promise<void>;
/**
 * Adds dev dependency to the project.
 *
 * @param name - Name of the dev dependency to add.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 *
 */
declare function addDevDependency(name: string | string[], options?: Omit<OperationOptions, "dev">): Promise<void>;
/**
 * Removes dependency from the project.
 *
 * @param name - Name of the dependency to remove.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.silent - Whether to run the command in silent mode.
 * @param options.packageManager - The package manager info to use (auto-detected).
 * @param options.dev - Whether to remove dev dependency.
 * @param options.workspace - The name of the workspace to use.
 * @param options.global - Whether to run the command in global mode.
 */
declare function removeDependency(name: string, options?: OperationOptions): Promise<void>;
/**
 * Ensures dependency is installed.
 *
 * @param name - Name of the dependency.
 * @param options - Options to pass to the API call.
 * @param options.cwd - The directory to run the command in.
 * @param options.dev - Whether to install as dev dependency (if not already installed).
 * @param options.workspace - The name of the workspace to install dependency in (if not already installed).
 */
declare function ensureDependencyInstalled(name: string, options?: Pick<OperationOptions, "cwd" | "dev" | "workspace">): Promise<true | undefined>;
declare function dedupeDependencies(options?: Pick<OperationOptions, "cwd" | "silent"> & {
    recreateLockfile?: boolean;
}): Promise<void>;

export { type DetectPackageManagerOptions, type OperationOptions, type PackageManager, type PackageManagerName, addDependency, addDevDependency, dedupeDependencies, detectPackageManager, ensureDependencyInstalled, installDependencies, packageManagers, removeDependency };
