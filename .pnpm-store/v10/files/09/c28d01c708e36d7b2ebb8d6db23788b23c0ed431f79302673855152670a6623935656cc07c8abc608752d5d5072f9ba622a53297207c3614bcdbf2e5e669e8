"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EAggregationTemporality = void 0;
/**
 * AggregationTemporality defines how a metric aggregator reports aggregated
 * values. It describes how those values relate to the time interval over
 * which they are aggregated.
 */
var EAggregationTemporality;
(function (EAggregationTemporality) {
    /* UNSPECIFIED is the default AggregationTemporality, it MUST not be used. */
    EAggregationTemporality[EAggregationTemporality["AGGREGATION_TEMPORALITY_UNSPECIFIED"] = 0] = "AGGREGATION_TEMPORALITY_UNSPECIFIED";
    /** DELTA is an AggregationTemporality for a metric aggregator which reports
    changes since last report time. Successive metrics contain aggregation of
    values from continuous and non-overlapping intervals.
  
    The values for a DELTA metric are based only on the time interval
    associated with one measurement cycle. There is no dependency on
    previous measurements like is the case for CUMULATIVE metrics.
  
    For example, consider a system measuring the number of requests that
    it receives and reports the sum of these requests every second as a
    DELTA metric:
  
    1. The system starts receiving at time=t_0.
    2. A request is received, the system measures 1 request.
    3. A request is received, the system measures 1 request.
    4. A request is received, the system measures 1 request.
    5. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+1 with a value of 3.
    6. A request is received, the system measures 1 request.
    7. A request is received, the system measures 1 request.
    8. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0+1 to
        t_0+2 with a value of 2. */
    EAggregationTemporality[EAggregationTemporality["AGGREGATION_TEMPORALITY_DELTA"] = 1] = "AGGREGATION_TEMPORALITY_DELTA";
    /** CUMULATIVE is an AggregationTemporality for a metric aggregator which
    reports changes since a fixed start time. This means that current values
    of a CUMULATIVE metric depend on all previous measurements since the
    start time. Because of this, the sender is required to retain this state
    in some form. If this state is lost or invalidated, the CUMULATIVE metric
    values MUST be reset and a new fixed start time following the last
    reported measurement time sent MUST be used.
  
    For example, consider a system measuring the number of requests that
    it receives and reports the sum of these requests every second as a
    CUMULATIVE metric:
  
    1. The system starts receiving at time=t_0.
    2. A request is received, the system measures 1 request.
    3. A request is received, the system measures 1 request.
    4. A request is received, the system measures 1 request.
    5. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+1 with a value of 3.
    6. A request is received, the system measures 1 request.
    7. A request is received, the system measures 1 request.
    8. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+2 with a value of 5.
    9. The system experiences a fault and loses state.
    10. The system recovers and resumes receiving at time=t_1.
    11. A request is received, the system measures 1 request.
    12. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_1 to
        t_0+1 with a value of 1.
  
    Note: Even though, when reporting changes since last report time, using
    CUMULATIVE is valid, it is not recommended. This may cause problems for
    systems that do not use start_time to determine when the aggregation
    value was reset (e.g. Prometheus). */
    EAggregationTemporality[EAggregationTemporality["AGGREGATION_TEMPORALITY_CUMULATIVE"] = 2] = "AGGREGATION_TEMPORALITY_CUMULATIVE";
})(EAggregationTemporality = exports.EAggregationTemporality || (exports.EAggregationTemporality = {}));
//# sourceMappingURL=internal-types.js.map