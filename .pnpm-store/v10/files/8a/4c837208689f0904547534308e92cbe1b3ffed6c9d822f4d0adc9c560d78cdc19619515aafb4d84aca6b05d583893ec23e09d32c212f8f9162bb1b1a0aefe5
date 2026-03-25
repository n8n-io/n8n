import { LogContext } from './context';
import { LogMessageTranslator } from './message';
import { LogTarget } from './target';
interface LogMethod {
    (message: string, ...args: any[]): void;
    (context: LogContext, message: string, ...args: any[]): void;
    isEmptyFunction?: boolean;
}
interface LogChildMethod {
    (context: LogContext): Logger;
    (translate: LogMessageTranslator): Logger;
}
interface LogWrapMethod {
    <F extends (...args: any[]) => any>(func: F): F;
    <F extends (...args: any[]) => any>(message: string, func: F): F;
    <F extends (...args: any[]) => any>(context: LogContext, message: string, func: F): F;
    <F extends (...args: any[]) => any>(level: number, message: string, func: F): F;
}
interface Logger extends LogMethod {
    trace: LogMethod;
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
    fatal: LogMethod;
    child: LogChildMethod;
    wrap: LogWrapMethod;
}
declare const resetSequence: (next?: number) => void;
declare const lastSequenceNumber: () => number;
interface CreateLoggerOptions {
    context?: LogContext;
    translate?: LogMessageTranslator;
    targets?: string | LogTarget[];
}
declare const createLogger: ({ context: baseContext, targets: logTargets, translate: logTranslator, }?: CreateLoggerOptions) => Logger;
export { createLogger, lastSequenceNumber, Logger, LogMethod, resetSequence, CreateLoggerOptions };
