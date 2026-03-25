interface PackageManifest {
    name: string;
    display: string;
    addon?: boolean;
    author?: string;
    description?: string;
    external?: string[];
    globals?: Record<string, string>;
    manualImport?: boolean;
    deprecated?: boolean;
    submodules?: boolean;
    build?: boolean;
    iife?: boolean;
    cjs?: boolean;
    mjs?: boolean;
    dts?: boolean;
    target?: string;
    utils?: boolean;
    copy?: string[];
}
interface VueUseFunction {
    name: string;
    package: string;
    importPath?: string;
    lastUpdated?: number;
    category?: string;
    description?: string;
    docs?: string;
    deprecated?: boolean;
    internal?: boolean;
    component?: boolean;
    directive?: boolean;
    external?: string;
    alias?: string[];
    related?: string[];
}
interface VueUsePackage extends PackageManifest {
    dir: string;
    docs?: string;
}
interface PackageIndexes {
    packages: Record<string, VueUsePackage>;
    categories: string[];
    functions: VueUseFunction[];
}
interface CommitInfo {
    functions: string[];
    version?: string;
    hash: string;
    date: string;
    message: string;
    refs?: string;
    body?: string;
    author_name: string;
    author_email: string;
}
interface ContributorInfo {
    name: string;
    count: number;
    hash: string;
}

declare const metadata: PackageIndexes;
declare const functions: VueUseFunction[];
declare const packages: Record<string, VueUsePackage>;
declare const categories: string[];
declare const functionNames: string[];
declare const categoryNames: string[];
declare const coreCategoryNames: string[];
declare const addonCategoryNames: string[];
declare function getFunction(name: string): VueUseFunction | undefined;

declare function getCategories(functions: VueUseFunction[]): string[];
declare function uniq<T extends any[]>(a: T): any[];

export { type CommitInfo, type ContributorInfo, type PackageIndexes, type PackageManifest, type VueUseFunction, type VueUsePackage, addonCategoryNames, categories, categoryNames, coreCategoryNames, functionNames, functions, getCategories, getFunction, metadata, packages, uniq };
