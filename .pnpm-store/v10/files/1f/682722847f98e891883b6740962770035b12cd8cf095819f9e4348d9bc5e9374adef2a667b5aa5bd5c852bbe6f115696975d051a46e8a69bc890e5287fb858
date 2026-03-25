/**
 * @license
 * Copyright 2018 gRPC authors.
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
import * as Protobuf from 'protobufjs';
export declare type Options = Protobuf.IParseOptions & Protobuf.IConversionOptions & {
    includeDirs?: string[];
};
export declare function loadProtosWithOptions(filename: string | string[], options?: Options): Promise<Protobuf.Root>;
export declare function loadProtosWithOptionsSync(filename: string | string[], options?: Options): Protobuf.Root;
/**
 * Load Google's well-known proto files that aren't exposed by Protobuf.js.
 */
export declare function addCommonProtos(): void;
