/// <reference types="node" />
import { Writable } from 'stream';
import { LogMessageFormatter } from './message';
interface LogTarget {
    stream: Writable;
    minLevel: number;
    format: LogMessageFormatter;
}
declare const parseLogTargets: (targetString?: string | undefined) => LogTarget[];
declare const DEFAULT_LOG_TARGET: string;
export { LogTarget, DEFAULT_LOG_TARGET, parseLogTargets };
