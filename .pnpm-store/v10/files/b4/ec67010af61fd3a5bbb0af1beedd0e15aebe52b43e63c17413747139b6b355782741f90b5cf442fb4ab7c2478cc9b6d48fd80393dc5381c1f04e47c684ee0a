import { AbstractLogger } from "./AbstractLogger";
import { LogLevel, LogMessage, LogMessageType } from "./Logger";
import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Performs logging of the events in TypeORM via debug library.
 */
export declare class DebugLogger extends AbstractLogger {
    /**
     * Object with all debug logger.
     */
    private logger;
    /**
     * Check is logging for level or message type is enabled.
     */
    protected isLogEnabledFor(type?: LogLevel | LogMessageType): boolean;
    /**
     * Write log to specific output.
     */
    protected writeLog(level: LogLevel, logMessage: LogMessage | LogMessage[], queryRunner?: QueryRunner): void;
}
