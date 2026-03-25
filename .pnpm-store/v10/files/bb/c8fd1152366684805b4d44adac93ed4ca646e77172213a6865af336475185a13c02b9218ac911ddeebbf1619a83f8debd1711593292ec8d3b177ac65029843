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
import { Status } from './status';
import * as protobuf from 'protobufjs';
import { Metadata } from './grpc';
import { JSONValue } from 'proto3-json-serializer';
export declare class GoogleError extends Error {
    code?: Status;
    note?: string;
    metadata?: Metadata;
    statusDetails?: string | protobuf.Message<{}>[];
    reason?: string;
    domain?: string;
    errorInfoMetadata?: {
        [propName: string]: string;
    };
    static parseGRPCStatusDetails(err: GoogleError): GoogleError;
    static parseHttpError(json: any): GoogleError;
}
export type FallbackServiceError = FallbackStatusObject & Error;
interface FallbackStatusObject {
    code: Status;
    message: string;
    statusDetails: Array<{}>;
    reason?: string;
    domain?: string;
    errorInfoMetadata?: {
        string: string;
    };
}
interface ProtobufAny {
    type_url: string;
    value: Uint8Array;
}
interface GRPCStatusDetailsObject {
    details: protobuf.Message<{}>[];
    errorInfo?: ErrorInfo;
}
interface ErrorInfo {
    reason: string;
    domain: string;
    metadata: {
        string: string;
    };
}
export declare class GoogleErrorDecoder {
    root: protobuf.Root;
    anyType: protobuf.Type;
    statusType: protobuf.Type;
    constructor();
    decodeProtobufAny(anyValue: ProtobufAny): protobuf.Message<{}>;
    decodeRpcStatus(buffer: Buffer | ArrayBuffer): FallbackStatusObject;
    callErrorFromStatus(status: FallbackStatusObject): FallbackServiceError;
    decodeErrorFromBuffer(buffer: Buffer | ArrayBuffer): Error;
    decodeGRPCStatusDetails(bufferArr: Buffer[] | ArrayBuffer[]): GRPCStatusDetailsObject;
    decodeHTTPError(json: JSONValue): {
        [k: string]: any;
    };
    decodeHttpStatusDetails(rawDetails: Array<ProtobufAny>): GRPCStatusDetailsObject;
}
export {};
