"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESET_ESCAPE_CODE = void 0;
exports.removeExtraIndentation = removeExtraIndentation;
exports.indent = indent;
exports.printWorkflowSeparatorLine = printWorkflowSeparatorLine;
exports.printWorkflowSeparator = printWorkflowSeparator;
exports.printRequiredWorkflowSeparator = printRequiredWorkflowSeparator;
exports.printChildWorkflowSeparator = printChildWorkflowSeparator;
exports.printActionsSeparator = printActionsSeparator;
exports.printStepSeparatorLine = printStepSeparatorLine;
exports.printConfigLintTotals = printConfigLintTotals;
exports.printStepDetails = printStepDetails;
exports.printUnknownStep = printUnknownStep;
const jest_matcher_utils_1 = require("jest-matcher-utils");
const colorette_1 = require("colorette");
const cli_output_1 = require("../modules/cli-output");
const logger_1 = require("./logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
exports.RESET_ESCAPE_CODE = process.env.NO_COLOR ? '' : '\x1B[0m';
function removeExtraIndentation(message) {
    if (!message) {
        return '';
    }
    // Split the message into individual lines
    const lines = message.split('\n');
    // Trim leading whitespace from each line
    const trimmedLines = lines.map((line) => line.trimStart());
    // Join the trimmed lines back into a single string
    return trimmedLines.join('\n');
}
function indent(str, level) {
    return str
        .split('\n')
        .map((line) => '\xa0'.repeat(level) + line)
        .join('\n');
}
function printWorkflowSeparatorLine() {
    logger.printSeparator('\u2500');
    logger.printNewLine();
    logger.printNewLine();
}
function printWorkflowSeparator(fileName, workflowName, skipLineSeparator) {
    if (!skipLineSeparator) {
        printWorkflowSeparatorLine();
    }
    logger.log(`  ${(0, colorette_1.bold)('Running workflow')} ${(0, colorette_1.blue)(`${fileName} / ${workflowName}`)}`);
    logger.printNewLine();
}
function printRequiredWorkflowSeparator(parentWorkflowId) {
    logger.printNewLine();
    logger.log(`  ${(0, colorette_1.bold)('Running required')} workflow for ${(0, colorette_1.blue)(parentWorkflowId)}${exports.RESET_ESCAPE_CODE}\n`);
}
function printChildWorkflowSeparator(parentStepId) {
    logger.printNewLine();
    logger.log(`  ${(0, colorette_1.bold)('Running child')} workflow for the step ${(0, colorette_1.blue)(parentStepId)}${exports.RESET_ESCAPE_CODE}`);
    logger.printNewLine();
}
function printActionsSeparator(stepId, actionName, kind) {
    logger.printNewLine();
    logger.log(`  ${(0, colorette_1.bold)(`Running ${kind} action`)} ${(0, colorette_1.blue)(actionName)} for the step ${(0, colorette_1.blue)(stepId)}${exports.RESET_ESCAPE_CODE}`);
    logger.printNewLine();
}
function printStepSeparatorLine() {
    logger.printNewLine();
}
function printConfigLintTotals(totals) {
    if (totals.errors > 0) {
        logger.error((0, colorette_1.red)(`❌  Your config has ${totals.errors} ${(0, jest_matcher_utils_1.pluralize)('error', totals.errors)}.${exports.RESET_ESCAPE_CODE}`));
    }
    else if (totals.warnings > 0) {
        logger.error((0, colorette_1.yellow)(`⚠️  Your config has ${totals.warnings} ${(0, jest_matcher_utils_1.pluralize)('warning', totals.warnings)}.${exports.RESET_ESCAPE_CODE}`));
    }
}
function printStepDetails({ testNameToDisplay, checks, verboseLogs, verboseResponseLogs, }) {
    printStepSeparatorLine();
    (0, cli_output_1.displayChecks)(testNameToDisplay, checks, verboseLogs, verboseResponseLogs);
}
function printUnknownStep(step) {
    printStepSeparatorLine();
    (0, cli_output_1.displayChecks)(step.stepId, step.checks);
}
//# sourceMappingURL=cli-outputs.js.map