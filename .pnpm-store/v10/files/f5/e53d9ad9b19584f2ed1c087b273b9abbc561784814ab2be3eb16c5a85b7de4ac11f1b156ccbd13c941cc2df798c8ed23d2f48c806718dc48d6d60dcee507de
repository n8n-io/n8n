/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ExactPredicate } from './Predicate';
export class MeterSelector {
    _nameFilter;
    _versionFilter;
    _schemaUrlFilter;
    constructor(criteria) {
        this._nameFilter = new ExactPredicate(criteria?.name);
        this._versionFilter = new ExactPredicate(criteria?.version);
        this._schemaUrlFilter = new ExactPredicate(criteria?.schemaUrl);
    }
    getNameFilter() {
        return this._nameFilter;
    }
    /**
     * TODO: semver filter? no spec yet.
     */
    getVersionFilter() {
        return this._versionFilter;
    }
    getSchemaUrlFilter() {
        return this._schemaUrlFilter;
    }
}
//# sourceMappingURL=MeterSelector.js.map