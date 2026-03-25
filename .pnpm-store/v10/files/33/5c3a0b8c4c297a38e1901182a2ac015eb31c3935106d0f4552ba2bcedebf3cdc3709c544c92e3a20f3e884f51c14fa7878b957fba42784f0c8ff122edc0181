import { Options } from '@grpc/proto-loader';
import { ServiceClientConstructor, InterceptingCall } from '@grpc/grpc-js';
interface IServiceDetails {
    protoPath: string;
    serviceName: string;
}
/**
 * Returns a gRPC service client constructor for the given proto file and service name.
 * @param proto An object containing the proto file path and service name.
 * @returns A gRPC service client constructor.
 */
export declare const getGRPCService: (proto: IServiceDetails, options: Options) => ServiceClientConstructor;
/**
 * Returns a gRPC interceptor function that adds metadata to outgoing requests.
 *
 * @param {Function} onInvoked - A function to be called with the modified metadata.
 * @param {Object[]} initValues - An array of objects containing key-value pairs to add to the metadata.
 * @returns {Function} The gRPC interceptor function.
 */
export declare const getMetaInterceptor: (onInvoked: Function, initValues?: {
    [key: string]: any;
}[]) => (options: any, nextCall: any) => InterceptingCall;
/**
 * Returns a gRPC interceptor function that retries failed requests up to a maximum number of times.
 *
 * @param {Object} options - The options object.
 * @param {number} options.maxRetries - The maximum number of times to retry a failed request.
 * @param {number} options.retryDelay - The delay in milliseconds between retries.
 * @returns {Function} The gRPC interceptor function.
 */
export declare const getRetryInterceptor: ({ maxRetries, retryDelay, clientId, }: {
    maxRetries: number;
    retryDelay: number;
    clientId: string;
}) => (options: any, nextCall: any) => InterceptingCall;
/**
 * Returns a gRPC interceptor function that adds trace context to outgoing requests.
 */
export declare const getTraceInterceptor: () => (options: any, nextCall: any) => InterceptingCall;
export {};
