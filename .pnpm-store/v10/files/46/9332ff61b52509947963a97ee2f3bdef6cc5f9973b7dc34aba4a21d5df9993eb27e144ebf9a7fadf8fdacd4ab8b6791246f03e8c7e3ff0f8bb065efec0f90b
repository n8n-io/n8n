/*!
 * Copyright 2019 Google Inc. All Rights Reserved.
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
import { Transform, Writable } from 'stream';
import { ParsedArguments } from './';
interface ResourceEvents<T> {
    addListener(event: 'data', listener: (data: T) => void): this;
    emit(event: 'data', data: T): boolean;
    on(event: 'data', listener: (data: T) => void): this;
    once(event: 'data', listener: (data: T) => void): this;
    prependListener(event: 'data', listener: (data: T) => void): this;
    prependOnceListener(event: 'data', listener: (data: T) => void): this;
    removeListener(event: 'data', listener: (data: T) => void): this;
}
export declare class ResourceStream<T> extends Transform implements ResourceEvents<T> {
    _ended: boolean;
    _maxApiCalls: number;
    _nextQuery: {} | null;
    _otherArgs: unknown[];
    _reading: boolean;
    _requestFn: Function;
    _requestsMade: number;
    _resultsToSend: number;
    constructor(args: ParsedArguments, requestFn: Function);
    end(...args: any[]): ReturnType<Writable['end']> extends Writable ? this : void;
    _read(): void;
}
export {};
