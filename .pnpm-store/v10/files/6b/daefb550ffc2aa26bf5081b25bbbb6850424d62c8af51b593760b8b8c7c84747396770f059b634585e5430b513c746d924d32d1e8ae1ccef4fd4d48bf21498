import type { Arazzo1RuleSet, Async2RuleSet, Async3RuleSet, Oas2RuleSet, Oas3RuleSet, SpecVersion } from '../oas-types';
import type { StyleguideConfig } from './config';
import type { ProblemSeverity } from '../walk';
type InitializedRule = {
    severity: ProblemSeverity;
    ruleId: string;
    visitor: any;
};
export declare function initRules(rules: (Oas3RuleSet | Oas2RuleSet | Async2RuleSet | Async3RuleSet | Arazzo1RuleSet)[], config: StyleguideConfig, type: 'rules' | 'preprocessors' | 'decorators', oasVersion: SpecVersion): InitializedRule[];
export {};
