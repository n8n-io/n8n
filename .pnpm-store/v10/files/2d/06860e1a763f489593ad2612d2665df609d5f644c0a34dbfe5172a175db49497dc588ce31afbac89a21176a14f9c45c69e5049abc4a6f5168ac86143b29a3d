"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRules = initRules;
const utils_1 = require("../utils");
function initRules(rules, config, type, oasVersion) {
    return rules
        .flatMap((ruleset) => Object.keys(ruleset).map((ruleId) => {
        const rule = ruleset[ruleId];
        const ruleSettings = type === 'rules'
            ? config.getRuleSettings(ruleId, oasVersion)
            : type === 'preprocessors'
                ? config.getPreprocessorSettings(ruleId, oasVersion)
                : config.getDecoratorSettings(ruleId, oasVersion);
        if (ruleSettings.severity === 'off') {
            return undefined;
        }
        const severity = ruleSettings.severity;
        const message = ruleSettings.message;
        const visitors = rule(ruleSettings);
        if (Array.isArray(visitors)) {
            return visitors.map((visitor) => ({
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
    }))
        .flatMap((visitor) => visitor)
        .filter(utils_1.isDefined);
}
