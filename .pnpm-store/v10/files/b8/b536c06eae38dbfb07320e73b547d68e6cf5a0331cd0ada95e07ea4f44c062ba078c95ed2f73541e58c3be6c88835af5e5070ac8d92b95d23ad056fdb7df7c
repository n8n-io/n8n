export type MessageFun<T> = (w: MessageWriter, msg: T) => void;
export declare class MessageWriter {
    #private;
    constructor();
    bytes(tag: number, value: Uint8Array): void;
    string(tag: number, value: string): void;
    message<T>(tag: number, value: T, fun: MessageFun<T>): void;
    int32(tag: number, value: number): void;
    uint32(tag: number, value: number): void;
    bool(tag: number, value: boolean): void;
    sint64(tag: number, value: bigint): void;
    double(tag: number, value: number): void;
    data(): Uint8Array;
}
export declare function writeProtobufMessage<T>(value: T, fun: MessageFun<T>): Uint8Array;
