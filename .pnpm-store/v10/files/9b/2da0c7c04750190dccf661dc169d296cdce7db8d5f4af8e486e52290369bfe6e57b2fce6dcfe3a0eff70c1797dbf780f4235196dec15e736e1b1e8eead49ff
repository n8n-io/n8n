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
// https://tc39.es/proposal-regex-escaping
// escape ^ $ \ .  + ? ( ) [ ] { } |
// do not need to escape * as we interpret it as wildcard
var ESCAPE = /[\^$\\.+?()[\]{}|]/g;
/**
 * Wildcard pattern predicate, supports patterns like `*`, `foo*`, `*bar`.
 */
var PatternPredicate = /** @class */ (function () {
    function PatternPredicate(pattern) {
        if (pattern === '*') {
            this._matchAll = true;
            this._regexp = /.*/;
        }
        else {
            this._matchAll = false;
            this._regexp = new RegExp(PatternPredicate.escapePattern(pattern));
        }
    }
    PatternPredicate.prototype.match = function (str) {
        if (this._matchAll) {
            return true;
        }
        return this._regexp.test(str);
    };
    PatternPredicate.escapePattern = function (pattern) {
        return "^" + pattern.replace(ESCAPE, '\\$&').replace('*', '.*') + "$";
    };
    PatternPredicate.hasWildcard = function (pattern) {
        return pattern.includes('*');
    };
    return PatternPredicate;
}());
export { PatternPredicate };
var ExactPredicate = /** @class */ (function () {
    function ExactPredicate(pattern) {
        this._matchAll = pattern === undefined;
        this._pattern = pattern;
    }
    ExactPredicate.prototype.match = function (str) {
        if (this._matchAll) {
            return true;
        }
        if (str === this._pattern) {
            return true;
        }
        return false;
    };
    return ExactPredicate;
}());
export { ExactPredicate };
//# sourceMappingURL=Predicate.js.map