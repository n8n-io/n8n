import { EndpointError } from "../types";
import { evaluateConditions } from "./evaluateConditions";
import { evaluateEndpointRule } from "./evaluateEndpointRule";
import { evaluateErrorRule } from "./evaluateErrorRule";
export const evaluateRules = (rules, options) => {
    for (const rule of rules) {
        if (rule.type === "endpoint") {
            const endpointOrUndefined = evaluateEndpointRule(rule, options);
            if (endpointOrUndefined) {
                return endpointOrUndefined;
            }
        }
        else if (rule.type === "error") {
            evaluateErrorRule(rule, options);
        }
        else if (rule.type === "tree") {
            const endpointOrUndefined = group.evaluateTreeRule(rule, options);
            if (endpointOrUndefined) {
                return endpointOrUndefined;
            }
        }
        else {
            throw new EndpointError(`Unknown endpoint rule: ${rule}`);
        }
    }
    throw new EndpointError(`Rules evaluation failed`);
};
export const evaluateTreeRule = (treeRule, options) => {
    const { conditions, rules } = treeRule;
    const { result, referenceRecord } = evaluateConditions(conditions, options);
    if (!result) {
        return;
    }
    return group.evaluateRules(rules, {
        ...options,
        referenceRecord: { ...options.referenceRecord, ...referenceRecord },
    });
};
export const group = {
    evaluateRules,
    evaluateTreeRule,
};
