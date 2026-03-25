/**
 * Copyright 2021 Google LLC
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
import { AuthClient } from './fallback';
import { StreamArrayParser } from './streamArrayParser';
export interface FallbackServiceStub {
    [method: string]: (request: {}, options?: {}, metadata?: {}, callback?: (err?: Error, response?: {} | undefined) => void) => StreamArrayParser | {
        cancel: () => void;
    };
}
export type FetchParametersMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface FetchParameters {
    headers: {
        [key: string]: string;
    };
    body: Buffer | Uint8Array | string;
    method: FetchParametersMethod;
    url: string;
}
export declare function generateServiceStub(rpcs: {
    [name: string]: protobuf.Method;
}, protocol: string, servicePath: string, servicePort: number, authClient: AuthClient, requestEncoder: (rpc: protobuf.Method, protocol: string, servicePath: string, servicePort: number, request: {}, numericEnums: boolean) => FetchParameters, responseDecoder: (rpc: protobuf.Method, ok: boolean, response: Buffer | ArrayBuffer) => {}, numericEnums: boolean): FallbackServiceStub;
