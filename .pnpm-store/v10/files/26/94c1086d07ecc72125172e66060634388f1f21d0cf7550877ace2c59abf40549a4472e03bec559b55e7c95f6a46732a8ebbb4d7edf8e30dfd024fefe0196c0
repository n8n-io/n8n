"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTotals = getTotals;
exports.formatProblems = formatProblems;
const path = require("path");
const logger_1 = require("../logger");
const output_1 = require("../output");
const codeframes_1 = require("./codeframes");
const env_1 = require("../env");
const ref_utils_1 = require("../ref-utils");
const coreVersion = require('../../package.json').version;
const ERROR_MESSAGE = {
    INVALID_SEVERITY_LEVEL: 'Invalid severity level; accepted values: error or warn',
};
const BG_COLORS = {
    warn: (str) => logger_1.colorize.bgYellow(logger_1.colorize.black(str)),
    error: logger_1.colorize.bgRed,
};
const COLORS = {
    warn: logger_1.colorize.yellow,
    error: logger_1.colorize.red,
};
const SEVERITY_NAMES = {
    warn: 'Warning',
    error: 'Error',
};
const CODECLIMATE_SEVERITY_MAPPING = {
    error: 'critical',
    warn: 'minor',
};
const MAX_SUGGEST = 5;
function severityToNumber(severity) {
    return severity === 'error' ? 1 : 2;
}
function getTotals(problems) {
    let errors = 0;
    let warnings = 0;
    let ignored = 0;
    for (const m of problems) {
        if (m.ignored) {
            ignored++;
            continue;
        }
        if (m.severity === 'error')
            errors++;
        if (m.severity === 'warn')
            warnings++;
    }
    return {
        errors,
        warnings,
        ignored,
    };
}
function formatProblems(problems, opts) {
    const { maxProblems = 100, cwd = env_1.isBrowser ? '' : process.cwd(), format = 'codeframe', color = logger_1.colorOptions.enabled, totals = getTotals(problems), version = coreVersion, } = opts;
    logger_1.colorOptions.enabled = color; // force colors if specified
    const totalProblems = problems.length;
    problems = problems.filter((m) => !m.ignored);
    const ignoredProblems = totalProblems - problems.length;
    problems = problems
        .sort((a, b) => severityToNumber(a.severity) - severityToNumber(b.severity))
        .slice(0, maxProblems);
    if (!totalProblems && format !== 'json')
        return;
    switch (format) {
        case 'json':
            outputJSON();
            break;
        case 'codeframe':
            for (let i = 0; i < problems.length; i++) {
                const problem = problems[i];
                logger_1.logger.info(`${formatCodeframe(problem, i)}\n`);
            }
            break;
        case 'stylish': {
            const groupedByFile = groupByFiles(problems);
            for (const [file, { ruleIdPad, locationPad: positionPad, fileProblems }] of Object.entries(groupedByFile)) {
                logger_1.logger.info(`${logger_1.colorize.blue((0, ref_utils_1.isAbsoluteUrl)(file) ? file : path.relative(cwd, file))}:\n`);
                for (let i = 0; i < fileProblems.length; i++) {
                    const problem = fileProblems[i];
                    logger_1.logger.info(`${formatStylish(problem, positionPad, ruleIdPad)}\n`);
                }
                logger_1.logger.info('\n');
            }
            break;
        }
        case 'markdown': {
            const groupedByFile = groupByFiles(problems);
            for (const [file, { fileProblems }] of Object.entries(groupedByFile)) {
                output_1.output.write(`## Lint: ${(0, ref_utils_1.isAbsoluteUrl)(file) ? file : path.relative(cwd, file)}\n\n`);
                output_1.output.write(`| Severity | Location | Problem | Message |\n`);
                output_1.output.write(`|---|---|---|---|\n`);
                for (let i = 0; i < fileProblems.length; i++) {
                    const problem = fileProblems[i];
                    output_1.output.write(`${formatMarkdown(problem)}\n`);
                }
                output_1.output.write('\n');
                if (totals.errors > 0) {
                    output_1.output.write(`Validation failed\nErrors: ${totals.errors}\n`);
                }
                else {
                    output_1.output.write('Validation successful\n');
                }
                if (totals.warnings > 0) {
                    output_1.output.write(`Warnings: ${totals.warnings}\n`);
                }
                output_1.output.write('\n');
            }
            break;
        }
        case 'checkstyle': {
            const groupedByFile = groupByFiles(problems);
            output_1.output.write('<?xml version="1.0" encoding="UTF-8"?>\n');
            output_1.output.write('<checkstyle version="4.3">\n');
            for (const [file, { fileProblems }] of Object.entries(groupedByFile)) {
                output_1.output.write(`<file name="${xmlEscape((0, ref_utils_1.isAbsoluteUrl)(file) ? file : path.relative(cwd, file))}">\n`);
                fileProblems.forEach(formatCheckstyle);
                output_1.output.write(`</file>\n`);
            }
            output_1.output.write(`</checkstyle>\n`);
            break;
        }
        case 'codeclimate':
            outputForCodeClimate();
            break;
        case 'summary':
            formatSummary(problems);
            break;
        case 'github-actions':
            outputForGithubActions(problems, cwd);
    }
    if (totalProblems - ignoredProblems > maxProblems) {
        logger_1.logger.info(`< ... ${totalProblems - maxProblems} more problems hidden > ${logger_1.colorize.gray('increase with `--max-problems N`')}\n`);
    }
    function outputForCodeClimate() {
        const issues = problems.map((p) => {
            const location = p.location[0]; // TODO: support multiple location
            const lineCol = (0, codeframes_1.getLineColLocation)(location);
            return {
                description: p.message,
                location: {
                    path: (0, ref_utils_1.isAbsoluteUrl)(location.source.absoluteRef)
                        ? location.source.absoluteRef
                        : path.relative(cwd, location.source.absoluteRef),
                    lines: {
                        begin: lineCol.start.line,
                    },
                },
                severity: CODECLIMATE_SEVERITY_MAPPING[p.severity],
                fingerprint: `${p.ruleId}${p.location.length > 0 ? '-' + p.location[0].pointer : ''}`,
            };
        });
        output_1.output.write(JSON.stringify(issues, null, 2));
    }
    function outputJSON() {
        const resultObject = {
            totals,
            version,
            problems: problems.map((p) => {
                const problem = {
                    ...p,
                    location: p.location.map((location) => ({
                        ...location,
                        source: {
                            ref: (0, ref_utils_1.isAbsoluteUrl)(location.source.absoluteRef)
                                ? location.source.absoluteRef
                                : path.relative(cwd, location.source.absoluteRef),
                        },
                    })),
                    from: p.from
                        ? {
                            ...p.from,
                            source: {
                                ref: (0, ref_utils_1.isAbsoluteUrl)(p.from?.source.absoluteRef)
                                    ? p.from?.source.absoluteRef
                                    : path.relative(cwd, p.from?.source.absoluteRef || cwd),
                            },
                        }
                        : undefined,
                };
                if (env_1.env.FORMAT_JSON_WITH_CODEFRAMES) {
                    const location = p.location[0]; // TODO: support multiple locations
                    const loc = (0, codeframes_1.getLineColLocation)(location);
                    problem.codeframe = (0, codeframes_1.getCodeframe)(loc, color);
                }
                return problem;
            }),
        };
        output_1.output.write(JSON.stringify(resultObject, null, 2));
    }
    function getBgColor(problem) {
        const { severity } = problem;
        if (!BG_COLORS[severity]) {
            throw new Error(ERROR_MESSAGE.INVALID_SEVERITY_LEVEL);
        }
        return BG_COLORS[severity];
    }
    function formatCodeframe(problem, idx) {
        const bgColor = getBgColor(problem);
        const location = problem.location[0]; // TODO: support multiple locations
        const relativePath = (0, ref_utils_1.isAbsoluteUrl)(location.source.absoluteRef)
            ? location.source.absoluteRef
            : path.relative(cwd, location.source.absoluteRef);
        const loc = (0, codeframes_1.getLineColLocation)(location);
        const atPointer = location.pointer ? logger_1.colorize.gray(`at ${location.pointer}`) : '';
        const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
        return (`[${idx + 1}] ${bgColor(fileWithLoc)} ${atPointer}\n\n` +
            `${problem.message}\n\n` +
            formatDidYouMean(problem) +
            (0, codeframes_1.getCodeframe)(loc, color) +
            '\n\n' +
            formatFrom(cwd, problem.from) +
            `${SEVERITY_NAMES[problem.severity]} was generated by the ${logger_1.colorize.blue(problem.ruleId)} rule.\n\n`);
    }
    function formatStylish(problem, locationPad, ruleIdPad) {
        const color = COLORS[problem.severity];
        if (!SEVERITY_NAMES[problem.severity]) {
            return 'Error not found severity. Please check your config file. Allowed values: `warn,error,off`';
        }
        const severityName = color(SEVERITY_NAMES[problem.severity].toLowerCase().padEnd(7));
        const { start } = problem.location[0];
        return `  ${`${start.line}:${start.col}`.padEnd(locationPad)}  ${severityName}  ${problem.ruleId.padEnd(ruleIdPad)}  ${problem.message}`;
    }
    function formatMarkdown(problem) {
        if (!SEVERITY_NAMES[problem.severity]) {
            return 'Error not found severity. Please check your config file. Allowed values: `warn,error,off`';
        }
        const severityName = SEVERITY_NAMES[problem.severity].toLowerCase();
        const { start } = problem.location[0];
        return `| ${severityName} | line ${`${start.line}:${start.col}`} | [${problem.ruleId}](https://redocly.com/docs/cli/rules/${problem.ruleId}/) | ${problem.message} |`;
    }
    function formatCheckstyle(problem) {
        const { line, col } = problem.location[0].start;
        const severity = problem.severity == 'warn' ? 'warning' : 'error';
        const message = xmlEscape(problem.message);
        const source = xmlEscape(problem.ruleId);
        output_1.output.write(`<error line="${line}" column="${col}" severity="${severity}" message="${message}" source="${source}" />\n`);
    }
}
function formatSummary(problems) {
    const counts = {};
    for (const problem of problems) {
        counts[problem.ruleId] = counts[problem.ruleId] || { count: 0, severity: problem.severity };
        counts[problem.ruleId].count++;
    }
    const sorted = Object.entries(counts).sort(([, a], [, b]) => {
        const severityDiff = severityToNumber(a.severity) - severityToNumber(b.severity);
        return severityDiff || b.count - a.count;
    });
    for (const [ruleId, info] of sorted) {
        const color = COLORS[info.severity];
        const severityName = color(SEVERITY_NAMES[info.severity].toLowerCase().padEnd(7));
        logger_1.logger.info(`${severityName} ${ruleId}: ${info.count}\n`);
    }
    logger_1.logger.info('\n');
}
function formatFrom(cwd, location) {
    if (!location)
        return '';
    const relativePath = path.relative(cwd, location.source.absoluteRef);
    const loc = (0, codeframes_1.getLineColLocation)(location);
    const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
    const atPointer = location.pointer ? logger_1.colorize.gray(`at ${location.pointer}`) : '';
    return `referenced from ${logger_1.colorize.blue(fileWithLoc)} ${atPointer} \n\n`;
}
function formatDidYouMean(problem) {
    if (problem.suggest.length === 0)
        return '';
    if (problem.suggest.length === 1) {
        return `Did you mean: ${problem.suggest[0]} ?\n\n`;
    }
    else {
        return `Did you mean:\n  - ${problem.suggest.slice(0, MAX_SUGGEST).join('\n  - ')}\n\n`;
    }
}
const groupByFiles = (problems) => {
    const fileGroups = {};
    for (const problem of problems) {
        const absoluteRef = problem.location[0].source.absoluteRef; // TODO: multiple errors
        fileGroups[absoluteRef] = fileGroups[absoluteRef] || {
            fileProblems: [],
            ruleIdPad: 0,
            locationPad: 0,
        };
        const mappedProblem = { ...problem, location: problem.location.map(codeframes_1.getLineColLocation) };
        fileGroups[absoluteRef].fileProblems.push(mappedProblem);
        fileGroups[absoluteRef].ruleIdPad = Math.max(problem.ruleId.length, fileGroups[absoluteRef].ruleIdPad);
        fileGroups[absoluteRef].locationPad = Math.max(Math.max(...mappedProblem.location.map((loc) => `${loc.start.line}:${loc.start.col}`.length)), fileGroups[absoluteRef].locationPad);
    }
    return fileGroups;
};
function xmlEscape(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(/[<>&"'\x00-\x1F\x7F\u0080-\uFFFF]/gu, (char) => {
        switch (char) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case '"':
                return '&quot;';
            case "'":
                return '&apos;';
            default:
                return `&#${char.charCodeAt(0)};`;
        }
    });
}
function outputForGithubActions(problems, cwd) {
    for (const problem of problems) {
        for (const location of problem.location.map(codeframes_1.getLineColLocation)) {
            let command;
            switch (problem.severity) {
                case 'error':
                    command = 'error';
                    break;
                case 'warn':
                    command = 'warning';
                    break;
            }
            const suggest = formatDidYouMean(problem);
            const message = suggest !== '' ? problem.message + '\n\n' + suggest : problem.message;
            const properties = {
                title: problem.ruleId,
                file: (0, ref_utils_1.isAbsoluteUrl)(location.source.absoluteRef)
                    ? location.source.absoluteRef
                    : path.relative(cwd, location.source.absoluteRef),
                line: location.start.line,
                col: location.start.col,
                endLine: location.end?.line,
                endColumn: location.end?.col,
            };
            output_1.output.write(`::${command} ${formatProperties(properties)}::${escapeMessage(message)}\n`);
        }
    }
    function formatProperties(props) {
        return Object.entries(props)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k}=${escapeProperty(v)}`)
            .join(',');
    }
    function toString(v) {
        if (v === null || v === undefined) {
            return '';
        }
        else if (typeof v === 'string' || v instanceof String) {
            return v;
        }
        return JSON.stringify(v);
    }
    function escapeMessage(v) {
        return toString(v).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    }
    function escapeProperty(v) {
        return toString(v)
            .replace(/%/g, '%25')
            .replace(/\r/g, '%0D')
            .replace(/\n/g, '%0A')
            .replace(/:/g, '%3A')
            .replace(/,/g, '%2C');
    }
}
