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
    packageManagerVersion?: string;
    preferOffline?: boolean;
    additionalArgs?: string[];
}
declare function installPackage(names: string | string[], options?: InstallPackageOptions): Promise<tinyexec.Output>;

export { type InstallPackageOptions, type PackageManager, detectPackageManager, installPackage };
