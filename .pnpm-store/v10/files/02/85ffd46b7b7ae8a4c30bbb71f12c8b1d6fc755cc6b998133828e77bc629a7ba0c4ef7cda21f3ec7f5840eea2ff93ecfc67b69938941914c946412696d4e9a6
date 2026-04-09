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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { FixedSizeExemplarReservoirBase } from './ExemplarReservoir';
/**
 * AlignedHistogramBucketExemplarReservoir takes the same boundaries
 * configuration of a Histogram. This algorithm keeps the last seen measurement
 * that falls within a histogram bucket.
 */
var AlignedHistogramBucketExemplarReservoir = /** @class */ (function (_super) {
    __extends(AlignedHistogramBucketExemplarReservoir, _super);
    function AlignedHistogramBucketExemplarReservoir(boundaries) {
        var _this = _super.call(this, boundaries.length + 1) || this;
        _this._boundaries = boundaries;
        return _this;
    }
    AlignedHistogramBucketExemplarReservoir.prototype._findBucketIndex = function (value, _timestamp, _attributes, _ctx) {
        for (var i = 0; i < this._boundaries.length; i++) {
            if (value <= this._boundaries[i]) {
                return i;
            }
        }
        return this._boundaries.length;
    };
    AlignedHistogramBucketExemplarReservoir.prototype.offer = function (value, timestamp, attributes, ctx) {
        var index = this._findBucketIndex(value, timestamp, attributes, ctx);
        this._reservoirStorage[index].offer(value, timestamp, attributes, ctx);
    };
    return AlignedHistogramBucketExemplarReservoir;
}(FixedSizeExemplarReservoirBase));
export { AlignedHistogramBucketExemplarReservoir };
//# sourceMappingURL=AlignedHistogramBucketExemplarReservoir.js.map