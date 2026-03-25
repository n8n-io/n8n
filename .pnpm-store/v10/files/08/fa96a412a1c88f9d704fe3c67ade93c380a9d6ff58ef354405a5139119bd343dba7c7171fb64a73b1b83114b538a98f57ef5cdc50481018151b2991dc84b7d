/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ErrorDetails } from "../responses";
export { ErrorDetails };
/**
 * Standard RPC error status object.
 * @public
 */
export interface RpcStatus {
    /**
     * Error status code
     */
    code: number;
    /**
     * A developer-facing error message.
     */
    message: string;
    /**
     * A list of messages that carry the error details.
     */
    details?: ErrorDetails[];
}
/**
 * Params to pass to {@link GoogleAIFileManager.listFiles} or
 * {@link GoogleAICacheManager.list}
 * @public
 */
export interface ListParams {
    pageSize?: number;
    pageToken?: string;
}
