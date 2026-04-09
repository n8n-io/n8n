"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProblemMatchersJson = parseProblemMatchersJson;
/**
 * Parse VS Code problem matcher JSON definitions into {@link IProblemMatcher} objects.
 *
 * @public
 */
function parseProblemMatchersJson(problemMatchers) {
    const result = [];
    for (const matcher of problemMatchers) {
        const problemPatterns = Array.isArray(matcher.pattern)
            ? matcher.pattern
            : [matcher.pattern];
        if (problemPatterns.length === 0) {
            continue;
        }
        const name = matcher.name;
        const defaultSeverity = matcher.severity;
        const compiled = compileProblemPatterns(problemPatterns);
        if (compiled.length === 1) {
            result.push(createSingleLineMatcher(name, compiled[0], defaultSeverity));
        }
        else {
            result.push(createMultiLineMatcher(name, compiled, defaultSeverity));
        }
    }
    return result;
}
function toNumber(text) {
    if (!text) {
        return undefined;
    }
    const n = parseInt(text, 10);
    return isNaN(n) ? undefined : n;
}
function normalizeSeverity(raw) {
    if (!raw) {
        return undefined;
    }
    const lowered = raw.toLowerCase();
    // Support full words as well as common abbreviations (e.g. single-letter tokens)
    if (lowered.indexOf('err') === 0)
        return 'error';
    if (lowered.indexOf('warn') === 0)
        return 'warning';
    if (lowered.indexOf('info') === 0)
        return 'info';
    return undefined;
}
function compileProblemPatterns(problemPatterns) {
    return problemPatterns.map((problemPattern) => {
        let reStr = problemPattern.regexp;
        if (/\\r?\\n\$/.test(reStr) || /\\n\$/.test(reStr)) {
            // already newline aware
        }
        else if (reStr.length > 0 && reStr.charAt(reStr.length - 1) === '$') {
            reStr = reStr.slice(0, -1) + '\\r?\\n$';
        }
        else {
            reStr = reStr + '(?:\\r?\\n)';
        }
        const re = new RegExp(reStr);
        return { re, spec: problemPattern };
    });
}
function createEmptyCaptures() {
    return { messageParts: [] };
}
/**
 * Apply one pattern's regex match to the (possibly accumulating) captures.
 */
function applyPatternCaptures(spec, reMatch, captures, defaultSeverity) {
    if (spec.file && reMatch[spec.file]) {
        captures.file = reMatch[spec.file];
    }
    if (spec.location && reMatch[spec.location]) {
        const loc = reMatch[spec.location];
        const parts = loc.split(/[,.:]/).filter((s) => s.length > 0);
        if (parts.length === 1) {
            captures.line = toNumber(parts[0]);
        }
        else if (parts.length === 2) {
            captures.line = toNumber(parts[0]);
            captures.column = toNumber(parts[1]);
        }
        else if (parts.length === 4) {
            captures.line = toNumber(parts[0]);
            captures.column = toNumber(parts[1]);
            captures.endLine = toNumber(parts[2]);
            captures.endColumn = toNumber(parts[3]);
        }
    }
    else {
        if (spec.line && reMatch[spec.line]) {
            captures.line = toNumber(reMatch[spec.line]);
        }
        if (spec.column && reMatch[spec.column]) {
            captures.column = toNumber(reMatch[spec.column]);
        }
    }
    if (spec.endLine && reMatch[spec.endLine]) {
        captures.endLine = toNumber(reMatch[spec.endLine]);
    }
    if (spec.endColumn && reMatch[spec.endColumn]) {
        captures.endColumn = toNumber(reMatch[spec.endColumn]);
    }
    if (spec.severity && reMatch[spec.severity]) {
        captures.severity = normalizeSeverity(reMatch[spec.severity]) || defaultSeverity;
    }
    else if (!captures.severity && defaultSeverity) {
        captures.severity = defaultSeverity;
    }
    if (spec.code && reMatch[spec.code]) {
        captures.code = reMatch[spec.code];
    }
    if (spec.message && reMatch[spec.message]) {
        captures.messageParts.push(reMatch[spec.message]);
    }
}
function finalizeProblem(matcherName, captures, defaultSeverity) {
    // For multi-line patterns, use only the last non-empty message part
    const message = captures.messageParts.length > 0 ? captures.messageParts[captures.messageParts.length - 1] : '';
    return {
        matcherName,
        file: captures.file,
        line: captures.line,
        column: captures.column,
        endLine: captures.endLine,
        endColumn: captures.endColumn,
        severity: captures.severity || defaultSeverity,
        code: captures.code,
        message: message
    };
}
function createSingleLineMatcher(name, compiled, defaultSeverity) {
    const { re, spec } = compiled;
    return {
        name,
        exec(line) {
            const match = re.exec(line);
            if (!match) {
                return false;
            }
            const captures = createEmptyCaptures();
            applyPatternCaptures(spec, match, captures, defaultSeverity);
            return finalizeProblem(name, captures, defaultSeverity);
        }
    };
}
function createMultiLineMatcher(name, compiled, defaultSeverity) {
    // currentIndex points to the next pattern we expect to match. When it equals compiled.length
    // and the last pattern is a loop, we are in a special "loop state" where additional lines
    // should be attempted against only the last pattern to emit more problems.
    let currentIndex = 0;
    const lastSpec = compiled[compiled.length - 1].spec;
    const lastIsLoop = !!lastSpec.loop;
    let captures = createEmptyCaptures();
    return {
        name,
        exec(line) {
            let effectiveMatch = null;
            let effectiveSpec;
            // Determine matching behavior based on current state
            if (currentIndex === compiled.length && lastIsLoop) {
                // Loop state: only try to match the last pattern
                const lastPattern = compiled[compiled.length - 1];
                effectiveMatch = lastPattern.re.exec(line);
                if (!effectiveMatch) {
                    // Exit loop state and reset for a potential new sequence
                    currentIndex = 0;
                    captures = createEmptyCaptures();
                    // Attempt to treat this line as a fresh start (pattern 0)
                    const first = compiled[0];
                    const fresh = first.re.exec(line);
                    if (!fresh) {
                        return false;
                    }
                    effectiveMatch = fresh;
                    effectiveSpec = first.spec;
                    currentIndex = compiled.length > 1 ? 1 : compiled.length;
                }
                else {
                    effectiveSpec = lastPattern.spec;
                    // currentIndex remains compiled.length (loop state) until we decide to emit
                }
            }
            else {
                // Normal multi-line progression state
                const active = compiled[currentIndex];
                const reMatch = active.re.exec(line);
                if (!reMatch) {
                    // Reset and maybe attempt new start
                    currentIndex = 0;
                    captures = createEmptyCaptures();
                    const { re: re0, spec: spec0 } = compiled[0];
                    const restartMatch = re0.exec(line);
                    if (!restartMatch) {
                        return false;
                    }
                    effectiveMatch = restartMatch;
                    effectiveSpec = spec0;
                    currentIndex = compiled.length > 1 ? 1 : compiled.length;
                }
                else {
                    effectiveMatch = reMatch;
                    effectiveSpec = active.spec;
                    currentIndex++;
                }
            }
            applyPatternCaptures(effectiveSpec, effectiveMatch, captures, defaultSeverity);
            // If we haven't matched all patterns yet (and not in loop state), wait for more lines
            if (currentIndex < compiled.length) {
                return false;
            }
            // We have matched the full sequence (either first completion or a loop iteration)
            const problem = finalizeProblem(name, captures, defaultSeverity);
            if (lastIsLoop) {
                // Stay in loop state; reset fields that accumulate per problem but retain other context (e.g., file if first pattern captured it?)
                // For safety, if the last pattern provided the file each iteration we keep overwriting anyway.
                captures.messageParts = [];
                // Do not clear entire captures to allow preceding pattern data (e.g., summary) to persist if desirable.
            }
            else {
                currentIndex = 0;
                captures = createEmptyCaptures();
            }
            return problem;
        }
    };
}
//# sourceMappingURL=ProblemMatcher.js.map