/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { callWithTimeout } from '@opentelemetry/core';
/**
 * Implementation of the {@link LogRecordProcessor} that simply forwards all
 * received events to a list of {@link LogRecordProcessor}s.
 */
export class MultiLogRecordProcessor {
    processors;
    forceFlushTimeoutMillis;
    constructor(processors, forceFlushTimeoutMillis) {
        this.processors = processors;
        this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
    }
    async forceFlush() {
        const timeout = this.forceFlushTimeoutMillis;
        await Promise.all(this.processors.map(processor => callWithTimeout(processor.forceFlush(), timeout)));
    }
    onEmit(logRecord, context) {
        this.processors.forEach(processors => processors.onEmit(logRecord, context));
    }
    async shutdown() {
        await Promise.all(this.processors.map(processor => processor.shutdown()));
    }
}
//# sourceMappingURL=MultiLogRecordProcessor.js.map