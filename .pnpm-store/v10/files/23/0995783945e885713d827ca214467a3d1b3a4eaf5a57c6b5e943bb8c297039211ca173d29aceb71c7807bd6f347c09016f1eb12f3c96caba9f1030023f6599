import { EndpointRuleObject } from "./EndpointRuleObject";
import { ErrorRuleObject } from "./ErrorRuleObject";
import { ConditionObject } from "./shared";
/**
 * @public
 */
export type RuleSetRules = Array<EndpointRuleObject | ErrorRuleObject | TreeRuleObject>;
/**
 * @public
 */
export type TreeRuleObject = {
    type: "tree";
    conditions?: ConditionObject[];
    rules: RuleSetRules;
    documentation?: string;
};
