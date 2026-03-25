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
export interface Bindings {
    [index: string]: string | number;
}
export declare class PathTemplate {
    private data;
    private bindings;
    segments: string[];
    size: number;
    /**
     * @param {String} data the of the template
     *
     * @constructor
     */
    constructor(data: string);
    /**
     * Matches a fully-qualified path template string.
     *
     * @param {String} path a fully-qualified path template string
     * @return {Object} contains const names matched to binding values
     * @throws {TypeError} if path can't be matched to this template
     */
    match(path: string): Bindings;
    /**
     * Renders a path template using the provided bindings.
     *
     * @param {Object} bindings a mapping of const names to binding strings
     * @return {String} a rendered representation of the path template
     * @throws {TypeError} if a key is missing, or if a sub-template cannot be
     *   parsed
     */
    render(bindings: Bindings): string;
    /**
     * Renders the path template.
     *
     * @return {string} contains const names matched to binding values
     */
    inspect(): string;
    /**
     * Parse the path template.
     *
     * @return {string[]} return segments of the input path.
     * For example: 'buckets/{hello}'' will give back ['buckets', {hello=*}]
     */
    private parsePathTemplate;
}
