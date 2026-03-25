/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Readable, Writable } from 'stream';
import { EmitterAugmentation1 } from './events';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WriteCallback = (error: Error | null | undefined) => void;

export interface IntermediateObjectReadable<T> extends Readable {
  read(size?: number): any & T;
}

export type ObjectReadable<T> = {
  read(size?: number): T;
} & EmitterAugmentation1<'data', T> &
  IntermediateObjectReadable<T>;

export interface IntermediateObjectWritable<T> extends Writable {
  _write(chunk: any & T, encoding: string, callback: Function): void;
  write(chunk: any & T, cb?: WriteCallback): boolean;
  write(chunk: any & T, encoding?: any, cb?: WriteCallback): boolean;
  setDefaultEncoding(encoding: string): this;
  end(): ReturnType<Writable['end']> extends Writable ? this : void;
  end(
    chunk: any & T,
    cb?: Function
  ): ReturnType<Writable['end']> extends Writable ? this : void;
  end(
    chunk: any & T,
    encoding?: any,
    cb?: Function
  ): ReturnType<Writable['end']> extends Writable ? this : void;
}

export interface ObjectWritable<T> extends IntermediateObjectWritable<T> {
  _write(chunk: T, encoding: string, callback: Function): void;
  write(chunk: T, cb?: Function): boolean;
  write(chunk: T, encoding?: any, cb?: Function): boolean;
  setDefaultEncoding(encoding: string): this;
  end(): ReturnType<Writable['end']> extends Writable ? this : void;
  end(
    chunk: T,
    cb?: Function
  ): ReturnType<Writable['end']> extends Writable ? this : void;
  end(
    chunk: T,
    encoding?: any,
    cb?: Function
  ): ReturnType<Writable['end']> extends Writable ? this : void;
}
