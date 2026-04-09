"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRun = handleRun;
const colorette_1 = require("colorette");
const flow_runner_1 = require("../modules/flow-runner");
const cli_output_1 = require("../modules/cli-output");
const logger_1 = require("../utils/logger/logger");
const exit_with_error_1 = require("../utils/exit-with-error");
const node_fs_1 = require("node:fs");
const cli_outputs_1 = require("../utils/cli-outputs");
const timer_1 = require("../modules/timeout-timer/timer");
const logger = logger_1.DefaultLogger.getInstance();
async function handleRun({ argv, collectSpecData }) {
    const harOutputFile = argv['har-output'];
    if (harOutputFile && !harOutputFile.endsWith('.har')) {
        throw new Error('File for HAR logs should be in .har format');
    }
    const jsonOutputFile = argv['json-output'];
    if (jsonOutputFile && !jsonOutputFile.endsWith('.json')) {
        throw new Error('File for JSON logs should be in .json format');
    }
    const { skip, workflow } = argv;
    if (skip && workflow) {
        logger.printNewLine();
        logger.log((0, colorette_1.red)(`Cannot use both --skip and --workflow flags at the same time.`));
        return;
    }
    try {
        timer_1.Timer.getInstance();
        const startedAt = performance.now();
        const testsRunProblemsStatus = [];
        const { files } = argv;
        const runAllFilesResult = [];
        if (files.length > 1 && harOutputFile) {
            // TODO: implement multiple run files HAR output
            throw new Error('Currently only a single file can be run with --har-output. Please run a single file at a time.');
        }
        for (const path of files) {
            const result = await runFile({ ...argv, file: path }, performance.now(), {
                harFile: harOutputFile,
            }, collectSpecData);
            testsRunProblemsStatus.push(result.hasProblems);
            runAllFilesResult.push(result);
        }
        const hasProblems = runAllFilesResult.some((result) => result.hasProblems);
        const hasWarnings = runAllFilesResult.some((result) => result.hasWarnings);
        logger.printNewLine();
        (0, cli_output_1.displayFilesSummaryTable)(runAllFilesResult);
        logger.printNewLine();
        if (jsonOutputFile) {
            (0, node_fs_1.writeFileSync)(jsonOutputFile, JSON.stringify({
                files: (0, cli_output_1.composeJsonLogsFiles)(runAllFilesResult),
                status: hasProblems ? 'error' : hasWarnings ? 'warn' : 'success',
                totalTime: performance.now() - startedAt,
            }, null, 2), 'utf-8');
            logger.log((0, colorette_1.blue)((0, cli_outputs_1.indent)(`JSON logs saved in ${(0, colorette_1.green)(jsonOutputFile)}`, 2)));
            logger.printNewLine();
            logger.printNewLine();
        }
        if (hasProblems) {
            throw new Error(' Tests exited with error ');
        }
    }
    catch (err) {
        (0, exit_with_error_1.exitWithError)(err?.message ?? err);
    }
}
async function runFile(argv, startedAt, output, collectSpecData) {
    const { executedWorkflows, ctx } = await (0, flow_runner_1.runTestFile)(argv, output, collectSpecData);
    const totals = (0, cli_output_1.calculateTotals)(executedWorkflows);
    const hasProblems = totals.workflows.failed > 0;
    const hasWarnings = totals.workflows.warnings > 0;
    const hasGlobalTimeoutError = executedWorkflows.some((workflow) => workflow.globalTimeoutError);
    if (totals.steps.failed > 0 || totals.steps.warnings > 0 || totals.steps.skipped > 0) {
        (0, cli_output_1.displayErrors)(executedWorkflows);
    }
    (0, cli_output_1.displaySummary)(startedAt, executedWorkflows, argv);
    return {
        hasProblems,
        hasWarnings,
        file: argv.file,
        executedWorkflows,
        argv,
        ctx,
        totalTimeMs: performance.now() - startedAt,
        totalRequests: totals.totalRequests,
        globalTimeoutError: hasGlobalTimeoutError,
    };
}
//# sourceMappingURL=run.js.map