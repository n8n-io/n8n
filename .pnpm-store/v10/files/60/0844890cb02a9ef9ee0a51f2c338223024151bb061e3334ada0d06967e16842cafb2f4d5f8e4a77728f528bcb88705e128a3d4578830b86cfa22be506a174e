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
exports.View = void 0;
const Predicate_1 = require("./Predicate");
const AttributesProcessor_1 = require("./AttributesProcessor");
const InstrumentSelector_1 = require("./InstrumentSelector");
const MeterSelector_1 = require("./MeterSelector");
const Aggregation_1 = require("./Aggregation");
function isSelectorNotProvided(options) {
    return (options.instrumentName == null &&
        options.instrumentType == null &&
        options.instrumentUnit == null &&
        options.meterName == null &&
        options.meterVersion == null &&
        options.meterSchemaUrl == null);
}
/**
 * Can be passed to a {@link MeterProvider} to select instruments and alter their metric stream.
 */
class View {
    /**
     * Create a new {@link View} instance.
     *
     * Parameters can be categorized as two types:
     *  Instrument selection criteria: Used to describe the instrument(s) this view will be applied to.
     *  Will be treated as additive (the Instrument has to meet all the provided criteria to be selected).
     *
     *  Metric stream altering: Alter the metric stream of instruments selected by instrument selection criteria.
     *
     * @param viewOptions {@link ViewOptions} for altering the metric stream and instrument selection.
     * @param viewOptions.name
     * Alters the metric stream:
     *  This will be used as the name of the metrics stream.
     *  If not provided, the original Instrument name will be used.
     * @param viewOptions.description
     * Alters the metric stream:
     *  This will be used as the description of the metrics stream.
     *  If not provided, the original Instrument description will be used by default.
     * @param viewOptions.attributeKeys
     * Alters the metric stream:
     *  If provided, the attributes that are not in the list will be ignored.
     *  If not provided, all attribute keys will be used by default.
     * @param viewOptions.aggregation
     * Alters the metric stream:
     *  Alters the {@link Aggregation} of the metric stream.
     * @param viewOptions.instrumentName
     * Instrument selection criteria:
     *  Original name of the Instrument(s) with wildcard support.
     * @param viewOptions.instrumentType
     * Instrument selection criteria:
     *  The original type of the Instrument(s).
     * @param viewOptions.instrumentUnit
     * Instrument selection criteria:
     *  The unit of the Instrument(s).
     * @param viewOptions.meterName
     * Instrument selection criteria:
     *  The name of the Meter. No wildcard support, name must match the meter exactly.
     * @param viewOptions.meterVersion
     * Instrument selection criteria:
     *  The version of the Meter. No wildcard support, version must match exactly.
     * @param viewOptions.meterSchemaUrl
     * Instrument selection criteria:
     *  The schema URL of the Meter. No wildcard support, schema URL must match exactly.
     *
     * @example
     * // Create a view that changes the Instrument 'my.instrument' to use to an
     * // ExplicitBucketHistogramAggregation with the boundaries [20, 30, 40]
     * new View({
     *   aggregation: new ExplicitBucketHistogramAggregation([20, 30, 40]),
     *   instrumentName: 'my.instrument'
     * })
     */
    constructor(viewOptions) {
        var _a;
        // If no criteria is provided, the SDK SHOULD treat it as an error.
        // It is recommended that the SDK implementations fail fast.
        if (isSelectorNotProvided(viewOptions)) {
            throw new Error('Cannot create view with no selector arguments supplied');
        }
        // the SDK SHOULD NOT allow Views with a specified name to be declared with instrument selectors that
        // may select more than one instrument (e.g. wild card instrument name) in the same Meter.
        if (viewOptions.name != null &&
            ((viewOptions === null || viewOptions === void 0 ? void 0 : viewOptions.instrumentName) == null ||
                Predicate_1.PatternPredicate.hasWildcard(viewOptions.instrumentName))) {
            throw new Error('Views with a specified name must be declared with an instrument selector that selects at most one instrument per meter.');
        }
        // Create AttributesProcessor if attributeKeys are defined set.
        if (viewOptions.attributeKeys != null) {
            this.attributesProcessor = new AttributesProcessor_1.FilteringAttributesProcessor(viewOptions.attributeKeys);
        }
        else {
            this.attributesProcessor = AttributesProcessor_1.AttributesProcessor.Noop();
        }
        this.name = viewOptions.name;
        this.description = viewOptions.description;
        this.aggregation = (_a = viewOptions.aggregation) !== null && _a !== void 0 ? _a : Aggregation_1.Aggregation.Default();
        this.instrumentSelector = new InstrumentSelector_1.InstrumentSelector({
            name: viewOptions.instrumentName,
            type: viewOptions.instrumentType,
            unit: viewOptions.instrumentUnit,
        });
        this.meterSelector = new MeterSelector_1.MeterSelector({
            name: viewOptions.meterName,
            version: viewOptions.meterVersion,
            schemaUrl: viewOptions.meterSchemaUrl,
        });
    }
}
exports.View = View;
//# sourceMappingURL=View.js.map