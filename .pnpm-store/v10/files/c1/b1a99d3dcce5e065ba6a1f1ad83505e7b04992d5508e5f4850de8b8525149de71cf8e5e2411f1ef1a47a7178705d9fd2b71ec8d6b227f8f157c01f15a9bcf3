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
exports.BaseSubchannelWrapper = void 0;
class BaseSubchannelWrapper {
    constructor(child) {
        this.child = child;
        this.healthy = true;
        this.healthListeners = new Set();
        this.refcount = 0;
        this.dataWatchers = new Set();
        child.addHealthStateWatcher(childHealthy => {
            /* A change to the child health state only affects this wrapper's overall
             * health state if this wrapper is reporting healthy. */
            if (this.healthy) {
                this.updateHealthListeners();
            }
        });
    }
    updateHealthListeners() {
        for (const listener of this.healthListeners) {
            listener(this.isHealthy());
        }
    }
    getConnectivityState() {
        return this.child.getConnectivityState();
    }
    addConnectivityStateListener(listener) {
        this.child.addConnectivityStateListener(listener);
    }
    removeConnectivityStateListener(listener) {
        this.child.removeConnectivityStateListener(listener);
    }
    startConnecting() {
        this.child.startConnecting();
    }
    getAddress() {
        return this.child.getAddress();
    }
    throttleKeepalive(newKeepaliveTime) {
        this.child.throttleKeepalive(newKeepaliveTime);
    }
    ref() {
        this.child.ref();
        this.refcount += 1;
    }
    unref() {
        this.child.unref();
        this.refcount -= 1;
        if (this.refcount === 0) {
            this.destroy();
        }
    }
    destroy() {
        for (const watcher of this.dataWatchers) {
            watcher.destroy();
        }
    }
    getChannelzRef() {
        return this.child.getChannelzRef();
    }
    isHealthy() {
        return this.healthy && this.child.isHealthy();
    }
    addHealthStateWatcher(listener) {
        this.healthListeners.add(listener);
    }
    removeHealthStateWatcher(listener) {
        this.healthListeners.delete(listener);
    }
    addDataWatcher(dataWatcher) {
        dataWatcher.setSubchannel(this.getRealSubchannel());
        this.dataWatchers.add(dataWatcher);
    }
    setHealthy(healthy) {
        if (healthy !== this.healthy) {
            this.healthy = healthy;
            /* A change to this wrapper's health state only affects the overall
             * reported health state if the child is healthy. */
            if (this.child.isHealthy()) {
                this.updateHealthListeners();
            }
        }
    }
    getRealSubchannel() {
        return this.child.getRealSubchannel();
    }
    realSubchannelEquals(other) {
        return this.getRealSubchannel() === other.getRealSubchannel();
    }
    getCallCredentials() {
        return this.child.getCallCredentials();
    }
    getChannel() {
        return this.child.getChannel();
    }
}
exports.BaseSubchannelWrapper = BaseSubchannelWrapper;
//# sourceMappingURL=subchannel-interface.js.map