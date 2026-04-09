"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStep = runStep;
const colorette_1 = require("colorette");
const call_api_and_analyze_results_1 = require("./call-api-and-analyze-results");
const success_criteria_1 = require("./success-criteria");
const delay_1 = require("../../utils/delay");
const checks_1 = require("../checks");
const runner_1 = require("./runner");
const prepare_request_1 = require("./prepare-request");
const cli_outputs_1 = require("../../utils/cli-outputs");
const config_parser_1 = require("../config-parser");
const runtime_expressions_1 = require("../runtime-expressions");
const logger_1 = require("../../utils/logger/logger");
const timer_1 = require("../timeout-timer/timer");
const consts_1 = require("../../consts");
const logger = logger_1.DefaultLogger.getInstance();
const parsedMaxSteps = parseInt(process.env.RESPECT_MAX_STEPS, 10);
const maxSteps = isNaN(parsedMaxSteps) ? consts_1.DEFAULT_RESPECT_MAX_STEPS : parsedMaxSteps;
let stepsRun = 0;
async function runStep({ step, ctx, workflowId, retriesLeft, }) {
    step = { ...step }; // shallow copy step to avoid mutating the original step
    step.retriesLeft = retriesLeft;
    const workflow = ctx.workflows.find((w) => w.workflowId === workflowId);
    const { stepId, onFailure, onSuccess, workflowId: targetWorkflowRef, parameters } = step;
    const failureActionsToRun = (onFailure || workflow?.failureActions || []).map((action) => (0, config_parser_1.resolveReusableComponentItem)(action, ctx));
    const successActionsToRun = (onSuccess || workflow?.successActions || []).map((action) => (0, config_parser_1.resolveReusableComponentItem)(action, ctx));
    const resolvedParameters = parameters?.map((parameter) => (0, config_parser_1.resolveReusableComponentItem)(parameter, ctx));
    if (targetWorkflowRef) {
        const targetWorkflow = ctx.workflows.find((w) => w.workflowId === targetWorkflowRef) ||
            (0, config_parser_1.getValueFromContext)(targetWorkflowRef, ctx);
        if (!targetWorkflow) {
            const failedCall = {
                name: checks_1.CHECKS.UNEXPECTED_ERROR,
                message: `Workflow ${(0, colorette_1.red)(targetWorkflowRef)} not found.`,
                passed: false,
                severity: ctx.severity['UNEXPECTED_ERROR'],
            };
            step.checks.push(failedCall);
            return;
        }
        const workflowCtx = await (0, runner_1.resolveWorkflowContext)(targetWorkflowRef, targetWorkflow, ctx);
        if (resolvedParameters && resolvedParameters.length) {
            // When the step in context specifies a workflowId, then all parameters without `in` maps to workflow inputs.
            const workflowInputParameters = resolvedParameters
                .filter(config_parser_1.isParameterWithoutIn)
                .reduce((acc, parameter) => {
                // Ensure parameter is of type ParameterWithoutIn
                acc[parameter.name] = (0, config_parser_1.getValueFromContext)(parameter.value, ctx);
                return acc;
            }, {});
            workflowCtx.$workflows[targetWorkflow.workflowId].inputs = workflowInputParameters;
        }
        (0, cli_outputs_1.printChildWorkflowSeparator)(stepId);
        const stepWorkflowResult = await (0, runner_1.runWorkflow)({
            workflowInput: targetWorkflow,
            ctx: workflowCtx,
            skipLineSeparator: true,
            parentStepId: stepId,
            invocationContext: `Child workflow of step ${stepId}`,
        });
        ctx.executedSteps.push(stepWorkflowResult);
        const outputs = {};
        if (step?.outputs) {
            try {
                for (const [outputKey, outputValue] of Object.entries(step.outputs)) {
                    // need to partially emulate $outputs context
                    outputs[outputKey] = (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
                        payload: outputValue,
                        context: {
                            $outputs: workflowCtx.$outputs?.[targetWorkflow.workflowId] || {},
                        },
                    });
                }
            }
            catch (error) {
                const failedCall = {
                    name: checks_1.CHECKS.UNEXPECTED_ERROR,
                    message: error.message,
                    passed: false,
                    severity: ctx.severity['UNEXPECTED_ERROR'],
                };
                step.checks.push(failedCall);
            }
            // save local $steps context
            ctx.$steps[stepId] = {
                outputs,
            };
            // save local $steps context to parent workflow
            if (workflow?.workflowId) {
                ctx.$workflows[workflow.workflowId].steps[stepId] = {
                    outputs,
                    request: undefined,
                    response: undefined,
                };
            }
        }
        return { shouldEnd: false };
    }
    ctx.executedSteps.push(step);
    stepsRun++;
    if (stepsRun > maxSteps) {
        step.checks.push({
            name: checks_1.CHECKS.MAX_STEPS_REACHED_ERROR,
            message: `Max steps (${maxSteps}) reached`,
            passed: false,
            severity: ctx.severity['MAX_STEPS_REACHED_ERROR'],
        });
        return { shouldEnd: true };
    }
    if (timer_1.Timer.getInstance().isTimedOut()) {
        step.checks.push({
            name: checks_1.CHECKS.GLOBAL_TIMEOUT_ERROR,
            message: `Global Respect timer reached`,
            passed: false,
            severity: ctx.severity['GLOBAL_TIMEOUT_ERROR'],
        });
        return { shouldEnd: true };
    }
    if (resolvedParameters && resolvedParameters.length) {
        // When the step in context does not specify a workflowId the `in` field MUST be specified.
        const parameterWithoutIn = resolvedParameters.find((parameter) => {
            const resolvedParameter = (0, config_parser_1.resolveReusableComponentItem)(parameter, ctx);
            return !('in' in resolvedParameter);
        });
        if (parameterWithoutIn) {
            throw new Error(`Parameter "in" is required for ${stepId} step parameter ${parameterWithoutIn.name}`);
        }
    }
    let allChecksPassed = false;
    let requestData;
    try {
        if (!workflowId) {
            throw new Error('Workflow name is required to run a step');
        }
        requestData = await (0, prepare_request_1.prepareRequest)(ctx, step, workflowId);
        const checksResult = await (0, call_api_and_analyze_results_1.callAPIAndAnalyzeResults)({
            ctx,
            workflowId,
            step,
            requestData,
        });
        allChecksPassed = Object.values(checksResult).every((check) => check);
    }
    catch (e) {
        step.verboseLog = ctx.apiClient.getVerboseResponseLogs();
        const failedCall = {
            name: checks_1.CHECKS.UNEXPECTED_ERROR,
            message: e.message,
            passed: false,
            severity: ctx.severity['UNEXPECTED_ERROR'],
        };
        step.checks.push(failedCall);
    }
    const verboseLogs = ctx.options.verbose ? ctx.apiClient.getVerboseLogs() : undefined;
    const verboseResponseLogs = ctx.options.verbose
        ? ctx.apiClient.getVerboseResponseLogs()
        : undefined;
    const requestUrl = requestData?.path || requestData?.serverUrl?.url;
    if (requestUrl) {
        (0, cli_outputs_1.printStepDetails)({
            testNameToDisplay: `${requestData?.method.toUpperCase()} ${(0, colorette_1.white)(requestUrl)}${step.stepId ? ` ${(0, colorette_1.blue)('- step')} ${(0, colorette_1.white)((0, colorette_1.bold)(step.stepId))}` : ''}`,
            checks: step.checks,
            verboseLogs,
            verboseResponseLogs,
        });
    }
    else {
        (0, cli_outputs_1.printUnknownStep)(step);
    }
    if (!allChecksPassed) {
        const result = await runActions(failureActionsToRun, 'failure');
        if (result?.retriesLeft && result.retriesLeft > 0) {
            // if retriesLeft > 0, it means that the step was retried successfully and we need to
            // return step result to the outer flow
            return result.stepResult;
        }
        if (result?.shouldEnd) {
            return { shouldEnd: true };
        }
    }
    if (successActionsToRun.length && allChecksPassed) {
        const result = await runActions(successActionsToRun, 'success');
        if (result?.shouldEnd) {
            return { shouldEnd: true };
        }
    }
    // Internal function to run actions
    async function runActions(actions = [], kind) {
        for (const action of actions) {
            const { type, criteria } = action;
            if (action.workflowId && action.stepId) {
                throw new Error(`Cannot use both workflowId: ${action.workflowId} and stepId: ${action.stepId} in ${action.type} action`);
            }
            const matchesCriteria = (0, success_criteria_1.checkCriteria)({
                workflowId: workflowId,
                step,
                criteria,
                ctx,
            }).every((check) => check.passed);
            if (matchesCriteria) {
                const targetWorkflow = action.workflowId
                    ? (0, config_parser_1.getValueFromContext)(action.workflowId, ctx)
                    : undefined;
                const targetCtx = action.workflowId
                    ? await (0, runner_1.resolveWorkflowContext)(action.workflowId, targetWorkflow, ctx)
                    : { ...ctx, executedSteps: [] };
                const targetStep = action.stepId ? action.stepId : undefined;
                if (type === 'retry') {
                    const { retryAfter, retryLimit = 0 } = action;
                    retriesLeft = retriesLeft ?? retryLimit;
                    step.retriesLeft = retriesLeft;
                    if (retriesLeft === 0) {
                        return { retriesLeft: 0, shouldEnd: false };
                    }
                    await (0, delay_1.delay)(retryAfter);
                    if (targetWorkflow || targetStep) {
                        (0, cli_outputs_1.printActionsSeparator)(stepId, action.name, kind);
                    }
                    if (targetWorkflow) {
                        const stepWorkflowResult = await (0, runner_1.runWorkflow)({
                            workflowInput: targetWorkflow,
                            ctx: targetCtx,
                            skipLineSeparator: true,
                            invocationContext: `Retry action for step ${stepId}`,
                        });
                        ctx.executedSteps.push(stepWorkflowResult);
                    }
                    else if (targetStep) {
                        const stepToRun = workflow?.steps.find((s) => s.stepId === targetStep);
                        if (!stepToRun) {
                            throw new Error(`Step ${targetStep} not found in workflow ${workflowId}`);
                        }
                        await runStep({
                            step: stepToRun,
                            ctx: targetCtx,
                            workflowId,
                        });
                    }
                    logger.log(`\n  Retrying step ${(0, colorette_1.blue)(stepId)} (${retryLimit - retriesLeft + 1}/${retryLimit})\n`);
                    return {
                        stepResult: await runStep({
                            step,
                            ctx,
                            workflowId,
                            retriesLeft: retriesLeft - 1,
                        }),
                        retriesLeft,
                    };
                }
                else if (type === 'end') {
                    return { shouldEnd: true };
                }
                else if (type === 'goto') {
                    if (!targetWorkflow && !targetStep) {
                        throw new Error('Either workflowId or stepId must be provided in goto action');
                    }
                    if (targetWorkflow || targetStep) {
                        (0, cli_outputs_1.printActionsSeparator)(stepId, action.name, kind);
                    }
                    const stepWorkflowResult = await (0, runner_1.runWorkflow)({
                        workflowInput: targetWorkflow || workflow,
                        ctx: targetCtx,
                        fromStepId: targetStep,
                        skipLineSeparator: true,
                        invocationContext: `Goto from step ${stepId}`,
                    });
                    ctx.executedSteps.push(stepWorkflowResult);
                    return { shouldEnd: true };
                }
                // stop at first matching action
                break;
            }
        }
        if (kind === 'failure') {
            return { shouldEnd: true };
        }
    }
}
//# sourceMappingURL=run-step.js.map