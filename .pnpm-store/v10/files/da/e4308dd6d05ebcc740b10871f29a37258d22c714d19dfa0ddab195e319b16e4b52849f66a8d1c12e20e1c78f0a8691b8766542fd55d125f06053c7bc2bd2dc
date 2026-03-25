"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathTemplate = void 0;
class PathTemplate {
    /**
     * @param {String} data the of the template
     *
     * @constructor
     */
    constructor(data) {
        this.bindings = {};
        this.data = data;
        this.segments = this.parsePathTemplate(data);
        this.size = this.segments.length;
    }
    /**
     * Matches a fully-qualified path template string.
     *
     * @param {String} path a fully-qualified path template string
     * @return {Object} contains const names matched to binding values
     * @throws {TypeError} if path can't be matched to this template
     */
    match(path) {
        let pathSegments = path.split('/');
        const bindings = {};
        if (pathSegments.length !== this.segments.length) {
            // if the path contains a wildcard, then the length may differ by 1.
            if (!this.data.includes('**')) {
                throw new TypeError(`This path ${path} does not match path template ${this.data}, the number of parameters is not same.`);
            }
            else if (pathSegments.length !== this.segments.length + 1) {
                throw new TypeError(`This path ${path} does not match path template ${this.data}, the number of parameters is not same with one wildcard.`);
            }
        }
        for (let index = 0; index < this.segments.length && pathSegments.length > 0; index++) {
            if (this.segments[index] !== pathSegments[0]) {
                if (!this.segments[index].includes('*')) {
                    throw new TypeError(`segment does not match, ${this.segments[index]} and  ${pathSegments[index]}.`);
                }
                else {
                    let segment = this.segments[index];
                    const matches = segment.match(/\{[$0-9a-zA-Z_]+=.*?\}/g);
                    if (!matches) {
                        throw new Error(`Error processing path template segment ${segment}`);
                    }
                    const variables = matches.map(str => str.replace(/^\{/, '').replace(/=.*/, ''));
                    if (segment.includes('**')) {
                        bindings[variables[0]] = pathSegments[0] + '/' + pathSegments[1];
                        pathSegments = pathSegments.slice(2);
                    }
                    else {
                        // atomic resource
                        if (variables.length === 1) {
                            bindings[variables[0]] = pathSegments[0];
                        }
                        else {
                            // non-slash resource
                            // segment: {blurb_id=*}.{legacy_user=*} to match pathSegments: ['bar.user2']
                            // split the match pathSegments[0] -> value: ['bar', 'user2']
                            // compare the length of two arrays, and compare array items
                            const value = pathSegments[0].split(/[-_.~]/);
                            if (value.length !== variables.length) {
                                throw new Error(`segment ${segment} does not match ${pathSegments[0]}`);
                            }
                            for (const v of variables) {
                                bindings[v] = value[0];
                                segment = segment.replace(`{${v}=*}`, `${value[0]}`);
                                value.shift();
                            }
                            // segment: {blurb_id=*}.{legacy_user=*} matching pathSegments: ['bar~user2'] should fail
                            if (segment !== pathSegments[0]) {
                                throw new TypeError(`non slash resource pattern ${this.segments[index]} and ${pathSegments[0]} should have same separator`);
                            }
                        }
                        pathSegments.shift();
                    }
                }
            }
            else {
                pathSegments.shift();
            }
        }
        return bindings;
    }
    /**
     * Renders a path template using the provided bindings.
     *
     * @param {Object} bindings a mapping of const names to binding strings
     * @return {String} a rendered representation of the path template
     * @throws {TypeError} if a key is missing, or if a sub-template cannot be
     *   parsed
     */
    render(bindings) {
        if (Object.keys(bindings).length !== Object.keys(this.bindings).length) {
            throw new TypeError(`The number of variables ${Object.keys(bindings).length} does not match the number of needed variables ${Object.keys(this.bindings).length}`);
        }
        let path = this.inspect();
        for (const key of Object.keys(bindings)) {
            const b = bindings[key].toString();
            if (!this.bindings[key]) {
                throw new TypeError(`render fails for not matching ${bindings[key]}`);
            }
            const variable = this.bindings[key];
            if (variable === '*') {
                if (!b.match(/[^/{}]+/)) {
                    throw new TypeError(`render fails for not matching ${b}`);
                }
                path = path.replace(`{${key}=*}`, `${b}`);
            }
            else if (variable === '**') {
                if (!b.match(/[^{}]+/)) {
                    throw new TypeError(`render fails for not matching ${b}`);
                }
                path = path.replace(`{${key}=**}`, `${b}`);
            }
        }
        return path;
    }
    /**
     * Renders the path template.
     *
     * @return {string} contains const names matched to binding values
     */
    inspect() {
        return this.segments.join('/');
    }
    /**
     * Parse the path template.
     *
     * @return {string[]} return segments of the input path.
     * For example: 'buckets/{hello}'' will give back ['buckets', {hello=*}]
     */
    parsePathTemplate(data) {
        const pathSegments = splitPathTemplate(data);
        let index = 0;
        let wildCardCount = 0;
        const segments = [];
        let matches;
        pathSegments.forEach(segment => {
            // * or ** -> segments.push('{$0=*}');
            //         -> bindings['$0'] = '*'
            if (segment === '*' || segment === '**') {
                this.bindings[`$${index}`] = segment;
                segments.push(`{$${index}=${segment}}`);
                index = index + 1;
                if (segment === '**') {
                    ++wildCardCount;
                }
            }
            else if ((matches = segment.match(/\{[0-9a-zA-Z-.~_]+(?:=.*?)?\}/g))) {
                for (const subsegment of matches) {
                    const pairMatch = subsegment.match(/^\{([0-9a-zA-Z-.~_]+)(?:=(.*?))?\}$/);
                    if (!pairMatch) {
                        throw new Error(`Cannot process path template segment ${subsegment}`);
                    }
                    const key = pairMatch[1];
                    let value = pairMatch[2];
                    if (!value) {
                        value = '*';
                        segment = segment.replace(key, key + '=*');
                        this.bindings[key] = value;
                    }
                    else if (value === '*') {
                        this.bindings[key] = value;
                    }
                    else if (value === '**') {
                        ++wildCardCount;
                        this.bindings[key] = value;
                    }
                }
                segments.push(segment);
            }
            else if (segment.match(/[0-9a-zA-Z-.~_]+/)) {
                segments.push(segment);
            }
        });
        if (wildCardCount > 1) {
            throw new TypeError('Can not have more than one wildcard.');
        }
        return segments;
    }
}
exports.PathTemplate = PathTemplate;
/**
 * Split the path template by `/`.
 * It can not be simply splitted by `/` because there might be `/` in the segments.
 * For example: 'a/b/{a=hello/world}' we do not want to break the brackets pair
 * so above path will be splitted as ['a', 'b', '{a=hello/world}']
 */
function splitPathTemplate(data) {
    let left = 0;
    let right = 0;
    let bracketCount = 0;
    const segments = [];
    while (right >= left && right < data.length) {
        if (data.charAt(right) === '{') {
            bracketCount = bracketCount + 1;
        }
        else if (data.charAt(right) === '}') {
            bracketCount = bracketCount - 1;
        }
        else if (data.charAt(right) === '/') {
            if (right === data.length - 1) {
                throw new TypeError('Invalid path, it can not be ended by /');
            }
            if (bracketCount === 0) {
                // complete bracket, to avoid the case a/b/**/*/{a=hello/world}
                segments.push(data.substring(left, right));
                left = right + 1;
            }
        }
        if (right === data.length - 1) {
            if (bracketCount !== 0) {
                throw new TypeError('Brackets are invalid.');
            }
            segments.push(data.substring(left));
        }
        right = right + 1;
    }
    return segments;
}
//# sourceMappingURL=pathTemplate.js.map