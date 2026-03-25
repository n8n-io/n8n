/**
 * (C) Copyright IBM Corp. 2020.
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
/// <reference types="node" />
import { Transform, TransformCallback } from 'stream';
export type SdkHeaders = {
    'User-Agent': string;
};
/**
 * Get the request headers to be sent in requests by the SDK.
 *
 * If you plan to gather metrics for your SDK, the User-Agent header value must
 * be a string similar to the following:
 * autogen-node-sdk/0.0.1 (lang=node.js; os.name=Linux; os.version=19.3.0; node.version=v10.15.3)
 *
 * In the example above, the analytics tool will parse the user-agent header and
 * use the following properties:
 * "autogen-node-sdk" - the name of your sdk
 * "0.0.1"- the version of your sdk
 * "lang=node.js" - the language of the current sdk
 * "os.name=Linux; os.version=19.3.0; node.version=v10.15.3" - system information
 *
 * Note: It is very important that the sdk name ends with the string `-sdk`,
 * as the analytics data collector uses this to gather usage data.
 */
export declare function getSdkHeaders(serviceName: string, serviceVersion: string, operationId: string): SdkHeaders | {};
export interface ObjectStreamed<T> {
    id: number;
    event: string;
    data: T;
}
export declare class StreamTransform extends Transform {
    buffer: string;
    constructor();
}
export declare class ObjectTransformStream extends StreamTransform {
    _transform(chunk: any, _encoding: string, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
}
export declare class Stream<T> implements AsyncIterable<T> {
    private iterator;
    controller: AbortController;
    constructor(iterator: () => AsyncIterator<T>, controller: AbortController);
    static createStream<T>(stream: Transform, controller: AbortController): Promise<Stream<T>>;
    [Symbol.asyncIterator](): AsyncIterator<T>;
}
export declare function transformStreamToObjectStream<T>(apiResponse: any): Promise<Stream<T>>;
export declare class LineTransformStream extends StreamTransform {
    _transform(chunk: any, _encoding: string, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
}
export declare function transformStreamToStringStream<T>(apiResponse: any): Promise<Stream<T>>;
