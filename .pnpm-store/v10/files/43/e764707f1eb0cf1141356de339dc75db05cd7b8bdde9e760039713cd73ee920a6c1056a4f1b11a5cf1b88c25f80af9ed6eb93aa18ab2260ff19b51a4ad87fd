import { List } from 'utilium';
import { ErrnoError } from './error.js';
import type { FileSystem } from './filesystem.js';
export declare const enum Level {
    /** Emergency */
    EMERG = 0,
    /** Alert */
    ALERT = 1,
    /** Critical */
    CRIT = 2,
    /** Error */
    ERR = 3,
    /** Warning */
    WARN = 4,
    /** Notice */
    NOTICE = 5,
    /** Informational */
    INFO = 6,
    /** Debug */
    DEBUG = 7
}
/** An object mapping log levels to a textual representation of them */
export declare const levels: {
    readonly 0: "emergency";
    readonly 1: "alert";
    readonly 2: "critical";
    readonly 3: "error";
    readonly 4: "warning";
    readonly 5: "notice";
    readonly 6: "info";
    readonly 7: "debug";
};
export declare function levelOf(value: (typeof levels)[Level]): Level;
/** A log entry */
export interface Entry {
    level: Level;
    timestamp: Date;
    elapsedMs: number;
    message: string;
}
/** The list of log entries */
export declare const entries: List<Entry>;
export declare function log(level: Level, message: string): void;
interface LogShortcutOptions {
    fs?: FileSystem;
}
/** Shortcut for logging emergencies */
export declare const emerg: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging alerts */
export declare const alert: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging critical errors */
export declare const crit: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging non-critical errors */
export declare const err: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging warnings */
export declare const warn: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging notices */
export declare const notice: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging informational messages */
export declare const info: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/** Shortcut for logging debug messages */
export declare const debug: <T extends {
    toString(): string;
} | ErrnoError>(message: T, options?: LogShortcutOptions) => T;
/**
 * Shortcut for logging usage of deprecated functions at runtime
 * @param symbol The thing that is deprecated
 * @internal @hidden
 */
export declare function log_deprecated(symbol: string): void;
/**
 * Various format functions included to make using the logger easier.
 * These are not the only formats you can use.
 */
export declare const formats: {
    /** Format with a timestamp and the level, colorized with ANSI escape codes */
    readonly ansi_level: (this: void, entry: Entry) => string[];
    /**
     * Format with a timestamp and colorize the message with ANSI escape codes.
     * For EMERG and ALERT, the levels are included
     */
    readonly ansi_message: (this: void, entry: Entry) => string;
    readonly css_level: (this: void, entry: Entry) => string[];
    readonly css_message: (this: void, entry: Entry) => string[];
    readonly default: (this: void, entry: Entry) => string[];
};
export declare function format(entry: Entry): string[];
/** Whether log entries are being recorded */
export declare let isEnabled: boolean;
export interface LogConfiguration {
    /**
     * If false, log messages will not be recorded or outputted
     * @default false
     */
    enabled?: boolean;
    /**
     * The minimum level needed to output a message
     * @default Level.ALERT
     */
    level?: Level | (typeof levels)[Level];
    /**
     * Formats a log entry into a string
     * @default `[${ms / 1000}] ${message}`
     */
    format?(this: void, entry: Entry): string | string[];
    /**
     * Outputs a log message
     * @default console.error()
     */
    output?(this: void, ...message: string[]): unknown;
    /**
     * If set, output() all current entries after `configure` is done
     * @default false
     */
    dumpBacklog?: boolean;
}
/** Configure logging behavior */
export declare function configure(options: LogConfiguration): void;
export {};
