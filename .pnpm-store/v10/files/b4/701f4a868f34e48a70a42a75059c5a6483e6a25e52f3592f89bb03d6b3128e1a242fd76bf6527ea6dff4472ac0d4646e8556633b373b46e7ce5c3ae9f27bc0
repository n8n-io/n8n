import type { LogResult, Options, SimpleGit } from '../../../typings';
import { StringTask } from '../types';
export interface DefaultLogFields {
    hash: string;
    date: string;
    message: string;
    refs: string;
    body: string;
    author_name: string;
    author_email: string;
}
export type LogOptions<T = DefaultLogFields> = {
    file?: string;
    format?: T;
    from?: string;
    mailMap?: boolean;
    maxCount?: number;
    multiLine?: boolean;
    splitter?: string;
    strictDate?: boolean;
    symmetric?: boolean;
    to?: string;
};
interface ParsedLogOptions {
    fields: string[];
    splitter: string;
    commands: string[];
}
export declare function parseLogOptions<T extends Options>(opt?: Options | LogOptions<T>, customArgs?: string[]): ParsedLogOptions;
export declare function logTask<T>(splitter: string, fields: string[], customArgs: string[]): StringTask<LogResult<T>>;
export default function (): Pick<SimpleGit, 'log'>;
export {};
