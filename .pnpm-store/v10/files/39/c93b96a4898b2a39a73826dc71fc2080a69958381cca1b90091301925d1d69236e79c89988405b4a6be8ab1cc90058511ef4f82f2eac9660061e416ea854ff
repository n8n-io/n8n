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
import * as protobuf from 'protobufjs';
import { Descriptor } from '../descriptor';
import { OperationsClient } from '../operationsClient';
import { LongrunningApiCaller } from './longRunningApiCaller';
/**
 * A callback to upack a google.protobuf.Any message.
 */
export interface AnyDecoder {
    (reader: protobuf.Reader | Uint8Array, length?: number): protobuf.Message<{}>;
}
/**
 * A descriptor for long-running operations.
 */
export declare class LongRunningDescriptor implements Descriptor {
    operationsClient: OperationsClient;
    responseDecoder: AnyDecoder;
    metadataDecoder: AnyDecoder;
    constructor(operationsClient: OperationsClient, responseDecoder: AnyDecoder, metadataDecoder: AnyDecoder);
    getApiCaller(): LongrunningApiCaller;
}
