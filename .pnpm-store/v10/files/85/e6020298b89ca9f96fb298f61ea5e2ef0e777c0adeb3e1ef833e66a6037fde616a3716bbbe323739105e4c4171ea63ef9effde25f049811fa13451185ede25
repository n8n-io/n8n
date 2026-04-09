//#region types.d.ts
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
//#endregion
//#region metadata.d.ts
declare const metadata: PackageIndexes;
declare const functions: PackageIndexes["functions"];
declare const packages: PackageIndexes["packages"];
declare const categories: PackageIndexes["categories"];
declare const functionNames: string[];
declare const categoryNames: string[];
declare const coreCategoryNames: string[];
declare const addonCategoryNames: string[];
declare function getFunction(name: string): VueUseFunction | undefined;
//#endregion
//#region utils.d.ts
declare function getCategories(functions: VueUseFunction[]): string[];
declare function uniq<T extends any[]>(a: T): any[];
//#endregion
export { CommitInfo, ContributorInfo, PackageIndexes, PackageManifest, VueUseFunction, VueUsePackage, addonCategoryNames, categories, categoryNames, coreCategoryNames, functionNames, functions, getCategories, getFunction, metadata, packages, uniq };