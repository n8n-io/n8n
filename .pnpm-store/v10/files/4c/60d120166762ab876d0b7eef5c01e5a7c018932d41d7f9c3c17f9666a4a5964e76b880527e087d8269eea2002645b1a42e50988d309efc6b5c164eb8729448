import { Location } from './ref-utils';
import { YamlParseError } from './resolve';
import type { SpecVersion } from './oas-types';
import type { ResolveError, Source, ResolvedRefMap, Document } from './resolve';
import type { Referenced } from './typings/openapi';
import type { NormalizedOasVisitors, BaseVisitor } from './visitors';
import type { NormalizedNodeType } from './types';
import type { RuleSeverity } from './config';
export type NonUndefined = string | number | boolean | symbol | bigint | object | Record<string, any>;
export type ResolveResult<T extends NonUndefined> = {
    node: T;
    location: Location;
    error?: ResolveError | YamlParseError;
} | {
    node: undefined;
    location: undefined;
    error?: ResolveError | YamlParseError;
};
export type ResolveFn = <T extends NonUndefined>(node: Referenced<T>, from?: string) => ResolveResult<T>;
export type UserContext = {
    report(problem: Problem): void;
    location: Location;
    rawNode: any;
    rawLocation: Location;
    resolve: ResolveFn;
    parentLocations: Record<string, Location>;
    type: NormalizedNodeType;
    key: string | number;
    parent: any;
    oasVersion: SpecVersion;
    getVisitorData: () => Record<string, unknown>;
};
export type Loc = {
    line: number;
    col: number;
};
export type PointerLocationObject = {
    source: Source;
    reportOnKey?: boolean;
    pointer: string;
};
export type LineColLocationObject = Omit<PointerLocationObject, 'pointer'> & {
    pointer: undefined;
    start: Loc;
    end?: Loc;
};
export type LocationObject = LineColLocationObject | PointerLocationObject;
export type ProblemSeverity = 'error' | 'warn';
export type Problem = {
    message: string;
    suggest?: string[];
    location?: Partial<LocationObject> | Array<Partial<LocationObject>>;
    from?: LocationObject;
    forceSeverity?: RuleSeverity;
    ruleId?: string;
};
export type NormalizedProblem = {
    message: string;
    ruleId: string;
    severity: ProblemSeverity;
    location: LocationObject[];
    from?: LocationObject;
    suggest: string[];
    ignored?: boolean;
};
export type WalkContext = {
    problems: NormalizedProblem[];
    oasVersion: SpecVersion;
    visitorsData: Record<string, Record<string, unknown>>;
    refTypes?: Map<string, NormalizedNodeType>;
};
export declare function walkDocument<T extends BaseVisitor>(opts: {
    document: Document;
    rootType: NormalizedNodeType;
    normalizedVisitors: NormalizedOasVisitors<T>;
    resolvedRefMap: ResolvedRefMap;
    ctx: WalkContext;
}): void;
