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

import { ChannelCredentials } from './channel-credentials';
import { ChannelOptions } from './channel-options';
import { ServerSurfaceCall } from './server-call';

import { ConnectivityState } from './connectivity-state';
import type { ChannelRef } from './channelz';
import { Call } from './call-interface';
import { InternalChannel } from './internal-channel';
import { Deadline } from './deadline';

/**
 * An interface that represents a communication channel to a server specified
 * by a given address.
 */
export interface Channel {
  /**
   * Close the channel. This has the same functionality as the existing
   * grpc.Client.prototype.close
   */
  close(): void;
  /**
   * Return the target that this channel connects to
   */
  getTarget(): string;
  /**
   * Get the channel's current connectivity state. This method is here mainly
   * because it is in the existing internal Channel class, and there isn't
   * another good place to put it.
   * @param tryToConnect If true, the channel will start connecting if it is
   *     idle. Otherwise, idle channels will only start connecting when a
   *     call starts.
   */
  getConnectivityState(tryToConnect: boolean): ConnectivityState;
  /**
   * Watch for connectivity state changes. This is also here mainly because
   * it is in the existing external Channel class.
   * @param currentState The state to watch for transitions from. This should
   *     always be populated by calling getConnectivityState immediately
   *     before.
   * @param deadline A deadline for waiting for a state change
   * @param callback Called with no error when a state change, or with an
   *     error if the deadline passes without a state change.
   */
  watchConnectivityState(
    currentState: ConnectivityState,
    deadline: Date | number,
    callback: (error?: Error) => void
  ): void;
  /**
   * Get the channelz reference object for this channel. A request to the
   * channelz service for the id in this object will provide information
   * about this channel.
   */
  getChannelzRef(): ChannelRef;
  /**
   * Create a call object. Call is an opaque type that is used by the Client
   * class. This function is called by the gRPC library when starting a
   * request. Implementers should return an instance of Call that is returned
   * from calling createCall on an instance of the provided Channel class.
   * @param method The full method string to request.
   * @param deadline The call deadline
   * @param host A host string override for making the request
   * @param parentCall A server call to propagate some information from
   * @param propagateFlags A bitwise combination of elements of grpc.propagate
   *     that indicates what information to propagate from parentCall.
   */
  createCall(
    method: string,
    deadline: Deadline,
    host: string | null | undefined,
    parentCall: ServerSurfaceCall | null,
    propagateFlags: number | null | undefined
  ): Call;
}

export class ChannelImplementation implements Channel {
  private internalChannel: InternalChannel;

  constructor(
    target: string,
    credentials: ChannelCredentials,
    options: ChannelOptions
  ) {
    if (typeof target !== 'string') {
      throw new TypeError('Channel target must be a string');
    }
    if (!(credentials instanceof ChannelCredentials)) {
      throw new TypeError(
        'Channel credentials must be a ChannelCredentials object'
      );
    }
    if (options) {
      if (typeof options !== 'object') {
        throw new TypeError('Channel options must be an object');
      }
    }

    this.internalChannel = new InternalChannel(target, credentials, options);
  }

  close() {
    this.internalChannel.close();
  }

  getTarget() {
    return this.internalChannel.getTarget();
  }

  getConnectivityState(tryToConnect: boolean) {
    return this.internalChannel.getConnectivityState(tryToConnect);
  }

  watchConnectivityState(
    currentState: ConnectivityState,
    deadline: Date | number,
    callback: (error?: Error) => void
  ): void {
    this.internalChannel.watchConnectivityState(
      currentState,
      deadline,
      callback
    );
  }

  /**
   * Get the channelz reference object for this channel. The returned value is
   * garbage if channelz is disabled for this channel.
   * @returns
   */
  getChannelzRef() {
    return this.internalChannel.getChannelzRef();
  }

  createCall(
    method: string,
    deadline: Deadline,
    host: string | null | undefined,
    parentCall: ServerSurfaceCall | null,
    propagateFlags: number | null | undefined
  ): Call {
    if (typeof method !== 'string') {
      throw new TypeError('Channel#createCall: method must be a string');
    }
    if (!(typeof deadline === 'number' || deadline instanceof Date)) {
      throw new TypeError(
        'Channel#createCall: deadline must be a number or Date'
      );
    }
    return this.internalChannel.createCall(
      method,
      deadline,
      host,
      parentCall,
      propagateFlags
    );
  }
}
