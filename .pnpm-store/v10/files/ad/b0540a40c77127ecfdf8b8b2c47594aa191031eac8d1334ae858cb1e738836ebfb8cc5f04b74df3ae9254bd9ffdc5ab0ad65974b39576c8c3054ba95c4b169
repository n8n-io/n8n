import * as _jsdevtools_ez_spawn from '@jsdevtools/ez-spawn';

type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';
declare const AGENTS: readonly ["pnpm", "yarn", "npm", "pnpm@6", "yarn@berry", "bun"];
type Agent = typeof AGENTS[number];
declare function detectPackageManager(cwd?: string): Promise<Agent | null>;

interface InstallPackageOptions {
    cwd?: string;
    dev?: boolean;
    silent?: boolean;
    packageManager?: string;
    packageManagerVersion?: string;
    preferOffline?: boolean;
    additionalArgs?: string[];
}
declare function installPackage(names: string | string[], options?: InstallPackageOptions): Promise<_jsdevtools_ez_spawn.Process<string>>;

export { type Agent, type InstallPackageOptions, type PackageManager, detectPackageManager, installPackage };
