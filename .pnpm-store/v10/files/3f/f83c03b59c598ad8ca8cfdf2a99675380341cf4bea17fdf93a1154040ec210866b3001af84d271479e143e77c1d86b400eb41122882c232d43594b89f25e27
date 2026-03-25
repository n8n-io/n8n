/**
 * @license
 * Copyright 2018 Google LLC
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
/// <reference types="node" />
/// <reference types="node" />
import { Agent, AgentOptions as HttpsAgentOptions } from 'https';
import { AgentOptions as HttpAgentOptions } from 'http';
import { PassThrough, Readable } from 'stream';
import { TeenyStatistics } from './TeenyStatistics';
export interface CoreOptions {
    method?: string;
    timeout?: number;
    gzip?: boolean;
    json?: any;
    headers?: Headers;
    body?: string | {};
    useQuerystring?: boolean;
    qs?: any;
    proxy?: string;
    multipart?: RequestPart[];
    forever?: boolean;
    pool?: HttpsAgentOptions | HttpAgentOptions;
}
export interface OptionsWithUri extends CoreOptions {
    uri: string;
}
export interface OptionsWithUrl extends CoreOptions {
    url: string;
}
export type Options = OptionsWithUri | OptionsWithUrl;
export interface Request extends PassThrough {
    agent: Agent | false;
    headers: Headers;
    href?: string;
}
export interface Response<T = any> {
    statusCode: number;
    headers: Headers;
    body: T;
    request: Request;
    statusMessage?: string;
}
export interface RequestPart {
    body: string | Readable;
}
export interface RequestCallback<T = any> {
    (err: Error | null, response: Response, body?: T): void;
}
export declare class RequestError extends Error {
    code?: number;
}
interface Headers {
    [index: string]: any;
}
declare function teenyRequest(reqOpts: Options): Request;
declare function teenyRequest(reqOpts: Options, callback: RequestCallback): void;
declare namespace teenyRequest {
    var defaults: (defaults: CoreOptions) => (reqOpts: Options, callback?: RequestCallback<any> | undefined) => void | Request;
    var stats: TeenyStatistics;
    var resetStats: () => void;
}
export { teenyRequest };
