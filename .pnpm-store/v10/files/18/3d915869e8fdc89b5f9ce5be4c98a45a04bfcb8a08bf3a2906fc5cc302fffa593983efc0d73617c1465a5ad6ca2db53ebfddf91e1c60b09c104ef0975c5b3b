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
exports.SubchannelPool = void 0;
exports.getSubchannelPool = getSubchannelPool;
const channel_options_1 = require("./channel-options");
const subchannel_1 = require("./subchannel");
const subchannel_address_1 = require("./subchannel-address");
const uri_parser_1 = require("./uri-parser");
const transport_1 = require("./transport");
// 10 seconds in milliseconds. This value is arbitrary.
/**
 * The amount of time in between checks for dropping subchannels that have no
 * other references
 */
const REF_CHECK_INTERVAL = 10000;
class SubchannelPool {
    /**
     * A pool of subchannels use for making connections. Subchannels with the
     * exact same parameters will be reused.
     */
    constructor() {
        this.pool = Object.create(null);
        /**
         * A timer of a task performing a periodic subchannel cleanup.
         */
        this.cleanupTimer = null;
    }
    /**
     * Unrefs all unused subchannels and cancels the cleanup task if all
     * subchannels have been unrefed.
     */
    unrefUnusedSubchannels() {
        let allSubchannelsUnrefed = true;
        /* These objects are created with Object.create(null), so they do not
         * have a prototype, which means that for (... in ...) loops over them
         * do not need to be filtered */
        // eslint-disable-disable-next-line:forin
        for (const channelTarget in this.pool) {
            const subchannelObjArray = this.pool[channelTarget];
            const refedSubchannels = subchannelObjArray.filter(value => !value.subchannel.unrefIfOneRef());
            if (refedSubchannels.length > 0) {
                allSubchannelsUnrefed = false;
            }
            /* For each subchannel in the pool, try to unref it if it has
             * exactly one ref (which is the ref from the pool itself). If that
             * does happen, remove the subchannel from the pool */
            this.pool[channelTarget] = refedSubchannels;
        }
        /* Currently we do not delete keys with empty values. If that results
         * in significant memory usage we should change it. */
        // Cancel the cleanup task if all subchannels have been unrefed.
        if (allSubchannelsUnrefed && this.cleanupTimer !== null) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    /**
     * Ensures that the cleanup task is spawned.
     */
    ensureCleanupTask() {
        var _a, _b;
        if (this.cleanupTimer === null) {
            this.cleanupTimer = setInterval(() => {
                this.unrefUnusedSubchannels();
            }, REF_CHECK_INTERVAL);
            // Unref because this timer should not keep the event loop running.
            // Call unref only if it exists to address electron/electron#21162
            (_b = (_a = this.cleanupTimer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
    }
    /**
     * Get a subchannel if one already exists with exactly matching parameters.
     * Otherwise, create and save a subchannel with those parameters.
     * @param channelTarget
     * @param subchannelTarget
     * @param channelArguments
     * @param channelCredentials
     */
    getOrCreateSubchannel(channelTargetUri, subchannelTarget, channelArguments, channelCredentials) {
        this.ensureCleanupTask();
        const channelTarget = (0, uri_parser_1.uriToString)(channelTargetUri);
        if (channelTarget in this.pool) {
            const subchannelObjArray = this.pool[channelTarget];
            for (const subchannelObj of subchannelObjArray) {
                if ((0, subchannel_address_1.subchannelAddressEqual)(subchannelTarget, subchannelObj.subchannelAddress) &&
                    (0, channel_options_1.channelOptionsEqual)(channelArguments, subchannelObj.channelArguments) &&
                    channelCredentials._equals(subchannelObj.channelCredentials)) {
                    return subchannelObj.subchannel;
                }
            }
        }
        // If we get here, no matching subchannel was found
        const subchannel = new subchannel_1.Subchannel(channelTargetUri, subchannelTarget, channelArguments, channelCredentials, new transport_1.Http2SubchannelConnector(channelTargetUri));
        if (!(channelTarget in this.pool)) {
            this.pool[channelTarget] = [];
        }
        this.pool[channelTarget].push({
            subchannelAddress: subchannelTarget,
            channelArguments,
            channelCredentials,
            subchannel,
        });
        subchannel.ref();
        return subchannel;
    }
}
exports.SubchannelPool = SubchannelPool;
const globalSubchannelPool = new SubchannelPool();
/**
 * Get either the global subchannel pool, or a new subchannel pool.
 * @param global
 */
function getSubchannelPool(global) {
    if (global) {
        return globalSubchannelPool;
    }
    else {
        return new SubchannelPool();
    }
}
//# sourceMappingURL=subchannel-pool.js.map