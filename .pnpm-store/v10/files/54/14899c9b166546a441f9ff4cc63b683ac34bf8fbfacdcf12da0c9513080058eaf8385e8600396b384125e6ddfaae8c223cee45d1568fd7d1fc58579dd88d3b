// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Gaxios } from './gaxios.js';
export { GaxiosError, } from './common.js';
export { Gaxios };
export * from './interceptor.js';
/**
 * The default instance used when the `request` method is directly
 * invoked.
 */
export const instance = new Gaxios();
/**
 * Make an HTTP request using the given options.
 * @param opts Options for the request
 */
export async function request(opts) {
    return instance.request(opts);
}
//# sourceMappingURL=index.js.map