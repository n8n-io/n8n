import type { IProblemMatcher, IProblemMatcherJson, IProblem } from '@rushstack/problem-matcher';
import type { ITerminalChunk } from './ITerminalChunk';
import { type ITerminalWritableOptions, TerminalWritable } from './TerminalWritable';
import type { IProblemCollector } from './IProblemCollector';
/**
 * Constructor options for {@link ProblemCollector}.
 * @beta
 */
export interface IProblemCollectorOptions extends ITerminalWritableOptions {
    /**
     * The set of matchers that will be applied to each incoming line. Must contain at least one item.
     */
    matchers?: IProblemMatcher[];
    /**
     * VS Code style problem matcher definitions. These will be converted to
     * {@link @rushstack/problem-matcher#IProblemMatcher | IProblemMatcher} definitions.
     */
    matcherJson?: IProblemMatcherJson[];
    /**
     * Optional callback invoked immediately whenever a problem is produced.
     */
    onProblem?: (problem: IProblem) => void;
}
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
export declare class ProblemCollector extends TerminalWritable implements IProblemCollector {
    private readonly _matchers;
    private readonly _problems;
    private readonly _onProblem;
    constructor(options: IProblemCollectorOptions);
    /**
     * {@inheritdoc IProblemCollector}
     */
    get problems(): ReadonlySet<IProblem>;
    /**
     * {@inheritdoc TerminalWritable}
     */
    protected onWriteChunk(chunk: ITerminalChunk): void;
    /**
     * {@inheritdoc TerminalWritable}
     */
    protected onClose(): void;
}
//# sourceMappingURL=ProblemCollector.d.ts.map