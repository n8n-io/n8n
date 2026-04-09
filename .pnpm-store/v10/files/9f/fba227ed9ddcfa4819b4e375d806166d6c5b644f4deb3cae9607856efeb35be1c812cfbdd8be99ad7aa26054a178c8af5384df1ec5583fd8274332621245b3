import { isDefined } from '../utils';

import type {
  Arazzo1RuleSet,
  Async2RuleSet,
  Async3RuleSet,
  Oas2RuleSet,
  Oas3RuleSet,
  Overlay1RuleSet,
  SpecVersion,
} from '../oas-types';
import type { StyleguideConfig } from './config';
import type { ProblemSeverity } from '../walk';

type InitializedRule = {
  severity: ProblemSeverity;
  ruleId: string;
  visitor: any;
};

export function initRules(
  rules: (
    | Oas3RuleSet
    | Oas2RuleSet
    | Async2RuleSet
    | Async3RuleSet
    | Arazzo1RuleSet
    | Overlay1RuleSet
  )[],
  config: StyleguideConfig,
  type: 'rules' | 'preprocessors' | 'decorators',
  oasVersion: SpecVersion
): InitializedRule[] {
  return rules
    .flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => {
        const rule = ruleset[ruleId];

        const ruleSettings =
          type === 'rules'
            ? config.getRuleSettings(ruleId, oasVersion)
            : type === 'preprocessors'
            ? config.getPreprocessorSettings(ruleId, oasVersion)
            : config.getDecoratorSettings(ruleId, oasVersion);

        if (ruleSettings.severity === 'off') {
          return undefined;
        }
        const severity: ProblemSeverity = ruleSettings.severity;
        const message = ruleSettings.message;
        const visitors = rule(ruleSettings);

        if (Array.isArray(visitors)) {
          return visitors.map((visitor: any) => ({
            severity,
            ruleId,
            message,
            visitor: visitor,
          }));
        }

        return {
          severity,
          message,
          ruleId,
          visitor: visitors, // note: actually it is only one visitor object
        };
      })
    )
    .flatMap((visitor) => visitor)
    .filter(isDefined);
}
