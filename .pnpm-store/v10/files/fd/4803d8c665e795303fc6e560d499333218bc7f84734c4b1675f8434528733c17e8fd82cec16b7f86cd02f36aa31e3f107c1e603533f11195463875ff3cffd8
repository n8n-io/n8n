import * as quansync_types from 'quansync/types';
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
declare const getPackageInfo: quansync_types.QuansyncFn<{
    name: string;
    version: string | undefined;
    rootPath: string;
    packageJsonPath: string;
    packageJson: PackageJson;
} | undefined, [name: string, options?: PackageResolvingOptions | undefined]>;
declare const getPackageInfoSync: (name: string, options?: PackageResolvingOptions | undefined) => {
    name: string;
    version: string | undefined;
    rootPath: string;
    packageJsonPath: string;
    packageJson: PackageJson;
} | undefined;
declare const loadPackageJSON: quansync_types.QuansyncFn<PackageJson | null, [cwd?: Args[0] | undefined]>;
declare const loadPackageJSONSync: (cwd?: Args[0] | undefined) => PackageJson | null;
declare const isPackageListed: quansync_types.QuansyncFn<boolean, [name: string, cwd?: string | undefined]>;
declare const isPackageListedSync: (name: string, cwd?: string | undefined) => boolean;

export { type PackageInfo, type PackageResolvingOptions, getPackageInfo, getPackageInfoSync, importModule, isPackageExists, isPackageListed, isPackageListedSync, loadPackageJSON, loadPackageJSONSync, resolveModule };
