// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { getInstrumenter } from "./instrumenter";
import { knownContextKeys } from "./tracingContext";
/**
 * Creates a new tracing client.
 *
 * @param options - Options used to configure the tracing client.
 * @returns - An instance of {@link TracingClient}.
 */
export function createTracingClient(options) {
    const { namespace, packageName, packageVersion } = options;
    function startSpan(name, operationOptions, spanOptions) {
        var _a;
        const startSpanResult = getInstrumenter().startSpan(name, Object.assign(Object.assign({}, spanOptions), { packageName: packageName, packageVersion: packageVersion, tracingContext: (_a = operationOptions === null || operationOptions === void 0 ? void 0 : operationOptions.tracingOptions) === null || _a === void 0 ? void 0 : _a.tracingContext }));
        let tracingContext = startSpanResult.tracingContext;
        const span = startSpanResult.span;
        if (!tracingContext.getValue(knownContextKeys.namespace)) {
            tracingContext = tracingContext.setValue(knownContextKeys.namespace, namespace);
        }
        span.setAttribute("az.namespace", tracingContext.getValue(knownContextKeys.namespace));
        const updatedOptions = Object.assign({}, operationOptions, {
            tracingOptions: Object.assign(Object.assign({}, operationOptions === null || operationOptions === void 0 ? void 0 : operationOptions.tracingOptions), { tracingContext }),
        });
        return {
            span,
            updatedOptions,
        };
    }
    async function withSpan(name, operationOptions, callback, spanOptions) {
        const { span, updatedOptions } = startSpan(name, operationOptions, spanOptions);
        try {
            const result = await withContext(updatedOptions.tracingOptions.tracingContext, () => Promise.resolve(callback(updatedOptions, span)));
            span.setStatus({ status: "success" });
            return result;
        }
        catch (err) {
            span.setStatus({ status: "error", error: err });
            throw err;
        }
        finally {
            span.end();
        }
    }
    function withContext(context, callback, ...callbackArgs) {
        return getInstrumenter().withContext(context, callback, ...callbackArgs);
    }
    /**
     * Parses a traceparent header value into a span identifier.
     *
     * @param traceparentHeader - The traceparent header to parse.
     * @returns An implementation-specific identifier for the span.
     */
    function parseTraceparentHeader(traceparentHeader) {
        return getInstrumenter().parseTraceparentHeader(traceparentHeader);
    }
    /**
     * Creates a set of request headers to propagate tracing information to a backend.
     *
     * @param tracingContext - The context containing the span to serialize.
     * @returns The set of headers to add to a request.
     */
    function createRequestHeaders(tracingContext) {
        return getInstrumenter().createRequestHeaders(tracingContext);
    }
    return {
        startSpan,
        withSpan,
        withContext,
        parseTraceparentHeader,
        createRequestHeaders,
    };
}
//# sourceMappingURL=tracingClient.js.map