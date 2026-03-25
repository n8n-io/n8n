import { BaseResolver } from './resolve';
import { SpecMajorVersion } from './oas-types';
import type { NormalizedNodeType, NodeType } from './types';
import type { NormalizedProblem } from './walk';
import type { Config, StyleguideConfig } from './config';
import type { Document, ResolvedRefMap } from './resolve';
import type { CollectFn } from './utils';
export declare enum OasVersion {
    Version2 = "oas2",
    Version3_0 = "oas3_0",
    Version3_1 = "oas3_1"
}
export type BundleOptions = {
    externalRefResolver?: BaseResolver;
    config: Config;
    dereference?: boolean;
    base?: string | null;
    skipRedoclyRegistryRefs?: boolean;
    removeUnusedComponents?: boolean;
    keepUrlRefs?: boolean;
};
export declare function bundleConfig(document: Document, resolvedRefMap: ResolvedRefMap): Promise<any>;
export declare function bundle(opts: {
    ref?: string;
    doc?: Document;
    collectSpecData?: CollectFn;
} & BundleOptions): Promise<BundleResult>;
export declare function bundleFromString(opts: {
    source: string;
    absoluteRef?: string;
} & BundleOptions): Promise<BundleResult>;
export type BundleResult = {
    bundle: Document;
    problems: NormalizedProblem[];
    fileDependencies: Set<string>;
    rootType: NormalizedNodeType;
    refTypes?: Map<string, NormalizedNodeType>;
    visitorsData: Record<string, Record<string, unknown>>;
};
export declare function bundleDocument(opts: {
    document: Document;
    config: StyleguideConfig;
    customTypes?: Record<string, NodeType>;
    externalRefResolver: BaseResolver;
    dereference?: boolean;
    skipRedoclyRegistryRefs?: boolean;
    removeUnusedComponents?: boolean;
    keepUrlRefs?: boolean;
}): Promise<BundleResult>;
export declare function mapTypeToComponent(typeName: string, version: SpecMajorVersion): "definitions" | "links" | "responses" | "parameters" | "examples" | "headers" | "schemas" | "requestBodies" | "securitySchemes" | "callbacks" | null;
