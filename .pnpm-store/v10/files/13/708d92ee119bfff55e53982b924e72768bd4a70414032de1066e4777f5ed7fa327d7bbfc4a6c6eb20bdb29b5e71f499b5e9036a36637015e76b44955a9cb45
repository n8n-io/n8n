import { BaseResolver } from './resolve';
import type { StyleguideConfig, Config } from './config';
import type { Document, ResolvedRefMap } from './resolve';
import type { ProblemSeverity } from './walk';
import type { NodeType } from './types';
import type { CollectFn } from './utils';
export declare function lint(opts: {
    ref: string;
    config: Config;
    externalRefResolver?: BaseResolver;
    collectSpecData?: CollectFn;
}): Promise<import("./walk").NormalizedProblem[]>;
export declare function lintFromString(opts: {
    source: string;
    absoluteRef?: string;
    config: Config;
    externalRefResolver?: BaseResolver;
}): Promise<import("./walk").NormalizedProblem[]>;
export declare function lintDocument(opts: {
    document: Document;
    config: StyleguideConfig;
    customTypes?: Record<string, NodeType>;
    externalRefResolver: BaseResolver;
}): Promise<import("./walk").NormalizedProblem[]>;
export declare function lintConfig(opts: {
    document: Document;
    config: Config;
    resolvedRefMap?: ResolvedRefMap;
    severity?: ProblemSeverity;
    externalRefResolver?: BaseResolver;
    externalConfigTypes?: Record<string, NodeType>;
}): Promise<import("./walk").NormalizedProblem[]>;
