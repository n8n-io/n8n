"use strict";
/*
 * Copyright 2019 gRPC authors.
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
exports.ChannelImplementation = void 0;
const channel_credentials_1 = require("./channel-credentials");
const internal_channel_1 = require("./internal-channel");
class ChannelImplementation {
    constructor(target, credentials, options) {
        if (typeof target !== 'string') {
            throw new TypeError('Channel target must be a string');
        }
        if (!(credentials instanceof channel_credentials_1.ChannelCredentials)) {
            throw new TypeError('Channel credentials must be a ChannelCredentials object');
        }
        if (options) {
            if (typeof options !== 'object') {
                throw new TypeError('Channel options must be an object');
            }
        }
        this.internalChannel = new internal_channel_1.InternalChannel(target, credentials, options);
    }
    close() {
        this.internalChannel.close();
    }
    getTarget() {
        return this.internalChannel.getTarget();
    }
    getConnectivityState(tryToConnect) {
        return this.internalChannel.getConnectivityState(tryToConnect);
    }
    watchConnectivityState(currentState, deadline, callback) {
        this.internalChannel.watchConnectivityState(currentState, deadline, callback);
    }
    /**
     * Get the channelz reference object for this channel. The returned value is
     * garbage if channelz is disabled for this channel.
     * @returns
     */
    getChannelzRef() {
        return this.internalChannel.getChannelzRef();
    }
    createCall(method, deadline, host, parentCall, propagateFlags) {
        if (typeof method !== 'string') {
            throw new TypeError('Channel#createCall: method must be a string');
        }
        if (!(typeof deadline === 'number' || deadline instanceof Date)) {
            throw new TypeError('Channel#createCall: deadline must be a number or Date');
        }
        return this.internalChannel.createCall(method, deadline, host, parentCall, propagateFlags);
    }
}
exports.ChannelImplementation = ChannelImplementation;
//# sourceMappingURL=channel.js.map