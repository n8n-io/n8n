/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstrumentType = exports.ExporterDefaultHistogramAggregation = exports.ExporterTemporalityPreference = exports.ExperimentalPrometheusTranslationStrategy = exports.ExemplarFilter = exports.initializeDefaultMeterProviderConfiguration = void 0;
function initializeDefaultMeterProviderConfiguration() {
    return {
        readers: [],
        views: [],
        exemplar_filter: ExemplarFilter.TraceBased,
    };
}
exports.initializeDefaultMeterProviderConfiguration = initializeDefaultMeterProviderConfiguration;
var ExemplarFilter;
(function (ExemplarFilter) {
    ExemplarFilter["AlwaysOff"] = "always_off";
    ExemplarFilter["AlwaysOn"] = "always_on";
    ExemplarFilter["TraceBased"] = "trace_based";
})(ExemplarFilter = exports.ExemplarFilter || (exports.ExemplarFilter = {}));
var ExperimentalPrometheusTranslationStrategy;
(function (ExperimentalPrometheusTranslationStrategy) {
    ExperimentalPrometheusTranslationStrategy["UnderscoreEscapingWithSuffixes"] = "underscore_escaping_with_suffixes";
    ExperimentalPrometheusTranslationStrategy["UnderscoreEscapingWithoutSuffixes"] = "underscore_escaping_without_suffixes";
    ExperimentalPrometheusTranslationStrategy["NoUtf8EscapingWithSuffixes"] = "no_utf8_escaping_with_suffixes";
    ExperimentalPrometheusTranslationStrategy["NoTranslation"] = "no_translation";
})(ExperimentalPrometheusTranslationStrategy = exports.ExperimentalPrometheusTranslationStrategy || (exports.ExperimentalPrometheusTranslationStrategy = {}));
var ExporterTemporalityPreference;
(function (ExporterTemporalityPreference) {
    ExporterTemporalityPreference["Cumulative"] = "cumulative";
    ExporterTemporalityPreference["Delta"] = "delta";
    ExporterTemporalityPreference["LowMemory"] = "low_memory";
})(ExporterTemporalityPreference = exports.ExporterTemporalityPreference || (exports.ExporterTemporalityPreference = {}));
var ExporterDefaultHistogramAggregation;
(function (ExporterDefaultHistogramAggregation) {
    ExporterDefaultHistogramAggregation["Base2ExponentialBucketHistogram"] = "base2_exponential_bucket_histogram";
    ExporterDefaultHistogramAggregation["ExplicitBucketHistogram"] = "explicit_bucket_histogram";
})(ExporterDefaultHistogramAggregation = exports.ExporterDefaultHistogramAggregation || (exports.ExporterDefaultHistogramAggregation = {}));
var InstrumentType;
(function (InstrumentType) {
    InstrumentType["Counter"] = "counter";
    InstrumentType["Gauge"] = "gauge";
    InstrumentType["Histogram"] = "histogram";
    InstrumentType["ObservableCounter"] = "observable_counter";
    InstrumentType["ObservableGauge"] = "observable_gauge";
    InstrumentType["ObservableUpDownCounter"] = "observable_up_down_counter";
    InstrumentType["UpDownCounter"] = "up_down_counter";
})(InstrumentType = exports.InstrumentType || (exports.InstrumentType = {}));
//# sourceMappingURL=meterProviderModel.js.map