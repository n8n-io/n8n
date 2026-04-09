"use strict";
/*
 * Copyright 2022 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterceptingListenerImpl = void 0;
exports.statusOrFromValue = statusOrFromValue;
exports.statusOrFromError = statusOrFromError;
exports.isInterceptingListener = isInterceptingListener;
const metadata_1 = require("./metadata");
function statusOrFromValue(value) {
    return {
        ok: true,
        value: value
    };
}
function statusOrFromError(error) {
    var _a;
    return {
        ok: false,
        error: Object.assign(Object.assign({}, error), { metadata: (_a = error.metadata) !== null && _a !== void 0 ? _a : new metadata_1.Metadata() })
    };
}
function isInterceptingListener(listener) {
    return (listener.onReceiveMetadata !== undefined &&
        listener.onReceiveMetadata.length === 1);
}
class InterceptingListenerImpl {
    constructor(listener, nextListener) {
        this.listener = listener;
        this.nextListener = nextListener;
        this.processingMetadata = false;
        this.hasPendingMessage = false;
        this.processingMessage = false;
        this.pendingStatus = null;
    }
    processPendingMessage() {
        if (this.hasPendingMessage) {
            this.nextListener.onReceiveMessage(this.pendingMessage);
            this.pendingMessage = null;
            this.hasPendingMessage = false;
        }
    }
    processPendingStatus() {
        if (this.pendingStatus) {
            this.nextListener.onReceiveStatus(this.pendingStatus);
        }
    }
    onReceiveMetadata(metadata) {
        this.processingMetadata = true;
        this.listener.onReceiveMetadata(metadata, metadata => {
            this.processingMetadata = false;
            this.nextListener.onReceiveMetadata(metadata);
            this.processPendingMessage();
            this.processPendingStatus();
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReceiveMessage(message) {
        /* If this listener processes messages asynchronously, the last message may
         * be reordered with respect to the status */
        this.processingMessage = true;
        this.listener.onReceiveMessage(message, msg => {
            this.processingMessage = false;
            if (this.processingMetadata) {
                this.pendingMessage = msg;
                this.hasPendingMessage = true;
            }
            else {
                this.nextListener.onReceiveMessage(msg);
                this.processPendingStatus();
            }
        });
    }
    onReceiveStatus(status) {
        this.listener.onReceiveStatus(status, processedStatus => {
            if (this.processingMetadata || this.processingMessage) {
                this.pendingStatus = processedStatus;
            }
            else {
                this.nextListener.onReceiveStatus(processedStatus);
            }
        });
    }
}
exports.InterceptingListenerImpl = InterceptingListenerImpl;
//# sourceMappingURL=call-interface.js.map