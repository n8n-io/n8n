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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
import { isDescriptorCompatibleWith, } from '../InstrumentDescriptor';
import * as api from '@opentelemetry/api';
import { getConflictResolutionRecipe, getIncompatibilityDetails, } from '../view/RegistrationConflicts';
/**
 * Internal class for storing {@link MetricStorage}
 */
var MetricStorageRegistry = /** @class */ (function () {
    function MetricStorageRegistry() {
        this._sharedRegistry = new Map();
        this._perCollectorRegistry = new Map();
    }
    MetricStorageRegistry.create = function () {
        return new MetricStorageRegistry();
    };
    MetricStorageRegistry.prototype.getStorages = function (collector) {
        var e_1, _a, e_2, _b;
        var storages = [];
        try {
            for (var _c = __values(this._sharedRegistry.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var metricStorages = _d.value;
                storages = storages.concat(metricStorages);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var perCollectorStorages = this._perCollectorRegistry.get(collector);
        if (perCollectorStorages != null) {
            try {
                for (var _e = __values(perCollectorStorages.values()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var metricStorages = _f.value;
                    storages = storages.concat(metricStorages);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return storages;
    };
    MetricStorageRegistry.prototype.register = function (storage) {
        this._registerStorage(storage, this._sharedRegistry);
    };
    MetricStorageRegistry.prototype.registerForCollector = function (collector, storage) {
        var storageMap = this._perCollectorRegistry.get(collector);
        if (storageMap == null) {
            storageMap = new Map();
            this._perCollectorRegistry.set(collector, storageMap);
        }
        this._registerStorage(storage, storageMap);
    };
    MetricStorageRegistry.prototype.findOrUpdateCompatibleStorage = function (expectedDescriptor) {
        var storages = this._sharedRegistry.get(expectedDescriptor.name);
        if (storages === undefined) {
            return null;
        }
        // If the descriptor is compatible, the type of their metric storage
        // (either SyncMetricStorage or AsyncMetricStorage) must be compatible.
        return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    };
    MetricStorageRegistry.prototype.findOrUpdateCompatibleCollectorStorage = function (collector, expectedDescriptor) {
        var storageMap = this._perCollectorRegistry.get(collector);
        if (storageMap === undefined) {
            return null;
        }
        var storages = storageMap.get(expectedDescriptor.name);
        if (storages === undefined) {
            return null;
        }
        // If the descriptor is compatible, the type of their metric storage
        // (either SyncMetricStorage or AsyncMetricStorage) must be compatible.
        return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    };
    MetricStorageRegistry.prototype._registerStorage = function (storage, storageMap) {
        var descriptor = storage.getInstrumentDescriptor();
        var storages = storageMap.get(descriptor.name);
        if (storages === undefined) {
            storageMap.set(descriptor.name, [storage]);
            return;
        }
        storages.push(storage);
    };
    MetricStorageRegistry.prototype._findOrUpdateCompatibleStorage = function (expectedDescriptor, existingStorages) {
        var e_3, _a;
        var compatibleStorage = null;
        try {
            for (var existingStorages_1 = __values(existingStorages), existingStorages_1_1 = existingStorages_1.next(); !existingStorages_1_1.done; existingStorages_1_1 = existingStorages_1.next()) {
                var existingStorage = existingStorages_1_1.value;
                var existingDescriptor = existingStorage.getInstrumentDescriptor();
                if (isDescriptorCompatibleWith(existingDescriptor, expectedDescriptor)) {
                    // Use the longer description if it does not match.
                    if (existingDescriptor.description !== expectedDescriptor.description) {
                        if (expectedDescriptor.description.length >
                            existingDescriptor.description.length) {
                            existingStorage.updateDescription(expectedDescriptor.description);
                        }
                        api.diag.warn('A view or instrument with the name ', expectedDescriptor.name, ' has already been registered, but has a different description and is incompatible with another registered view.\n', 'Details:\n', getIncompatibilityDetails(existingDescriptor, expectedDescriptor), 'The longer description will be used.\nTo resolve the conflict:', getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
                    }
                    // Storage is fully compatible. There will never be more than one pre-existing fully compatible storage.
                    compatibleStorage = existingStorage;
                }
                else {
                    // The implementation SHOULD warn about duplicate instrument registration
                    // conflicts after applying View configuration.
                    api.diag.warn('A view or instrument with the name ', expectedDescriptor.name, ' has already been registered and is incompatible with another registered view.\n', 'Details:\n', getIncompatibilityDetails(existingDescriptor, expectedDescriptor), 'To resolve the conflict:\n', getConflictResolutionRecipe(existingDescriptor, expectedDescriptor));
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (existingStorages_1_1 && !existingStorages_1_1.done && (_a = existingStorages_1.return)) _a.call(existingStorages_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return compatibleStorage;
    };
    return MetricStorageRegistry;
}());
export { MetricStorageRegistry };
//# sourceMappingURL=MetricStorageRegistry.js.map