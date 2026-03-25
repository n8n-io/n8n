export declare class Fail extends Error {
    static DOCS_URL: string;
    static EXIT_CODES: Record<number, string>;
    static ERRNO_CODES: Record<number, string>;
    static formatExitMessage(code: number | null, signal: NodeJS.Signals | null, stderr: string, from: string, details?: string): string;
    static formatErrorMessage(err: NodeJS.ErrnoException, from: string): string;
    static formatErrorDetails(lines?: string[], lim?: number): string;
    static getExitCodeInfo(exitCode: number | null): string | undefined;
    static getCallerLocationFromString(stackString?: string): string;
    static getCallerLocation(err?: Error): string;
    static getErrnoMessage(errno?: number): string;
}
