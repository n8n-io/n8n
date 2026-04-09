export interface MessageDef<T> {
    default(): T;
    [tag: number]: (r: FieldReader, msg: T) => T | void;
}
declare class MessageReader {
    #private;
    constructor(array: Uint8Array);
    varint(): number;
    varintBig(): bigint;
    bytes(length: number): Uint8Array;
    double(): number;
    skipVarint(): void;
    skip(count: number): void;
    eof(): boolean;
}
export declare class FieldReader {
    #private;
    constructor(reader: MessageReader);
    setup(wireType: number): void;
    bytes(): Uint8Array;
    string(): string;
    message<T>(def: MessageDef<T>): T;
    int32(): number;
    uint32(): number;
    bool(): boolean;
    uint64(): bigint;
    sint64(): bigint;
    double(): number;
    maybeSkip(): void;
}
export declare function readProtobufMessage<T>(data: Uint8Array, def: MessageDef<T>): T;
export {};
