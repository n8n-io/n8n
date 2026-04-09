"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstrumentSelector = void 0;
const Predicate_1 = require("./Predicate");
class InstrumentSelector {
    _nameFilter;
    _type;
    _unitFilter;
    constructor(criteria) {
        this._nameFilter = new Predicate_1.PatternPredicate(criteria?.name ?? '*');
        this._type = criteria?.type;
        this._unitFilter = new Predicate_1.ExactPredicate(criteria?.unit);
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