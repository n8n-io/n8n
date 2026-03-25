/// <reference types="node" />
export interface NumberValue {
    value: number | object;
}
export interface StringValue {
    value: string;
}
export interface BoolValue {
    value: boolean;
}
export interface BytesValue {
    value: Buffer | Uint8Array;
}
export declare function wrapperToProto3JSON(obj: protobuf.Message & (NumberValue | StringValue | BoolValue | BytesValue)): string | number | boolean | null;
export declare function wrapperFromProto3JSON(typeName: string, json: number | string | boolean | null): {
    value: null;
} | {
    value: Buffer;
} | {
    value: string | number | boolean;
};
