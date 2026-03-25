import { FileLoggerOptions, LoggerOptions } from "./LoggerOptions";
import { LogLevel, LogMessage } from "./Logger";
import { QueryRunner } from "../query-runner/QueryRunner";
import { AbstractLogger } from "./AbstractLogger";
/**
 * Performs logging of the events in TypeORM.
 * This version of logger logs everything into ormlogs.log file.
 */
export declare class FileLogger extends AbstractLogger {
    private fileLoggerOptions?;
    constructor(options?: LoggerOptions, fileLoggerOptions?: FileLoggerOptions | undefined);
    /**
     * Write log to specific output.
     */
    protected writeLog(level: LogLevel, logMessage: LogMessage | LogMessage[], queryRunner?: QueryRunner): void;
    /**
     * Writes given strings into the log file.
     */
    protected write(strings: string | string[]): void;
}
