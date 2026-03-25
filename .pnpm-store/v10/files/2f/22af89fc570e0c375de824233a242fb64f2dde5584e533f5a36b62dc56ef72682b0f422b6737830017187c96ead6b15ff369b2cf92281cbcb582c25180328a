import { Logger, LogLevel, LogMessage, LogMessageType, PrepareLogMessagesOptions } from "./Logger";
import { QueryRunner } from "../query-runner/QueryRunner";
import { LoggerOptions } from "./LoggerOptions";
export declare abstract class AbstractLogger implements Logger {
    protected options?: LoggerOptions | undefined;
    constructor(options?: LoggerOptions | undefined);
    /**
     * Logs query and parameters used in it.
     */
    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    /**
     * Logs query that is failed.
     */
    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    /**
     * Logs query that is slow.
     */
    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void;
    /**
     * Logs events from the schema build process.
     */
    logSchemaBuild(message: string, queryRunner?: QueryRunner): void;
    /**
     * Logs events from the migration run process.
     */
    logMigration(message: string, queryRunner?: QueryRunner): void;
    /**
     * Perform logging using given logger, or by default to the console.
     * Log has its own level and message.
     */
    log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner): void;
    /**
     * Check is logging for level or message type is enabled.
     */
    protected isLogEnabledFor(type?: LogLevel | LogMessageType): boolean;
    /**
     * Write log to specific output.
     */
    protected abstract writeLog(level: LogLevel, message: LogMessage | string | number | (LogMessage | string | number)[], queryRunner?: QueryRunner): void;
    /**
     * Prepare and format log messages
     */
    protected prepareLogMessages(logMessage: LogMessage | string | number | (LogMessage | string | number)[], options?: Partial<PrepareLogMessagesOptions>): LogMessage[];
    /**
     * Converts parameters to a string.
     * Sometimes parameters can have circular objects and therefor we are handle this case too.
     */
    protected stringifyParams(parameters: any[]): string | any[];
}
