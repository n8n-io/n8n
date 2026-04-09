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
exports.displayFilesSummaryTable = displayFilesSummaryTable;
const colorette_1 = require("colorette");
const path = __importStar(require("path"));
const calculate_tests_passed_1 = require("./calculate-tests-passed");
const cli_outputs_1 = require("../../utils/cli-outputs");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
function displayFilesSummaryTable(filesResult) {
    const DEFAULT_FILENAME_PADDING = 40;
    const maxFilenameLength = Math.max(...filesResult.map(({ file }) => path.basename(file).length + DEFAULT_FILENAME_PADDING));
    const columns = [
        { name: 'Filename', width: maxFilenameLength },
        { name: 'Workflows', width: 10 },
        { name: 'Passed', width: 7 },
        { name: 'Failed', width: 7 },
        { name: 'Warnings', width: 8 },
    ];
    let output = '';
    // Top line
    output += `${(0, colorette_1.gray)(`┌${columns.map((col) => '─'.repeat(col.width + 2)).join('┬')}┐`)}\n`;
    // Header
    output += `${(0, colorette_1.gray)(`│${columns.map((col) => ` ${col.name.padEnd(col.width)} `).join('│')}│`)}\n`;
    // Separator
    output += `${(0, colorette_1.gray)(`├${columns.map((col) => '─'.repeat(col.width + 2)).join('┼')}┤`)}\n`;
    // Data rows
    filesResult.forEach(({ file, executedWorkflows: workflows, argv }) => {
        const fileName = path.basename(file);
        const workflowArgv = argv?.workflow || [];
        const skippedWorkflowArgv = argv?.skip || [];
        let executedWorkflows = workflowArgv && workflowArgv.length
            ? workflows.filter(({ workflowId }) => workflowArgv.includes(workflowId))
            : workflows;
        executedWorkflows =
            skippedWorkflowArgv && skippedWorkflowArgv.length
                ? executedWorkflows.filter(({ workflowId }) => !skippedWorkflowArgv.includes(workflowId))
                : executedWorkflows;
        const { workflows: testWorkflows } = (0, calculate_tests_passed_1.calculateTotals)(executedWorkflows);
        const total = (0, colorette_1.gray)(testWorkflows.total.toString().padEnd(11));
        const passed = (0, colorette_1.green)(testWorkflows.passed.toString().padEnd(8));
        const failed = testWorkflows.failed > 0
            ? (0, colorette_1.red)(testWorkflows.failed.toString().padEnd(8))
            : (0, colorette_1.gray)('-'.padEnd(8));
        const warnings = testWorkflows.warnings > 0
            ? (0, colorette_1.yellow)(testWorkflows.warnings.toString().padEnd(9))
            : (0, colorette_1.gray)('-'.padEnd(9));
        // First pad the content, then add colors
        const statusSymbol = testWorkflows.failed > 0 ? 'x' : '✓';
        const paddedContent = `${statusSymbol} ${fileName}`.padEnd(maxFilenameLength + 1);
        const fileNameWithStatus = testWorkflows.failed > 0 ? (0, colorette_1.red)(paddedContent) : (0, colorette_1.green)(paddedContent);
        output +=
            (0, colorette_1.gray)('│') +
                ` ${fileNameWithStatus}` +
                (0, colorette_1.gray)('│') +
                ` ${total}` +
                (0, colorette_1.gray)('│') +
                ` ${passed}` +
                (0, colorette_1.gray)('│') +
                ` ${failed}` +
                (0, colorette_1.gray)('│') +
                ` ${warnings}` +
                (0, colorette_1.gray)('│') +
                '\n';
    });
    // Bottom line
    output += `${(0, colorette_1.gray)(`└${columns.map((col) => '─'.repeat(col.width + 2)).join('┴')}┘`)}${cli_outputs_1.RESET_ESCAPE_CODE}\n`;
    // Add a single reset at the very end
    logger.log(output);
}
//# sourceMappingURL=display-files-summary-table.js.map