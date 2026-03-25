/**
 * @license
 * Copyright 2019 Google LLC
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
import { Agent as HTTPAgent } from 'http';
import { Agent as HTTPSAgent } from 'https';
import { Options } from './';
export declare const pool: Map<string, HTTPAgent>;
export type HttpAnyAgent = HTTPAgent | HTTPSAgent;
/**
 * Returns a custom request Agent if one is found, otherwise returns undefined
 * which will result in the global http(s) Agent being used.
 * @private
 * @param {string} uri The request uri
 * @param {Options} reqOpts The request options
 * @returns {HttpAnyAgent|undefined}
 */
export declare function getAgent(uri: string, reqOpts: Options): HttpAnyAgent | undefined;
