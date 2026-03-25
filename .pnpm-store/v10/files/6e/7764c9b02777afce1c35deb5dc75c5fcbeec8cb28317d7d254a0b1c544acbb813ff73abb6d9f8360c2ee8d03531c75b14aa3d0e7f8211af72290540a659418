import { IAttributesProcessor } from './AttributesProcessor';
import { InstrumentSelector } from './InstrumentSelector';
import { MeterSelector } from './MeterSelector';
import { Aggregation } from './Aggregation';
import { AggregationOption } from './AggregationOption';
import { InstrumentType } from '../export/MetricData';
export type ViewOptions = {
    /**
     *  Alters the metric stream:
     *  This will be used as the name of the metrics stream.
     *  If not provided, the original Instrument name will be used.
     */
    name?: string;
    /**
     * Alters the metric stream:
     * This will be used as the description of the metrics stream.
     * If not provided, the original Instrument description will be used by default.
     *
     * @example <caption>changes the description of all selected instruments to 'sample description'</caption>
     * description: 'sample description'
     */
    description?: string;
    /**
     * Alters the metric stream:
     * If provided, the attributes will be modified as defined by the processors in the list. Processors are applied
     * in the order they're provided.
     * If not provided, all attribute keys will be used by default.
     *
     * @example <caption>drops all attributes with top-level keys except for 'myAttr' and 'myOtherAttr'</caption>
     * attributesProcessors: [createAllowListProcessor(['myAttr', 'myOtherAttr'])]
     * @example <caption>drops all attributes</caption>
     * attributesProcessors: [createAllowListProcessor([])]
     * @example <caption>allows all attributes except for 'myAttr'</caption>
     * attributesProcessors: [createDenyListProcessor(['myAttr']]
     */
    attributesProcessors?: IAttributesProcessor[];
    /**
     * Alters the metric stream:
     * Alters the Aggregation of the metric stream.
     *
     * @example <caption>changes the aggregation of the selected instrument(s) to ExplicitBucketHistogramAggregation</caption>
     * aggregation: { type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM, options: { boundaries: [1, 10, 100] } }
     * @example <caption>changes the aggregation of the selected instrument(s) to LastValueAggregation</caption>
     * aggregation: { type: AggregationType.LAST_VALUE, options: { boundaries: [1, 10, 100] } }
     */
    aggregation?: AggregationOption;
    /**
     * Alters the metric stream:
     * Sets a limit on the number of unique attribute combinations (cardinality) that can be aggregated.
     * If not provided, the default limit will be used.
     *
     * @example <caption>sets the cardinality limit to 1000</caption>
     * aggregationCardinalityLimit: 1000
     */
    aggregationCardinalityLimit?: number;
    /**
     * Instrument selection criteria:
     * The original type of the Instrument(s).
     *
     * @example <caption>selects all counters</caption>
     * instrumentType: InstrumentType.COUNTER
     * @example <caption>selects all histograms</caption>
     * instrumentType: InstrumentType.HISTOGRAM
     */
    instrumentType?: InstrumentType;
    /**
     * Instrument selection criteria:
     * Original name of the Instrument(s) with wildcard support.
     *
     * @example <caption>select all instruments</caption>
     * instrumentName: '*'
     * @example <caption>select all instruments starting with 'my.instruments.'</caption>
     * instrumentName: 'my.instruments.*'
     * @example <caption>select all instruments named 'my.instrument.requests' exactly</caption>
     * instrumentName: 'my.instruments.requests'
     */
    instrumentName?: string;
    /**
     * Instrument selection criteria:
     * The unit of the Instrument(s).
     *
     * @example <caption>select all instruments with unit 'ms'</caption>
     * instrumentUnit: 'ms'
     */
    instrumentUnit?: string;
    /**
     * Instrument selection criteria:
     * The name of the Meter. No wildcard support, name must match the meter exactly.
     *
     * @example <caption>select all meters named 'example.component.app' exactly</caption>
     * meterName: 'example.component.app'
     */
    meterName?: string;
    /**
     * Instrument selection criteria:
     * The version of the Meter. No wildcard support, version must match exactly.
     *
     * @example
     * meterVersion: '1.0.1'
     */
    meterVersion?: string;
    /**
     * Instrument selection criteria:
     * The schema URL of the Meter. No wildcard support, schema URL must match exactly.
     *
     * @example <caption>Select all meters with schema URL 'https://example.com/schema' exactly.</caption>
     * meterSchemaUrl: 'https://example.com/schema'
     */
    meterSchemaUrl?: string;
};
/**
 * Can be passed to a {@link MeterProvider} to select instruments and alter their metric stream.
 */
export declare class View {
    readonly name?: string;
    readonly description?: string;
    readonly aggregation: Aggregation;
    readonly attributesProcessor: IAttributesProcessor;
    readonly instrumentSelector: InstrumentSelector;
    readonly meterSelector: MeterSelector;
    readonly aggregationCardinalityLimit?: number;
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
     * @param viewOptions.attributesProcessors
     * Alters the metric stream:
     *  If provided, the attributes will be modified as defined by the added processors.
     *  If not provided, all attribute keys will be used by default.
     * @param viewOptions.aggregationCardinalityLimit
     * Alters the metric stream:
     *  Sets a limit on the number of unique attribute combinations (cardinality) that can be aggregated.
     *  If not provided, the default limit of 2000 will be used.
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
    constructor(viewOptions: ViewOptions);
}
//# sourceMappingURL=View.d.ts.map