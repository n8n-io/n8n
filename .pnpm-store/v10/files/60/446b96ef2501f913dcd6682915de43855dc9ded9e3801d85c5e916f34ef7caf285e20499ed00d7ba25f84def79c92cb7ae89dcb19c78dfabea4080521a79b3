import execa from 'execa';

declare type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';
declare const AGENTS: readonly ["pnpm", "yarn", "npm", "pnpm@6", "yarn@berry", "bun"];
declare type Agent = typeof AGENTS[number];
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
declare function installPackage(names: string | string[], options?: InstallPackageOptions): Promise<execa.ExecaReturnValue<string>>;

export { Agent, InstallPackageOptions, PackageManager, detectPackageManager, installPackage };
