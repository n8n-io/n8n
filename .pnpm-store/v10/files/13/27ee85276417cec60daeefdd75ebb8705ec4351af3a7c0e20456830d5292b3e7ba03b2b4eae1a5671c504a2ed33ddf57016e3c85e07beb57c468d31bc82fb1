"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpInstrumentation = void 0;
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
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const url = require("url");
const version_1 = require("./version");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const events_1 = require("events");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const utils_1 = require("./utils");
/**
 * `node:http` and `node:https` instrumentation for OpenTelemetry
 */
class HttpInstrumentation extends instrumentation_1.InstrumentationBase {
    /** keep track on spans not ended */
    _spanNotEnded = new WeakSet();
    _headerCapture;
    _semconvStability = instrumentation_1.SemconvStability.OLD;
    constructor(config = {}) {
        super('@opentelemetry/instrumentation-http', version_1.VERSION, config);
        this._headerCapture = this._createHeaderCapture();
        this._semconvStability = (0, instrumentation_1.semconvStabilityFromStr)('http', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    _updateMetricInstruments() {
        this._oldHttpServerDurationHistogram = this.meter.createHistogram('http.server.duration', {
            description: 'Measures the duration of inbound HTTP requests.',
            unit: 'ms',
            valueType: api_1.ValueType.DOUBLE,
        });
        this._oldHttpClientDurationHistogram = this.meter.createHistogram('http.client.duration', {
            description: 'Measures the duration of outbound HTTP requests.',
            unit: 'ms',
            valueType: api_1.ValueType.DOUBLE,
        });
        this._stableHttpServerDurationHistogram = this.meter.createHistogram(semantic_conventions_1.METRIC_HTTP_SERVER_REQUEST_DURATION, {
            description: 'Duration of HTTP server requests.',
            unit: 's',
            valueType: api_1.ValueType.DOUBLE,
            advice: {
                explicitBucketBoundaries: [
                    0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5,
                    7.5, 10,
                ],
            },
        });
        this._stableHttpClientDurationHistogram = this.meter.createHistogram(semantic_conventions_1.METRIC_HTTP_CLIENT_REQUEST_DURATION, {
            description: 'Duration of HTTP client requests.',
            unit: 's',
            valueType: api_1.ValueType.DOUBLE,
            advice: {
                explicitBucketBoundaries: [
                    0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5,
                    7.5, 10,
                ],
            },
        });
    }
    _recordServerDuration(durationMs, oldAttributes, stableAttributes) {
        if (this._semconvStability & instrumentation_1.SemconvStability.OLD) {
            // old histogram is counted in MS
            this._oldHttpServerDurationHistogram.record(durationMs, oldAttributes);
        }
        if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
            // stable histogram is counted in S
            this._stableHttpServerDurationHistogram.record(durationMs / 1000, stableAttributes);
        }
    }
    _recordClientDuration(durationMs, oldAttributes, stableAttributes) {
        if (this._semconvStability & instrumentation_1.SemconvStability.OLD) {
            // old histogram is counted in MS
            this._oldHttpClientDurationHistogram.record(durationMs, oldAttributes);
        }
        if (this._semconvStability & instrumentation_1.SemconvStability.STABLE) {
            // stable histogram is counted in S
            this._stableHttpClientDurationHistogram.record(durationMs / 1000, stableAttributes);
        }
    }
    setConfig(config = {}) {
        super.setConfig(config);
        this._headerCapture = this._createHeaderCapture();
    }
    init() {
        return [this._getHttpsInstrumentation(), this._getHttpInstrumentation()];
    }
    _getHttpInstrumentation() {
        return new instrumentation_1.InstrumentationNodeModuleDefinition('http', ['*'], (moduleExports) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isESM = moduleExports[Symbol.toStringTag] === 'Module';
            if (!this.getConfig().disableOutgoingRequestInstrumentation) {
                const patchedRequest = this._wrap(moduleExports, 'request', this._getPatchOutgoingRequestFunction('http'));
                const patchedGet = this._wrap(moduleExports, 'get', this._getPatchOutgoingGetFunction(patchedRequest));
                if (isESM) {
                    // To handle `import http from 'http'`, which returns the default
                    // export, we need to set `module.default.*`.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    moduleExports.default.request = patchedRequest;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    moduleExports.default.get = patchedGet;
                }
            }
            if (!this.getConfig().disableIncomingRequestInstrumentation) {
                this._wrap(moduleExports.Server.prototype, 'emit', this._getPatchIncomingRequestFunction('http'));
            }
            return moduleExports;
        }, (moduleExports) => {
            if (moduleExports === undefined)
                return;
            if (!this.getConfig().disableOutgoingRequestInstrumentation) {
                this._unwrap(moduleExports, 'request');
                this._unwrap(moduleExports, 'get');
            }
            if (!this.getConfig().disableIncomingRequestInstrumentation) {
                this._unwrap(moduleExports.Server.prototype, 'emit');
            }
        });
    }
    _getHttpsInstrumentation() {
        return new instrumentation_1.InstrumentationNodeModuleDefinition('https', ['*'], (moduleExports) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isESM = moduleExports[Symbol.toStringTag] === 'Module';
            if (!this.getConfig().disableOutgoingRequestInstrumentation) {
                const patchedRequest = this._wrap(moduleExports, 'request', this._getPatchHttpsOutgoingRequestFunction('https'));
                const patchedGet = this._wrap(moduleExports, 'get', this._getPatchHttpsOutgoingGetFunction(patchedRequest));
                if (isESM) {
                    // To handle `import https from 'https'`, which returns the default
                    // export, we need to set `module.default.*`.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    moduleExports.default.request = patchedRequest;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    moduleExports.default.get = patchedGet;
                }
            }
            if (!this.getConfig().disableIncomingRequestInstrumentation) {
                this._wrap(moduleExports.Server.prototype, 'emit', this._getPatchIncomingRequestFunction('https'));
            }
            return moduleExports;
        }, (moduleExports) => {
            if (moduleExports === undefined)
                return;
            if (!this.getConfig().disableOutgoingRequestInstrumentation) {
                this._unwrap(moduleExports, 'request');
                this._unwrap(moduleExports, 'get');
            }
            if (!this.getConfig().disableIncomingRequestInstrumentation) {
                this._unwrap(moduleExports.Server.prototype, 'emit');
            }
        });
    }
    /**
     * Creates spans for incoming requests, restoring spans' context if applied.
     */
    _getPatchIncomingRequestFunction(component) {
        return (original) => {
            return this._incomingRequestFunction(component, original);
        };
    }
    /**
     * Creates spans for outgoing requests, sending spans' context for distributed
     * tracing.
     */
    _getPatchOutgoingRequestFunction(component) {
        return (original) => {
            return this._outgoingRequestFunction(component, original);
        };
    }
    _getPatchOutgoingGetFunction(clientRequest) {
        return (_original) => {
            // Re-implement http.get. This needs to be done (instead of using
            // getPatchOutgoingRequestFunction to patch it) because we need to
            // set the trace context header before the returned http.ClientRequest is
            // ended. The Node.js docs state that the only differences between
            // request and get are that (1) get defaults to the HTTP GET method and
            // (2) the returned request object is ended immediately. The former is
            // already true (at least in supported Node versions up to v10), so we
            // simply follow the latter. Ref:
            // https://nodejs.org/dist/latest/docs/api/http.html#http_http_get_options_callback
            // https://github.com/googleapis/cloud-trace-nodejs/blob/master/src/instrumentations/instrumentation-http.ts#L198
            return function outgoingGetRequest(options, ...args) {
                const req = clientRequest(options, ...args);
                req.end();
                return req;
            };
        };
    }
    /** Patches HTTPS outgoing requests */
    _getPatchHttpsOutgoingRequestFunction(component) {
        return (original) => {
            const instrumentation = this;
            return function httpsOutgoingRequest(
            // eslint-disable-next-line n/no-unsupported-features/node-builtins
            options, ...args) {
                // Makes sure options will have default HTTPS parameters
                if (component === 'https' &&
                    typeof options === 'object' &&
                    options?.constructor?.name !== 'URL') {
                    options = Object.assign({}, options);
                    instrumentation._setDefaultOptions(options);
                }
                return instrumentation._getPatchOutgoingRequestFunction(component)(original)(options, ...args);
            };
        };
    }
    _setDefaultOptions(options) {
        options.protocol = options.protocol || 'https:';
        options.port = options.port || 443;
    }
    /** Patches HTTPS outgoing get requests */
    _getPatchHttpsOutgoingGetFunction(clientRequest) {
        return (original) => {
            const instrumentation = this;
            return function httpsOutgoingRequest(
            // eslint-disable-next-line n/no-unsupported-features/node-builtins
            options, ...args) {
                return instrumentation._getPatchOutgoingGetFunction(clientRequest)(original)(options, ...args);
            };
        };
    }
    /**
     * Attach event listeners to a client request to end span and add span attributes.
     *
     * @param request The original request object.
     * @param span representing the current operation
     * @param startTime representing the start time of the request to calculate duration in Metric
     * @param oldMetricAttributes metric attributes for old semantic conventions
     * @param stableMetricAttributes metric attributes for new semantic conventions
     */
    _traceClientRequest(request, span, startTime, oldMetricAttributes, stableMetricAttributes) {
        if (this.getConfig().requestHook) {
            this._callRequestHook(span, request);
        }
        /**
         * Determines if the request has errored or the response has ended/errored.
         */
        let responseFinished = false;
        /*
         * User 'response' event listeners can be added before our listener,
         * force our listener to be the first, so response emitter is bound
         * before any user listeners are added to it.
         */
        request.prependListener('response', (response) => {
            this._diag.debug('outgoingRequest on response()');
            if (request.listenerCount('response') <= 1) {
                response.resume();
            }
            const responseAttributes = (0, utils_1.getOutgoingRequestAttributesOnResponse)(response, this._semconvStability);
            span.setAttributes(responseAttributes);
            oldMetricAttributes = Object.assign(oldMetricAttributes, (0, utils_1.getOutgoingRequestMetricAttributesOnResponse)(responseAttributes));
            stableMetricAttributes = Object.assign(stableMetricAttributes, (0, utils_1.getOutgoingStableRequestMetricAttributesOnResponse)(responseAttributes));
            if (this.getConfig().responseHook) {
                this._callResponseHook(span, response);
            }
            this._headerCapture.client.captureRequestHeaders(span, header => request.getHeader(header));
            this._headerCapture.client.captureResponseHeaders(span, header => response.headers[header]);
            api_1.context.bind(api_1.context.active(), response);
            const endHandler = () => {
                this._diag.debug('outgoingRequest on end()');
                if (responseFinished) {
                    return;
                }
                responseFinished = true;
                let status;
                if (response.aborted && !response.complete) {
                    status = { code: api_1.SpanStatusCode.ERROR };
                }
                else {
                    // behaves same for new and old semconv
                    status = {
                        code: (0, utils_1.parseResponseStatus)(api_1.SpanKind.CLIENT, response.statusCode),
                    };
                }
                span.setStatus(status);
                if (this.getConfig().applyCustomAttributesOnSpan) {
                    (0, instrumentation_1.safeExecuteInTheMiddle)(() => this.getConfig().applyCustomAttributesOnSpan(span, request, response), () => { }, true);
                }
                this._closeHttpSpan(span, api_1.SpanKind.CLIENT, startTime, oldMetricAttributes, stableMetricAttributes);
            };
            response.on('end', endHandler);
            response.on(events_1.errorMonitor, (error) => {
                this._diag.debug('outgoingRequest on error()', error);
                if (responseFinished) {
                    return;
                }
                responseFinished = true;
                this._onOutgoingRequestError(span, oldMetricAttributes, stableMetricAttributes, startTime, error);
            });
        });
        request.on('close', () => {
            this._diag.debug('outgoingRequest on request close()');
            if (request.aborted || responseFinished) {
                return;
            }
            responseFinished = true;
            this._closeHttpSpan(span, api_1.SpanKind.CLIENT, startTime, oldMetricAttributes, stableMetricAttributes);
        });
        request.on(events_1.errorMonitor, (error) => {
            this._diag.debug('outgoingRequest on request error()', error);
            if (responseFinished) {
                return;
            }
            responseFinished = true;
            this._onOutgoingRequestError(span, oldMetricAttributes, stableMetricAttributes, startTime, error);
        });
        this._diag.debug('http.ClientRequest return request');
        return request;
    }
    _incomingRequestFunction(component, original) {
        const instrumentation = this;
        return function incomingRequest(event, ...args) {
            // Only traces request events
            if (event !== 'request') {
                return original.apply(this, [event, ...args]);
            }
            const request = args[0];
            const response = args[1];
            const method = request.method || 'GET';
            instrumentation._diag.debug(`${component} instrumentation incomingRequest`);
            if ((0, instrumentation_1.safeExecuteInTheMiddle)(() => instrumentation.getConfig().ignoreIncomingRequestHook?.(request), (e) => {
                if (e != null) {
                    instrumentation._diag.error('caught ignoreIncomingRequestHook error: ', e);
                }
            }, true)) {
                return api_1.context.with((0, core_1.suppressTracing)(api_1.context.active()), () => {
                    api_1.context.bind(api_1.context.active(), request);
                    api_1.context.bind(api_1.context.active(), response);
                    return original.apply(this, [event, ...args]);
                });
            }
            const headers = request.headers;
            const spanAttributes = (0, utils_1.getIncomingRequestAttributes)(request, {
                component: component,
                serverName: instrumentation.getConfig().serverName,
                hookAttributes: instrumentation._callStartSpanHook(request, instrumentation.getConfig().startIncomingSpanHook),
                semconvStability: instrumentation._semconvStability,
                enableSyntheticSourceDetection: instrumentation.getConfig().enableSyntheticSourceDetection || false,
            }, instrumentation._diag);
            const spanOptions = {
                kind: api_1.SpanKind.SERVER,
                attributes: spanAttributes,
            };
            const startTime = (0, core_1.hrTime)();
            const oldMetricAttributes = (0, utils_1.getIncomingRequestMetricAttributes)(spanAttributes);
            // request method and url.scheme are both required span attributes
            const stableMetricAttributes = {
                [semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD]: spanAttributes[semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD],
                [semantic_conventions_1.ATTR_URL_SCHEME]: spanAttributes[semantic_conventions_1.ATTR_URL_SCHEME],
            };
            // recommended if and only if one was sent, same as span recommendation
            if (spanAttributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION]) {
                stableMetricAttributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION] =
                    spanAttributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION];
            }
            const ctx = api_1.propagation.extract(api_1.ROOT_CONTEXT, headers);
            const span = instrumentation._startHttpSpan(method, spanOptions, ctx);
            const rpcMetadata = {
                type: core_1.RPCType.HTTP,
                span,
            };
            return api_1.context.with((0, core_1.setRPCMetadata)(api_1.trace.setSpan(ctx, span), rpcMetadata), () => {
                api_1.context.bind(api_1.context.active(), request);
                api_1.context.bind(api_1.context.active(), response);
                if (instrumentation.getConfig().requestHook) {
                    instrumentation._callRequestHook(span, request);
                }
                if (instrumentation.getConfig().responseHook) {
                    instrumentation._callResponseHook(span, response);
                }
                instrumentation._headerCapture.server.captureRequestHeaders(span, header => request.headers[header]);
                // After 'error', no further events other than 'close' should be emitted.
                let hasError = false;
                response.on('close', () => {
                    if (hasError) {
                        return;
                    }
                    instrumentation._onServerResponseFinish(request, response, span, oldMetricAttributes, stableMetricAttributes, startTime);
                });
                response.on(events_1.errorMonitor, (err) => {
                    hasError = true;
                    instrumentation._onServerResponseError(span, oldMetricAttributes, stableMetricAttributes, startTime, err);
                });
                return (0, instrumentation_1.safeExecuteInTheMiddle)(() => original.apply(this, [event, ...args]), error => {
                    if (error) {
                        instrumentation._onServerResponseError(span, oldMetricAttributes, stableMetricAttributes, startTime, error);
                        throw error;
                    }
                });
            });
        };
    }
    _outgoingRequestFunction(component, original) {
        const instrumentation = this;
        return function outgoingRequest(options, ...args) {
            if (!(0, utils_1.isValidOptionsType)(options)) {
                return original.apply(this, [options, ...args]);
            }
            const extraOptions = typeof args[0] === 'object' &&
                (typeof options === 'string' || options instanceof url.URL)
                ? args.shift()
                : undefined;
            const { method, invalidUrl, optionsParsed } = (0, utils_1.getRequestInfo)(instrumentation._diag, options, extraOptions);
            if ((0, instrumentation_1.safeExecuteInTheMiddle)(() => instrumentation
                .getConfig()
                .ignoreOutgoingRequestHook?.(optionsParsed), (e) => {
                if (e != null) {
                    instrumentation._diag.error('caught ignoreOutgoingRequestHook error: ', e);
                }
            }, true)) {
                return original.apply(this, [optionsParsed, ...args]);
            }
            const { hostname, port } = (0, utils_1.extractHostnameAndPort)(optionsParsed);
            const attributes = (0, utils_1.getOutgoingRequestAttributes)(optionsParsed, {
                component,
                port,
                hostname,
                hookAttributes: instrumentation._callStartSpanHook(optionsParsed, instrumentation.getConfig().startOutgoingSpanHook),
                redactedQueryParams: instrumentation.getConfig().redactedQueryParams, // Added config for adding custom query strings
            }, instrumentation._semconvStability, instrumentation.getConfig().enableSyntheticSourceDetection || false);
            const startTime = (0, core_1.hrTime)();
            const oldMetricAttributes = (0, utils_1.getOutgoingRequestMetricAttributes)(attributes);
            // request method, server address, and server port are both required span attributes
            const stableMetricAttributes = {
                [semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD]: attributes[semantic_conventions_1.ATTR_HTTP_REQUEST_METHOD],
                [semantic_conventions_1.ATTR_SERVER_ADDRESS]: attributes[semantic_conventions_1.ATTR_SERVER_ADDRESS],
                [semantic_conventions_1.ATTR_SERVER_PORT]: attributes[semantic_conventions_1.ATTR_SERVER_PORT],
            };
            // required if and only if one was sent, same as span requirement
            if (attributes[semantic_conventions_1.ATTR_HTTP_RESPONSE_STATUS_CODE]) {
                stableMetricAttributes[semantic_conventions_1.ATTR_HTTP_RESPONSE_STATUS_CODE] =
                    attributes[semantic_conventions_1.ATTR_HTTP_RESPONSE_STATUS_CODE];
            }
            // recommended if and only if one was sent, same as span recommendation
            if (attributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION]) {
                stableMetricAttributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION] =
                    attributes[semantic_conventions_1.ATTR_NETWORK_PROTOCOL_VERSION];
            }
            const spanOptions = {
                kind: api_1.SpanKind.CLIENT,
                attributes,
            };
            const span = instrumentation._startHttpSpan(method, spanOptions);
            const parentContext = api_1.context.active();
            const requestContext = api_1.trace.setSpan(parentContext, span);
            if (!optionsParsed.headers) {
                optionsParsed.headers = {};
            }
            else {
                // Make a copy of the headers object to avoid mutating an object the
                // caller might have a reference to.
                optionsParsed.headers = Object.assign({}, optionsParsed.headers);
            }
            api_1.propagation.inject(requestContext, optionsParsed.headers);
            return api_1.context.with(requestContext, () => {
                /*
                 * The response callback is registered before ClientRequest is bound,
                 * thus it is needed to bind it before the function call.
                 */
                const cb = args[args.length - 1];
                if (typeof cb === 'function') {
                    args[args.length - 1] = api_1.context.bind(parentContext, cb);
                }
                const request = (0, instrumentation_1.safeExecuteInTheMiddle)(() => {
                    if (invalidUrl) {
                        // we know that the url is invalid, there's no point in injecting context as it will fail validation.
                        // Passing in what the user provided will give the user an error that matches what they'd see without
                        // the instrumentation.
                        return original.apply(this, [options, ...args]);
                    }
                    else {
                        return original.apply(this, [optionsParsed, ...args]);
                    }
                }, error => {
                    if (error) {
                        instrumentation._onOutgoingRequestError(span, oldMetricAttributes, stableMetricAttributes, startTime, error);
                        throw error;
                    }
                });
                instrumentation._diag.debug(`${component} instrumentation outgoingRequest`);
                api_1.context.bind(parentContext, request);
                return instrumentation._traceClientRequest(request, span, startTime, oldMetricAttributes, stableMetricAttributes);
            });
        };
    }
    _onServerResponseFinish(request, response, span, oldMetricAttributes, stableMetricAttributes, startTime) {
        const attributes = (0, utils_1.getIncomingRequestAttributesOnResponse)(request, response, this._semconvStability);
        oldMetricAttributes = Object.assign(oldMetricAttributes, (0, utils_1.getIncomingRequestMetricAttributesOnResponse)(attributes));
        stableMetricAttributes = Object.assign(stableMetricAttributes, (0, utils_1.getIncomingStableRequestMetricAttributesOnResponse)(attributes));
        this._headerCapture.server.captureResponseHeaders(span, header => response.getHeader(header));
        span.setAttributes(attributes).setStatus({
            code: (0, utils_1.parseResponseStatus)(api_1.SpanKind.SERVER, response.statusCode),
        });
        const route = attributes[semantic_conventions_1.ATTR_HTTP_ROUTE];
        if (route) {
            span.updateName(`${request.method || 'GET'} ${route}`);
        }
        if (this.getConfig().applyCustomAttributesOnSpan) {
            (0, instrumentation_1.safeExecuteInTheMiddle)(() => this.getConfig().applyCustomAttributesOnSpan(span, request, response), () => { }, true);
        }
        this._closeHttpSpan(span, api_1.SpanKind.SERVER, startTime, oldMetricAttributes, stableMetricAttributes);
    }
    _onOutgoingRequestError(span, oldMetricAttributes, stableMetricAttributes, startTime, error) {
        (0, utils_1.setSpanWithError)(span, error, this._semconvStability);
        stableMetricAttributes[semantic_conventions_1.ATTR_ERROR_TYPE] = error.name;
        this._closeHttpSpan(span, api_1.SpanKind.CLIENT, startTime, oldMetricAttributes, stableMetricAttributes);
    }
    _onServerResponseError(span, oldMetricAttributes, stableMetricAttributes, startTime, error) {
        (0, utils_1.setSpanWithError)(span, error, this._semconvStability);
        stableMetricAttributes[semantic_conventions_1.ATTR_ERROR_TYPE] = error.name;
        this._closeHttpSpan(span, api_1.SpanKind.SERVER, startTime, oldMetricAttributes, stableMetricAttributes);
    }
    _startHttpSpan(name, options, ctx = api_1.context.active()) {
        /*
         * If a parent is required but not present, we use a `NoopSpan` to still
         * propagate context without recording it.
         */
        const requireParent = options.kind === api_1.SpanKind.CLIENT
            ? this.getConfig().requireParentforOutgoingSpans
            : this.getConfig().requireParentforIncomingSpans;
        let span;
        const currentSpan = api_1.trace.getSpan(ctx);
        if (requireParent === true &&
            (!currentSpan || !api_1.trace.isSpanContextValid(currentSpan.spanContext()))) {
            span = api_1.trace.wrapSpanContext(api_1.INVALID_SPAN_CONTEXT);
        }
        else if (requireParent === true && currentSpan?.spanContext().isRemote) {
            span = currentSpan;
        }
        else {
            span = this.tracer.startSpan(name, options, ctx);
        }
        this._spanNotEnded.add(span);
        return span;
    }
    _closeHttpSpan(span, spanKind, startTime, oldMetricAttributes, stableMetricAttributes) {
        if (!this._spanNotEnded.has(span)) {
            return;
        }
        span.end();
        this._spanNotEnded.delete(span);
        // Record metrics
        const duration = (0, core_1.hrTimeToMilliseconds)((0, core_1.hrTimeDuration)(startTime, (0, core_1.hrTime)()));
        if (spanKind === api_1.SpanKind.SERVER) {
            this._recordServerDuration(duration, oldMetricAttributes, stableMetricAttributes);
        }
        else if (spanKind === api_1.SpanKind.CLIENT) {
            this._recordClientDuration(duration, oldMetricAttributes, stableMetricAttributes);
        }
    }
    _callResponseHook(span, response) {
        (0, instrumentation_1.safeExecuteInTheMiddle)(() => this.getConfig().responseHook(span, response), () => { }, true);
    }
    _callRequestHook(span, request) {
        (0, instrumentation_1.safeExecuteInTheMiddle)(() => this.getConfig().requestHook(span, request), () => { }, true);
    }
    _callStartSpanHook(request, hookFunc) {
        if (typeof hookFunc === 'function') {
            return (0, instrumentation_1.safeExecuteInTheMiddle)(() => hookFunc(request), () => { }, true);
        }
    }
    _createHeaderCapture() {
        const config = this.getConfig();
        return {
            client: {
                captureRequestHeaders: (0, utils_1.headerCapture)('request', config.headersToSpanAttributes?.client?.requestHeaders ?? []),
                captureResponseHeaders: (0, utils_1.headerCapture)('response', config.headersToSpanAttributes?.client?.responseHeaders ?? []),
            },
            server: {
                captureRequestHeaders: (0, utils_1.headerCapture)('request', config.headersToSpanAttributes?.server?.requestHeaders ?? []),
                captureResponseHeaders: (0, utils_1.headerCapture)('response', config.headersToSpanAttributes?.server?.responseHeaders ?? []),
            },
        };
    }
}
exports.HttpInstrumentation = HttpInstrumentation;
//# sourceMappingURL=http.js.map