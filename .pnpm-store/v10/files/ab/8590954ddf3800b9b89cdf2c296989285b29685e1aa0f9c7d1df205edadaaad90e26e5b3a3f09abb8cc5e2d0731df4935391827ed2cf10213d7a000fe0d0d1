"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayErrors = displayErrors;
const colorette_1 = require("colorette");
const checks_1 = require("../checks");
const cli_outputs_1 = require("../../utils/cli-outputs");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
function flattenNestedSteps(steps) {
    return steps.flatMap((step) => {
        if ('executedSteps' in step) {
            return flattenNestedSteps(step.executedSteps);
        }
        return [step];
    });
}
function displayErrors(workflows) {
    logger.log(`${cli_outputs_1.RESET_ESCAPE_CODE}\n${(0, cli_outputs_1.indent)((0, colorette_1.red)('Failed tests info:'), 2)}\n`);
    for (const workflow of workflows) {
        const steps = flattenNestedSteps(workflow.executedSteps);
        const hasProblems = steps.some((step) => step.checks.some((check) => !check.passed) && (!step.retriesLeft || step.retriesLeft === 0));
        if (!hasProblems)
            continue;
        logger.log(`${cli_outputs_1.RESET_ESCAPE_CODE}\n${(0, cli_outputs_1.indent)((0, colorette_1.gray)('Workflow name:'), 2)} ${(0, colorette_1.underline)(workflow.workflowId)}${cli_outputs_1.RESET_ESCAPE_CODE}\n`);
        for (const step of steps) {
            const failedStepChecks = step.checks.filter((check) => !check.passed);
            if (!failedStepChecks.length)
                continue;
            if (step.retriesLeft && step.retriesLeft !== 0)
                continue;
            logger.printNewLine();
            logger.log((0, cli_outputs_1.indent)(`${(0, colorette_1.blue)('stepId - ')}`, 4) +
                (step?.stepId ? (0, colorette_1.red)(step.stepId) : (0, colorette_1.red)(step?.operationId || step?.operationPath || '')));
            for (const failedCheckIndex in failedStepChecks) {
                const { name, message, severity } = failedStepChecks[failedCheckIndex];
                const showRespectInnerErrorMessage = [
                    checks_1.CHECKS.UNEXPECTED_ERROR,
                    checks_1.CHECKS.GLOBAL_TIMEOUT_ERROR,
                    checks_1.CHECKS.MAX_STEPS_REACHED_ERROR,
                ].includes(name);
                const messageToDisplay = showRespectInnerErrorMessage
                    ? (0, cli_outputs_1.indent)(`Reason: ${message}`, 4)
                    : (0, cli_outputs_1.indent)(`${(0, cli_outputs_1.removeExtraIndentation)(message)}${cli_outputs_1.RESET_ESCAPE_CODE}\n`, 6);
                logger.printNewLine();
                if (severity === 'error') {
                    logger.log((0, cli_outputs_1.indent)(`${(0, colorette_1.red)('✗')} ${(0, colorette_1.gray)(name.toLowerCase())}`, 4));
                }
                else if (severity === 'off') {
                    logger.log((0, cli_outputs_1.indent)(`${(0, colorette_1.gray)('○')} ${(0, colorette_1.gray)(name.toLowerCase())} ${(0, colorette_1.gray)('(skipped)')}`, 4));
                }
                else {
                    logger.log((0, cli_outputs_1.indent)(`${(0, colorette_1.yellow)('⚠')} ${(0, colorette_1.gray)(name.toLowerCase())}`, 4));
                }
                logger.printNewLine();
                logger.log(`${messageToDisplay}`);
            }
        }
    }
}
//# sourceMappingURL=display-errors.js.map