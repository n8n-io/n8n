/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Internal interface.
 */
export class MultiMetricStorage {
    _backingStorages;
    constructor(backingStorages) {
        this._backingStorages = backingStorages;
    }
    record(value, attributes, context, recordTime) {
        this._backingStorages.forEach(it => {
            it.record(value, attributes, context, recordTime);
        });
    }
}
//# sourceMappingURL=MultiWritableMetricStorage.js.map