import type { NormalizedProblem } from '../walk';
export type Totals = {
    errors: number;
    warnings: number;
    ignored: number;
};
export type OutputFormat = 'codeframe' | 'stylish' | 'json' | 'checkstyle' | 'codeclimate' | 'summary' | 'github-actions' | 'markdown';
export declare function getTotals(problems: (NormalizedProblem & {
    ignored?: boolean;
})[]): Totals;
export declare function formatProblems(problems: (NormalizedProblem & {
    ignored?: boolean;
})[], opts: {
    maxProblems?: number;
    cwd?: string;
    format?: OutputFormat;
    color?: boolean;
    totals: Totals;
    version: string;
}): void;
