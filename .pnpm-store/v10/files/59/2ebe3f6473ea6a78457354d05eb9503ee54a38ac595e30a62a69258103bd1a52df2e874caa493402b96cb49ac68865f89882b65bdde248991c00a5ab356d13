/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExactPredicate, PatternPredicate } from './Predicate';
export class InstrumentSelector {
    _nameFilter;
    _type;
    _unitFilter;
    constructor(criteria) {
        this._nameFilter = new PatternPredicate(criteria?.name ?? '*');
        this._type = criteria?.type;
        this._unitFilter = new ExactPredicate(criteria?.unit);
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
//# sourceMappingURL=InstrumentSelector.js.map