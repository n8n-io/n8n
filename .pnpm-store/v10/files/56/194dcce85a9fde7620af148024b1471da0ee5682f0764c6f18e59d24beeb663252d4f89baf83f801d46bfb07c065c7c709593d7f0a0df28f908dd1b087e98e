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
import { context } from '@opentelemetry/api';
import { LogRecord } from './LogRecord';
export class Logger {
    constructor(instrumentationScope, _sharedState) {
        this.instrumentationScope = instrumentationScope;
        this._sharedState = _sharedState;
    }
    emit(logRecord) {
        const currentContext = logRecord.context || context.active();
        /**
         * If a Logger was obtained with include_trace_context=true,
         * the LogRecords it emits MUST automatically include the Trace Context from the active Context,
         * if Context has not been explicitly set.
         */
        const logRecordInstance = new LogRecord(this._sharedState, this.instrumentationScope, Object.assign({ context: currentContext }, logRecord));
        /**
         * the explicitly passed Context,
         * the current Context, or an empty Context if the Logger was obtained with include_trace_context=false
         */
        this._sharedState.activeProcessor.onEmit(logRecordInstance, currentContext);
        /**
         * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
         * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
         */
        logRecordInstance._makeReadonly();
    }
}
//# sourceMappingURL=Logger.js.map