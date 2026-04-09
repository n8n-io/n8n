"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCriteria = checkCriteria;
const jsonpath_plus_1 = require("jsonpath-plus");
const validate_success_criteria_1 = require("./validate-success-criteria");
const checks_1 = require("../../checks");
const runtime_expressions_1 = require("../../runtime-expressions");
const context_1 = require("../context");
function checkCriteria({ workflowId, step, criteria: criteriaList = [], ctx, }) {
    (0, validate_success_criteria_1.validateSuccessCriteria)(criteriaList);
    const checks = [];
    if (!workflowId) {
        checks.push({
            name: checks_1.CHECKS.SUCCESS_CRITERIA_CHECK,
            passed: false,
            message: `Undefined workflowId for step ${step.stepId}`,
            severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
        });
        return checks;
    }
    const criteriaContext = (0, context_1.createRuntimeExpressionCtx)({
        ctx,
        workflowId,
        step,
    });
    criteriaList.forEach((criteria) => {
        const { condition } = criteria;
        try {
            if ((0, validate_success_criteria_1.isRegexpSuccessCriteria)(criteria)) {
                const regexParts = condition.match(/^\/(.*)\/([gimsuy]*)$/);
                let regexPattern;
                let flags;
                if (regexParts) {
                    regexPattern = regexParts[1]; // Extract pattern between the first and last slash
                    flags = regexParts[2]; // Extract flags after the last slash
                }
                else {
                    regexPattern = condition; // If no slashes are present, treat the whole string as the pattern
                    flags = ''; // No flags in this case
                }
                const { context } = criteria;
                const regex = new RegExp(regexPattern, flags);
                checks.push({
                    name: checks_1.CHECKS.SUCCESS_CRITERIA_CHECK,
                    passed: regex.test((0, runtime_expressions_1.evaluateRuntimeExpression)(context, criteriaContext)),
                    message: `Checking regex criteria: ${JSON.stringify(criteria)}`,
                    severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
                    condition: condition,
                });
            }
            else if ((0, validate_success_criteria_1.isJSONPathSuccessCriteria)(criteria)) {
                const { context } = criteria;
                const data = (0, runtime_expressions_1.evaluateRuntimeExpression)(context, criteriaContext);
                checks.push({
                    name: checks_1.CHECKS.SUCCESS_CRITERIA_CHECK,
                    passed: evaluateJSONPAthCondition(condition, data),
                    message: `Checking jsonpath criteria: ${condition}`,
                    severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
                    condition: condition,
                });
            }
            else {
                checks.push({
                    name: checks_1.CHECKS.SUCCESS_CRITERIA_CHECK,
                    passed: (0, runtime_expressions_1.evaluateRuntimeExpression)(condition, criteriaContext),
                    message: `Checking simple criteria: ${JSON.stringify(criteria)}`,
                    severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
                    condition: condition,
                });
            }
        }
        catch (e) {
            checks.push({
                name: checks_1.CHECKS.SUCCESS_CRITERIA_CHECK,
                passed: false,
                message: `Failed to pass ${JSON.stringify(criteria)}: ${e.message}`,
                severity: ctx.severity['SUCCESS_CRITERIA_CHECK'],
                condition: criteria.condition,
            });
        }
    });
    return checks;
}
function evaluateJSONPAthCondition(condition, context) {
    // Extract JSONPath expressions from the string
    const jsonpathMatches = condition.match(/\$\.[a-zA-Z0-9_]+/g) || [];
    // Replace JSONPath expressions with their values
    const replacedCondition = jsonpathMatches.reduce((acc, match) => {
        const jsonpathResult = (0, jsonpath_plus_1.JSONPath)({ path: match, json: context });
        const jsonpathResultValue = jsonpathResult[0] || null;
        return acc.replace(match, JSON.stringify(jsonpathResultValue));
    }, condition);
    try {
        const evaluateFn = new Function(`return ${replacedCondition};`);
        return !!evaluateFn();
    }
    catch (_error) {
        return false;
    }
}
//# sourceMappingURL=check-success-criteria.js.map