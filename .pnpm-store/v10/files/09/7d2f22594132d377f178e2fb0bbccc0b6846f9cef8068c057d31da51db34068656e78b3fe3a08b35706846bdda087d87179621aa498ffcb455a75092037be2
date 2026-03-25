import { PackageJson } from 'pkg-types';

interface PackageInfo {
    name: string;
    rootPath: string;
    packageJsonPath: string;
    version: string;
    packageJson: PackageJson;
}
interface PackageResolvingOptions {
    paths?: string[];
    /**
     * @default 'auto'
     * Resolve path as posix or win32
     */
    platform?: 'posix' | 'win32' | 'auto';
}
declare function resolveModule(name: string, options?: PackageResolvingOptions): string | undefined;
declare function importModule<T = any>(path: string): Promise<T>;
declare function isPackageExists(name: string, options?: PackageResolvingOptions): boolean;
declare function getPackageInfo(name: string, options?: PackageResolvingOptions): Promise<{
    name: string;
    version: string | undefined;
    rootPath: string;
    packageJsonPath: string;
    packageJson: PackageJson;
} | undefined>;
declare function getPackageInfoSync(name: string, options?: PackageResolvingOptions): {
    name: string;
    version: string | undefined;
    rootPath: string;
    packageJsonPath: string;
    packageJson: PackageJson;
} | undefined;
declare function loadPackageJSON(cwd?: string): Promise<PackageJson | null>;
declare function isPackageListed(name: string, cwd?: string): Promise<boolean>;

export { type PackageInfo, type PackageResolvingOptions, getPackageInfo, getPackageInfoSync, importModule, isPackageExists, isPackageListed, loadPackageJSON, resolveModule };
