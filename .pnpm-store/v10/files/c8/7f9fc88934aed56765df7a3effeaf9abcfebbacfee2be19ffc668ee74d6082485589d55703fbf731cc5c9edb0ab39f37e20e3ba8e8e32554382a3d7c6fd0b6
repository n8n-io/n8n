"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAPIAndAnalyzeResults = callAPIAndAnalyzeResults;
const success_criteria_1 = require("./success-criteria");
const schema_1 = require("./schema");
const checks_1 = require("../checks");
const context_1 = require("./context");
const runtime_expressions_1 = require("../runtime-expressions");
// TODO: split into two functions
async function callAPIAndAnalyzeResults({ ctx, workflowId, step, requestData, }) {
    // clear checks in case of retry
    step.checks = [];
    const checksResult = {
        successCriteriaCheck: true,
        schemaCheck: true,
        networkCheck: true,
    };
    try {
        step.response = await ctx.apiClient.fetchResult(ctx, requestData);
    }
    catch (error) {
        step.checks.push({
            name: checks_1.CHECKS.NETWORK_ERROR,
            passed: false,
            message: error.message,
            severity: ctx.severity['NETWORK_ERROR'],
        });
        checksResult.networkCheck = false;
        return checksResult;
    }
    const request = ctx.$workflows[workflowId].steps[step.stepId].request;
    step.verboseLog = ctx.apiClient.getVerboseResponseLogs();
    if (step.successCriteria) {
        const successCriteriaChecks = (0, success_criteria_1.checkCriteria)({
            workflowId,
            step,
            criteria: step.successCriteria,
            ctx: {
                ...ctx,
                $request: request,
                $response: step.response,
                $inputs: ctx.$workflows[workflowId].inputs,
            },
        });
        checksResult.successCriteriaCheck = successCriteriaChecks.every((check) => check.passed || ['off', 'warn'].includes(check.severity));
        step.checks.push(...successCriteriaChecks);
    }
    const schemaChecks = (0, schema_1.checkSchema)({
        stepCallCtx: {
            $request: request,
            $response: step.response,
            $inputs: ctx.$workflows[workflowId].inputs,
        },
        descriptionOperation: requestData.openapiOperation,
        ctx,
    });
    if (schemaChecks.length) {
        checksResult.schemaCheck = schemaChecks.every((check) => check.passed || ['off', 'warn'].includes(check.severity));
        step.checks.push(...schemaChecks);
    }
    // store step level outputs
    const outputs = {};
    if (step.outputs) {
        const runtimeExpressionContext = (0, context_1.createRuntimeExpressionCtx)({
            ctx: {
                ...ctx,
                $request: request,
                $response: step.response,
                $inputs: ctx.$workflows[workflowId].inputs,
            },
            workflowId,
            step,
        });
        for (const outputKey of Object.keys(step.outputs)) {
            outputs[outputKey] = (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
                payload: step.outputs[outputKey],
                context: runtimeExpressionContext,
            });
        }
    }
    // save local $steps context
    ctx.$steps[step.stepId] = {
        outputs: { ...ctx.$steps[step.stepId].outputs, ...outputs },
    };
    // save $workflows context
    ctx.$workflows[workflowId].steps[step.stepId] = {
        outputs: { ...ctx.$steps[step.stepId].outputs, ...outputs },
        request,
        response: step.response,
    };
    return checksResult;
}
//# sourceMappingURL=call-api-and-analyze-results.js.map