import { GrpcClientOptions, ClientStubOptions } from './grpc';
import * as gax from './gax';
import { GoogleAuthOptions } from 'google-auth-library';
import { BundleDescriptor, LongrunningDescriptor, PageDescriptor, StreamDescriptor } from './descriptor';
import * as longrunning from './longRunningCalls/longrunning';
import * as operationProtos from '../protos/operations';
export interface ClientOptions extends GrpcClientOptions, GoogleAuthOptions, ClientStubOptions {
    libName?: string;
    libVersion?: string;
    clientConfig?: gax.ClientConfig;
    fallback?: boolean | 'rest' | 'proto';
    apiEndpoint?: string;
    gaxServerStreamingRetries?: boolean;
    universeDomain?: string;
    universe_domain?: string;
}
export interface Descriptors {
    page: {
        [name: string]: PageDescriptor;
    };
    stream: {
        [name: string]: StreamDescriptor;
    };
    longrunning: {
        [name: string]: LongrunningDescriptor;
    };
    batching?: {
        [name: string]: BundleDescriptor;
    };
}
export interface Callback<ResponseObject, NextRequestObject, RawResponseObject> {
    (err: Error | null | undefined, value?: ResponseObject | null, nextRequest?: NextRequestObject, rawResponse?: RawResponseObject): void;
}
export interface LROperation<ResultType, MetadataType> extends longrunning.Operation {
    promise(): Promise<[
        ResultType,
        MetadataType,
        operationProtos.google.longrunning.Operation
    ]>;
}
export interface PaginationCallback<RequestObject, ResponseObject, ResponseType> {
    (err: Error | null, values?: ResponseType[], nextPageRequest?: RequestObject, rawResponse?: ResponseObject): void;
}
export interface PaginationResponse<RequestObject, ResponseObject, ResponseType> {
    values?: ResponseType[];
    nextPageRequest?: RequestObject;
    rawResponse?: ResponseObject;
}
