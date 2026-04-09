"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeterSelector = void 0;
const Predicate_1 = require("./Predicate");
class MeterSelector {
    _nameFilter;
    _versionFilter;
    _schemaUrlFilter;
    constructor(criteria) {
        this._nameFilter = new Predicate_1.ExactPredicate(criteria?.name);
        this._versionFilter = new Predicate_1.ExactPredicate(criteria?.version);
        this._schemaUrlFilter = new Predicate_1.ExactPredicate(criteria?.schemaUrl);
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
exports.MeterSelector = MeterSelector;
//# sourceMappingURL=MeterSelector.js.map