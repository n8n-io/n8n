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

import {
  LoadBalancer,
  ChannelControlHelper,
  TypedLoadBalancingConfig,
  registerLoadBalancerType,
  createChildChannelControlHelper,
} from './load-balancer';
import { ConnectivityState } from './connectivity-state';
import {
  QueuePicker,
  Picker,
  PickArgs,
  UnavailablePicker,
  PickResult,
} from './picker';
import * as logging from './logging';
import { LogVerbosity } from './constants';
import {
  Endpoint,
  endpointEqual,
  endpointToString,
} from './subchannel-address';
import { LeafLoadBalancer } from './load-balancer-pick-first';
import { ChannelOptions } from './channel-options';
import { StatusOr } from './call-interface';

const TRACER_NAME = 'round_robin';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

const TYPE_NAME = 'round_robin';

class RoundRobinLoadBalancingConfig implements TypedLoadBalancingConfig {
  getLoadBalancerName(): string {
    return TYPE_NAME;
  }

  constructor() {}

  toJsonObject(): object {
    return {
      [TYPE_NAME]: {},
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static createFromJson(obj: any) {
    return new RoundRobinLoadBalancingConfig();
  }
}

class RoundRobinPicker implements Picker {
  constructor(
    private readonly children: { endpoint: Endpoint; picker: Picker }[],
    private nextIndex = 0
  ) {}

  pick(pickArgs: PickArgs): PickResult {
    const childPicker = this.children[this.nextIndex].picker;
    this.nextIndex = (this.nextIndex + 1) % this.children.length;
    return childPicker.pick(pickArgs);
  }

  /**
   * Check what the next subchannel returned would be. Used by the load
   * balancer implementation to preserve this part of the picker state if
   * possible when a subchannel connects or disconnects.
   */
  peekNextEndpoint(): Endpoint {
    return this.children[this.nextIndex].endpoint;
  }
}

function rotateArray<T>(list: T[], startIndex: number) {
  return [...list.slice(startIndex), ...list.slice(0, startIndex)];
}

export class RoundRobinLoadBalancer implements LoadBalancer {
  private children: LeafLoadBalancer[] = [];

  private currentState: ConnectivityState = ConnectivityState.IDLE;

  private currentReadyPicker: RoundRobinPicker | null = null;

  private updatesPaused = false;

  private childChannelControlHelper: ChannelControlHelper;

  private lastError: string | null = null;

  constructor(
    private readonly channelControlHelper: ChannelControlHelper
  ) {
    this.childChannelControlHelper = createChildChannelControlHelper(
      channelControlHelper,
      {
        updateState: (connectivityState, picker, errorMessage) => {
          /* Ensure that name resolution is requested again after active
           * connections are dropped. This is more aggressive than necessary to
           * accomplish that, so we are counting on resolvers to have
           * reasonable rate limits. */
          if (this.currentState === ConnectivityState.READY && connectivityState !== ConnectivityState.READY) {
            this.channelControlHelper.requestReresolution();
          }
          if (errorMessage) {
            this.lastError = errorMessage;
          }
          this.calculateAndUpdateState();
        },
      }
    );
  }

  private countChildrenWithState(state: ConnectivityState) {
    return this.children.filter(child => child.getConnectivityState() === state)
      .length;
  }

  private calculateAndUpdateState() {
    if (this.updatesPaused) {
      return;
    }
    if (this.countChildrenWithState(ConnectivityState.READY) > 0) {
      const readyChildren = this.children.filter(
        child => child.getConnectivityState() === ConnectivityState.READY
      );
      let index = 0;
      if (this.currentReadyPicker !== null) {
        const nextPickedEndpoint = this.currentReadyPicker.peekNextEndpoint();
        index = readyChildren.findIndex(child =>
          endpointEqual(child.getEndpoint(), nextPickedEndpoint)
        );
        if (index < 0) {
          index = 0;
        }
      }
      this.updateState(
        ConnectivityState.READY,
        new RoundRobinPicker(
          readyChildren.map(child => ({
            endpoint: child.getEndpoint(),
            picker: child.getPicker(),
          })),
          index
        ),
        null
      );
    } else if (this.countChildrenWithState(ConnectivityState.CONNECTING) > 0) {
      this.updateState(ConnectivityState.CONNECTING, new QueuePicker(this), null);
    } else if (
      this.countChildrenWithState(ConnectivityState.TRANSIENT_FAILURE) > 0
    ) {
      const errorMessage = `round_robin: No connection established. Last error: ${this.lastError}`;
      this.updateState(
        ConnectivityState.TRANSIENT_FAILURE,
        new UnavailablePicker({
          details: errorMessage,
        }),
        errorMessage
      );
    } else {
      this.updateState(ConnectivityState.IDLE, new QueuePicker(this), null);
    }
    /* round_robin should keep all children connected, this is how we do that.
     * We can't do this more efficiently in the individual child's updateState
     * callback because that doesn't have a reference to which child the state
     * change is associated with. */
    for (const child of this.children) {
      if (child.getConnectivityState() === ConnectivityState.IDLE) {
        child.exitIdle();
      }
    }
  }

  private updateState(newState: ConnectivityState, picker: Picker, errorMessage: string | null) {
    trace(
      ConnectivityState[this.currentState] +
        ' -> ' +
        ConnectivityState[newState]
    );
    if (newState === ConnectivityState.READY) {
      this.currentReadyPicker = picker as RoundRobinPicker;
    } else {
      this.currentReadyPicker = null;
    }
    this.currentState = newState;
    this.channelControlHelper.updateState(newState, picker, errorMessage);
  }

  private resetSubchannelList() {
    for (const child of this.children) {
      child.destroy();
    }
    this.children = [];
  }

  updateAddressList(
    maybeEndpointList: StatusOr<Endpoint[]>,
    lbConfig: TypedLoadBalancingConfig,
    options: ChannelOptions,
    resolutionNote: string
  ): boolean {
    if (!(lbConfig instanceof RoundRobinLoadBalancingConfig)) {
      return false;
    }
    if (!maybeEndpointList.ok) {
      if (this.children.length === 0) {
        this.updateState(
          ConnectivityState.TRANSIENT_FAILURE,
          new UnavailablePicker(maybeEndpointList.error),
          maybeEndpointList.error.details
        );
      }
      return true;
    }
    const startIndex = (Math.random() * maybeEndpointList.value.length) | 0;
    const endpointList = rotateArray(maybeEndpointList.value, startIndex);
    this.resetSubchannelList();
    if (endpointList.length === 0) {
      const errorMessage = `No addresses resolved. Resolution note: ${resolutionNote}`;
      this.updateState(
        ConnectivityState.TRANSIENT_FAILURE,
        new UnavailablePicker({details: errorMessage}),
        errorMessage
      );
    }
    trace('Connect to endpoint list ' + endpointList.map(endpointToString));
    this.updatesPaused = true;
    this.children = endpointList.map(
      endpoint =>
        new LeafLoadBalancer(
          endpoint,
          this.childChannelControlHelper,
          options,
          resolutionNote
        )
    );
    for (const child of this.children) {
      child.startConnecting();
    }
    this.updatesPaused = false;
    this.calculateAndUpdateState();
    return true;
  }

  exitIdle(): void {
    /* The round_robin LB policy is only in the IDLE state if it has no
     * addresses to try to connect to and it has no picked subchannel.
     * In that case, there is no meaningful action that can be taken here. */
  }
  resetBackoff(): void {
    // This LB policy has no backoff to reset
  }
  destroy(): void {
    this.resetSubchannelList();
  }
  getTypeName(): string {
    return TYPE_NAME;
  }
}

export function setup() {
  registerLoadBalancerType(
    TYPE_NAME,
    RoundRobinLoadBalancer,
    RoundRobinLoadBalancingConfig
  );
}
