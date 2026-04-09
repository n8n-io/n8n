import type { PackageJson } from '@package-json/types';
export type PackageDeps = ReturnType<typeof extractDepFields>;
declare function extractDepFields(pkg: PackageJson): {
    dependencies: import("@package-json/types").Dependency;
    devDependencies: import("@package-json/types").DevDependency;
    optionalDependencies: import("@package-json/types").OptionalDependency;
    peerDependencies: import("@package-json/types").PeerDependency;
    bundledDependencies: string[];
};
export interface DepDeclaration {
    isInDeps: boolean;
    isInDevDeps: boolean;
    isInOptDeps: boolean;
    isInPeerDeps: boolean;
    isInBundledDeps: boolean;
}
export interface DepsOptions {
    allowDevDeps: boolean;
    allowOptDeps: boolean;
    allowPeerDeps: boolean;
    allowBundledDeps: boolean;
    verifyInternalDeps: boolean;
    verifyTypeImports: boolean;
}
export interface Options {
    packageDir?: string | string[];
    devDependencies?: boolean | string[];
    optionalDependencies?: boolean | string[];
    peerDependencies?: boolean | string[];
    bundledDependencies?: boolean | string[];
    includeInternal?: boolean;
    includeTypes?: boolean;
    whitelist?: string[];
}
export type MessageId = 'pkgNotFound' | 'pkgUnparsable' | 'devDep' | 'optDep' | 'missing';
declare const _default: import("@typescript-eslint/utils/ts-eslint").RuleModule<MessageId, [(Options | undefined)?], import("../utils/create-rule.ts").ImportXPluginDocs, import("@typescript-eslint/utils/ts-eslint").RuleListener>;
export default _default;
