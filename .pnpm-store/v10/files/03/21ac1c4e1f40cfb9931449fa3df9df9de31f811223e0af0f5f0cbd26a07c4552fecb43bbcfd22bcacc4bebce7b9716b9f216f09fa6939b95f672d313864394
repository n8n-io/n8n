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
import { SamplingDecision } from '../Sampler';
/** Sampler that samples no traces. */
var AlwaysOffSampler = /** @class */ (function () {
    function AlwaysOffSampler() {
    }
    AlwaysOffSampler.prototype.shouldSample = function () {
        return {
            decision: SamplingDecision.NOT_RECORD,
        };
    };
    AlwaysOffSampler.prototype.toString = function () {
        return 'AlwaysOffSampler';
    };
    return AlwaysOffSampler;
}());
export { AlwaysOffSampler };
//# sourceMappingURL=AlwaysOffSampler.js.map