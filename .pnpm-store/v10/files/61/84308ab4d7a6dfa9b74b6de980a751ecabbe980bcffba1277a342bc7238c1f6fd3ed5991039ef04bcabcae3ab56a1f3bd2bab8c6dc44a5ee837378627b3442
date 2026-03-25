/// <reference types="node" />
/// <reference types="node" />
import { TransformOptions } from 'stream';
import { Mode, BackendMessage } from './messages';
export declare type Packet = {
    code: number;
    packet: Buffer;
};
declare type StreamOptions = TransformOptions & {
    mode: Mode;
};
export declare type MessageCallback = (msg: BackendMessage) => void;
export declare class Parser {
    private buffer;
    private bufferLength;
    private bufferOffset;
    private reader;
    private mode;
    constructor(opts?: StreamOptions);
    parse(buffer: Buffer, callback: MessageCallback): void;
    private mergeBuffer;
    private handlePacket;
}
export {};
