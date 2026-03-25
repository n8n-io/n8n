import type { Maybe, OptionFlags, Options } from '../types';
export declare enum ResetMode {
    MIXED = "mixed",
    SOFT = "soft",
    HARD = "hard",
    MERGE = "merge",
    KEEP = "keep"
}
export type ResetOptions = Options & OptionFlags<'-q' | '--quiet' | '--no-quiet' | '--pathspec-from-nul'> & OptionFlags<'--pathspec-from-file', string>;
export declare function resetTask(mode: Maybe<ResetMode>, customArgs: string[]): import("../types").StringTask<string>;
export declare function getResetMode(mode: ResetMode | unknown): Maybe<ResetMode>;
