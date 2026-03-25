import { CallContext } from 'nice-grpc-common';
import { CompatServiceDefinition, MethodDefinition, NormalizedServiceDefinition, ServiceDefinition } from '../service-definitions';
import { MethodRequestOut, MethodResponseIn } from '../utils/methodTypes';
export type ServiceImplementation<Service extends CompatServiceDefinition, CallContextExt = {}> = RawServiceImplementation<NormalizedServiceDefinition<Service>, CallContextExt>;
export type RawServiceImplementation<Service extends ServiceDefinition, CallContextExt = {}> = {
    [Method in keyof Service]: MethodImplementation<Service[Method], CallContextExt>;
};
export type MethodImplementation<Definition extends MethodDefinition<any, any, any, any>, CallContextExt = {}> = Definition['requestStream'] extends false ? Definition['responseStream'] extends false ? UnaryMethodImplementation<MethodRequestOut<Definition>, MethodResponseIn<Definition>, CallContextExt> : Definition['responseStream'] extends true ? ServerStreamingMethodImplementation<MethodRequestOut<Definition>, MethodResponseIn<Definition>, CallContextExt> : never : Definition['requestStream'] extends true ? Definition['responseStream'] extends false ? ClientStreamingMethodImplementation<MethodRequestOut<Definition>, MethodResponseIn<Definition>, CallContextExt> : Definition['responseStream'] extends true ? BidiStreamingMethodImplementation<MethodRequestOut<Definition>, MethodResponseIn<Definition>, CallContextExt> : never : never;
export type UnaryMethodImplementation<Request, Response, CallContextExt = {}> = (request: Request, context: CallContext & CallContextExt) => Promise<Response>;
export type ServerStreamingMethodImplementation<Request, Response, CallContextExt = {}> = (request: Request, context: CallContext & CallContextExt) => ServerStreamingMethodResult<Response>;
export type ClientStreamingMethodImplementation<Request, Response, CallContextExt = {}> = (request: AsyncIterable<Request>, context: CallContext & CallContextExt) => Promise<Response>;
export type BidiStreamingMethodImplementation<Request, Response, CallContextExt = {}> = (request: AsyncIterable<Request>, context: CallContext & CallContextExt) => ServerStreamingMethodResult<Response>;
export type ServerStreamingMethodResult<Response> = {
    [Symbol.asyncIterator](): AsyncIterator<Response, void>;
};
