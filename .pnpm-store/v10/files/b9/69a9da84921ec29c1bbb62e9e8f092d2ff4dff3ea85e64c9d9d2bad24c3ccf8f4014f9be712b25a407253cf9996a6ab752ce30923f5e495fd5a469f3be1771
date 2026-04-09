"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestFile = runTestFile;
exports.runWorkflow = runWorkflow;
exports.resolveWorkflowContext = resolveWorkflowContext;
const colorette_1 = require("colorette");
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const har_logs_1 = require("../../utils/har-logs");
const api_fetcher_1 = require("../../utils/api-fetcher");
const create_test_context_1 = require("./context/create-test-context");
const config_parser_1 = require("../config-parser");
const get_workflows_to_run_1 = require("./get-workflows-to-run");
const run_step_1 = require("./run-step");
const cli_outputs_1 = require("../../utils/cli-outputs");
const get_test_description_from_file_1 = require("./get-test-description-from-file");
const checks_1 = require("../checks");
const context_1 = require("./context");
const runtime_expressions_1 = require("../runtime-expressions");
const cli_output_1 = require("../cli-output");
const resolve_running_workflows_1 = require("./resolve-running-workflows");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
async function runTestFile(argv, output, collectSpecData) {
    const { file: filePath, workflow, verbose, input, skip, server, 'har-output': harOutput, 'json-output': jsonOutput, severity, } = argv;
    const options = {
        workflowPath: filePath, // filePath or documentPath
        workflow,
        skip,
        verbose,
        harOutput,
        jsonOutput,
        metadata: { ...argv },
        input,
        server,
        severity,
        mutualTls: {
            clientCert: argv['client-cert'],
            clientKey: argv['client-key'],
            caCert: argv['ca-cert'],
        },
    };
    const bundledTestDescription = await (0, get_test_description_from_file_1.bundleArazzo)(filePath, collectSpecData);
    const result = await runWorkflows(bundledTestDescription, options);
    if (output?.harFile && Object.keys(result.harLogs).length) {
        const parsedHarLogs = (0, cli_output_1.maskSecrets)(result.harLogs, result.ctx.secretFields || new Set());
        (0, node_fs_1.writeFileSync)(output.harFile, JSON.stringify(parsedHarLogs, null, 2), 'utf-8');
        logger.log((0, colorette_1.blue)(`Har logs saved in ${(0, colorette_1.green)(output.harFile)}`));
        logger.printNewLine();
        logger.printNewLine();
    }
    return result;
}
async function runWorkflows(testDescription, options) {
    const harLogs = options?.harOutput && (0, har_logs_1.createHarLog)();
    const apiClient = new api_fetcher_1.ApiFetcher({
        harLogs,
    });
    const ctx = await (0, create_test_context_1.createTestContext)(testDescription, options, apiClient);
    const workflowsToRun = (0, resolve_running_workflows_1.resolveRunningWorkflows)(options.workflow);
    const workflowsToSkip = (0, resolve_running_workflows_1.resolveRunningWorkflows)(options.skip);
    const workflows = (0, get_workflows_to_run_1.getWorkflowsToRun)(ctx.workflows, workflowsToRun, workflowsToSkip);
    const executedWorkflows = [];
    for (const workflow of workflows) {
        ctx.executedSteps = [];
        // run dependencies workflows first
        if (workflow.dependsOn?.length) {
            await handleDependsOn({ workflow, ctx });
        }
        const workflowExecutionResult = await runWorkflow({
            workflowInput: workflow.workflowId,
            ctx,
        });
        executedWorkflows.push(workflowExecutionResult);
    }
    return { ctx, harLogs, executedWorkflows };
}
async function runWorkflow({ workflowInput, ctx, fromStepId, skipLineSeparator, parentStepId, invocationContext, }) {
    const workflowStartTime = performance.now();
    const fileBaseName = (0, node_path_1.basename)(ctx.options.workflowPath);
    const workflow = typeof workflowInput === 'string'
        ? ctx.workflows.find((w) => w.workflowId === workflowInput)
        : workflowInput;
    if (!workflow) {
        throw new Error(`\n ${(0, colorette_1.blue)('Workflow')} ${workflowInput} ${(0, colorette_1.blue)('not found')} \n`);
    }
    const workflowId = workflow.workflowId;
    if (!fromStepId) {
        (0, cli_outputs_1.printWorkflowSeparator)(fileBaseName, workflowId, skipLineSeparator);
    }
    const fromStepIndex = fromStepId
        ? workflow.steps.findIndex((step) => step.stepId === fromStepId)
        : 0;
    // if (fromStepId && fromStepIndex === -1) {
    //   throw new Error(`\n ${blue('Step')} ${fromStepId} ${blue('not found')} \n`);
    // }
    const workflowSteps = workflow.steps.slice(fromStepIndex);
    // clean $steps ctx before running workflow steps
    ctx.$steps = {};
    for (const step of workflowSteps) {
        try {
            const stepResult = await (0, run_step_1.runStep)({
                step,
                ctx,
                workflowId,
            });
            // When `end` action is used, we should not continue with the next steps
            if (stepResult?.shouldEnd) {
                break;
            }
        }
        catch (err) {
            const failedCall = {
                name: checks_1.CHECKS.UNEXPECTED_ERROR,
                message: err.message,
                passed: false,
                severity: ctx.severity['UNEXPECTED_ERROR'],
            };
            step.checks.push(failedCall);
        }
    }
    const hasFailedTimeoutSteps = workflow.steps.some((step) => step.checks?.some((check) => !check.passed && check.name == checks_1.CHECKS.GLOBAL_TIMEOUT_ERROR));
    // workflow level outputs
    if (workflow.outputs && workflowId && !hasFailedTimeoutSteps) {
        if (!ctx.$outputs) {
            ctx.$outputs = {};
        }
        if (!ctx.$outputs[workflowId]) {
            ctx.$outputs[workflowId] = {};
        }
        const runtimeExpressionContext = (0, context_1.createRuntimeExpressionCtx)({
            ctx: {
                ...ctx,
                $inputs: {
                    ...(ctx.$inputs || {}),
                    ...(ctx.$workflows[workflowId]?.inputs || {}),
                },
            },
            workflowId,
        });
        const outputs = {};
        for (const outputKey of Object.keys(workflow.outputs)) {
            try {
                outputs[outputKey] = (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
                    payload: workflow.outputs[outputKey],
                    context: runtimeExpressionContext,
                });
            }
            catch (error) {
                throw new Error(`Failed to resolve output "${outputKey}" in workflow "${workflowId}": ${error.message}`);
            }
        }
        ctx.$outputs[workflowId] = outputs;
        ctx.$workflows[workflowId].outputs = outputs;
    }
    workflow.time = Math.ceil(performance.now() - workflowStartTime);
    logger.printNewLine();
    const endTime = performance.now();
    return {
        type: 'workflow',
        invocationContext,
        workflowId,
        stepId: parentStepId,
        startTime: workflowStartTime,
        endTime,
        totalTimeMs: Math.ceil(endTime - workflowStartTime),
        executedSteps: ctx.executedSteps,
        ctx,
        globalTimeoutError: hasFailedTimeoutSteps,
    };
}
async function handleDependsOn({ workflow, ctx }) {
    if (!workflow.dependsOn?.length)
        return;
    const dependenciesWorkflows = await Promise.all(workflow.dependsOn.map(async (workflowId) => {
        const resolvedWorkflow = (0, config_parser_1.getValueFromContext)(workflowId, ctx);
        const workflowCtx = await resolveWorkflowContext(workflowId, resolvedWorkflow, ctx);
        (0, cli_outputs_1.printRequiredWorkflowSeparator)(workflow.workflowId);
        return runWorkflow({
            workflowInput: resolvedWorkflow,
            ctx: workflowCtx,
            skipLineSeparator: true,
        });
    }));
    const totals = (0, cli_output_1.calculateTotals)(dependenciesWorkflows);
    const hasProblems = totals.steps.failed > 0;
    if (hasProblems) {
        throw new Error('Dependent workflows has failed steps');
    }
}
async function resolveWorkflowContext(workflowId, resolvedWorkflow, ctx) {
    const sourceDescriptionId = workflowId && workflowId.startsWith('$sourceDescriptions.') && workflowId.split('.')[1];
    const testDescription = sourceDescriptionId && ctx.$sourceDescriptions[sourceDescriptionId];
    // executing external workflow should not mutate the original context
    // only outputs are transferred to the parent workflow
    // creating the new ctx for the external workflow or recreate current ctx for local workflow
    return testDescription
        ? await (0, create_test_context_1.createTestContext)(testDescription, {
            workflowPath: findSourceDescriptionUrl(sourceDescriptionId, ctx.sourceDescriptions, ctx.options),
            workflow: [resolvedWorkflow.workflowId],
            skip: undefined,
            input: ctx.options.input || undefined,
            server: ctx.options.server || undefined,
            severity: ctx.options.severity || undefined,
            verbose: ctx.options.verbose || undefined,
        }, ctx.apiClient)
        : {
            ...ctx,
            executedSteps: [],
        };
}
function findSourceDescriptionUrl(sourceDescriptionId, sourceDescriptions, options) {
    const sourceDescription = sourceDescriptions && sourceDescriptions.find(({ name }) => name === sourceDescriptionId);
    if (!sourceDescription) {
        return '';
    }
    else if (sourceDescription.type === 'openapi') {
        return sourceDescription.url;
    }
    else if (sourceDescription.type === 'arazzo') {
        return (0, node_path_1.resolve)((0, node_path_1.dirname)(options.workflowPath), sourceDescription.url);
    }
    else {
        throw new Error(`Unknown source description type ${sourceDescription.type}`);
    }
}
//# sourceMappingURL=runner.js.map