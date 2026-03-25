import _m0 from "protobufjs/minimal.js";
import { BooleanArrayProperties, ConsistencyLevel, IntArrayProperties, NumberArrayProperties, ObjectArrayProperties, ObjectProperties, TextArrayProperties, Vectors } from "./base.js";
export declare const protobufPackage = "weaviate.v1";
export interface BatchObjectsRequest {
    objects: BatchObject[];
    consistencyLevel?: ConsistencyLevel | undefined;
}
export interface BatchReferencesRequest {
    references: BatchReference[];
    consistencyLevel?: ConsistencyLevel | undefined;
}
export interface BatchSendRequest {
    streamId: string;
    objects?: BatchSendRequest_Objects | undefined;
    references?: BatchSendRequest_References | undefined;
    stop?: BatchSendRequest_Stop | undefined;
}
export interface BatchSendRequest_Stop {
}
export interface BatchSendRequest_Objects {
    values: BatchObject[];
}
export interface BatchSendRequest_References {
    values: BatchReference[];
}
export interface BatchSendReply {
    nextBatchSize: number;
    backoffSeconds: number;
}
export interface BatchStreamRequest {
    consistencyLevel?: ConsistencyLevel | undefined;
    objectIndex?: number | undefined;
    referenceIndex?: number | undefined;
}
export interface BatchStreamMessage {
    streamId: string;
    error?: BatchStreamMessage_Error | undefined;
    start?: BatchStreamMessage_Start | undefined;
    stop?: BatchStreamMessage_Stop | undefined;
    shutdown?: BatchStreamMessage_Shutdown | undefined;
    shuttingDown?: BatchStreamMessage_ShuttingDown | undefined;
}
export interface BatchStreamMessage_Start {
}
export interface BatchStreamMessage_Stop {
}
export interface BatchStreamMessage_Shutdown {
}
export interface BatchStreamMessage_ShuttingDown {
}
export interface BatchStreamMessage_Error {
    error: string;
    index: number;
    isRetriable: boolean;
    isObject: boolean;
    isReference: boolean;
}
export interface BatchObject {
    uuid: string;
    /**
     * protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED
     *
     * @deprecated
     */
    vector: number[];
    properties: BatchObject_Properties | undefined;
    collection: string;
    tenant: string;
    vectorBytes: Uint8Array;
    /** protolint:disable:next REPEATED_FIELD_NAMES_PLURALIZED */
    vectors: Vectors[];
}
export interface BatchObject_Properties {
    nonRefProperties: {
        [key: string]: any;
    } | undefined;
    singleTargetRefProps: BatchObject_SingleTargetRefProps[];
    multiTargetRefProps: BatchObject_MultiTargetRefProps[];
    numberArrayProperties: NumberArrayProperties[];
    intArrayProperties: IntArrayProperties[];
    textArrayProperties: TextArrayProperties[];
    booleanArrayProperties: BooleanArrayProperties[];
    objectProperties: ObjectProperties[];
    objectArrayProperties: ObjectArrayProperties[];
    /**
     * empty lists do not have a type in many languages and clients do not know which datatype the property has.
     * Weaviate can get the datatype from its schema
     */
    emptyListProps: string[];
}
export interface BatchObject_SingleTargetRefProps {
    uuids: string[];
    propName: string;
}
export interface BatchObject_MultiTargetRefProps {
    uuids: string[];
    propName: string;
    targetCollection: string;
}
export interface BatchReference {
    name: string;
    fromCollection: string;
    fromUuid: string;
    toCollection?: string | undefined;
    toUuid: string;
    tenant: string;
}
export interface BatchObjectsReply {
    took: number;
    errors: BatchObjectsReply_BatchError[];
}
export interface BatchObjectsReply_BatchError {
    index: number;
    error: string;
}
export interface BatchReferencesReply {
    took: number;
    errors: BatchReferencesReply_BatchError[];
}
export interface BatchReferencesReply_BatchError {
    index: number;
    error: string;
}
export declare const BatchObjectsRequest: {
    encode(message: BatchObjectsRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObjectsRequest;
    fromJSON(object: any): BatchObjectsRequest;
    toJSON(message: BatchObjectsRequest): unknown;
    create(base?: DeepPartial<BatchObjectsRequest>): BatchObjectsRequest;
    fromPartial(object: DeepPartial<BatchObjectsRequest>): BatchObjectsRequest;
};
export declare const BatchReferencesRequest: {
    encode(message: BatchReferencesRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchReferencesRequest;
    fromJSON(object: any): BatchReferencesRequest;
    toJSON(message: BatchReferencesRequest): unknown;
    create(base?: DeepPartial<BatchReferencesRequest>): BatchReferencesRequest;
    fromPartial(object: DeepPartial<BatchReferencesRequest>): BatchReferencesRequest;
};
export declare const BatchSendRequest: {
    encode(message: BatchSendRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchSendRequest;
    fromJSON(object: any): BatchSendRequest;
    toJSON(message: BatchSendRequest): unknown;
    create(base?: DeepPartial<BatchSendRequest>): BatchSendRequest;
    fromPartial(object: DeepPartial<BatchSendRequest>): BatchSendRequest;
};
export declare const BatchSendRequest_Stop: {
    encode(_: BatchSendRequest_Stop, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchSendRequest_Stop;
    fromJSON(_: any): BatchSendRequest_Stop;
    toJSON(_: BatchSendRequest_Stop): unknown;
    create(base?: DeepPartial<BatchSendRequest_Stop>): BatchSendRequest_Stop;
    fromPartial(_: DeepPartial<BatchSendRequest_Stop>): BatchSendRequest_Stop;
};
export declare const BatchSendRequest_Objects: {
    encode(message: BatchSendRequest_Objects, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchSendRequest_Objects;
    fromJSON(object: any): BatchSendRequest_Objects;
    toJSON(message: BatchSendRequest_Objects): unknown;
    create(base?: DeepPartial<BatchSendRequest_Objects>): BatchSendRequest_Objects;
    fromPartial(object: DeepPartial<BatchSendRequest_Objects>): BatchSendRequest_Objects;
};
export declare const BatchSendRequest_References: {
    encode(message: BatchSendRequest_References, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchSendRequest_References;
    fromJSON(object: any): BatchSendRequest_References;
    toJSON(message: BatchSendRequest_References): unknown;
    create(base?: DeepPartial<BatchSendRequest_References>): BatchSendRequest_References;
    fromPartial(object: DeepPartial<BatchSendRequest_References>): BatchSendRequest_References;
};
export declare const BatchSendReply: {
    encode(message: BatchSendReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchSendReply;
    fromJSON(object: any): BatchSendReply;
    toJSON(message: BatchSendReply): unknown;
    create(base?: DeepPartial<BatchSendReply>): BatchSendReply;
    fromPartial(object: DeepPartial<BatchSendReply>): BatchSendReply;
};
export declare const BatchStreamRequest: {
    encode(message: BatchStreamRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamRequest;
    fromJSON(object: any): BatchStreamRequest;
    toJSON(message: BatchStreamRequest): unknown;
    create(base?: DeepPartial<BatchStreamRequest>): BatchStreamRequest;
    fromPartial(object: DeepPartial<BatchStreamRequest>): BatchStreamRequest;
};
export declare const BatchStreamMessage: {
    encode(message: BatchStreamMessage, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage;
    fromJSON(object: any): BatchStreamMessage;
    toJSON(message: BatchStreamMessage): unknown;
    create(base?: DeepPartial<BatchStreamMessage>): BatchStreamMessage;
    fromPartial(object: DeepPartial<BatchStreamMessage>): BatchStreamMessage;
};
export declare const BatchStreamMessage_Start: {
    encode(_: BatchStreamMessage_Start, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage_Start;
    fromJSON(_: any): BatchStreamMessage_Start;
    toJSON(_: BatchStreamMessage_Start): unknown;
    create(base?: DeepPartial<BatchStreamMessage_Start>): BatchStreamMessage_Start;
    fromPartial(_: DeepPartial<BatchStreamMessage_Start>): BatchStreamMessage_Start;
};
export declare const BatchStreamMessage_Stop: {
    encode(_: BatchStreamMessage_Stop, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage_Stop;
    fromJSON(_: any): BatchStreamMessage_Stop;
    toJSON(_: BatchStreamMessage_Stop): unknown;
    create(base?: DeepPartial<BatchStreamMessage_Stop>): BatchStreamMessage_Stop;
    fromPartial(_: DeepPartial<BatchStreamMessage_Stop>): BatchStreamMessage_Stop;
};
export declare const BatchStreamMessage_Shutdown: {
    encode(_: BatchStreamMessage_Shutdown, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage_Shutdown;
    fromJSON(_: any): BatchStreamMessage_Shutdown;
    toJSON(_: BatchStreamMessage_Shutdown): unknown;
    create(base?: DeepPartial<BatchStreamMessage_Shutdown>): BatchStreamMessage_Shutdown;
    fromPartial(_: DeepPartial<BatchStreamMessage_Shutdown>): BatchStreamMessage_Shutdown;
};
export declare const BatchStreamMessage_ShuttingDown: {
    encode(_: BatchStreamMessage_ShuttingDown, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage_ShuttingDown;
    fromJSON(_: any): BatchStreamMessage_ShuttingDown;
    toJSON(_: BatchStreamMessage_ShuttingDown): unknown;
    create(base?: DeepPartial<BatchStreamMessage_ShuttingDown>): BatchStreamMessage_ShuttingDown;
    fromPartial(_: DeepPartial<BatchStreamMessage_ShuttingDown>): BatchStreamMessage_ShuttingDown;
};
export declare const BatchStreamMessage_Error: {
    encode(message: BatchStreamMessage_Error, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchStreamMessage_Error;
    fromJSON(object: any): BatchStreamMessage_Error;
    toJSON(message: BatchStreamMessage_Error): unknown;
    create(base?: DeepPartial<BatchStreamMessage_Error>): BatchStreamMessage_Error;
    fromPartial(object: DeepPartial<BatchStreamMessage_Error>): BatchStreamMessage_Error;
};
export declare const BatchObject: {
    encode(message: BatchObject, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObject;
    fromJSON(object: any): BatchObject;
    toJSON(message: BatchObject): unknown;
    create(base?: DeepPartial<BatchObject>): BatchObject;
    fromPartial(object: DeepPartial<BatchObject>): BatchObject;
};
export declare const BatchObject_Properties: {
    encode(message: BatchObject_Properties, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObject_Properties;
    fromJSON(object: any): BatchObject_Properties;
    toJSON(message: BatchObject_Properties): unknown;
    create(base?: DeepPartial<BatchObject_Properties>): BatchObject_Properties;
    fromPartial(object: DeepPartial<BatchObject_Properties>): BatchObject_Properties;
};
export declare const BatchObject_SingleTargetRefProps: {
    encode(message: BatchObject_SingleTargetRefProps, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObject_SingleTargetRefProps;
    fromJSON(object: any): BatchObject_SingleTargetRefProps;
    toJSON(message: BatchObject_SingleTargetRefProps): unknown;
    create(base?: DeepPartial<BatchObject_SingleTargetRefProps>): BatchObject_SingleTargetRefProps;
    fromPartial(object: DeepPartial<BatchObject_SingleTargetRefProps>): BatchObject_SingleTargetRefProps;
};
export declare const BatchObject_MultiTargetRefProps: {
    encode(message: BatchObject_MultiTargetRefProps, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObject_MultiTargetRefProps;
    fromJSON(object: any): BatchObject_MultiTargetRefProps;
    toJSON(message: BatchObject_MultiTargetRefProps): unknown;
    create(base?: DeepPartial<BatchObject_MultiTargetRefProps>): BatchObject_MultiTargetRefProps;
    fromPartial(object: DeepPartial<BatchObject_MultiTargetRefProps>): BatchObject_MultiTargetRefProps;
};
export declare const BatchReference: {
    encode(message: BatchReference, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchReference;
    fromJSON(object: any): BatchReference;
    toJSON(message: BatchReference): unknown;
    create(base?: DeepPartial<BatchReference>): BatchReference;
    fromPartial(object: DeepPartial<BatchReference>): BatchReference;
};
export declare const BatchObjectsReply: {
    encode(message: BatchObjectsReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObjectsReply;
    fromJSON(object: any): BatchObjectsReply;
    toJSON(message: BatchObjectsReply): unknown;
    create(base?: DeepPartial<BatchObjectsReply>): BatchObjectsReply;
    fromPartial(object: DeepPartial<BatchObjectsReply>): BatchObjectsReply;
};
export declare const BatchObjectsReply_BatchError: {
    encode(message: BatchObjectsReply_BatchError, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchObjectsReply_BatchError;
    fromJSON(object: any): BatchObjectsReply_BatchError;
    toJSON(message: BatchObjectsReply_BatchError): unknown;
    create(base?: DeepPartial<BatchObjectsReply_BatchError>): BatchObjectsReply_BatchError;
    fromPartial(object: DeepPartial<BatchObjectsReply_BatchError>): BatchObjectsReply_BatchError;
};
export declare const BatchReferencesReply: {
    encode(message: BatchReferencesReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchReferencesReply;
    fromJSON(object: any): BatchReferencesReply;
    toJSON(message: BatchReferencesReply): unknown;
    create(base?: DeepPartial<BatchReferencesReply>): BatchReferencesReply;
    fromPartial(object: DeepPartial<BatchReferencesReply>): BatchReferencesReply;
};
export declare const BatchReferencesReply_BatchError: {
    encode(message: BatchReferencesReply_BatchError, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchReferencesReply_BatchError;
    fromJSON(object: any): BatchReferencesReply_BatchError;
    toJSON(message: BatchReferencesReply_BatchError): unknown;
    create(base?: DeepPartial<BatchReferencesReply_BatchError>): BatchReferencesReply_BatchError;
    fromPartial(object: DeepPartial<BatchReferencesReply_BatchError>): BatchReferencesReply_BatchError;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
