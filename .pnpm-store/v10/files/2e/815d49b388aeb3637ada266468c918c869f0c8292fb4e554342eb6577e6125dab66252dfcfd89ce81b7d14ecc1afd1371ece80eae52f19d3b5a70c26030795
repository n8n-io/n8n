"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemCollector = void 0;
const problem_matcher_1 = require("@rushstack/problem-matcher");
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * A {@link TerminalWritable} that consumes line-oriented terminal output and extracts structured
 * problems using one or more {@link @rushstack/problem-matcher#IProblemMatcher | IProblemMatcher} instances.
 *
 * @remarks
 * This collector expects that each incoming {@link ITerminalChunk} represents a single line terminated
 * by a `"\n"` character (for example when preceded by {@link StderrLineTransform} / `StdioLineTransform`).
 * If a chunk does not end with a newline an error is thrown to surface incorrect pipeline wiring early.
 *
 * @beta
 */
class ProblemCollector extends TerminalWritable_1.TerminalWritable {
    constructor(options) {
        super(options);
        this._problems = new Set();
        if (!options ||
            ((!options.matchers || options.matchers.length === 0) &&
                (!options.matcherJson || options.matcherJson.length === 0))) {
            throw new Error('ProblemCollector requires at least one problem matcher.');
        }
        const fromJson = options.matcherJson
            ? (0, problem_matcher_1.parseProblemMatchersJson)(options.matcherJson)
            : [];
        this._matchers = [...(options.matchers || []), ...fromJson];
        if (this._matchers.length === 0) {
            throw new Error('ProblemCollector requires at least one problem matcher.');
        }
        this._onProblem = options.onProblem;
    }
    /**
     * {@inheritdoc IProblemCollector}
     */
    get problems() {
        return this._problems;
    }
    /**
     * {@inheritdoc TerminalWritable}
     */
    onWriteChunk(chunk) {
        var _a;
        const text = chunk.text;
        if (text.length === 0 || text[text.length - 1] !== '\n') {
            throw new Error('ProblemCollector expects chunks that were split into newline terminated lines. ' +
                'Invalid input: ' +
                JSON.stringify(text));
        }
        for (const matcher of this._matchers) {
            const problem = matcher.exec(text);
            if (problem) {
                const finalized = {
                    ...problem,
                    matcherName: matcher.name
                };
                this._problems.add(finalized);
                (_a = this._onProblem) === null || _a === void 0 ? void 0 : _a.call(this, finalized);
            }
        }
    }
    /**
     * {@inheritdoc TerminalWritable}
     */
    onClose() {
        var _a;
        for (const matcher of this._matchers) {
            if (matcher.flush) {
                const flushed = matcher.flush();
                if (flushed && flushed.length > 0) {
                    for (const problem of flushed) {
                        const finalized = {
                            ...problem,
                            matcherName: matcher.name
                        };
                        this._problems.add(finalized);
                        (_a = this._onProblem) === null || _a === void 0 ? void 0 : _a.call(this, finalized);
                    }
                }
            }
        }
    }
}
exports.ProblemCollector = ProblemCollector;
//# sourceMappingURL=ProblemCollector.js.map