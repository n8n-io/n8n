/// <reference types="node" />
import { ErrorReply } from '../../errors';
export type Reply = string | Buffer | ErrorReply | number | null | Array<Reply>;
export type ReturnStringsAsBuffers = () => boolean;
interface RESP2Options {
    returnStringsAsBuffers: ReturnStringsAsBuffers;
    onReply(reply: Reply): unknown;
}
export default class RESP2Decoder {
    private options;
    constructor(options: RESP2Options);
    private cursor;
    private type?;
    private bufferComposer;
    private stringComposer;
    private currentStringComposer;
    reset(): void;
    write(chunk: Buffer): void;
    private parseType;
    private compose;
    private parseSimpleString;
    private parseError;
    private integer;
    private isNegativeInteger?;
    private parseInteger;
    private bulkStringRemainingLength?;
    private parseBulkString;
    private arraysInProcess;
    private initializeArray;
    private arrayItemType?;
    private parseArray;
    private returnArrayReply;
    private pushArrayItem;
}
export {};
