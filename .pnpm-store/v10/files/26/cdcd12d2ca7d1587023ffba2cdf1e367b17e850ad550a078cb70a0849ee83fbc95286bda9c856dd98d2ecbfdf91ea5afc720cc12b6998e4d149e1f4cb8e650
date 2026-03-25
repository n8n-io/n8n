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

import { CallCredentials } from './call-credentials';
import type { SubchannelRef } from './channelz';
import { ConnectivityState } from './connectivity-state';
import { Subchannel } from './subchannel';

export type ConnectivityStateListener = (
  subchannel: SubchannelInterface,
  previousState: ConnectivityState,
  newState: ConnectivityState,
  keepaliveTime: number,
  errorMessage?: string
) => void;

export type HealthListener = (healthy: boolean) => void;

/**
 * This is an interface for load balancing policies to use to interact with
 * subchannels. This allows load balancing policies to wrap and unwrap
 * subchannels.
 *
 * Any load balancing policy that wraps subchannels must unwrap the subchannel
 * in the picker, so that other load balancing policies consistently have
 * access to their own wrapper objects.
 */
export interface SubchannelInterface {
  getConnectivityState(): ConnectivityState;
  addConnectivityStateListener(listener: ConnectivityStateListener): void;
  removeConnectivityStateListener(listener: ConnectivityStateListener): void;
  startConnecting(): void;
  getAddress(): string;
  throttleKeepalive(newKeepaliveTime: number): void;
  ref(): void;
  unref(): void;
  getChannelzRef(): SubchannelRef;
  isHealthy(): boolean;
  addHealthStateWatcher(listener: HealthListener): void;
  removeHealthStateWatcher(listener: HealthListener): void;
  /**
   * If this is a wrapper, return the wrapped subchannel, otherwise return this
   */
  getRealSubchannel(): Subchannel;
  /**
   * Returns true if this and other both proxy the same underlying subchannel.
   * Can be used instead of directly accessing getRealSubchannel to allow mocks
   * to avoid implementing getRealSubchannel
   */
  realSubchannelEquals(other: SubchannelInterface): boolean;
  /**
   * Get the call credentials associated with the channel credentials for this
   * subchannel.
   */
  getCallCredentials(): CallCredentials;
}

export abstract class BaseSubchannelWrapper implements SubchannelInterface {
  private healthy = true;
  private healthListeners: Set<HealthListener> = new Set();
  constructor(protected child: SubchannelInterface) {
    child.addHealthStateWatcher(childHealthy => {
      /* A change to the child health state only affects this wrapper's overall
       * health state if this wrapper is reporting healthy. */
      if (this.healthy) {
        this.updateHealthListeners();
      }
    });
  }

  private updateHealthListeners(): void {
    for (const listener of this.healthListeners) {
      listener(this.isHealthy());
    }
  }

  getConnectivityState(): ConnectivityState {
    return this.child.getConnectivityState();
  }
  addConnectivityStateListener(listener: ConnectivityStateListener): void {
    this.child.addConnectivityStateListener(listener);
  }
  removeConnectivityStateListener(listener: ConnectivityStateListener): void {
    this.child.removeConnectivityStateListener(listener);
  }
  startConnecting(): void {
    this.child.startConnecting();
  }
  getAddress(): string {
    return this.child.getAddress();
  }
  throttleKeepalive(newKeepaliveTime: number): void {
    this.child.throttleKeepalive(newKeepaliveTime);
  }
  ref(): void {
    this.child.ref();
  }
  unref(): void {
    this.child.unref();
  }
  getChannelzRef(): SubchannelRef {
    return this.child.getChannelzRef();
  }
  isHealthy(): boolean {
    return this.healthy && this.child.isHealthy();
  }
  addHealthStateWatcher(listener: HealthListener): void {
    this.healthListeners.add(listener);
  }
  removeHealthStateWatcher(listener: HealthListener): void {
    this.healthListeners.delete(listener);
  }
  protected setHealthy(healthy: boolean): void {
    if (healthy !== this.healthy) {
      this.healthy = healthy;
      /* A change to this wrapper's health state only affects the overall
       * reported health state if the child is healthy. */
      if (this.child.isHealthy()) {
        this.updateHealthListeners();
      }
    }
  }
  getRealSubchannel(): Subchannel {
    return this.child.getRealSubchannel();
  }
  realSubchannelEquals(other: SubchannelInterface): boolean {
    return this.getRealSubchannel() === other.getRealSubchannel();
  }
  getCallCredentials(): CallCredentials {
    return this.child.getCallCredentials();
  }
}
