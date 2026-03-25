declare const LogLevels: {
    trace: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
    fatal: number;
    readonly lower: number;
    readonly higher: number;
};
declare type LogLevelName = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
declare const LogLevelNames: LogLevelName[];
declare const LogLevelValues: number[];
interface LogLevelsScaleEntry {
    range: {
        from: number;
        next: number;
    };
    name: string;
    test(level: number): boolean;
}
declare const LogLevelsScale: ReadonlyArray<LogLevelsScaleEntry>;
declare const logLevelNameFor: (level?: number | undefined) => string;
declare const parseLogLevel: (level: string | number) => number | undefined;
export { logLevelNameFor, LogLevels, LogLevelNames, LogLevelValues, LogLevelsScale, parseLogLevel, LogLevelName };
