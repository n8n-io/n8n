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
exports.semconvStabilityFromStr = exports.SemconvStability = void 0;
var SemconvStability;
(function (SemconvStability) {
    /** Emit only stable semantic conventions. */
    SemconvStability[SemconvStability["STABLE"] = 1] = "STABLE";
    /** Emit only old semantic conventions. */
    SemconvStability[SemconvStability["OLD"] = 2] = "OLD";
    /** Emit both stable and old semantic conventions. */
    SemconvStability[SemconvStability["DUPLICATE"] = 3] = "DUPLICATE";
})(SemconvStability = exports.SemconvStability || (exports.SemconvStability = {}));
/**
 * Determine the appropriate semconv stability for the given namespace.
 *
 * This will parse the given string of comma-separated values (often
 * `process.env.OTEL_SEMCONV_STABILITY_OPT_IN`) looking for the `${namespace}`
 * or `${namespace}/dup` tokens. This is a pattern defined by a number of
 * non-normative semconv documents.
 *
 * For example:
 * - namespace 'http': https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
 * - namespace 'database': https://opentelemetry.io/docs/specs/semconv/non-normative/database-migration/
 * - namespace 'k8s': https://opentelemetry.io/docs/specs/semconv/non-normative/k8s-migration/
 *
 * Usage:
 *
 *  import {SemconvStability, semconvStabilityFromStr} from '@opentelemetry/instrumentation';
 *
 *  export class FooInstrumentation extends InstrumentationBase<FooInstrumentationConfig> {
 *    private _semconvStability: SemconvStability;
 *    constructor(config: FooInstrumentationConfig = {}) {
 *      super('@opentelemetry/instrumentation-foo', VERSION, config);
 *
 *      // When supporting the OTEL_SEMCONV_STABILITY_OPT_IN envvar
 *      this._semconvStability = semconvStabilityFromStr(
 *        'http',
 *        process.env.OTEL_SEMCONV_STABILITY_OPT_IN
 *      );
 *
 *      // or when supporting a `semconvStabilityOptIn` config option (e.g. for
 *      // the web where there are no envvars).
 *      this._semconvStability = semconvStabilityFromStr(
 *        'http',
 *        config?.semconvStabilityOptIn
 *      );
 *    }
 *  }
 *
 *  // Then, to apply semconv, use the following or similar:
 *  if (this._semconvStability & SemconvStability.OLD) {
 *    // ...
 *  }
 *  if (this._semconvStability & SemconvStability.STABLE) {
 *    // ...
 *  }
 *
 */
function semconvStabilityFromStr(namespace, str) {
    let semconvStability = SemconvStability.OLD;
    // The same parsing of `str` as `getStringListFromEnv` from the core pkg.
    const entries = str
        ?.split(',')
        .map(v => v.trim())
        .filter(s => s !== '');
    for (const entry of entries ?? []) {
        if (entry.toLowerCase() === namespace + '/dup') {
            // DUPLICATE takes highest precedence.
            semconvStability = SemconvStability.DUPLICATE;
            break;
        }
        else if (entry.toLowerCase() === namespace) {
            semconvStability = SemconvStability.STABLE;
        }
    }
    return semconvStability;
}
exports.semconvStabilityFromStr = semconvStabilityFromStr;
//# sourceMappingURL=semconvStability.js.map