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

import {
  LoadBalancer,
  ChannelControlHelper,
  TypedLoadBalancingConfig,
  createLoadBalancer,
} from './load-balancer';
import { Endpoint, SubchannelAddress } from './subchannel-address';
import { ChannelOptions } from './channel-options';
import { ConnectivityState } from './connectivity-state';
import { Picker } from './picker';
import type { ChannelRef, SubchannelRef } from './channelz';
import { SubchannelInterface } from './subchannel-interface';

const TYPE_NAME = 'child_load_balancer_helper';

export class ChildLoadBalancerHandler {
  private currentChild: LoadBalancer | null = null;
  private pendingChild: LoadBalancer | null = null;
  private latestConfig: TypedLoadBalancingConfig | null = null;

  private ChildPolicyHelper = class {
    private child: LoadBalancer | null = null;
    constructor(private parent: ChildLoadBalancerHandler) {}
    createSubchannel(
      subchannelAddress: SubchannelAddress,
      subchannelArgs: ChannelOptions
    ): SubchannelInterface {
      return this.parent.channelControlHelper.createSubchannel(
        subchannelAddress,
        subchannelArgs
      );
    }
    updateState(connectivityState: ConnectivityState, picker: Picker, errorMessage: string | null): void {
      if (this.calledByPendingChild()) {
        if (connectivityState === ConnectivityState.CONNECTING) {
          return;
        }
        this.parent.currentChild?.destroy();
        this.parent.currentChild = this.parent.pendingChild;
        this.parent.pendingChild = null;
      } else if (!this.calledByCurrentChild()) {
        return;
      }
      this.parent.channelControlHelper.updateState(connectivityState, picker, errorMessage);
    }
    requestReresolution(): void {
      const latestChild = this.parent.pendingChild ?? this.parent.currentChild;
      if (this.child === latestChild) {
        this.parent.channelControlHelper.requestReresolution();
      }
    }
    setChild(newChild: LoadBalancer) {
      this.child = newChild;
    }
    addChannelzChild(child: ChannelRef | SubchannelRef) {
      this.parent.channelControlHelper.addChannelzChild(child);
    }
    removeChannelzChild(child: ChannelRef | SubchannelRef) {
      this.parent.channelControlHelper.removeChannelzChild(child);
    }

    private calledByPendingChild(): boolean {
      return this.child === this.parent.pendingChild;
    }
    private calledByCurrentChild(): boolean {
      return this.child === this.parent.currentChild;
    }
  };

  constructor(
    private readonly channelControlHelper: ChannelControlHelper
  ) {}

  protected configUpdateRequiresNewPolicyInstance(
    oldConfig: TypedLoadBalancingConfig,
    newConfig: TypedLoadBalancingConfig
  ): boolean {
    return oldConfig.getLoadBalancerName() !== newConfig.getLoadBalancerName();
  }

  /**
   * Prerequisites: lbConfig !== null and lbConfig.name is registered
   * @param endpointList
   * @param lbConfig
   * @param attributes
   */
  updateAddressList(
    endpointList: Endpoint[],
    lbConfig: TypedLoadBalancingConfig,
    options: ChannelOptions
  ): void {
    let childToUpdate: LoadBalancer;
    if (
      this.currentChild === null ||
      this.latestConfig === null ||
      this.configUpdateRequiresNewPolicyInstance(this.latestConfig, lbConfig)
    ) {
      const newHelper = new this.ChildPolicyHelper(this);
      const newChild = createLoadBalancer(lbConfig, newHelper)!;
      newHelper.setChild(newChild);
      if (this.currentChild === null) {
        this.currentChild = newChild;
        childToUpdate = this.currentChild;
      } else {
        if (this.pendingChild) {
          this.pendingChild.destroy();
        }
        this.pendingChild = newChild;
        childToUpdate = this.pendingChild;
      }
    } else {
      if (this.pendingChild === null) {
        childToUpdate = this.currentChild;
      } else {
        childToUpdate = this.pendingChild;
      }
    }
    this.latestConfig = lbConfig;
    childToUpdate.updateAddressList(endpointList, lbConfig, options);
  }
  exitIdle(): void {
    if (this.currentChild) {
      this.currentChild.exitIdle();
      if (this.pendingChild) {
        this.pendingChild.exitIdle();
      }
    }
  }
  resetBackoff(): void {
    if (this.currentChild) {
      this.currentChild.resetBackoff();
      if (this.pendingChild) {
        this.pendingChild.resetBackoff();
      }
    }
  }
  destroy(): void {
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
  getTypeName(): string {
    return TYPE_NAME;
  }
}
