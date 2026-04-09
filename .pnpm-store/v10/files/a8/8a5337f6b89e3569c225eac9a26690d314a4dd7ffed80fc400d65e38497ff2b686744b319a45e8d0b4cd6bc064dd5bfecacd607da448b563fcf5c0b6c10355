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
exports.InstrumentSelector = void 0;
const Predicate_1 = require("./Predicate");
class InstrumentSelector {
    constructor(criteria) {
        var _a;
        this._nameFilter = new Predicate_1.PatternPredicate((_a = criteria === null || criteria === void 0 ? void 0 : criteria.name) !== null && _a !== void 0 ? _a : '*');
        this._type = criteria === null || criteria === void 0 ? void 0 : criteria.type;
        this._unitFilter = new Predicate_1.ExactPredicate(criteria === null || criteria === void 0 ? void 0 : criteria.unit);
    }
    getType() {
        return this._type;
    }
    getNameFilter() {
        return this._nameFilter;
    }
    getUnitFilter() {
        return this._unitFilter;
    }
}
exports.InstrumentSelector = InstrumentSelector;
//# sourceMappingURL=InstrumentSelector.js.map