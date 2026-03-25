import type { asserts, AssertionFn } from './asserts';
import type { Arazzo1Visitor, Async2Visitor, Async3Visitor, Oas2Visitor, Oas3Visitor } from '../../../visitors';
import type { RuleSeverity } from '../../../config';
export type AssertionLocators = {
    filterInParentKeys?: (string | number)[];
    filterOutParentKeys?: (string | number)[];
    matchParentKeys?: string;
};
export type AssertionDefinition = {
    subject: {
        type: string;
        property?: string | string[];
    } & AssertionLocators;
    assertions: {
        [name in keyof typeof asserts]?: AssertionFn;
    };
};
export type RawAssertion = AssertionDefinition & {
    where?: AssertionDefinition[];
    message?: string;
    suggest?: string[];
    severity?: RuleSeverity;
};
export type Assertion = RawAssertion & {
    assertionId: string;
};
export declare const Assertions: (opts: Record<string, Assertion>) => (Oas3Visitor | Oas2Visitor | Async2Visitor | Async3Visitor | Arazzo1Visitor)[];
