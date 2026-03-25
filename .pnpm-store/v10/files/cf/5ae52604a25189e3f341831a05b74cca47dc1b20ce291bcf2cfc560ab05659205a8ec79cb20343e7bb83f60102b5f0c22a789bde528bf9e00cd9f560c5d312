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
import { NoopLogRecordProcessor } from '../export/NoopLogRecordProcessor';
import { MultiLogRecordProcessor } from '../MultiLogRecordProcessor';
export class LoggerProviderSharedState {
    resource;
    forceFlushTimeoutMillis;
    logRecordLimits;
    processors;
    loggers = new Map();
    activeProcessor;
    registeredLogRecordProcessors = [];
    constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors) {
        this.resource = resource;
        this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
        this.logRecordLimits = logRecordLimits;
        this.processors = processors;
        if (processors.length > 0) {
            this.registeredLogRecordProcessors = processors;
            this.activeProcessor = new MultiLogRecordProcessor(this.registeredLogRecordProcessors, this.forceFlushTimeoutMillis);
        }
        else {
            this.activeProcessor = new NoopLogRecordProcessor();
        }
    }
}
//# sourceMappingURL=LoggerProviderSharedState.js.map