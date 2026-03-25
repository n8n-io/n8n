import { CallOptions } from 'nice-grpc-common';
import { CompatServiceDefinition, MethodDefinition, NormalizedServiceDefinition, ServiceDefinition } from '../service-definitions';
import { MethodRequestIn, MethodResponseOut } from '../utils/methodTypes';
export type Client<Service extends CompatServiceDefinition, CallOptionsExt = {}> = RawClient<NormalizedServiceDefinition<Service>, CallOptionsExt>;
export type RawClient<Service extends ServiceDefinition, CallOptionsExt = {}> = {
    [Method in keyof Service]: ClientMethod<Service[Method], CallOptionsExt>;
};
export type ClientMethod<Definition extends MethodDefinition<any, any, any, any>, CallOptionsExt = {}> = Definition['requestStream'] extends false ? Definition['responseStream'] extends false ? UnaryClientMethod<MethodRequestIn<Definition>, MethodResponseOut<Definition>, CallOptionsExt> : Definition['responseStream'] extends true ? ServerStreamingClientMethod<MethodRequestIn<Definition>, MethodResponseOut<Definition>, CallOptionsExt> : never : Definition['requestStream'] extends true ? Definition['responseStream'] extends false ? ClientStreamingClientMethod<MethodRequestIn<Definition>, MethodResponseOut<Definition>, CallOptionsExt> : Definition['responseStream'] extends true ? BidiStreamingClientMethod<MethodRequestIn<Definition>, MethodResponseOut<Definition>, CallOptionsExt> : never : never;
export type UnaryClientMethod<Request, Response, CallOptionsExt = {}> = (request: Request, options?: CallOptions & CallOptionsExt) => Promise<Response>;
export type ServerStreamingClientMethod<Request, Response, CallOptionsExt = {}> = (request: Request, options?: CallOptions & CallOptionsExt) => AsyncIterable<Response>;
export type ClientStreamingClientMethod<Request, Response, CallOptionsExt = {}> = (request: AsyncIterable<Request>, options?: CallOptions & CallOptionsExt) => Promise<Response>;
export type BidiStreamingClientMethod<Request, Response, CallOptionsExt = {}> = (request: AsyncIterable<Request>, options?: CallOptions & CallOptionsExt) => AsyncIterable<Response>;
