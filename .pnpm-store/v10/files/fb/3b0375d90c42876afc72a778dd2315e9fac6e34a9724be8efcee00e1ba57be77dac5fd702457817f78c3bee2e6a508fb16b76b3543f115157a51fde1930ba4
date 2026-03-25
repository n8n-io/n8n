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

export interface EmitterAugmentation1<Name extends string | symbol, Arg> {
  addListener(event: Name, listener: (arg1: Arg) => void): this;
  emit(event: Name, arg1: Arg): boolean;
  on(event: Name, listener: (arg1: Arg) => void): this;
  once(event: Name, listener: (arg1: Arg) => void): this;
  prependListener(event: Name, listener: (arg1: Arg) => void): this;
  prependOnceListener(event: Name, listener: (arg1: Arg) => void): this;
  removeListener(event: Name, listener: (arg1: Arg) => void): this;
}
