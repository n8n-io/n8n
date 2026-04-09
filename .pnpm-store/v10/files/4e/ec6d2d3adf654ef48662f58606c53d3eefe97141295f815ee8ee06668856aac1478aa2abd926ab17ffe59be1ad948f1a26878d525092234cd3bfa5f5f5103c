import { Agent } from 'package-manager-detector';
export { Agent } from 'package-manager-detector';
import * as tinyexec from 'tinyexec';

type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun';
declare function detectPackageManager(cwd?: string): Promise<Agent | null>;

interface InstallPackageOptions {
    cwd?: string;
    dev?: boolean;
    silent?: boolean;
    packageManager?: string;
    preferOffline?: boolean;
    additionalArgs?: string[] | ((agent: string, detectedAgent: string) => string[] | undefined);
}
declare function installPackage(names: string | string[], options?: InstallPackageOptions): Promise<tinyexec.Output>;

interface UninstallPackageOptions {
    cwd?: string;
    dev?: boolean;
    silent?: boolean;
    packageManager?: string;
    additionalArgs?: string[];
}
declare function uninstallPackage(names: string | string[], options?: UninstallPackageOptions): Promise<tinyexec.Output>;

export { type InstallPackageOptions, type PackageManager, type UninstallPackageOptions, detectPackageManager, installPackage, uninstallPackage };
