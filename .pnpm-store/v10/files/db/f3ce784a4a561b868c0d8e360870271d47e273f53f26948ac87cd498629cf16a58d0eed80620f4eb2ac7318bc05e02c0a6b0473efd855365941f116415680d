import * as path from 'path';
import { colorOptions, colorize, logger } from '../logger';
import { output } from '../output';
import { getCodeframe, getLineColLocation } from './codeframes';
import { env, isBrowser } from '../env';
import { isAbsoluteUrl } from '../ref-utils';

import type {
  NormalizedProblem,
  ProblemSeverity,
  LineColLocationObject,
  LocationObject,
} from '../walk';

const coreVersion = require('../../package.json').version;

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};

const ERROR_MESSAGE = {
  INVALID_SEVERITY_LEVEL: 'Invalid severity level; accepted values: error or warn',
};

const BG_COLORS = {
  warn: (str: string) => colorize.bgYellow(colorize.black(str)),
  error: colorize.bgRed,
};

const COLORS = {
  warn: colorize.yellow,
  error: colorize.red,
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

function severityToNumber(severity: ProblemSeverity) {
  return severity === 'error' ? 1 : 2;
}

export type OutputFormat =
  | 'codeframe'
  | 'stylish'
  | 'json'
  | 'checkstyle'
  | 'codeclimate'
  | 'summary'
  | 'github-actions'
  | 'markdown';

export function getTotals(problems: (NormalizedProblem & { ignored?: boolean })[]): Totals {
  let errors = 0;
  let warnings = 0;
  let ignored = 0;

  for (const m of problems) {
    if (m.ignored) {
      ignored++;
      continue;
    }
    if (m.severity === 'error') errors++;
    if (m.severity === 'warn') warnings++;
  }

  return {
    errors,
    warnings,
    ignored,
  };
}

export function formatProblems(
  problems: (NormalizedProblem & { ignored?: boolean })[],
  opts: {
    maxProblems?: number;
    cwd?: string;
    format?: OutputFormat;
    color?: boolean;
    totals: Totals;
    version: string;
  }
) {
  const {
    maxProblems = 100,
    cwd = isBrowser ? '' : process.cwd(),
    format = 'codeframe',
    color = colorOptions.enabled,
    totals = getTotals(problems),
    version = coreVersion,
  } = opts;

  colorOptions.enabled = color; // force colors if specified

  const totalProblems = problems.length;
  problems = problems.filter((m) => !m.ignored);
  const ignoredProblems = totalProblems - problems.length;

  problems = problems
    .sort((a, b) => severityToNumber(a.severity) - severityToNumber(b.severity))
    .slice(0, maxProblems);

  if (!totalProblems && format !== 'json') return;

  switch (format) {
    case 'json':
      outputJSON();
      break;
    case 'codeframe':
      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        logger.info(`${formatCodeframe(problem, i)}\n`);
      }
      break;
    case 'stylish': {
      const groupedByFile = groupByFiles(problems);
      for (const [file, { ruleIdPad, locationPad: positionPad, fileProblems }] of Object.entries(
        groupedByFile
      )) {
        logger.info(`${colorize.blue(isAbsoluteUrl(file) ? file : path.relative(cwd, file))}:\n`);

        for (let i = 0; i < fileProblems.length; i++) {
          const problem = fileProblems[i];
          logger.info(`${formatStylish(problem, positionPad, ruleIdPad)}\n`);
        }

        logger.info('\n');
      }
      break;
    }
    case 'markdown': {
      const groupedByFile = groupByFiles(problems);
      for (const [file, { fileProblems }] of Object.entries(groupedByFile)) {
        output.write(`## Lint: ${isAbsoluteUrl(file) ? file : path.relative(cwd, file)}\n\n`);

        output.write(`| Severity | Location | Problem | Message |\n`);
        output.write(`|---|---|---|---|\n`);
        for (let i = 0; i < fileProblems.length; i++) {
          const problem = fileProblems[i];
          output.write(`${formatMarkdown(problem)}\n`);
        }
        output.write('\n');

        if (totals.errors > 0) {
          output.write(`Validation failed\nErrors: ${totals.errors}\n`);
        } else {
          output.write('Validation successful\n');
        }

        if (totals.warnings > 0) {
          output.write(`Warnings: ${totals.warnings}\n`);
        }

        output.write('\n');
      }
      break;
    }
    case 'checkstyle': {
      const groupedByFile = groupByFiles(problems);

      output.write('<?xml version="1.0" encoding="UTF-8"?>\n');
      output.write('<checkstyle version="4.3">\n');

      for (const [file, { fileProblems }] of Object.entries(groupedByFile)) {
        output.write(
          `<file name="${xmlEscape(isAbsoluteUrl(file) ? file : path.relative(cwd, file))}">\n`
        );
        fileProblems.forEach(formatCheckstyle);
        output.write(`</file>\n`);
      }

      output.write(`</checkstyle>\n`);
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
    logger.info(
      `< ... ${totalProblems - maxProblems} more problems hidden > ${colorize.gray(
        'increase with `--max-problems N`'
      )}\n`
    );
  }

  function outputForCodeClimate() {
    const issues = problems.map((p) => {
      const location = p.location[0]; // TODO: support multiple location
      const lineCol = getLineColLocation(location);
      return {
        description: p.message,
        location: {
          path: isAbsoluteUrl(location.source.absoluteRef)
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
    output.write(JSON.stringify(issues, null, 2));
  }

  function outputJSON() {
    const resultObject = {
      totals,
      version,
      problems: problems.map((p) => {
        const problem = {
          ...p,
          location: p.location.map((location: any) => ({
            ...location,
            source: {
              ref: isAbsoluteUrl(location.source.absoluteRef)
                ? location.source.absoluteRef
                : path.relative(cwd, location.source.absoluteRef),
            },
          })),
          from: p.from
            ? {
                ...p.from,
                source: {
                  ref: isAbsoluteUrl(p.from?.source.absoluteRef)
                    ? p.from?.source.absoluteRef
                    : path.relative(cwd, p.from?.source.absoluteRef || cwd),
                },
              }
            : undefined,
        };

        if (env.FORMAT_JSON_WITH_CODEFRAMES) {
          const location = p.location[0]; // TODO: support multiple locations
          const loc = getLineColLocation(location);
          (problem as any).codeframe = getCodeframe(loc, color);
        }
        return problem;
      }),
    };
    output.write(JSON.stringify(resultObject, null, 2));
  }

  function getBgColor(problem: NormalizedProblem) {
    const { severity } = problem;
    if (!BG_COLORS[severity]) {
      throw new Error(ERROR_MESSAGE.INVALID_SEVERITY_LEVEL);
    }
    return BG_COLORS[severity];
  }

  function formatCodeframe(problem: NormalizedProblem, idx: number) {
    const bgColor = getBgColor(problem);
    const location = problem.location[0]; // TODO: support multiple locations
    const relativePath = isAbsoluteUrl(location.source.absoluteRef)
      ? location.source.absoluteRef
      : path.relative(cwd, location.source.absoluteRef);
    const loc = getLineColLocation(location);
    const atPointer = location.pointer ? colorize.gray(`at ${location.pointer}`) : '';
    const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
    return (
      `[${idx + 1}] ${bgColor(fileWithLoc)} ${atPointer}\n\n` +
      `${problem.message}\n\n` +
      formatDidYouMean(problem) +
      getCodeframe(loc, color) +
      '\n\n' +
      formatFrom(cwd, problem.from) +
      `${SEVERITY_NAMES[problem.severity]} was generated by the ${colorize.blue(
        problem.ruleId
      )} rule.\n\n`
    );
  }

  function formatStylish(problem: OnlyLineColProblem, locationPad: number, ruleIdPad: number) {
    const color = COLORS[problem.severity];
    if (!SEVERITY_NAMES[problem.severity]) {
      return 'Error not found severity. Please check your config file. Allowed values: `warn,error,off`';
    }
    const severityName = color(SEVERITY_NAMES[problem.severity].toLowerCase().padEnd(7));
    const { start } = problem.location[0];
    return `  ${`${start.line}:${start.col}`.padEnd(
      locationPad
    )}  ${severityName}  ${problem.ruleId.padEnd(ruleIdPad)}  ${problem.message}`;
  }

  function formatMarkdown(problem: OnlyLineColProblem) {
    if (!SEVERITY_NAMES[problem.severity]) {
      return 'Error not found severity. Please check your config file. Allowed values: `warn,error,off`';
    }
    const severityName = SEVERITY_NAMES[problem.severity].toLowerCase();
    const { start } = problem.location[0];
    return `| ${severityName} | line ${`${start.line}:${start.col}`} | [${
      problem.ruleId
    }](https://redocly.com/docs/cli/rules/${problem.ruleId}/) | ${problem.message} |`;
  }

  function formatCheckstyle(problem: OnlyLineColProblem) {
    const { line, col } = problem.location[0].start;
    const severity = problem.severity == 'warn' ? 'warning' : 'error';
    const message = xmlEscape(problem.message);
    const source = xmlEscape(problem.ruleId);
    output.write(
      `<error line="${line}" column="${col}" severity="${severity}" message="${message}" source="${source}" />\n`
    );
  }
}

function formatSummary(problems: NormalizedProblem[]): void {
  const counts: Record<string, { count: number; severity: ProblemSeverity }> = {};
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
    logger.info(`${severityName} ${ruleId}: ${info.count}\n`);
  }

  logger.info('\n');
}

function formatFrom(cwd: string, location?: LocationObject) {
  if (!location) return '';
  const relativePath = path.relative(cwd, location.source.absoluteRef);
  const loc = getLineColLocation(location);
  const fileWithLoc = `${relativePath}:${loc.start.line}:${loc.start.col}`;
  const atPointer = location.pointer ? colorize.gray(`at ${location.pointer}`) : '';

  return `referenced from ${colorize.blue(fileWithLoc)} ${atPointer} \n\n`;
}

function formatDidYouMean(problem: NormalizedProblem) {
  if (problem.suggest.length === 0) return '';

  if (problem.suggest.length === 1) {
    return `Did you mean: ${problem.suggest[0]} ?\n\n`;
  } else {
    return `Did you mean:\n  - ${problem.suggest.slice(0, MAX_SUGGEST).join('\n  - ')}\n\n`;
  }
}

type OnlyLineColProblem = Omit<NormalizedProblem, 'location'> & {
  location: LineColLocationObject[];
};

const groupByFiles = (problems: NormalizedProblem[]) => {
  const fileGroups: Record<
    string,
    {
      locationPad: number;
      ruleIdPad: number;
      fileProblems: OnlyLineColProblem[];
    }
  > = {};
  for (const problem of problems) {
    const absoluteRef = problem.location[0].source.absoluteRef; // TODO: multiple errors
    fileGroups[absoluteRef] = fileGroups[absoluteRef] || {
      fileProblems: [],
      ruleIdPad: 0,
      locationPad: 0,
    };

    const mappedProblem = { ...problem, location: problem.location.map(getLineColLocation) };
    fileGroups[absoluteRef].fileProblems.push(mappedProblem);
    fileGroups[absoluteRef].ruleIdPad = Math.max(
      problem.ruleId.length,
      fileGroups[absoluteRef].ruleIdPad
    );

    fileGroups[absoluteRef].locationPad = Math.max(
      Math.max(...mappedProblem.location.map((loc) => `${loc.start.line}:${loc.start.col}`.length)),
      fileGroups[absoluteRef].locationPad
    );
  }

  return fileGroups;
};

function xmlEscape(s: string): string {
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

function outputForGithubActions(problems: NormalizedProblem[], cwd: string): void {
  for (const problem of problems) {
    for (const location of problem.location.map(getLineColLocation)) {
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
        file: isAbsoluteUrl(location.source.absoluteRef)
          ? location.source.absoluteRef
          : path.relative(cwd, location.source.absoluteRef),
        line: location.start.line,
        col: location.start.col,
        endLine: location.end?.line,
        endColumn: location.end?.col,
      };
      output.write(`::${command} ${formatProperties(properties)}::${escapeMessage(message)}\n`);
    }
  }

  function formatProperties(props: Record<string, any>): string {
    return Object.entries(props)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${escapeProperty(v)}`)
      .join(',');
  }

  function toString(v: any): string {
    if (v === null || v === undefined) {
      return '';
    } else if (typeof v === 'string' || v instanceof String) {
      return v as string;
    }
    return JSON.stringify(v);
  }

  function escapeMessage(v: any): string {
    return toString(v).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  }
  function escapeProperty(v: any): string {
    return toString(v)
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A')
      .replace(/:/g, '%3A')
      .replace(/,/g, '%2C');
  }
}
