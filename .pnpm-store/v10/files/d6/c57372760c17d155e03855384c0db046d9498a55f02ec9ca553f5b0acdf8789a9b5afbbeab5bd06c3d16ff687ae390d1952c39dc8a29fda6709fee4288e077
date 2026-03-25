import { ESLint, Rule } from "./index.js";

/** @deprecated */
export const builtinRules: Map<string, Rule.RuleModule>;

/** @deprecated */
export class FileEnumerator {
    constructor(
        params?: {
            cwd?: string;
            configArrayFactory?: any;
            extensions?: any;
            globInputPaths?: boolean;
            errorOnUnmatchedPattern?: boolean;
            ignore?: boolean;
        },
    );
    isTargetPath(filePath: string, providedConfig?: any): boolean;
    iterateFiles(
        patternOrPatterns: string | string[],
    ): IterableIterator<{ config: any; filePath: string; ignored: boolean }>;
}

export { /** @deprecated */ ESLint as FlatESLint };

/** @deprecated */
export class LegacyESLint {
    static configType: "eslintrc";

    static readonly version: string;

    static outputFixes(results: ESLint.LintResult[]): Promise<void>;

    static getErrorResults(results: ESLint.LintResult[]): ESLint.LintResult[];

    constructor(options?: ESLint.LegacyOptions);

    lintFiles(patterns: string | string[]): Promise<ESLint.LintResult[]>;

    lintText(
        code: string,
        options?: { filePath?: string | undefined; warnIgnored?: boolean | undefined },
    ): Promise<ESLint.LintResult[]>;

    getRulesMetaForResults(results: ESLint.LintResult[]): ESLint.LintResultData["rulesMeta"];

    hasFlag(flag: string): false;

    calculateConfigForFile(filePath: string): Promise<any>;

    isPathIgnored(filePath: string): Promise<boolean>;

    loadFormatter(nameOrPath?: string): Promise<ESLint.Formatter>;
}

/** @deprecated */
export function shouldUseFlatConfig(): Promise<boolean>;
