import type { Asserts } from './asserts';
import type { AssertionContext, AssertResult } from '../../../config';
import type { Assertion, AssertionDefinition } from '.';
import type { Oas2Visitor, Oas3Visitor, VisitFunction } from '../../../visitors';
export type OrderDirection = 'asc' | 'desc';
export type OrderOptions = {
    direction: OrderDirection;
    property: string;
};
export type AssertToApply = {
    name: keyof Asserts;
    conditions: any;
    runsOnKeys: boolean;
    runsOnValues: boolean;
};
type RunAssertionParams = {
    ctx: AssertionContext;
    assert: AssertToApply;
    assertionProperty?: string;
};
export declare function getAssertsToApply(assertion: AssertionDefinition): AssertToApply[];
export declare function buildVisitorObject(assertion: Assertion, subjectVisitor: VisitFunction<any>): Oas2Visitor | Oas3Visitor;
export declare function buildSubjectVisitor(assertId: string, assertion: Assertion): VisitFunction<any>;
export declare function getIntersectionLength(keys: string[], properties: string[]): number;
export declare function isOrdered(value: any[], options: OrderOptions | OrderDirection): boolean;
export declare function runAssertion({ assert, ctx, assertionProperty, }: RunAssertionParams): AssertResult[];
export declare function regexFromString(input: string): RegExp | null;
export {};
