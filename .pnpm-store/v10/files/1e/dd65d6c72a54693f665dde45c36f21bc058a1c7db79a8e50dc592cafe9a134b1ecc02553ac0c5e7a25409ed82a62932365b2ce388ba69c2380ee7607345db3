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
import { SimpleCallbackFunction, RequestType } from '../apitypes';
/**
 * ResourceCollector class implements asynchronous logic of calling the API call that supports pagination,
 * page by page, collecting all resources (up to `maxResults`) in the array.
 *
 * Usage:
 *   const resourceCollector = new ResourceCollector(apiCall, maxResults); // -1 for unlimited
 *   resourceCollector.processAllPages(request).then(resources => ...);
 */
export declare class ResourceCollector {
    apiCall: SimpleCallbackFunction;
    resources: Array<{}>;
    maxResults: number;
    resolveCallback?: (resources: Array<{}>) => void;
    rejectCallback?: (err: Error) => void;
    constructor(apiCall: SimpleCallbackFunction, maxResults?: number);
    private callback;
    processAllPages(firstRequest: RequestType): Promise<Array<{}>>;
}
