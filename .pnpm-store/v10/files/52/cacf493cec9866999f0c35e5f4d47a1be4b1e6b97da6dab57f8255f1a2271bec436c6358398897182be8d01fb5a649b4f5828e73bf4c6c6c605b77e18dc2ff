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
import { ResolvingLoadBalancer } from './resolving-load-balancer';
import { SubchannelPool, getSubchannelPool } from './subchannel-pool';
import { ChannelControlHelper } from './load-balancer';
import { UnavailablePicker, Picker, QueuePicker, PickArgs, PickResult, PickResultType } from './picker';
import { Metadata } from './metadata';
import { Status, LogVerbosity, Propagate } from './constants';
import { FilterStackFactory } from './filter-stack';
import { CompressionFilterFactory } from './compression-filter';
import {
  CallConfig,
  ConfigSelector,
  getDefaultAuthority,
  mapUriDefaultScheme,
} from './resolver';
import { trace, isTracerEnabled } from './logging';
import { SubchannelAddress } from './subchannel-address';
import { mapProxyName } from './http_proxy';
import { GrpcUri, parseUri, uriToString } from './uri-parser';
import { ServerSurfaceCall } from './server-call';

import { ConnectivityState } from './connectivity-state';
import {
  ChannelInfo,
  ChannelRef,
  ChannelzCallTracker,
  ChannelzChildrenTracker,
  ChannelzTrace,
  registerChannelzChannel,
  SubchannelRef,
  unregisterChannelzRef,
} from './channelz';
import { LoadBalancingCall } from './load-balancing-call';
import { CallCredentials } from './call-credentials';
import { Call, CallStreamOptions, StatusObject } from './call-interface';
import { Deadline, deadlineToString } from './deadline';
import { ResolvingCall } from './resolving-call';
import { getNextCallNumber } from './call-number';
import { restrictControlPlaneStatusCode } from './control-plane-status';
import {
  MessageBufferTracker,
  RetryingCall,
  RetryThrottler,
} from './retrying-call';
import {
  BaseSubchannelWrapper,
  ConnectivityStateListener,
  SubchannelInterface,
} from './subchannel-interface';

/**
 * See https://nodejs.org/api/timers.html#timers_setinterval_callback_delay_args
 */
const MAX_TIMEOUT_TIME = 2147483647;

const MIN_IDLE_TIMEOUT_MS = 1000;

// 30 minutes
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface ConnectivityStateWatcher {
  currentState: ConnectivityState;
  timer: NodeJS.Timeout | null;
  callback: (error?: Error) => void;
}

interface NoneConfigResult {
  type: 'NONE';
}

interface SuccessConfigResult {
  type: 'SUCCESS';
  config: CallConfig;
}

interface ErrorConfigResult {
  type: 'ERROR';
  error: StatusObject;
}

type GetConfigResult =
  | NoneConfigResult
  | SuccessConfigResult
  | ErrorConfigResult;

const RETRY_THROTTLER_MAP: Map<string, RetryThrottler> = new Map();

const DEFAULT_RETRY_BUFFER_SIZE_BYTES = 1 << 24; // 16 MB
const DEFAULT_PER_RPC_RETRY_BUFFER_SIZE_BYTES = 1 << 20; // 1 MB

class ChannelSubchannelWrapper
  extends BaseSubchannelWrapper
  implements SubchannelInterface
{
  private refCount = 0;
  private subchannelStateListener: ConnectivityStateListener;
  constructor(
    childSubchannel: SubchannelInterface,
    private channel: InternalChannel
  ) {
    super(childSubchannel);
    this.subchannelStateListener = (
      subchannel,
      previousState,
      newState,
      keepaliveTime
    ) => {
      channel.throttleKeepalive(keepaliveTime);
    };
  }

  ref(): void {
    if (this.refCount === 0) {
      this.child.addConnectivityStateListener(this.subchannelStateListener);
      this.channel.addWrappedSubchannel(this);
    }
    this.child.ref();
    this.refCount += 1;
  }

  unref(): void {
    this.child.unref();
    this.refCount -= 1;
    if (this.refCount <= 0) {
      this.child.removeConnectivityStateListener(this.subchannelStateListener);
      this.channel.removeWrappedSubchannel(this);
    }
  }
}

class ShutdownPicker implements Picker {
  pick(pickArgs: PickArgs): PickResult {
    return {
      pickResultType: PickResultType.DROP,
      status: {
        code: Status.UNAVAILABLE,
        details: 'Channel closed before call started',
        metadata: new Metadata()
      },
      subchannel: null,
      onCallStarted: null,
      onCallEnded: null
    }
  }
}

export const SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX = 'grpc.internal.no_subchannel';
class ChannelzInfoTracker {
  readonly trace = new ChannelzTrace();
  readonly callTracker = new ChannelzCallTracker();
  readonly childrenTracker = new ChannelzChildrenTracker();
  state: ConnectivityState = ConnectivityState.IDLE;
  constructor(private target: string) {}

  getChannelzInfoCallback(): () => ChannelInfo {
    return () => {
      return {
        target: this.target,
        state: this.state,
        trace: this.trace,
        callTracker: this.callTracker,
        children: this.childrenTracker.getChildLists()
      };
    };
  }
}

export class InternalChannel {
  private readonly resolvingLoadBalancer: ResolvingLoadBalancer;
  private readonly subchannelPool: SubchannelPool;
  private connectivityState: ConnectivityState = ConnectivityState.IDLE;
  private currentPicker: Picker = new UnavailablePicker();
  /**
   * Calls queued up to get a call config. Should only be populated before the
   * first time the resolver returns a result, which includes the ConfigSelector.
   */
  private configSelectionQueue: ResolvingCall[] = [];
  private pickQueue: LoadBalancingCall[] = [];
  private connectivityStateWatchers: ConnectivityStateWatcher[] = [];
  private readonly defaultAuthority: string;
  private readonly filterStackFactory: FilterStackFactory;
  private readonly target: GrpcUri;
  /**
   * This timer does not do anything on its own. Its purpose is to hold the
   * event loop open while there are any pending calls for the channel that
   * have not yet been assigned to specific subchannels. In other words,
   * the invariant is that callRefTimer is reffed if and only if pickQueue
   * is non-empty. In addition, the timer is null while the state is IDLE or
   * SHUTDOWN and there are no pending calls.
   */
  private callRefTimer: NodeJS.Timeout | null = null;
  private configSelector: ConfigSelector | null = null;
  /**
   * This is the error from the name resolver if it failed most recently. It
   * is only used to end calls that start while there is no config selector
   * and the name resolver is in backoff, so it should be nulled if
   * configSelector becomes set or the channel state becomes anything other
   * than TRANSIENT_FAILURE.
   */
  private currentResolutionError: StatusObject | null = null;
  private readonly retryBufferTracker: MessageBufferTracker;
  private keepaliveTime: number;
  private readonly wrappedSubchannels: Set<ChannelSubchannelWrapper> =
    new Set();

  private callCount = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly idleTimeoutMs: number;
  private lastActivityTimestamp: Date;

  // Channelz info
  private readonly channelzEnabled: boolean = true;
  private readonly channelzRef: ChannelRef;
  private readonly channelzInfoTracker: ChannelzInfoTracker;

  /**
   * Randomly generated ID to be passed to the config selector, for use by
   * ring_hash in xDS. An integer distributed approximately uniformly between
   * 0 and MAX_SAFE_INTEGER.
   */
  private readonly randomChannelId = Math.floor(
    Math.random() * Number.MAX_SAFE_INTEGER
  );

  constructor(
    target: string,
    private readonly credentials: ChannelCredentials,
    private readonly options: ChannelOptions
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
    this.channelzInfoTracker = new ChannelzInfoTracker(target);
    const originalTargetUri = parseUri(target);
    if (originalTargetUri === null) {
      throw new Error(`Could not parse target name "${target}"`);
    }
    /* This ensures that the target has a scheme that is registered with the
     * resolver */
    const defaultSchemeMapResult = mapUriDefaultScheme(originalTargetUri);
    if (defaultSchemeMapResult === null) {
      throw new Error(
        `Could not find a default scheme for target name "${target}"`
      );
    }

    if (this.options['grpc.enable_channelz'] === 0) {
      this.channelzEnabled = false;
    }

    this.channelzRef = registerChannelzChannel(
      target,
      this.channelzInfoTracker.getChannelzInfoCallback(),
      this.channelzEnabled
    );
    if (this.channelzEnabled) {
      this.channelzInfoTracker.trace.addTrace('CT_INFO', 'Channel created');
    }

    if (this.options['grpc.default_authority']) {
      this.defaultAuthority = this.options['grpc.default_authority'] as string;
    } else {
      this.defaultAuthority = getDefaultAuthority(defaultSchemeMapResult);
    }
    const proxyMapResult = mapProxyName(defaultSchemeMapResult, options);
    this.target = proxyMapResult.target;
    this.options = Object.assign({}, this.options, proxyMapResult.extraOptions);

    /* The global boolean parameter to getSubchannelPool has the inverse meaning to what
     * the grpc.use_local_subchannel_pool channel option means. */
    this.subchannelPool = getSubchannelPool(
      (this.options['grpc.use_local_subchannel_pool'] ?? 0) === 0
    );
    this.retryBufferTracker = new MessageBufferTracker(
      this.options['grpc.retry_buffer_size'] ?? DEFAULT_RETRY_BUFFER_SIZE_BYTES,
      this.options['grpc.per_rpc_retry_buffer_size'] ??
        DEFAULT_PER_RPC_RETRY_BUFFER_SIZE_BYTES
    );
    this.keepaliveTime = this.options['grpc.keepalive_time_ms'] ?? -1;
    this.idleTimeoutMs = Math.max(
      this.options['grpc.client_idle_timeout_ms'] ?? DEFAULT_IDLE_TIMEOUT_MS,
      MIN_IDLE_TIMEOUT_MS
    );
    const channelControlHelper: ChannelControlHelper = {
      createSubchannel: (
        subchannelAddress: SubchannelAddress,
        subchannelArgs: ChannelOptions
      ) => {
        const finalSubchannelArgs: ChannelOptions = {};
        for (const [key, value] of Object.entries(subchannelArgs)) {
          if (!key.startsWith(SUBCHANNEL_ARGS_EXCLUDE_KEY_PREFIX)) {
            finalSubchannelArgs[key] = value;
          }
        }
        const subchannel = this.subchannelPool.getOrCreateSubchannel(
          this.target,
          subchannelAddress,
          finalSubchannelArgs,
          this.credentials
        );
        subchannel.throttleKeepalive(this.keepaliveTime);
        if (this.channelzEnabled) {
          this.channelzInfoTracker.trace.addTrace(
            'CT_INFO',
            'Created subchannel or used existing subchannel',
            subchannel.getChannelzRef()
          );
        }
        const wrappedSubchannel = new ChannelSubchannelWrapper(
          subchannel,
          this
        );
        return wrappedSubchannel;
      },
      updateState: (connectivityState: ConnectivityState, picker: Picker) => {
        this.currentPicker = picker;
        const queueCopy = this.pickQueue.slice();
        this.pickQueue = [];
        if (queueCopy.length > 0) {
          this.callRefTimerUnref();
        }
        for (const call of queueCopy) {
          call.doPick();
        }
        this.updateState(connectivityState);
      },
      requestReresolution: () => {
        // This should never be called.
        throw new Error(
          'Resolving load balancer should never call requestReresolution'
        );
      },
      addChannelzChild: (child: ChannelRef | SubchannelRef) => {
        if (this.channelzEnabled) {
          this.channelzInfoTracker.childrenTracker.refChild(child);
        }
      },
      removeChannelzChild: (child: ChannelRef | SubchannelRef) => {
        if (this.channelzEnabled) {
          this.channelzInfoTracker.childrenTracker.unrefChild(child);
        }
      },
    };
    this.resolvingLoadBalancer = new ResolvingLoadBalancer(
      this.target,
      channelControlHelper,
      this.options,
      (serviceConfig, configSelector) => {
        if (serviceConfig.retryThrottling) {
          RETRY_THROTTLER_MAP.set(
            this.getTarget(),
            new RetryThrottler(
              serviceConfig.retryThrottling.maxTokens,
              serviceConfig.retryThrottling.tokenRatio,
              RETRY_THROTTLER_MAP.get(this.getTarget())
            )
          );
        } else {
          RETRY_THROTTLER_MAP.delete(this.getTarget());
        }
        if (this.channelzEnabled) {
          this.channelzInfoTracker.trace.addTrace(
            'CT_INFO',
            'Address resolution succeeded'
          );
        }
        this.configSelector?.unref();
        this.configSelector = configSelector;
        this.currentResolutionError = null;
        /* We process the queue asynchronously to ensure that the corresponding
         * load balancer update has completed. */
        process.nextTick(() => {
          const localQueue = this.configSelectionQueue;
          this.configSelectionQueue = [];
          if (localQueue.length > 0) {
            this.callRefTimerUnref();
          }
          for (const call of localQueue) {
            call.getConfig();
          }
        });
      },
      status => {
        if (this.channelzEnabled) {
          this.channelzInfoTracker.trace.addTrace(
            'CT_WARNING',
            'Address resolution failed with code ' +
              status.code +
              ' and details "' +
              status.details +
              '"'
          );
        }
        if (this.configSelectionQueue.length > 0) {
          this.trace(
            'Name resolution failed with calls queued for config selection'
          );
        }
        if (this.configSelector === null) {
          this.currentResolutionError = {
            ...restrictControlPlaneStatusCode(status.code, status.details),
            metadata: status.metadata,
          };
        }
        const localQueue = this.configSelectionQueue;
        this.configSelectionQueue = [];
        if (localQueue.length > 0) {
          this.callRefTimerUnref();
        }
        for (const call of localQueue) {
          call.reportResolverError(status);
        }
      }
    );
    this.filterStackFactory = new FilterStackFactory([
      new CompressionFilterFactory(this, this.options),
    ]);
    this.trace(
      'Channel constructed with options ' +
        JSON.stringify(options, undefined, 2)
    );
    const error = new Error();
    if (isTracerEnabled('channel_stacktrace')){
      trace(
        LogVerbosity.DEBUG,
        'channel_stacktrace',
        '(' +
          this.channelzRef.id +
          ') ' +
          'Channel constructed \n' +
          error.stack?.substring(error.stack.indexOf('\n') + 1)
      );
    }
    this.lastActivityTimestamp = new Date();
  }

  private trace(text: string, verbosityOverride?: LogVerbosity) {
    trace(
      verbosityOverride ?? LogVerbosity.DEBUG,
      'channel',
      '(' + this.channelzRef.id + ') ' + uriToString(this.target) + ' ' + text
    );
  }

  private callRefTimerRef() {
    if (!this.callRefTimer) {
      this.callRefTimer = setInterval(() => {}, MAX_TIMEOUT_TIME)
    }
    // If the hasRef function does not exist, always run the code
    if (!this.callRefTimer.hasRef?.()) {
      this.trace(
        'callRefTimer.ref | configSelectionQueue.length=' +
          this.configSelectionQueue.length +
          ' pickQueue.length=' +
          this.pickQueue.length
      );
      this.callRefTimer.ref?.();
    }
  }

  private callRefTimerUnref() {
    // If the timer or the hasRef function does not exist, always run the code
    if (!this.callRefTimer?.hasRef || this.callRefTimer.hasRef()) {
      this.trace(
        'callRefTimer.unref | configSelectionQueue.length=' +
          this.configSelectionQueue.length +
          ' pickQueue.length=' +
          this.pickQueue.length
      );
      this.callRefTimer?.unref?.();
    }
  }

  private removeConnectivityStateWatcher(
    watcherObject: ConnectivityStateWatcher
  ) {
    const watcherIndex = this.connectivityStateWatchers.findIndex(
      value => value === watcherObject
    );
    if (watcherIndex >= 0) {
      this.connectivityStateWatchers.splice(watcherIndex, 1);
    }
  }

  private updateState(newState: ConnectivityState): void {
    trace(
      LogVerbosity.DEBUG,
      'connectivity_state',
      '(' +
        this.channelzRef.id +
        ') ' +
        uriToString(this.target) +
        ' ' +
        ConnectivityState[this.connectivityState] +
        ' -> ' +
        ConnectivityState[newState]
    );
    if (this.channelzEnabled) {
      this.channelzInfoTracker.trace.addTrace(
        'CT_INFO',
        'Connectivity state change to ' + ConnectivityState[newState]
      );
    }
    this.connectivityState = newState;
    this.channelzInfoTracker.state = newState;
    const watchersCopy = this.connectivityStateWatchers.slice();
    for (const watcherObject of watchersCopy) {
      if (newState !== watcherObject.currentState) {
        if (watcherObject.timer) {
          clearTimeout(watcherObject.timer);
        }
        this.removeConnectivityStateWatcher(watcherObject);
        watcherObject.callback();
      }
    }
    if (newState !== ConnectivityState.TRANSIENT_FAILURE) {
      this.currentResolutionError = null;
    }
  }

  throttleKeepalive(newKeepaliveTime: number) {
    if (newKeepaliveTime > this.keepaliveTime) {
      this.keepaliveTime = newKeepaliveTime;
      for (const wrappedSubchannel of this.wrappedSubchannels) {
        wrappedSubchannel.throttleKeepalive(newKeepaliveTime);
      }
    }
  }

  addWrappedSubchannel(wrappedSubchannel: ChannelSubchannelWrapper) {
    this.wrappedSubchannels.add(wrappedSubchannel);
  }

  removeWrappedSubchannel(wrappedSubchannel: ChannelSubchannelWrapper) {
    this.wrappedSubchannels.delete(wrappedSubchannel);
  }

  doPick(metadata: Metadata, extraPickInfo: { [key: string]: string }) {
    return this.currentPicker.pick({
      metadata: metadata,
      extraPickInfo: extraPickInfo,
    });
  }

  queueCallForPick(call: LoadBalancingCall) {
    this.pickQueue.push(call);
    this.callRefTimerRef();
  }

  getConfig(method: string, metadata: Metadata): GetConfigResult {
    if (this.connectivityState !== ConnectivityState.SHUTDOWN) {
      this.resolvingLoadBalancer.exitIdle();
    }
    if (this.configSelector) {
      return {
        type: 'SUCCESS',
        config: this.configSelector.invoke(method, metadata, this.randomChannelId),
      };
    } else {
      if (this.currentResolutionError) {
        return {
          type: 'ERROR',
          error: this.currentResolutionError,
        };
      } else {
        return {
          type: 'NONE',
        };
      }
    }
  }

  queueCallForConfig(call: ResolvingCall) {
    this.configSelectionQueue.push(call);
    this.callRefTimerRef();
  }

  private enterIdle() {
    this.resolvingLoadBalancer.destroy();
    this.updateState(ConnectivityState.IDLE);
    this.currentPicker = new QueuePicker(this.resolvingLoadBalancer);
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.callRefTimer) {
      clearInterval(this.callRefTimer);
      this.callRefTimer = null;
    }
  }

  private startIdleTimeout(timeoutMs: number) {
    this.idleTimer = setTimeout(() => {
      if (this.callCount > 0) {
        /* If there is currently a call, the channel will not go idle for a
         * period of at least idleTimeoutMs, so check again after that time.
         */
        this.startIdleTimeout(this.idleTimeoutMs);
        return;
      }
      const now = new Date();
      const timeSinceLastActivity =
        now.valueOf() - this.lastActivityTimestamp.valueOf();
      if (timeSinceLastActivity >= this.idleTimeoutMs) {
        this.trace(
          'Idle timer triggered after ' +
            this.idleTimeoutMs +
            'ms of inactivity'
        );
        this.enterIdle();
      } else {
        /* Whenever the timer fires with the latest activity being too recent,
         * set the timer again for the time when the time since the last
         * activity is equal to the timeout. This should result in the timer
         * firing no more than once every idleTimeoutMs/2 on average. */
        this.startIdleTimeout(this.idleTimeoutMs - timeSinceLastActivity);
      }
    }, timeoutMs);
    this.idleTimer.unref?.();
  }

  private maybeStartIdleTimer() {
    if (
      this.connectivityState !== ConnectivityState.SHUTDOWN &&
      !this.idleTimer
    ) {
      this.startIdleTimeout(this.idleTimeoutMs);
    }
  }

  private onCallStart() {
    if (this.channelzEnabled) {
      this.channelzInfoTracker.callTracker.addCallStarted();
    }
    this.callCount += 1;
  }

  private onCallEnd(status: StatusObject) {
    if (this.channelzEnabled) {
      if (status.code === Status.OK) {
        this.channelzInfoTracker.callTracker.addCallSucceeded();
      } else {
        this.channelzInfoTracker.callTracker.addCallFailed();
      }
    }
    this.callCount -= 1;
    this.lastActivityTimestamp = new Date();
    this.maybeStartIdleTimer();
  }

  createLoadBalancingCall(
    callConfig: CallConfig,
    method: string,
    host: string,
    credentials: CallCredentials,
    deadline: Deadline
  ): LoadBalancingCall {
    const callNumber = getNextCallNumber();
    this.trace(
      'createLoadBalancingCall [' + callNumber + '] method="' + method + '"'
    );
    return new LoadBalancingCall(
      this,
      callConfig,
      method,
      host,
      credentials,
      deadline,
      callNumber
    );
  }

  createRetryingCall(
    callConfig: CallConfig,
    method: string,
    host: string,
    credentials: CallCredentials,
    deadline: Deadline
  ): RetryingCall {
    const callNumber = getNextCallNumber();
    this.trace(
      'createRetryingCall [' + callNumber + '] method="' + method + '"'
    );
    return new RetryingCall(
      this,
      callConfig,
      method,
      host,
      credentials,
      deadline,
      callNumber,
      this.retryBufferTracker,
      RETRY_THROTTLER_MAP.get(this.getTarget())
    );
  }

  createResolvingCall(
    method: string,
    deadline: Deadline,
    host: string | null | undefined,
    parentCall: ServerSurfaceCall | null,
    propagateFlags: number | null | undefined
  ): ResolvingCall {
    const callNumber = getNextCallNumber();
    this.trace(
      'createResolvingCall [' +
        callNumber +
        '] method="' +
        method +
        '", deadline=' +
        deadlineToString(deadline)
    );
    const finalOptions: CallStreamOptions = {
      deadline: deadline,
      flags: propagateFlags ?? Propagate.DEFAULTS,
      host: host ?? this.defaultAuthority,
      parentCall: parentCall,
    };

    const call = new ResolvingCall(
      this,
      method,
      finalOptions,
      this.filterStackFactory.clone(),
      callNumber
    );

    this.onCallStart();
    call.addStatusWatcher(status => {
      this.onCallEnd(status);
    });
    return call;
  }

  close() {
    this.resolvingLoadBalancer.destroy();
    this.updateState(ConnectivityState.SHUTDOWN);
    this.currentPicker = new ShutdownPicker();
    for (const call of this.configSelectionQueue) {
      call.cancelWithStatus(Status.UNAVAILABLE, 'Channel closed before call started');
    }
    this.configSelectionQueue = [];
    for (const call of this.pickQueue) {
      call.cancelWithStatus(Status.UNAVAILABLE, 'Channel closed before call started');
    }
    this.pickQueue = [];
    if (this.callRefTimer) {
      clearInterval(this.callRefTimer);
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.channelzEnabled) {
      unregisterChannelzRef(this.channelzRef);
    }

    this.subchannelPool.unrefUnusedSubchannels();
    this.configSelector?.unref();
    this.configSelector = null;
  }

  getTarget() {
    return uriToString(this.target);
  }

  getConnectivityState(tryToConnect: boolean) {
    const connectivityState = this.connectivityState;
    if (tryToConnect) {
      this.resolvingLoadBalancer.exitIdle();
      this.lastActivityTimestamp = new Date();
      this.maybeStartIdleTimer();
    }
    return connectivityState;
  }

  watchConnectivityState(
    currentState: ConnectivityState,
    deadline: Date | number,
    callback: (error?: Error) => void
  ): void {
    if (this.connectivityState === ConnectivityState.SHUTDOWN) {
      throw new Error('Channel has been shut down');
    }
    let timer = null;
    if (deadline !== Infinity) {
      const deadlineDate: Date =
        deadline instanceof Date ? deadline : new Date(deadline);
      const now = new Date();
      if (deadline === -Infinity || deadlineDate <= now) {
        process.nextTick(
          callback,
          new Error('Deadline passed without connectivity state change')
        );
        return;
      }
      timer = setTimeout(() => {
        this.removeConnectivityStateWatcher(watcherObject);
        callback(
          new Error('Deadline passed without connectivity state change')
        );
      }, deadlineDate.getTime() - now.getTime());
    }
    const watcherObject = {
      currentState,
      callback,
      timer,
    };
    this.connectivityStateWatchers.push(watcherObject);
  }

  /**
   * Get the channelz reference object for this channel. The returned value is
   * garbage if channelz is disabled for this channel.
   * @returns
   */
  getChannelzRef() {
    return this.channelzRef;
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
    if (this.connectivityState === ConnectivityState.SHUTDOWN) {
      throw new Error('Channel has been shut down');
    }
    return this.createResolvingCall(
      method,
      deadline,
      host,
      parentCall,
      propagateFlags
    );
  }

  getOptions() {
    return this.options;
  }
}
