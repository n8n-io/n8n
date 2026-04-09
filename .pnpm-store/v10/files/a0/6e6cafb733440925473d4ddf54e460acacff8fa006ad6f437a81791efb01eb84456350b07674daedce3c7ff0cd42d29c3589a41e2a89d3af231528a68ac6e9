"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExactPredicate = exports.PatternPredicate = void 0;
// https://tc39.es/proposal-regex-escaping
// escape ^ $ \ .  + ? ( ) [ ] { } |
// do not need to escape * as we interpret it as wildcard
const ESCAPE = /[\^$\\.+?()[\]{}|]/g;
/**
 * Wildcard pattern predicate, supports patterns like `*`, `foo*`, `*bar`.
 */
class PatternPredicate {
    constructor(pattern) {
        if (pattern === '*') {
            this._matchAll = true;
            this._regexp = /.*/;
        }
        else {
            this._matchAll = false;
            this._regexp = new RegExp(PatternPredicate.escapePattern(pattern));
        }
    }
    match(str) {
        if (this._matchAll) {
            return true;
        }
        return this._regexp.test(str);
    }
    static escapePattern(pattern) {
        return `^${pattern.replace(ESCAPE, '\\$&').replace('*', '.*')}$`;
    }
    static hasWildcard(pattern) {
        return pattern.includes('*');
    }
}
exports.PatternPredicate = PatternPredicate;
class ExactPredicate {
    constructor(pattern) {
        this._matchAll = pattern === undefined;
        this._pattern = pattern;
    }
    match(str) {
        if (this._matchAll) {
            return true;
        }
        if (str === this._pattern) {
            return true;
        }
        return false;
    }
}
exports.ExactPredicate = ExactPredicate;
//# sourceMappingURL=Predicate.js.map