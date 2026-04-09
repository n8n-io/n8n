"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayChecks = displayChecks;
const colorette_1 = require("colorette");
const outdent_1 = require("outdent");
const url_1 = require("../../utils/url");
const is_json_1 = require("../../utils/is-json");
const cli_outputs_1 = require("../../utils/cli-outputs");
const logger_1 = require("../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
const MAX_CRITERIA_CONDITION_DISPLAY_LENGTH = 50;
function displayChecks(testNameToDisplay, checks, verboseLogs, verboseResponseLogs) {
    const allChecksPassed = checks.every(({ passed }) => passed);
    logger.log(`  ${allChecksPassed ? (0, colorette_1.green)('✓') : (0, colorette_1.red)('✗')} ${(0, colorette_1.blue)(testNameToDisplay)}`);
    if (verboseLogs) {
        logger.log(`${cli_outputs_1.RESET_ESCAPE_CODE}\n` + (displayVerboseLogs(verboseLogs) || ''));
        logger.printNewLine();
    }
    if (verboseResponseLogs) {
        logger.log(`${cli_outputs_1.RESET_ESCAPE_CODE}\n` + (displayVerboseLogs(verboseResponseLogs, 'response') || ''));
        logger.printNewLine();
    }
    logger.printNewLine();
    for (const check of checks) {
        logger.log(`${(0, cli_outputs_1.indent)(displayCheckInfo(check, check.severity), 4)}\n`);
    }
}
function displayCheckInfo(check, severity) {
    const { name: checkName, passed, condition } = check;
    const icon = passed ? (0, colorette_1.green)('✓') : severity === 'warn' ? (0, colorette_1.yellow)('⚠') : (0, colorette_1.red)('✗');
    const color = passed ? colorette_1.green : colorette_1.red;
    return `${icon} ${(0, colorette_1.gray)(checkName.toLowerCase())}${condition
        ? ` - ${color(condition.length > MAX_CRITERIA_CONDITION_DISPLAY_LENGTH
            ? condition.slice(0, MAX_CRITERIA_CONDITION_DISPLAY_LENGTH) + '...'
            : condition)}`
        : ''}`;
}
function displayVerboseLogs(logs, type = 'request') {
    const { path, host, headerParams, body, statusCode } = logs;
    const responseTime = process.env.NODE_ENV === 'test' ? '<test>' : logs.responseTime;
    const urlString = (0, cli_outputs_1.indent)(`Request URL: ${(0, colorette_1.blue)((0, url_1.combineUrl)(host, path))}`, 4);
    const requestHeadersString = (0, cli_outputs_1.indent)(`Request Headers:`, 4);
    const responseHeadersString = (0, cli_outputs_1.indent)(`Response Headers:`, 4);
    const requestBodyString = (0, cli_outputs_1.indent)(`Request Body:`, 4);
    const responseBodyString = (0, cli_outputs_1.indent)(`Response Body:`, 4);
    const headersString = generateHeaderString(headerParams || {});
    const formattedBody = body
        ? (0, is_json_1.isJSON)(body)
            ? JSON.stringify(JSON.parse(body), null, 2)
            : body
        : undefined;
    const indentedBody = formattedBody
        ? formattedBody
            .split('\n')
            .map((line) => (0, colorette_1.blue)((0, cli_outputs_1.indent)(`${line}`, 6)))
            .join('\n')
        : undefined;
    const bodyString = indentedBody;
    const requestOutput = [
        logger.printNewLine(),
        (0, colorette_1.gray)(urlString),
        headersString && (0, colorette_1.gray)(requestHeadersString),
        headersString && (0, colorette_1.gray)(headersString),
        body && (0, colorette_1.gray)(requestBodyString),
        body && bodyString,
    ]
        .filter(Boolean)
        .join(`${cli_outputs_1.RESET_ESCAPE_CODE}\n`);
    const responseOutput = [
        (0, colorette_1.gray)((0, cli_outputs_1.indent)('Response status code: ' + (0, colorette_1.blue)(statusCode), 4)),
        (0, colorette_1.gray)((0, cli_outputs_1.indent)('Response time: ' + (0, colorette_1.blue)(responseTime), 4) + ' ms'),
        headersString && (0, colorette_1.gray)(responseHeadersString),
        headersString && (0, colorette_1.gray)(headersString),
        body && (0, colorette_1.gray)(responseBodyString),
        body && bodyString,
    ]
        .filter(Boolean)
        .join(`${cli_outputs_1.RESET_ESCAPE_CODE}\n`);
    return type === 'request' ? (0, outdent_1.outdent) `${requestOutput}` : (0, outdent_1.outdent) `${responseOutput}`;
}
function generateHeaderString(headerParams) {
    let compiledString = '';
    const entries = Object.entries(headerParams);
    entries.forEach(([key, value], index) => {
        compiledString = compiledString + (0, cli_outputs_1.indent)(`${(0, colorette_1.yellow)(key)}: ${(0, colorette_1.blue)(value)}`, 6);
        if (index < entries.length - 1) {
            compiledString += `${cli_outputs_1.RESET_ESCAPE_CODE}\n`;
        }
    });
    return compiledString;
}
//# sourceMappingURL=display-checks.js.map