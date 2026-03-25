/**
 * Service to log messages/data to output provider, default is console
 */
export class Logger {
    constructor(minLogLevel?: number);
    minLogLevel: number;
    logProvider: Console;
    log(...data: any[]): void;
    info(...data: any[]): void;
    debug(...data: any[]): void;
    warn(...data: any[]): void;
    error(...data: any[]): void;
    outputLog(logMethod: any, data: any): void;
    /**
     * Formats the console message
     */
    formatLogData(level: any, data: any): any;
}
export namespace LOG_LEVEL_MAP {
    let log: number;
    let debug: number;
    let info: number;
    let warn: number;
    let error: number;
    let none: number;
}
//# sourceMappingURL=Logger.d.ts.map