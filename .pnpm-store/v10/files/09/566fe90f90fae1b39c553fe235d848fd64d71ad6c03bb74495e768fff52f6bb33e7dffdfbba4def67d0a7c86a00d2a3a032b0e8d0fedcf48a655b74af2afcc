/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as grpc from '@grpc/grpc-js';
import { GrpcClient, GrpcClientOptions } from './grpc';
import * as IamProtos from '../protos/iam_service';
import * as LocationProtos from '../protos/locations';
import * as operationsProtos from '../protos/operations';
import * as operationsClient from './operationsClient';
import * as routingHeader from './routingHeader';
export { GoogleAuth, GoogleAuthOptions } from 'google-auth-library';
export { grpc };
export { CancellablePromise, OngoingCall } from './call';
export { createApiCall } from './createApiCall';
export { BundleDescriptor, LongrunningDescriptor, PageDescriptor, StreamDescriptor, } from './descriptor';
export { CallOptions, CallSettings, ClientConfig, constructSettings, RetryOptions, ServiceConfig, createRetryOptions, createBundleOptions, createBackoffSettings, createDefaultBackoffSettings, createMaxRetriesBackoffSettings, } from './gax';
export { GoogleError } from './googleError';
export { ClientStub, ClientStubOptions, GoogleProtoFilesRoot, GrpcClient, GrpcClientOptions, GrpcModule, Metadata, MetadataValue, } from './grpc';
export { Operation, operation } from './longRunningCalls/longrunning';
export { PathTemplate } from './pathTemplate';
export { Status } from './status';
export { StreamType } from './streamingCalls/streaming';
export { routingHeader };
declare function lro(options: GrpcClientOptions): operationsClient.OperationsClientBuilder;
declare namespace lro {
    var SERVICE_ADDRESS: string;
    var ALL_SCOPES: string[];
}
export { lro, operationsProtos, IamProtos, LocationProtos };
export { OperationsClient } from './operationsClient';
export { IamClient } from './iamService';
export { LocationsClient } from './locationService';
export declare const createByteLengthFunction: typeof GrpcClient.createByteLengthFunction;
export declare const version: any;
import * as protobuf from 'protobufjs';
export { protobuf };
export * as protobufMinimal from 'protobufjs/minimal';
import * as fallback from './fallback';
export { fallback };
export { APICallback, GRPCCallResult, ServerStreamingCall, ClientStreamingCall, BiDiStreamingCall, UnaryCall, GRPCCall, GaxCall, CancellableStream, } from './apitypes';
export { ClientOptions, Descriptors, Callback, LROperation, PaginationCallback, PaginationResponse, } from './clientInterface';
export { makeUUID } from './util';
export { ServiceError, ChannelCredentials } from '@grpc/grpc-js';
export { warn } from './warnings';
import * as serializer from 'proto3-json-serializer';
export { serializer };
