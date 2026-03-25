import { Command } from 'commander';
import { GenerateOptions } from './types.js';
/**
 * Run the CLI and gather options.
 * When this is done, load any config file and merge with the CLI options.
 * Finally, invoke a callback with the merged options.
 * Note: Does not introduce default values. Default values should be handled in the callback function.
 */
export declare function run(argv: readonly string[], cb: (path: string, options: GenerateOptions) => Promise<void>): Promise<Command>;
