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

import { StatusObject } from './call-interface';
import { Metadata } from './metadata';
import { Status } from './constants';
import { LoadBalancer } from './load-balancer';
import { SubchannelInterface } from './subchannel-interface';

export enum PickResultType {
  COMPLETE,
  QUEUE,
  TRANSIENT_FAILURE,
  DROP,
}

export type OnCallEnded = (statusCode: Status, details: string, metadata: Metadata) => void;

export interface PickResult {
  pickResultType: PickResultType;
  /**
   * The subchannel to use as the transport for the call. Only meaningful if
   * `pickResultType` is COMPLETE. If null, indicates that the call should be
   * dropped.
   */
  subchannel: SubchannelInterface | null;
  /**
   * The status object to end the call with. Populated if and only if
   * `pickResultType` is TRANSIENT_FAILURE.
   */
  status: StatusObject | null;
  onCallStarted: (() => void) | null;
  onCallEnded: OnCallEnded | null;
}

export interface CompletePickResult extends PickResult {
  pickResultType: PickResultType.COMPLETE;
  subchannel: SubchannelInterface | null;
  status: null;
  onCallStarted: (() => void) | null;
  onCallEnded: OnCallEnded | null;
}

export interface QueuePickResult extends PickResult {
  pickResultType: PickResultType.QUEUE;
  subchannel: null;
  status: null;
  onCallStarted: null;
  onCallEnded: null;
}

export interface TransientFailurePickResult extends PickResult {
  pickResultType: PickResultType.TRANSIENT_FAILURE;
  subchannel: null;
  status: StatusObject;
  onCallStarted: null;
  onCallEnded: null;
}

export interface DropCallPickResult extends PickResult {
  pickResultType: PickResultType.DROP;
  subchannel: null;
  status: StatusObject;
  onCallStarted: null;
  onCallEnded: null;
}

export interface PickArgs {
  metadata: Metadata;
  extraPickInfo: { [key: string]: string };
}

/**
 * A proxy object representing the momentary state of a load balancer. Picks
 * subchannels or returns other information based on that state. Should be
 * replaced every time the load balancer changes state.
 */
export interface Picker {
  pick(pickArgs: PickArgs): PickResult;
}

/**
 * A standard picker representing a load balancer in the TRANSIENT_FAILURE
 * state. Always responds to every pick request with an UNAVAILABLE status.
 */
export class UnavailablePicker implements Picker {
  private status: StatusObject;
  constructor(status?: Partial<StatusObject>) {
    this.status = {
      code: Status.UNAVAILABLE,
      details: 'No connection established',
      metadata: new Metadata(),
      ...status,
    };
  }
  pick(pickArgs: PickArgs): TransientFailurePickResult {
    return {
      pickResultType: PickResultType.TRANSIENT_FAILURE,
      subchannel: null,
      status: this.status,
      onCallStarted: null,
      onCallEnded: null,
    };
  }
}

/**
 * A standard picker representing a load balancer in the IDLE or CONNECTING
 * state. Always responds to every pick request with a QUEUE pick result
 * indicating that the pick should be tried again with the next `Picker`. Also
 * reports back to the load balancer that a connection should be established
 * once any pick is attempted.
 * If the childPicker is provided, delegate to it instead of returning the
 * hardcoded QUEUE pick result, but still calls exitIdle.
 */
export class QueuePicker {
  private calledExitIdle = false;
  // Constructed with a load balancer. Calls exitIdle on it the first time pick is called
  constructor(
    private loadBalancer: LoadBalancer,
    private childPicker?: Picker
  ) {}

  pick(pickArgs: PickArgs): PickResult {
    if (!this.calledExitIdle) {
      process.nextTick(() => {
        this.loadBalancer.exitIdle();
      });
      this.calledExitIdle = true;
    }
    if (this.childPicker) {
      return this.childPicker.pick(pickArgs);
    } else {
      return {
        pickResultType: PickResultType.QUEUE,
        subchannel: null,
        status: null,
        onCallStarted: null,
        onCallEnded: null,
      };
    }
  }
}
