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
    private parseReadyForQueryMessage;
    private parseCommandCompleteMessage;
    private parseCopyData;
    private parseCopyInMessage;
    private parseCopyOutMessage;
    private parseCopyMessage;
    private parseNotificationMessage;
    private parseRowDescriptionMessage;
    private parseField;
    private parseParameterDescriptionMessage;
    private parseDataRowMessage;
    private parseParameterStatusMessage;
    private parseBackendKeyData;
    parseAuthenticationResponse(offset: number, length: number, bytes: Buffer): any;
    private parseErrorMessage;
}
export {};
