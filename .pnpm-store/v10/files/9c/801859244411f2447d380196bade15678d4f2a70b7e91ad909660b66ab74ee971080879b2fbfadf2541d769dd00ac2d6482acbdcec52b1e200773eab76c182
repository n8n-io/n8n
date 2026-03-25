import { ChannelCredentials } from './channel-credentials';
import { ChannelOptions } from './channel-options';
import { Client } from './client';
import { UntypedServiceImplementation } from './server';
export interface Serialize<T> {
    (value: T): Buffer;
}
export interface Deserialize<T> {
    (bytes: Buffer): T;
}
export interface ClientMethodDefinition<RequestType, ResponseType> {
    path: string;
    requestStream: boolean;
    responseStream: boolean;
    requestSerialize: Serialize<RequestType>;
    responseDeserialize: Deserialize<ResponseType>;
    originalName?: string;
}
export interface ServerMethodDefinition<RequestType, ResponseType> {
    path: string;
    requestStream: boolean;
    responseStream: boolean;
    responseSerialize: Serialize<ResponseType>;
    requestDeserialize: Deserialize<RequestType>;
    originalName?: string;
}
export interface MethodDefinition<RequestType, ResponseType> extends ClientMethodDefinition<RequestType, ResponseType>, ServerMethodDefinition<RequestType, ResponseType> {
}
export type ServiceDefinition<ImplementationType = UntypedServiceImplementation> = {
    readonly [index in keyof ImplementationType]: MethodDefinition<any, any>;
};
export interface ProtobufTypeDefinition {
    format: string;
    type: object;
    fileDescriptorProtos: Buffer[];
}
export interface PackageDefinition {
    [index: string]: ServiceDefinition | ProtobufTypeDefinition;
}
export interface ServiceClient extends Client {
    [methodName: string]: Function;
}
export interface ServiceClientConstructor {
    new (address: string, credentials: ChannelCredentials, options?: Partial<ChannelOptions>): ServiceClient;
    service: ServiceDefinition;
    serviceName: string;
}
/**
 * Creates a constructor for a client with the given methods, as specified in
 * the methods argument. The resulting class will have an instance method for
 * each method in the service, which is a partial application of one of the
 * [Client]{@link grpc.Client} request methods, depending on `requestSerialize`
 * and `responseSerialize`, with the `method`, `serialize`, and `deserialize`
 * arguments predefined.
 * @param methods An object mapping method names to
 *     method attributes
 * @param serviceName The fully qualified name of the service
 * @param classOptions An options object.
 * @return New client constructor, which is a subclass of
 *     {@link grpc.Client}, and has the same arguments as that constructor.
 */
export declare function makeClientConstructor(methods: ServiceDefinition, serviceName: string, classOptions?: {}): ServiceClientConstructor;
export interface GrpcObject {
    [index: string]: GrpcObject | ServiceClientConstructor | ProtobufTypeDefinition;
}
/**
 * Load a gRPC package definition as a gRPC object hierarchy.
 * @param packageDef The package definition object.
 * @return The resulting gRPC object.
 */
export declare function loadPackageDefinition(packageDef: PackageDefinition): GrpcObject;
