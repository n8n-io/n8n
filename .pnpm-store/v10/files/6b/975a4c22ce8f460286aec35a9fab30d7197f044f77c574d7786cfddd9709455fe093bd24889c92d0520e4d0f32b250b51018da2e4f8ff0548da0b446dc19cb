import type { MaybeArray, TaskParser, TaskResponseFormat } from '../types';
import { GitOutputStreams } from './git-output-streams';
import { LineParser } from './line-parser';
export declare function callTaskParser<INPUT extends TaskResponseFormat, RESPONSE>(parser: TaskParser<INPUT, RESPONSE>, streams: GitOutputStreams<INPUT>): RESPONSE;
export declare function parseStringResponse<T>(result: T, parsers: LineParser<T>[], texts: MaybeArray<string>, trim?: boolean): T;
