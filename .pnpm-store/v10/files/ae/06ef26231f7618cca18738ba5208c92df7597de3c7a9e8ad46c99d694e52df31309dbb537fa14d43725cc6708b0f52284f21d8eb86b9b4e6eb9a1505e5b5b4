import { CompatServiceDefinition, MethodDefinition, ServiceDefinition } from '.';
export type TsProtoServiceDefinition = {
    name: string;
    fullName: string;
    methods: {
        [method: string]: TsProtoMethodDefinition<any, any>;
    };
};
export type TsProtoMethodDefinition<Request, Response> = {
    name: string;
    requestType: TsProtoMessageType<Request>;
    requestStream: boolean;
    responseType: TsProtoMessageType<Response>;
    responseStream: boolean;
    options: {
        idempotencyLevel?: 'IDEMPOTENT' | 'NO_SIDE_EFFECTS';
        _unknownFields?: {};
    };
};
export type TsProtoMessageType<Message> = {
    encode(message: Message): ProtobufJsWriter;
    decode(input: Uint8Array): Message;
    fromPartial?(object: unknown): Message;
};
export type ProtobufJsWriter = {
    finish(): Uint8Array;
};
export type TsProtoMessageIn<Type extends TsProtoMessageType<any>> = Type['fromPartial'] extends Function ? Parameters<Type['fromPartial']>[0] : Type extends TsProtoMessageType<infer Message> ? Message : never;
export type FromTsProtoServiceDefinition<Service extends TsProtoServiceDefinition> = {
    [M in keyof Service['methods']]: FromTsProtoMethodDefinition<Service['methods'][M]>;
};
export type FromTsProtoMethodDefinition<Method> = Method extends TsProtoMethodDefinition<infer Request, infer Response> ? MethodDefinition<TsProtoMessageIn<Method['requestType']>, Request, TsProtoMessageIn<Method['responseType']>, Response, Method['requestStream'], Method['responseStream']> : never;
export declare function fromTsProtoServiceDefinition(definition: TsProtoServiceDefinition): ServiceDefinition;
export declare function isTsProtoServiceDefinition(definition: CompatServiceDefinition): definition is TsProtoServiceDefinition;
