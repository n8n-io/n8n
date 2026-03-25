import { LogMessage } from '../logger/message';
import { LogTarget } from '../logger/target';
interface ExtendedArray<T> extends Array<T> {
    readonly last: T | undefined;
}
interface LogLevelMap<T> {
    trace: T;
    debug: T;
    info: T;
    warn: T;
    error: T;
    fatal: T;
}
declare const extendArray: <T>(array: T[]) => ExtendedArray<T>;
declare class LogTargetMock implements LogTarget {
    minLevel: number;
    readonly messages: ExtendedArray<LogMessage> & LogLevelMap<ExtendedArray<LogMessage>>;
    readonly lines: ExtendedArray<string> & LogLevelMap<ExtendedArray<string>>;
    readonly stream: LogTarget['stream'];
    constructor(minLevel?: number);
    format(msg: LogMessage): string;
    clear(): void;
    filteredMessages(level: number, untilLevel?: number): ExtendedArray<LogMessage>;
    filteredMessages(level: null): ExtendedArray<LogMessage>;
    filteredLines(level: number, untilLevel?: number): ExtendedArray<string>;
    filteredLines(level: null): ExtendedArray<string>;
}
export { LogTargetMock, extendArray, ExtendedArray };
