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
exports.ParentBasedSampler = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const AlwaysOffSampler_1 = require("./AlwaysOffSampler");
const AlwaysOnSampler_1 = require("./AlwaysOnSampler");
/**
 * A composite sampler that either respects the parent span's sampling decision
 * or delegates to `delegateSampler` for root spans.
 */
class ParentBasedSampler {
    constructor(config) {
        var _a, _b, _c, _d;
        this._root = config.root;
        if (!this._root) {
            (0, core_1.globalErrorHandler)(new Error('ParentBasedSampler must have a root sampler configured'));
            this._root = new AlwaysOnSampler_1.AlwaysOnSampler();
        }
        this._remoteParentSampled =
            (_a = config.remoteParentSampled) !== null && _a !== void 0 ? _a : new AlwaysOnSampler_1.AlwaysOnSampler();
        this._remoteParentNotSampled =
            (_b = config.remoteParentNotSampled) !== null && _b !== void 0 ? _b : new AlwaysOffSampler_1.AlwaysOffSampler();
        this._localParentSampled =
            (_c = config.localParentSampled) !== null && _c !== void 0 ? _c : new AlwaysOnSampler_1.AlwaysOnSampler();
        this._localParentNotSampled =
            (_d = config.localParentNotSampled) !== null && _d !== void 0 ? _d : new AlwaysOffSampler_1.AlwaysOffSampler();
    }
    shouldSample(context, traceId, spanName, spanKind, attributes, links) {
        const parentContext = api_1.trace.getSpanContext(context);
        if (!parentContext || !(0, api_1.isSpanContextValid)(parentContext)) {
            return this._root.shouldSample(context, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.isRemote) {
            if (parentContext.traceFlags & api_1.TraceFlags.SAMPLED) {
                return this._remoteParentSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
            }
            return this._remoteParentNotSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
        }
        if (parentContext.traceFlags & api_1.TraceFlags.SAMPLED) {
            return this._localParentSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
        }
        return this._localParentNotSampled.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    }
    toString() {
        return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
    }
}
exports.ParentBasedSampler = ParentBasedSampler;
//# sourceMappingURL=ParentBasedSampler.js.map