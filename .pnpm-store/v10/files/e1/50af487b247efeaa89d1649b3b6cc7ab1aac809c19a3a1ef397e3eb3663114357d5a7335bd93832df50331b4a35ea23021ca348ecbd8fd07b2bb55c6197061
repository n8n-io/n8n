import { CommandInfo } from '../command';
import { CommandParser } from './command-parser';
/**
 * Strips quotes around commands so that they can run on the current shell.
 */
export declare class StripQuotes implements CommandParser {
    parse(commandInfo: CommandInfo): {
        command: string;
        name: string;
        env?: Record<string, unknown> | undefined;
        cwd?: string | undefined;
        prefixColor?: string | undefined;
        raw?: boolean | undefined;
    };
}
