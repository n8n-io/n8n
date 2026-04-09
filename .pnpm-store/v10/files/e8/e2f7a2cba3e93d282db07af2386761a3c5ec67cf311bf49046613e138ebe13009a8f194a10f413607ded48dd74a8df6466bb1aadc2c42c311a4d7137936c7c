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

import { ChannelCredentials, SecureConnector } from './channel-credentials';
import { Metadata } from './metadata';
import { ChannelOptions } from './channel-options';
import { ConnectivityState } from './connectivity-state';
import { BackoffTimeout, BackoffOptions } from './backoff-timeout';
import * as logging from './logging';
import { LogVerbosity, Status } from './constants';
import { GrpcUri, uriToString } from './uri-parser';
import {
  SubchannelAddress,
  subchannelAddressToString,
} from './subchannel-address';
import {
  SubchannelRef,
  ChannelzTrace,
  ChannelzChildrenTracker,
  ChannelzChildrenTrackerStub,
  SubchannelInfo,
  registerChannelzSubchannel,
  ChannelzCallTracker,
  ChannelzCallTrackerStub,
  unregisterChannelzRef,
  ChannelzTraceStub,
} from './channelz';
import {
  ConnectivityStateListener,
  DataWatcher,
  SubchannelInterface,
} from './subchannel-interface';
import { SubchannelCallInterceptingListener } from './subchannel-call';
import { SubchannelCall } from './subchannel-call';
import { CallEventTracker, SubchannelConnector, Transport } from './transport';
import { CallCredentials } from './call-credentials';
import { SingleSubchannelChannel } from './single-subchannel-channel';
import { Channel } from './channel';

const TRACER_NAME = 'subchannel';

/* setInterval and setTimeout only accept signed 32 bit integers. JS doesn't
 * have a constant for the max signed 32 bit integer, so this is a simple way
 * to calculate it */
const KEEPALIVE_MAX_TIME_MS = ~(1 << 31);

export interface DataProducer {
  addDataWatcher(dataWatcher: DataWatcher): void;
  removeDataWatcher(dataWatcher: DataWatcher): void;
}

export class Subchannel implements SubchannelInterface {
  /**
   * The subchannel's current connectivity state. Invariant: `session` === `null`
   * if and only if `connectivityState` is IDLE or TRANSIENT_FAILURE.
   */
  private connectivityState: ConnectivityState = ConnectivityState.IDLE;
  /**
   * The underlying http2 session used to make requests.
   */
  private transport: Transport | null = null;
  /**
   * Indicates that the subchannel should transition from TRANSIENT_FAILURE to
   * CONNECTING instead of IDLE when the backoff timeout ends.
   */
  private continueConnecting = false;
  /**
   * A list of listener functions that will be called whenever the connectivity
   * state changes. Will be modified by `addConnectivityStateListener` and
   * `removeConnectivityStateListener`
   */
  private stateListeners: Set<ConnectivityStateListener> = new Set();

  private backoffTimeout: BackoffTimeout;

  private keepaliveTime: number;
  /**
   * Tracks channels and subchannel pools with references to this subchannel
   */
  private refcount = 0;

  /**
   * A string representation of the subchannel address, for logging/tracing
   */
  private subchannelAddressString: string;

  // Channelz info
  private readonly channelzEnabled: boolean = true;
  private channelzRef: SubchannelRef;

  private channelzTrace: ChannelzTrace | ChannelzTraceStub;
  private callTracker: ChannelzCallTracker | ChannelzCallTrackerStub;
  private childrenTracker:
    | ChannelzChildrenTracker
    | ChannelzChildrenTrackerStub;

  // Channelz socket info
  private streamTracker: ChannelzCallTracker | ChannelzCallTrackerStub;

  private secureConnector: SecureConnector;

  private dataProducers: Map<string, DataProducer> = new Map();

  private subchannelChannel: Channel | null = null;

  /**
   * A class representing a connection to a single backend.
   * @param channelTarget The target string for the channel as a whole
   * @param subchannelAddress The address for the backend that this subchannel
   *     will connect to
   * @param options The channel options, plus any specific subchannel options
   *     for this subchannel
   * @param credentials The channel credentials used to establish this
   *     connection
   */
  constructor(
    private channelTarget: GrpcUri,
    private subchannelAddress: SubchannelAddress,
    private options: ChannelOptions,
    credentials: ChannelCredentials,
    private connector: SubchannelConnector
  ) {
    const backoffOptions: BackoffOptions = {
      initialDelay: options['grpc.initial_reconnect_backoff_ms'],
      maxDelay: options['grpc.max_reconnect_backoff_ms'],
    };
    this.backoffTimeout = new BackoffTimeout(() => {
      this.handleBackoffTimer();
    }, backoffOptions);
    this.backoffTimeout.unref();
    this.subchannelAddressString = subchannelAddressToString(subchannelAddress);

    this.keepaliveTime = options['grpc.keepalive_time_ms'] ?? -1;

    if (options['grpc.enable_channelz'] === 0) {
      this.channelzEnabled = false;
      this.channelzTrace = new ChannelzTraceStub();
      this.callTracker = new ChannelzCallTrackerStub();
      this.childrenTracker = new ChannelzChildrenTrackerStub();
      this.streamTracker = new ChannelzCallTrackerStub();
    } else {
      this.channelzTrace = new ChannelzTrace();
      this.callTracker = new ChannelzCallTracker();
      this.childrenTracker = new ChannelzChildrenTracker();
      this.streamTracker = new ChannelzCallTracker();
    }

    this.channelzRef = registerChannelzSubchannel(
      this.subchannelAddressString,
      () => this.getChannelzInfo(),
      this.channelzEnabled
    );

    this.channelzTrace.addTrace('CT_INFO', 'Subchannel created');
    this.trace(
      'Subchannel constructed with options ' +
        JSON.stringify(options, undefined, 2)
    );
    this.secureConnector = credentials._createSecureConnector(channelTarget, options);
  }

  private getChannelzInfo(): SubchannelInfo {
    return {
      state: this.connectivityState,
      trace: this.channelzTrace,
      callTracker: this.callTracker,
      children: this.childrenTracker.getChildLists(),
      target: this.subchannelAddressString,
    };
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  private refTrace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      'subchannel_refcount',
      '(' +
        this.channelzRef.id +
        ') ' +
        this.subchannelAddressString +
        ' ' +
        text
    );
  }

  private handleBackoffTimer() {
    if (this.continueConnecting) {
      this.transitionToState(
        [ConnectivityState.TRANSIENT_FAILURE],
        ConnectivityState.CONNECTING
      );
    } else {
      this.transitionToState(
        [ConnectivityState.TRANSIENT_FAILURE],
        ConnectivityState.IDLE
      );
    }
  }

  /**
   * Start a backoff timer with the current nextBackoff timeout
   */
  private startBackoff() {
    this.backoffTimeout.runOnce();
  }

  private stopBackoff() {
    this.backoffTimeout.stop();
    this.backoffTimeout.reset();
  }

  private startConnectingInternal() {
    let options = this.options;
    if (options['grpc.keepalive_time_ms']) {
      const adjustedKeepaliveTime = Math.min(
        this.keepaliveTime,
        KEEPALIVE_MAX_TIME_MS
      );
      options = { ...options, 'grpc.keepalive_time_ms': adjustedKeepaliveTime };
    }
    this.connector
      .connect(this.subchannelAddress, this.secureConnector, options)
      .then(
        transport => {
          if (
            this.transitionToState(
              [ConnectivityState.CONNECTING],
              ConnectivityState.READY
            )
          ) {
            this.transport = transport;
            if (this.channelzEnabled) {
              this.childrenTracker.refChild(transport.getChannelzRef());
            }
            transport.addDisconnectListener(tooManyPings => {
              this.transitionToState(
                [ConnectivityState.READY],
                ConnectivityState.IDLE
              );
              if (tooManyPings && this.keepaliveTime > 0) {
                this.keepaliveTime *= 2;
                logging.log(
                  LogVerbosity.ERROR,
                  `Connection to ${uriToString(this.channelTarget)} at ${
                    this.subchannelAddressString
                  } rejected by server because of excess pings. Increasing ping interval to ${
                    this.keepaliveTime
                  } ms`
                );
              }
            });
          } else {
            /* If we can't transition from CONNECTING to READY here, we will
             * not be using this transport, so release its resources. */
            transport.shutdown();
          }
        },
        error => {
          this.transitionToState(
            [ConnectivityState.CONNECTING],
            ConnectivityState.TRANSIENT_FAILURE,
            `${error}`
          );
        }
      );
  }

  /**
   * Initiate a state transition from any element of oldStates to the new
   * state. If the current connectivityState is not in oldStates, do nothing.
   * @param oldStates The set of states to transition from
   * @param newState The state to transition to
   * @returns True if the state changed, false otherwise
   */
  private transitionToState(
    oldStates: ConnectivityState[],
    newState: ConnectivityState,
    errorMessage?: string
  ): boolean {
    if (oldStates.indexOf(this.connectivityState) === -1) {
      return false;
    }
    if (errorMessage) {
      this.trace(
        ConnectivityState[this.connectivityState] +
          ' -> ' +
          ConnectivityState[newState] +
          ' with error "' + errorMessage + '"'
      );

    } else {
      this.trace(
        ConnectivityState[this.connectivityState] +
          ' -> ' +
          ConnectivityState[newState]
      );
    }
    if (this.channelzEnabled) {
      this.channelzTrace.addTrace(
        'CT_INFO',
        'Connectivity state change to ' + ConnectivityState[newState]
      );
    }
    const previousState = this.connectivityState;
    this.connectivityState = newState;
    switch (newState) {
      case ConnectivityState.READY:
        this.stopBackoff();
        break;
      case ConnectivityState.CONNECTING:
        this.startBackoff();
        this.startConnectingInternal();
        this.continueConnecting = false;
        break;
      case ConnectivityState.TRANSIENT_FAILURE:
        if (this.channelzEnabled && this.transport) {
          this.childrenTracker.unrefChild(this.transport.getChannelzRef());
        }
        this.transport?.shutdown();
        this.transport = null;
        /* If the backoff timer has already ended by the time we get to the
         * TRANSIENT_FAILURE state, we want to immediately transition out of
         * TRANSIENT_FAILURE as though the backoff timer is ending right now */
        if (!this.backoffTimeout.isRunning()) {
          process.nextTick(() => {
            this.handleBackoffTimer();
          });
        }
        break;
      case ConnectivityState.IDLE:
        if (this.channelzEnabled && this.transport) {
          this.childrenTracker.unrefChild(this.transport.getChannelzRef());
        }
        this.transport?.shutdown();
        this.transport = null;
        break;
      default:
        throw new Error(`Invalid state: unknown ConnectivityState ${newState}`);
    }
    for (const listener of this.stateListeners) {
      listener(this, previousState, newState, this.keepaliveTime, errorMessage);
    }
    return true;
  }

  ref() {
    this.refTrace('refcount ' + this.refcount + ' -> ' + (this.refcount + 1));
    this.refcount += 1;
  }

  unref() {
    this.refTrace('refcount ' + this.refcount + ' -> ' + (this.refcount - 1));
    this.refcount -= 1;
    if (this.refcount === 0) {
      this.channelzTrace.addTrace('CT_INFO', 'Shutting down');
      unregisterChannelzRef(this.channelzRef);
      this.secureConnector.destroy();
      process.nextTick(() => {
        this.transitionToState(
          [ConnectivityState.CONNECTING, ConnectivityState.READY],
          ConnectivityState.IDLE
        );
      });
    }
  }

  unrefIfOneRef(): boolean {
    if (this.refcount === 1) {
      this.unref();
      return true;
    }
    return false;
  }

  createCall(
    metadata: Metadata,
    host: string,
    method: string,
    listener: SubchannelCallInterceptingListener
  ): SubchannelCall {
    if (!this.transport) {
      throw new Error('Cannot create call, subchannel not READY');
    }
    let statsTracker: Partial<CallEventTracker>;
    if (this.channelzEnabled) {
      this.callTracker.addCallStarted();
      this.streamTracker.addCallStarted();
      statsTracker = {
        onCallEnd: status => {
          if (status.code === Status.OK) {
            this.callTracker.addCallSucceeded();
          } else {
            this.callTracker.addCallFailed();
          }
        },
      };
    } else {
      statsTracker = {};
    }
    return this.transport.createCall(
      metadata,
      host,
      method,
      listener,
      statsTracker
    );
  }

  /**
   * If the subchannel is currently IDLE, start connecting and switch to the
   * CONNECTING state. If the subchannel is current in TRANSIENT_FAILURE,
   * the next time it would transition to IDLE, start connecting again instead.
   * Otherwise, do nothing.
   */
  startConnecting() {
    process.nextTick(() => {
      /* First, try to transition from IDLE to connecting. If that doesn't happen
       * because the state is not currently IDLE, check if it is
       * TRANSIENT_FAILURE, and if so indicate that it should go back to
       * connecting after the backoff timer ends. Otherwise do nothing */
      if (
        !this.transitionToState(
          [ConnectivityState.IDLE],
          ConnectivityState.CONNECTING
        )
      ) {
        if (this.connectivityState === ConnectivityState.TRANSIENT_FAILURE) {
          this.continueConnecting = true;
        }
      }
    });
  }

  /**
   * Get the subchannel's current connectivity state.
   */
  getConnectivityState() {
    return this.connectivityState;
  }

  /**
   * Add a listener function to be called whenever the subchannel's
   * connectivity state changes.
   * @param listener
   */
  addConnectivityStateListener(listener: ConnectivityStateListener) {
    this.stateListeners.add(listener);
  }

  /**
   * Remove a listener previously added with `addConnectivityStateListener`
   * @param listener A reference to a function previously passed to
   *     `addConnectivityStateListener`
   */
  removeConnectivityStateListener(listener: ConnectivityStateListener) {
    this.stateListeners.delete(listener);
  }

  /**
   * Reset the backoff timeout, and immediately start connecting if in backoff.
   */
  resetBackoff() {
    process.nextTick(() => {
      this.backoffTimeout.reset();
      this.transitionToState(
        [ConnectivityState.TRANSIENT_FAILURE],
        ConnectivityState.CONNECTING
      );
    });
  }

  getAddress(): string {
    return this.subchannelAddressString;
  }

  getChannelzRef(): SubchannelRef {
    return this.channelzRef;
  }

  isHealthy(): boolean {
    return true;
  }

  addHealthStateWatcher(listener: (healthy: boolean) => void): void {
    // Do nothing with the listener
  }

  removeHealthStateWatcher(listener: (healthy: boolean) => void): void {
    // Do nothing with the listener
  }

  getRealSubchannel(): this {
    return this;
  }

  realSubchannelEquals(other: SubchannelInterface): boolean {
    return other.getRealSubchannel() === this;
  }

  throttleKeepalive(newKeepaliveTime: number) {
    if (newKeepaliveTime > this.keepaliveTime) {
      this.keepaliveTime = newKeepaliveTime;
    }
  }
  getCallCredentials(): CallCredentials {
    return this.secureConnector.getCallCredentials();
  }

  getChannel(): Channel {
    if (!this.subchannelChannel) {
      this.subchannelChannel = new SingleSubchannelChannel(this, this.channelTarget, this.options);
    }
    return this.subchannelChannel;
  }

  addDataWatcher(dataWatcher: DataWatcher): void {
    throw new Error('Not implemented');
  }

  getOrCreateDataProducer(name: string, createDataProducer: (subchannel: Subchannel) => DataProducer): DataProducer {
    const existingProducer = this.dataProducers.get(name);
    if (existingProducer){
      return existingProducer;
    }
    const newProducer = createDataProducer(this);
    this.dataProducers.set(name, newProducer);
    return newProducer;
  }

  removeDataProducer(name: string) {
    this.dataProducers.delete(name);
  }
}
