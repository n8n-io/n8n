"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeJsonLogsFiles = composeJsonLogsFiles;
const mask_secrets_1 = require("./mask-secrets");
const calculate_tests_passed_1 = require("./calculate-tests-passed");
function composeJsonLogsFiles(filesResult) {
    const files = {};
    for (const fileResult of filesResult) {
        const { executedWorkflows, globalTimeoutError: fileGlobalTimeoutError } = fileResult;
        const { secretFields } = fileResult.ctx;
        files[fileResult.file] = (0, mask_secrets_1.maskSecrets)({
            totalRequests: fileResult.totalRequests,
            executedWorkflows: executedWorkflows.map((workflow) => mapJsonWorkflow(workflow)),
            totalTimeMs: fileResult.totalTimeMs,
            globalTimeoutError: fileGlobalTimeoutError,
        }, secretFields || new Set());
    }
    return files;
}
function mapJsonWorkflow(workflow) {
    const { ctx, ...rest } = workflow;
    const steps = workflow.executedSteps.map((step) => mapJsonStep(step, workflow.workflowId, ctx));
    const totals = (0, calculate_tests_passed_1.calculateTotals)([workflow]);
    const result = {
        ...rest,
        executedSteps: steps,
        status: totals.steps.failed > 0 ? 'error' : totals.steps.warnings > 0 ? 'warn' : 'success',
        totalRequests: totals.totalRequests,
        totalTimeMs: workflow.totalTimeMs,
    };
    return result;
}
function mapJsonStep(step, workflowId, ctx) {
    if ('executedSteps' in step) {
        return mapJsonWorkflow(step);
    }
    const publicStep = ctx.$workflows[workflowId].steps[step.stepId];
    return {
        type: 'step',
        stepId: step.stepId,
        workflowId,
        request: {
            method: publicStep.request?.method || '',
            url: step.response?.requestUrl || '',
            headers: publicStep.request?.header || {},
            body: publicStep.request?.body,
        },
        response: {
            statusCode: step.response?.statusCode || 0,
            body: publicStep.response?.body,
            headers: step.response?.header || {},
            time: step.response?.time || 0,
        },
        checks: step.checks.map((check) => ({
            ...check,
            status: calculateCheckStatus(check),
        })),
        totalTimeMs: publicStep.response?.time || 0,
        retriesLeft: step.retriesLeft,
        status: calculateStepStatus(step.checks),
    };
}
function calculateCheckStatus(check) {
    if (check.passed) {
        return 'success';
    }
    if (check.severity === 'error') {
        return 'error';
    }
    return 'warn';
}
function calculateStepStatus(checks) {
    let hasWarning = false;
    for (const check of checks) {
        if (!check.passed && check.severity === 'error') {
            return 'error';
        }
        if (!check.passed && check.severity === 'warn') {
            hasWarning = true;
        }
    }
    return hasWarning ? 'warn' : 'success';
}
//# sourceMappingURL=json-logs.js.map