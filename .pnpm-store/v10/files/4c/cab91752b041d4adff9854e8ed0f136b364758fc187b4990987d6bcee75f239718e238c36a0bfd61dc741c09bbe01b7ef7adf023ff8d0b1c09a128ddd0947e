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
exports.ObservableRegistry = void 0;
const api_1 = require("@opentelemetry/api");
const Instruments_1 = require("../Instruments");
const ObservableResult_1 = require("../ObservableResult");
const utils_1 = require("../utils");
/**
 * An internal interface for managing ObservableCallbacks.
 *
 * Every registered callback associated with a set of instruments are be evaluated
 * exactly once during collection prior to reading data for that instrument.
 */
class ObservableRegistry {
    _callbacks = [];
    _batchCallbacks = [];
    addCallback(callback, instrument) {
        const idx = this._findCallback(callback, instrument);
        if (idx >= 0) {
            return;
        }
        this._callbacks.push({ callback, instrument });
    }
    removeCallback(callback, instrument) {
        const idx = this._findCallback(callback, instrument);
        if (idx < 0) {
            return;
        }
        this._callbacks.splice(idx, 1);
    }
    addBatchCallback(callback, instruments) {
        // Create a set of unique instruments.
        const observableInstruments = new Set(instruments.filter(Instruments_1.isObservableInstrument));
        if (observableInstruments.size === 0) {
            api_1.diag.error('BatchObservableCallback is not associated with valid instruments', instruments);
            return;
        }
        const idx = this._findBatchCallback(callback, observableInstruments);
        if (idx >= 0) {
            return;
        }
        this._batchCallbacks.push({ callback, instruments: observableInstruments });
    }
    removeBatchCallback(callback, instruments) {
        // Create a set of unique instruments.
        const observableInstruments = new Set(instruments.filter(Instruments_1.isObservableInstrument));
        const idx = this._findBatchCallback(callback, observableInstruments);
        if (idx < 0) {
            return;
        }
        this._batchCallbacks.splice(idx, 1);
    }
    /**
     * @returns a promise of rejected reasons for invoking callbacks.
     */
    async observe(collectionTime, timeoutMillis) {
        const callbackFutures = this._observeCallbacks(collectionTime, timeoutMillis);
        const batchCallbackFutures = this._observeBatchCallbacks(collectionTime, timeoutMillis);
        const results = await (0, utils_1.PromiseAllSettled)([
            ...callbackFutures,
            ...batchCallbackFutures,
        ]);
        const rejections = results
            .filter(utils_1.isPromiseAllSettledRejectionResult)
            .map(it => it.reason);
        return rejections;
    }
    _observeCallbacks(observationTime, timeoutMillis) {
        return this._callbacks.map(async ({ callback, instrument }) => {
            const observableResult = new ObservableResult_1.ObservableResultImpl(instrument._descriptor.name, instrument._descriptor.valueType);
            let callPromise = Promise.resolve(callback(observableResult));
            if (timeoutMillis != null) {
                callPromise = (0, utils_1.callWithTimeout)(callPromise, timeoutMillis);
            }
            await callPromise;
            instrument._metricStorages.forEach(metricStorage => {
                metricStorage.record(observableResult._buffer, observationTime);
            });
        });
    }
    _observeBatchCallbacks(observationTime, timeoutMillis) {
        return this._batchCallbacks.map(async ({ callback, instruments }) => {
            const observableResult = new ObservableResult_1.BatchObservableResultImpl();
            let callPromise = Promise.resolve(callback(observableResult));
            if (timeoutMillis != null) {
                callPromise = (0, utils_1.callWithTimeout)(callPromise, timeoutMillis);
            }
            await callPromise;
            instruments.forEach(instrument => {
                const buffer = observableResult._buffer.get(instrument);
                if (buffer == null) {
                    return;
                }
                instrument._metricStorages.forEach(metricStorage => {
                    metricStorage.record(buffer, observationTime);
                });
            });
        });
    }
    _findCallback(callback, instrument) {
        return this._callbacks.findIndex(record => {
            return record.callback === callback && record.instrument === instrument;
        });
    }
    _findBatchCallback(callback, instruments) {
        return this._batchCallbacks.findIndex(record => {
            return (record.callback === callback &&
                (0, utils_1.setEquals)(record.instruments, instruments));
        });
    }
}
exports.ObservableRegistry = ObservableRegistry;
//# sourceMappingURL=ObservableRegistry.js.map