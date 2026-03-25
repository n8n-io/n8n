import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';
/**
 * Finds wildcards in npm/yarn/pnpm/bun run commands and replaces them with all matching scripts in the
 * `package.json` file of the current directory.
 */
export declare class ExpandNpmWildcard implements CommandParser {
    private readonly readPackage;
    static readPackage(): any;
    private scripts?;
    constructor(readPackage?: typeof ExpandNpmWildcard.readPackage);
    parse(commandInfo: CommandInfo): CommandInfo | CommandInfo[];
}
