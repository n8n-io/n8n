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
exports.MetricStorageRegistry = void 0;
const InstrumentDescriptor_1 = require("../InstrumentDescriptor");
const api = require("@opentelemetry/api");
const RegistrationConflicts_1 = require("../view/RegistrationConflicts");
/**
 * Internal class for storing {@link MetricStorage}
 */
class MetricStorageRegistry {
    constructor() {
        this._sharedRegistry = new Map();
        this._perCollectorRegistry = new Map();
    }
    static create() {
        return new MetricStorageRegistry();
    }
    getStorages(collector) {
        let storages = [];
        for (const metricStorages of this._sharedRegistry.values()) {
            storages = storages.concat(metricStorages);
        }
        const perCollectorStorages = this._perCollectorRegistry.get(collector);
        if (perCollectorStorages != null) {
            for (const metricStorages of perCollectorStorages.values()) {
                storages = storages.concat(metricStorages);
            }
        }
        return storages;
    }
    register(storage) {
        this._registerStorage(storage, this._sharedRegistry);
    }
    registerForCollector(collector, storage) {
        let storageMap = this._perCollectorRegistry.get(collector);
        if (storageMap == null) {
            storageMap = new Map();
            this._perCollectorRegistry.set(collector, storageMap);
        }
        this._registerStorage(storage, storageMap);
    }
    findOrUpdateCompatibleStorage(expectedDescriptor) {
        const storages = this._sharedRegistry.get(expectedDescriptor.name);
        if (storages === undefined) {
            return null;
        }
        // If the descriptor is compatible, the type of their metric storage
        // (either SyncMetricStorage or AsyncMetricStorage) must be compatible.
        return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    findOrUpdateCompatibleCollectorStorage(collector, expectedDescriptor) {
        const storageMap = this._perCollectorRegistry.get(collector);
        if (storageMap === undefined) {
            return null;
        }
        const storages = storageMap.get(expectedDescriptor.name);
        if (storages === undefined) {
            return null;
        }
        // If the descriptor is compatible, the type of their metric storage
        // (either SyncMetricStorage or AsyncMetricStorage) must be compatible.
        return this._findOrUpdateCompatibleStorage(expectedDescriptor, storages);
    }
    _registerStorage(storage, storageMap) {
        const descriptor = storage.getInstrumentDescriptor();
        const storages = storageMap.get(descriptor.name);
        if (storages === undefined) {
            storageMap.set(descriptor.name, [storage]);
            return;
        }
        storages.push(storage);
    }
    _findOrUpdateCompatibleStorage(expectedDescriptor, existingStorages) {
        let compatibleStorage = null;
        for (const existingStorage of existingStorages) {
            const existingDescriptor = existingStorage.getInstrumentDescriptor();
            if ((0, InstrumentDescriptor_1.isDescriptorCompatibleWith)(existingDescriptor, expectedDescriptor)) {
                // Use the longer description if it does not match.
                if (existingDescriptor.description !== expectedDescriptor.description) {
                    if (expectedDescriptor.description.length >
                        existingDescriptor.description.length) {
                        existingStorage.updateDescription(expectedDescriptor.description);
                    }
                    api.diag.warn('A view or instrument with the name ', expectedDescriptor.name, ' has already been registered, but has a different description and is incompatible with another registered view.\n', 'Details:\n', (0, RegistrationConflicts_1.getIncompatibilityDetails)(existingDescriptor, expectedDescriptor), 'The longer description will be used.\nTo resolve the conflict:', (0, RegistrationConflicts_1.getConflictResolutionRecipe)(existingDescriptor, expectedDescriptor));
                }
                // Storage is fully compatible. There will never be more than one pre-existing fully compatible storage.
                compatibleStorage = existingStorage;
            }
            else {
                // The implementation SHOULD warn about duplicate instrument registration
                // conflicts after applying View configuration.
                api.diag.warn('A view or instrument with the name ', expectedDescriptor.name, ' has already been registered and is incompatible with another registered view.\n', 'Details:\n', (0, RegistrationConflicts_1.getIncompatibilityDetails)(existingDescriptor, expectedDescriptor), 'To resolve the conflict:\n', (0, RegistrationConflicts_1.getConflictResolutionRecipe)(existingDescriptor, expectedDescriptor));
            }
        }
        return compatibleStorage;
    }
}
exports.MetricStorageRegistry = MetricStorageRegistry;
//# sourceMappingURL=MetricStorageRegistry.js.map