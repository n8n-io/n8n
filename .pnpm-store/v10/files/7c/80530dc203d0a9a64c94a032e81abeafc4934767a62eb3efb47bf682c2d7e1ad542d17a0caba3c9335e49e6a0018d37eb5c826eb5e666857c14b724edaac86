import { HttpInstrumentationConfig } from './types';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
/**
 * `node:http` and `node:https` instrumentation for OpenTelemetry
 */
export declare class HttpInstrumentation extends InstrumentationBase<HttpInstrumentationConfig> {
    /** keep track on spans not ended */
    private readonly _spanNotEnded;
    private _headerCapture;
    private _oldHttpServerDurationHistogram;
    private _stableHttpServerDurationHistogram;
    private _oldHttpClientDurationHistogram;
    private _stableHttpClientDurationHistogram;
    private _semconvStability;
    constructor(config?: HttpInstrumentationConfig);
    protected _updateMetricInstruments(): void;
    private _recordServerDuration;
    private _recordClientDuration;
    setConfig(config?: HttpInstrumentationConfig): void;
    init(): [
        InstrumentationNodeModuleDefinition,
        InstrumentationNodeModuleDefinition
    ];
    private _getHttpInstrumentation;
    private _getHttpsInstrumentation;
    /**
     * Creates spans for incoming requests, restoring spans' context if applied.
     */
    private _getPatchIncomingRequestFunction;
    /**
     * Creates spans for outgoing requests, sending spans' context for distributed
     * tracing.
     */
    private _getPatchOutgoingRequestFunction;
    private _getPatchOutgoingGetFunction;
    /** Patches HTTPS outgoing requests */
    private _getPatchHttpsOutgoingRequestFunction;
    private _setDefaultOptions;
    /** Patches HTTPS outgoing get requests */
    private _getPatchHttpsOutgoingGetFunction;
    /**
     * Attach event listeners to a client request to end span and add span attributes.
     *
     * @param request The original request object.
     * @param span representing the current operation
     * @param startTime representing the start time of the request to calculate duration in Metric
     * @param oldMetricAttributes metric attributes for old semantic conventions
     * @param stableMetricAttributes metric attributes for new semantic conventions
     */
    private _traceClientRequest;
    private _incomingRequestFunction;
    private _outgoingRequestFunction;
    private _onServerResponseFinish;
    private _onOutgoingRequestError;
    private _onServerResponseError;
    private _startHttpSpan;
    private _closeHttpSpan;
    private _callResponseHook;
    private _callRequestHook;
    private _callStartSpanHook;
    private _createHeaderCapture;
}
//# sourceMappingURL=http.d.ts.map