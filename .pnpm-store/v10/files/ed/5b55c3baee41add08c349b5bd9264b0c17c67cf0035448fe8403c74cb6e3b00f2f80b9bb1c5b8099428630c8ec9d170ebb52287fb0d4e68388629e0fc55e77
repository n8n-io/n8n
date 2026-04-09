"use strict";
/*
 * Copyright 2020 gRPC authors.
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
exports.ChildLoadBalancerHandler = void 0;
const load_balancer_1 = require("./load-balancer");
const connectivity_state_1 = require("./connectivity-state");
const TYPE_NAME = 'child_load_balancer_helper';
class ChildLoadBalancerHandler {
    constructor(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
        this.currentChild = null;
        this.pendingChild = null;
        this.latestConfig = null;
        this.ChildPolicyHelper = class {
            constructor(parent) {
                this.parent = parent;
                this.child = null;
            }
            createSubchannel(subchannelAddress, subchannelArgs) {
                return this.parent.channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
            }
            updateState(connectivityState, picker, errorMessage) {
                var _a;
                if (this.calledByPendingChild()) {
                    if (connectivityState === connectivity_state_1.ConnectivityState.CONNECTING) {
                        return;
                    }
                    (_a = this.parent.currentChild) === null || _a === void 0 ? void 0 : _a.destroy();
                    this.parent.currentChild = this.parent.pendingChild;
                    this.parent.pendingChild = null;
                }
                else if (!this.calledByCurrentChild()) {
                    return;
                }
                this.parent.channelControlHelper.updateState(connectivityState, picker, errorMessage);
            }
            requestReresolution() {
                var _a;
                const latestChild = (_a = this.parent.pendingChild) !== null && _a !== void 0 ? _a : this.parent.currentChild;
                if (this.child === latestChild) {
                    this.parent.channelControlHelper.requestReresolution();
                }
            }
            setChild(newChild) {
                this.child = newChild;
            }
            addChannelzChild(child) {
                this.parent.channelControlHelper.addChannelzChild(child);
            }
            removeChannelzChild(child) {
                this.parent.channelControlHelper.removeChannelzChild(child);
            }
            calledByPendingChild() {
                return this.child === this.parent.pendingChild;
            }
            calledByCurrentChild() {
                return this.child === this.parent.currentChild;
            }
        };
    }
    configUpdateRequiresNewPolicyInstance(oldConfig, newConfig) {
        return oldConfig.getLoadBalancerName() !== newConfig.getLoadBalancerName();
    }
    /**
     * Prerequisites: lbConfig !== null and lbConfig.name is registered
     * @param endpointList
     * @param lbConfig
     * @param attributes
     */
    updateAddressList(endpointList, lbConfig, options, resolutionNote) {
        let childToUpdate;
        if (this.currentChild === null ||
            this.latestConfig === null ||
            this.configUpdateRequiresNewPolicyInstance(this.latestConfig, lbConfig)) {
            const newHelper = new this.ChildPolicyHelper(this);
            const newChild = (0, load_balancer_1.createLoadBalancer)(lbConfig, newHelper);
            newHelper.setChild(newChild);
            if (this.currentChild === null) {
                this.currentChild = newChild;
                childToUpdate = this.currentChild;
            }
            else {
                if (this.pendingChild) {
                    this.pendingChild.destroy();
                }
                this.pendingChild = newChild;
                childToUpdate = this.pendingChild;
            }
        }
        else {
            if (this.pendingChild === null) {
                childToUpdate = this.currentChild;
            }
            else {
                childToUpdate = this.pendingChild;
            }
        }
        this.latestConfig = lbConfig;
        return childToUpdate.updateAddressList(endpointList, lbConfig, options, resolutionNote);
    }
    exitIdle() {
        if (this.currentChild) {
            this.currentChild.exitIdle();
            if (this.pendingChild) {
                this.pendingChild.exitIdle();
            }
        }
    }
    resetBackoff() {
        if (this.currentChild) {
            this.currentChild.resetBackoff();
            if (this.pendingChild) {
                this.pendingChild.resetBackoff();
            }
        }
    }
    destroy() {
        /* Note: state updates are only propagated from the child balancer if that
         * object is equal to this.currentChild or this.pendingChild. Since this
         * function sets both of those to null, no further state updates will
         * occur after this function returns. */
        if (this.currentChild) {
            this.currentChild.destroy();
            this.currentChild = null;
        }
        if (this.pendingChild) {
            this.pendingChild.destroy();
            this.pendingChild = null;
        }
    }
    getTypeName() {
        return TYPE_NAME;
    }
}
exports.ChildLoadBalancerHandler = ChildLoadBalancerHandler;
//# sourceMappingURL=load-balancer-child-handler.js.map