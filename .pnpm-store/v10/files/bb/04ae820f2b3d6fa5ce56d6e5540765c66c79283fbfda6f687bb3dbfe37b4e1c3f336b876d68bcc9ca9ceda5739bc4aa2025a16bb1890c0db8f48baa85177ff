import * as Rx from 'rxjs';
import { Command, CommandIdentifier } from './command';
export declare class Logger {
    private readonly hide;
    private readonly raw;
    private readonly prefixFormat?;
    private readonly prefixLength;
    private readonly timestampFormat;
    /**
     * Last character emitted.
     * If `undefined`, then nothing has been logged yet.
     */
    private lastChar?;
    /**
     * Observable that emits when there's been output logged.
     * If `command` is is `undefined`, then the log is for a global event.
     */
    readonly output: Rx.Subject<{
        command: Command | undefined;
        text: string;
    }>;
    constructor({ hide, prefixFormat, prefixLength, raw, timestampFormat, }: {
        /**
         * Which command(s) should have their output hidden.
         */
        hide?: CommandIdentifier | CommandIdentifier[];
        /**
         * Whether output should be formatted to include prefixes and whether "event" logs will be
         * logged.
         */
        raw?: boolean;
        /**
         * The prefix format to use when logging a command's output.
         * Defaults to the command's index.
         */
        prefixFormat?: string;
        /**
         * How many characters should a prefix have at most, used when the prefix format is `command`.
         */
        prefixLength?: number;
        /**
         * Date format used when logging date/time.
         * @see https://date-fns.org/v2.0.1/docs/format
         */
        timestampFormat?: string;
    });
    private shortenText;
    private getPrefixesFor;
    getPrefix(command: Command): string;
    colorText(command: Command, text: string): string;
    /**
     * Logs an event for a command (e.g. start, stop).
     *
     * If raw mode is on, then nothing is logged.
     */
    logCommandEvent(text: string, command: Command): void;
    logCommandText(text: string, command: Command): void;
    /**
     * Logs a global event (e.g. sending signals to processes).
     *
     * If raw mode is on, then nothing is logged.
     */
    logGlobalEvent(text: string): void;
    /**
     * Logs a table from an input object array, like `console.table`.
     *
     * Each row is a single input item, and they are presented in the input order.
     */
    logTable(tableContents: Record<string, unknown>[]): void;
    log(prefix: string, text: string, command?: Command): void;
    emit(command: Command | undefined, text: string): void;
}
