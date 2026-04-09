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
import { ExactPredicate } from './Predicate';
var MeterSelector = /** @class */ (function () {
    function MeterSelector(criteria) {
        this._nameFilter = new ExactPredicate(criteria === null || criteria === void 0 ? void 0 : criteria.name);
        this._versionFilter = new ExactPredicate(criteria === null || criteria === void 0 ? void 0 : criteria.version);
        this._schemaUrlFilter = new ExactPredicate(criteria === null || criteria === void 0 ? void 0 : criteria.schemaUrl);
    }
    MeterSelector.prototype.getNameFilter = function () {
        return this._nameFilter;
    };
    /**
     * TODO: semver filter? no spec yet.
     */
    MeterSelector.prototype.getVersionFilter = function () {
        return this._versionFilter;
    };
    MeterSelector.prototype.getSchemaUrlFilter = function () {
        return this._schemaUrlFilter;
    };
    return MeterSelector;
}());
export { MeterSelector };
//# sourceMappingURL=MeterSelector.js.map