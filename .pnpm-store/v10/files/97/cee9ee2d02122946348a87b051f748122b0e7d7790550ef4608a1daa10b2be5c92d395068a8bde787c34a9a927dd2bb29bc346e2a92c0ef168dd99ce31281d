"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLogRecordProcessor = void 0;
const core_1 = require("@opentelemetry/core");
/**
 * Implementation of the {@link LogRecordProcessor} that simply forwards all
 * received events to a list of {@link LogRecordProcessor}s.
 */
class MultiLogRecordProcessor {
    processors;
    forceFlushTimeoutMillis;
    constructor(processors, forceFlushTimeoutMillis) {
        this.processors = processors;
        this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
    }
    async forceFlush() {
        const timeout = this.forceFlushTimeoutMillis;
        await Promise.all(this.processors.map(processor => (0, core_1.callWithTimeout)(processor.forceFlush(), timeout)));
    }
    onEmit(logRecord, context) {
        this.processors.forEach(processors => processors.onEmit(logRecord, context));
    }
    async shutdown() {
        await Promise.all(this.processors.map(processor => processor.shutdown()));
    }
}
exports.MultiLogRecordProcessor = MultiLogRecordProcessor;
//# sourceMappingURL=MultiLogRecordProcessor.js.map