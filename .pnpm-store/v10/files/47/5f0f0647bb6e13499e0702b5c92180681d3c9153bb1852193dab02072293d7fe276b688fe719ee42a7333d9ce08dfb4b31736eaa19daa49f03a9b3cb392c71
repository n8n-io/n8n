import { ResolvedGenerateOptions } from './options.js';
import { ConfigsToRules, GenerateOptions, Plugin } from './types.js';
/**
 * Context about the current invocation of the program, like what end-of-line
 * character to use.
 */
export interface Context {
    configsToRules: ConfigsToRules;
    endOfLine: string;
    options: ResolvedGenerateOptions;
    path: string;
    plugin: Plugin;
    pluginPrefix: string;
}
export declare function getContext(path: string, userOptions?: GenerateOptions, useMockPlugin?: boolean): Promise<Context>;
