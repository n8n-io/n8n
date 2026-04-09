"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.displaySummary = displaySummary;
const outdent_1 = require("outdent");
const colorette_1 = require("colorette");
const path = __importStar(require("path"));
const time_1 = require("../../utils/time");
const calculate_tests_passed_1 = require("./calculate-tests-passed");
const cli_outputs_1 = require("../../utils/cli-outputs");
const flow_runner_1 = require("../flow-runner");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
function displaySummary(startedAt, workflows, argv) {
    const fileName = path.basename(argv?.file || '');
    const workflowArgv = (0, flow_runner_1.resolveRunningWorkflows)(argv?.workflow) || [];
    const skippedWorkflowArgv = (0, flow_runner_1.resolveRunningWorkflows)(argv?.skip) || [];
    let executedWorkflows = workflowArgv && workflowArgv.length
        ? workflows.filter(({ workflowId }) => workflowArgv.includes(workflowId))
        : workflows;
    executedWorkflows =
        skippedWorkflowArgv && skippedWorkflowArgv.length
            ? executedWorkflows.filter(({ workflowId }) => !skippedWorkflowArgv.includes(workflowId))
            : executedWorkflows;
    const totals = (0, calculate_tests_passed_1.calculateTotals)(executedWorkflows);
    const executionTime = (0, time_1.getExecutionTime)(startedAt);
    logger.printNewLine();
    logger.log((0, outdent_1.outdent) `
        ${(0, colorette_1.yellow)((0, cli_outputs_1.indent)(`Summary for ${(0, colorette_1.blue)(fileName)}`, 2))}
        ${(0, cli_outputs_1.indent)('', 2)}
        ${(0, cli_outputs_1.indent)(formatWorkflowsTotals('Workflows:', totals.workflows), 2)}
        ${(0, cli_outputs_1.indent)(formatTotals('Steps:', totals.steps), 2)}
        ${(0, cli_outputs_1.indent)(formatTotals('Checks:', totals.checks), 2)}
        ${(0, cli_outputs_1.indent)((0, colorette_1.inverse)(`Time: ${executionTime}`), 2)}
  `);
    logger.printNewLine();
    logger.printNewLine();
}
function formatWorkflowsTotals(header, totals) {
    return ((0, colorette_1.bold)(header) +
        (totals.passed ? ` ${(0, colorette_1.green)(totals.passed + ' passed')},` : '') +
        (totals.failed ? ` ${(0, colorette_1.red)(totals.failed + ' failed')},` : '') +
        ` ${totals.total} total`);
}
function formatTotals(header, totals) {
    return ((0, colorette_1.bold)(header) +
        (totals.passed ? ` ${(0, colorette_1.green)(totals.passed + ' passed')},` : '') +
        (totals.failed ? ` ${(0, colorette_1.red)(totals.failed + ' failed')},` : '') +
        (totals.warnings ? ` ${(0, colorette_1.yellow)(totals.warnings + ' warnings')},` : '') +
        (totals.skipped ? ` ${(0, colorette_1.gray)(totals.skipped + ' ignored')},` : '') +
        ` ${totals.total} total`);
}
//# sourceMappingURL=display-summary.js.map