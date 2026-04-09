/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { createOtlpExportDelegate, } from './otlp-export-delegate';
import { createHttpExporterTransport } from './transport/http-exporter-transport';
import { createBoundedQueueExportPromiseHandler } from './bounded-queue-export-promise-handler';
import { createRetryingTransport } from './retrying-transport';
export function createOtlpHttpExportDelegate(options, serializer) {
    return createOtlpExportDelegate({
        transport: createRetryingTransport({
            transport: createHttpExporterTransport(options),
        }),
        serializer: serializer,
        promiseHandler: createBoundedQueueExportPromiseHandler(options),
    }, { timeout: options.timeoutMillis });
}
//# sourceMappingURL=otlp-http-export-delegate.js.map