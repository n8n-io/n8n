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
  registerDefaultLoadBalancerType,
  registerLoadBalancerType,
  createChildChannelControlHelper,
} from './load-balancer';
import { ConnectivityState } from './connectivity-state';
import {
  QueuePicker,
  Picker,
  PickArgs,
  CompletePickResult,
  PickResultType,
  UnavailablePicker,
} from './picker';
import { Endpoint, SubchannelAddress, subchannelAddressToString } from './subchannel-address';
import * as logging from './logging';
import { LogVerbosity } from './constants';
import {
  SubchannelInterface,
  ConnectivityStateListener,
  HealthListener,
} from './subchannel-interface';
import { isTcpSubchannelAddress } from './subchannel-address';
import { isIPv6 } from 'net';
import { ChannelOptions } from './channel-options';

const TRACER_NAME = 'pick_first';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

const TYPE_NAME = 'pick_first';

/**
 * Delay after starting a connection on a subchannel before starting a
 * connection on the next subchannel in the list, for Happy Eyeballs algorithm.
 */
const CONNECTION_DELAY_INTERVAL_MS = 250;

export class PickFirstLoadBalancingConfig implements TypedLoadBalancingConfig {
  constructor(private readonly shuffleAddressList: boolean) {}

  getLoadBalancerName(): string {
    return TYPE_NAME;
  }

  toJsonObject(): object {
    return {
      [TYPE_NAME]: {
        shuffleAddressList: this.shuffleAddressList,
      },
    };
  }

  getShuffleAddressList() {
    return this.shuffleAddressList;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static createFromJson(obj: any) {
    if (
      'shuffleAddressList' in obj &&
      !(typeof obj.shuffleAddressList === 'boolean')
    ) {
      throw new Error(
        'pick_first config field shuffleAddressList must be a boolean if provided'
      );
    }
    return new PickFirstLoadBalancingConfig(obj.shuffleAddressList === true);
  }
}

/**
 * Picker for a `PickFirstLoadBalancer` in the READY state. Always returns the
 * picked subchannel.
 */
class PickFirstPicker implements Picker {
  constructor(private subchannel: SubchannelInterface) {}

  pick(pickArgs: PickArgs): CompletePickResult {
    return {
      pickResultType: PickResultType.COMPLETE,
      subchannel: this.subchannel,
      status: null,
      onCallStarted: null,
      onCallEnded: null,
    };
  }
}

interface SubchannelChild {
  subchannel: SubchannelInterface;
  hasReportedTransientFailure: boolean;
}

/**
 * Return a new array with the elements of the input array in a random order
 * @param list The input array
 * @returns A shuffled array of the elements of list
 */
export function shuffled<T>(list: T[]): T[] {
  const result = list.slice();
  for (let i = result.length - 1; i > 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Interleave addresses in addressList by family in accordance with RFC-8304 section 4
 * @param addressList
 * @returns
 */
function interleaveAddressFamilies(
  addressList: SubchannelAddress[]
): SubchannelAddress[] {
  if (addressList.length === 0) {
    return [];
  }
  const result: SubchannelAddress[] = [];
  const ipv6Addresses: SubchannelAddress[] = [];
  const ipv4Addresses: SubchannelAddress[] = [];
  const ipv6First =
    isTcpSubchannelAddress(addressList[0]) && isIPv6(addressList[0].host);
  for (const address of addressList) {
    if (isTcpSubchannelAddress(address) && isIPv6(address.host)) {
      ipv6Addresses.push(address);
    } else {
      ipv4Addresses.push(address);
    }
  }
  const firstList = ipv6First ? ipv6Addresses : ipv4Addresses;
  const secondList = ipv6First ? ipv4Addresses : ipv6Addresses;
  for (let i = 0; i < Math.max(firstList.length, secondList.length); i++) {
    if (i < firstList.length) {
      result.push(firstList[i]);
    }
    if (i < secondList.length) {
      result.push(secondList[i]);
    }
  }
  return result;
}

const REPORT_HEALTH_STATUS_OPTION_NAME =
  'grpc-node.internal.pick-first.report_health_status';

export class PickFirstLoadBalancer implements LoadBalancer {
  /**
   * The list of subchannels this load balancer is currently attempting to
   * connect to.
   */
  private children: SubchannelChild[] = [];
  /**
   * The current connectivity state of the load balancer.
   */
  private currentState: ConnectivityState = ConnectivityState.IDLE;
  /**
   * The index within the `subchannels` array of the subchannel with the most
   * recently started connection attempt.
   */
  private currentSubchannelIndex = 0;
  /**
   * The currently picked subchannel used for making calls. Populated if
   * and only if the load balancer's current state is READY. In that case,
   * the subchannel's current state is also READY.
   */
  private currentPick: SubchannelInterface | null = null;
  /**
   * Listener callback attached to each subchannel in the `subchannels` list
   * while establishing a connection.
   */
  private subchannelStateListener: ConnectivityStateListener = (
    subchannel,
    previousState,
    newState,
    keepaliveTime,
    errorMessage
  ) => {
    this.onSubchannelStateUpdate(
      subchannel,
      previousState,
      newState,
      errorMessage
    );
  };

  private pickedSubchannelHealthListener: HealthListener = () =>
    this.calculateAndReportNewState();
  /**
   * Timer reference for the timer tracking when to start
   */
  private connectionDelayTimeout: NodeJS.Timeout;

  /**
   * The LB policy enters sticky TRANSIENT_FAILURE mode when all
   * subchannels have failed to connect at least once, and it stays in that
   * mode until a connection attempt is successful. While in sticky TF mode,
   * the LB policy continuously attempts to connect to all of its subchannels.
   */
  private stickyTransientFailureMode = false;

  private reportHealthStatus: boolean = false;

  /**
   * The most recent error reported by any subchannel as it transitioned to
   * TRANSIENT_FAILURE.
   */
  private lastError: string | null = null;

  private latestAddressList: SubchannelAddress[] | null = null;

  private latestOptions: ChannelOptions = {};

  /**
   * Load balancer that attempts to connect to each backend in the address list
   * in order, and picks the first one that connects, using it for every
   * request.
   * @param channelControlHelper `ChannelControlHelper` instance provided by
   *     this load balancer's owner.
   */
  constructor(
    private readonly channelControlHelper: ChannelControlHelper
  ) {
    this.connectionDelayTimeout = setTimeout(() => {}, 0);
    clearTimeout(this.connectionDelayTimeout);
  }

  private allChildrenHaveReportedTF(): boolean {
    return this.children.every(child => child.hasReportedTransientFailure);
  }

  private resetChildrenReportedTF() {
    this.children.every(child => child.hasReportedTransientFailure = false);
  }

  private calculateAndReportNewState() {
    if (this.currentPick) {
      if (this.reportHealthStatus && !this.currentPick.isHealthy()) {
        const errorMessage = `Picked subchannel ${this.currentPick.getAddress()} is unhealthy`;
        this.updateState(
          ConnectivityState.TRANSIENT_FAILURE,
          new UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage
        );
      } else {
        this.updateState(
          ConnectivityState.READY,
          new PickFirstPicker(this.currentPick),
          null
        );
      }
    } else if (this.latestAddressList?.length === 0) {
      const errorMessage = `No connection established. Last error: ${this.lastError}`;
      this.updateState(
        ConnectivityState.TRANSIENT_FAILURE,
        new UnavailablePicker({
          details: errorMessage,
        }),
        errorMessage
      );
    } else if (this.children.length === 0) {
      this.updateState(ConnectivityState.IDLE, new QueuePicker(this), null);
    } else {
      if (this.stickyTransientFailureMode) {
        const errorMessage = `No connection established. Last error: ${this.lastError}`;
        this.updateState(
          ConnectivityState.TRANSIENT_FAILURE,
          new UnavailablePicker({
            details: errorMessage,
          }),
          errorMessage
        );
      } else {
        this.updateState(ConnectivityState.CONNECTING, new QueuePicker(this), null);
      }
    }
  }

  private requestReresolution() {
    this.channelControlHelper.requestReresolution();
  }

  private maybeEnterStickyTransientFailureMode() {
    if (!this.allChildrenHaveReportedTF()) {
      return;
    }
    this.requestReresolution();
    this.resetChildrenReportedTF();
    if (this.stickyTransientFailureMode) {
      this.calculateAndReportNewState();
      return;
    }
    this.stickyTransientFailureMode = true;
    for (const { subchannel } of this.children) {
      subchannel.startConnecting();
    }
    this.calculateAndReportNewState();
  }

  private removeCurrentPick() {
    if (this.currentPick !== null) {
      this.currentPick.removeConnectivityStateListener(this.subchannelStateListener);
      this.channelControlHelper.removeChannelzChild(
        this.currentPick.getChannelzRef()
      );
      this.currentPick.removeHealthStateWatcher(
        this.pickedSubchannelHealthListener
      );
      // Unref last, to avoid triggering listeners
      this.currentPick.unref();
      this.currentPick = null;
    }
  }

  private onSubchannelStateUpdate(
    subchannel: SubchannelInterface,
    previousState: ConnectivityState,
    newState: ConnectivityState,
    errorMessage?: string
  ) {
    if (this.currentPick?.realSubchannelEquals(subchannel)) {
      if (newState !== ConnectivityState.READY) {
        this.removeCurrentPick();
        this.calculateAndReportNewState();
      }
      return;
    }
    for (const [index, child] of this.children.entries()) {
      if (subchannel.realSubchannelEquals(child.subchannel)) {
        if (newState === ConnectivityState.READY) {
          this.pickSubchannel(child.subchannel);
        }
        if (newState === ConnectivityState.TRANSIENT_FAILURE) {
          child.hasReportedTransientFailure = true;
          if (errorMessage) {
            this.lastError = errorMessage;
          }
          this.maybeEnterStickyTransientFailureMode();
          if (index === this.currentSubchannelIndex) {
            this.startNextSubchannelConnecting(index + 1);
          }
        }
        child.subchannel.startConnecting();
        return;
      }
    }
  }

  private startNextSubchannelConnecting(startIndex: number) {
    clearTimeout(this.connectionDelayTimeout);
    for (const [index, child] of this.children.entries()) {
      if (index >= startIndex) {
        const subchannelState = child.subchannel.getConnectivityState();
        if (
          subchannelState === ConnectivityState.IDLE ||
          subchannelState === ConnectivityState.CONNECTING
        ) {
          this.startConnecting(index);
          return;
        }
      }
    }
    this.maybeEnterStickyTransientFailureMode();
  }

  /**
   * Have a single subchannel in the `subchannels` list start connecting.
   * @param subchannelIndex The index into the `subchannels` list.
   */
  private startConnecting(subchannelIndex: number) {
    clearTimeout(this.connectionDelayTimeout);
    this.currentSubchannelIndex = subchannelIndex;
    if (
      this.children[subchannelIndex].subchannel.getConnectivityState() ===
      ConnectivityState.IDLE
    ) {
      trace(
        'Start connecting to subchannel with address ' +
          this.children[subchannelIndex].subchannel.getAddress()
      );
      process.nextTick(() => {
        this.children[subchannelIndex]?.subchannel.startConnecting();
      });
    }
    this.connectionDelayTimeout = setTimeout(() => {
      this.startNextSubchannelConnecting(subchannelIndex + 1);
    }, CONNECTION_DELAY_INTERVAL_MS);
    this.connectionDelayTimeout.unref?.();
  }

  /**
   * Declare that the specified subchannel should be used to make requests.
   * This functions the same independent of whether subchannel is a member of
   * this.children and whether it is equal to this.currentPick.
   * Prerequisite: subchannel.getConnectivityState() === READY.
   * @param subchannel
   */
  private pickSubchannel(subchannel: SubchannelInterface) {
    trace('Pick subchannel with address ' + subchannel.getAddress());
    this.stickyTransientFailureMode = false;
    /* Ref before removeCurrentPick and resetSubchannelList to avoid the
     * refcount dropping to 0 during this process. */
    subchannel.ref();
    this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
    this.removeCurrentPick();
    this.resetSubchannelList();
    subchannel.addConnectivityStateListener(this.subchannelStateListener);
    subchannel.addHealthStateWatcher(this.pickedSubchannelHealthListener);
    this.currentPick = subchannel;
    clearTimeout(this.connectionDelayTimeout);
    this.calculateAndReportNewState();
  }

  private updateState(newState: ConnectivityState, picker: Picker, errorMessage: string | null) {
    trace(
      ConnectivityState[this.currentState] +
        ' -> ' +
        ConnectivityState[newState]
    );
    this.currentState = newState;
    this.channelControlHelper.updateState(newState, picker, errorMessage);
  }

  private resetSubchannelList() {
    for (const child of this.children) {
      /* Always remoev the connectivity state listener. If the subchannel is
         getting picked, it will be re-added then. */
      child.subchannel.removeConnectivityStateListener(
        this.subchannelStateListener
      );
      /* Refs are counted independently for the children list and the
       * currentPick, so we call unref whether or not the child is the
       * currentPick. Channelz child references are also refcounted, so
       * removeChannelzChild can be handled the same way. */
      child.subchannel.unref();
      this.channelControlHelper.removeChannelzChild(
        child.subchannel.getChannelzRef()
      );
    }
    this.currentSubchannelIndex = 0;
    this.children = [];
  }

  private connectToAddressList(addressList: SubchannelAddress[], options: ChannelOptions) {
    trace('connectToAddressList([' + addressList.map(address => subchannelAddressToString(address)) + '])');
    const newChildrenList = addressList.map(address => ({
      subchannel: this.channelControlHelper.createSubchannel(address, options),
      hasReportedTransientFailure: false,
    }));
    for (const { subchannel } of newChildrenList) {
      if (subchannel.getConnectivityState() === ConnectivityState.READY) {
        this.pickSubchannel(subchannel);
        return;
      }
    }
    /* Ref each subchannel before resetting the list, to ensure that
     * subchannels shared between the list don't drop to 0 refs during the
     * transition. */
    for (const { subchannel } of newChildrenList) {
      subchannel.ref();
      this.channelControlHelper.addChannelzChild(subchannel.getChannelzRef());
    }
    this.resetSubchannelList();
    this.children = newChildrenList;
    for (const { subchannel } of this.children) {
      subchannel.addConnectivityStateListener(this.subchannelStateListener);
    }
    for (const child of this.children) {
      if (
        child.subchannel.getConnectivityState() ===
        ConnectivityState.TRANSIENT_FAILURE
      ) {
        child.hasReportedTransientFailure = true;
      }
    }
    this.startNextSubchannelConnecting(0);
    this.calculateAndReportNewState();
  }

  updateAddressList(
    endpointList: Endpoint[],
    lbConfig: TypedLoadBalancingConfig,
    options: ChannelOptions
  ): void {
    if (!(lbConfig instanceof PickFirstLoadBalancingConfig)) {
      return;
    }
    this.reportHealthStatus = options[REPORT_HEALTH_STATUS_OPTION_NAME];
    /* Previously, an update would be discarded if it was identical to the
     * previous update, to minimize churn. Now the DNS resolver is
     * rate-limited, so that is less of a concern. */
    if (lbConfig.getShuffleAddressList()) {
      endpointList = shuffled(endpointList);
    }
    const rawAddressList = ([] as SubchannelAddress[]).concat(
      ...endpointList.map(endpoint => endpoint.addresses)
    );
    trace('updateAddressList([' + rawAddressList.map(address => subchannelAddressToString(address)) + '])');
    if (rawAddressList.length === 0) {
      this.lastError = 'No addresses resolved';
    }
    const addressList = interleaveAddressFamilies(rawAddressList);
    this.latestAddressList = addressList;
    this.latestOptions = options;
    this.connectToAddressList(addressList, options);
  }

  exitIdle() {
    if (
      this.currentState === ConnectivityState.IDLE &&
      this.latestAddressList
    ) {
      this.connectToAddressList(this.latestAddressList, this.latestOptions);
    }
  }

  resetBackoff() {
    /* The pick first load balancer does not have a connection backoff, so this
     * does nothing */
  }

  destroy() {
    this.resetSubchannelList();
    this.removeCurrentPick();
  }

  getTypeName(): string {
    return TYPE_NAME;
  }
}

const LEAF_CONFIG = new PickFirstLoadBalancingConfig(false);

/**
 * This class handles the leaf load balancing operations for a single endpoint.
 * It is a thin wrapper around a PickFirstLoadBalancer with a different API
 * that more closely reflects how it will be used as a leaf balancer.
 */
export class LeafLoadBalancer {
  private pickFirstBalancer: PickFirstLoadBalancer;
  private latestState: ConnectivityState = ConnectivityState.IDLE;
  private latestPicker: Picker;
  constructor(
    private endpoint: Endpoint,
    channelControlHelper: ChannelControlHelper,
    private options: ChannelOptions
  ) {
    const childChannelControlHelper = createChildChannelControlHelper(
      channelControlHelper,
      {
        updateState: (connectivityState, picker, errorMessage) => {
          this.latestState = connectivityState;
          this.latestPicker = picker;
          channelControlHelper.updateState(connectivityState, picker, errorMessage);
        },
      }
    );
    this.pickFirstBalancer = new PickFirstLoadBalancer(
      childChannelControlHelper
    );
    this.latestPicker = new QueuePicker(this.pickFirstBalancer);
  }

  startConnecting() {
    this.pickFirstBalancer.updateAddressList(
      [this.endpoint],
      LEAF_CONFIG,
      { ...this.options, [REPORT_HEALTH_STATUS_OPTION_NAME]: true }
    );
  }

  /**
   * Update the endpoint associated with this LeafLoadBalancer to a new
   * endpoint. Does not trigger connection establishment if a connection
   * attempt is not already in progress.
   * @param newEndpoint
   */
  updateEndpoint(newEndpoint: Endpoint, newOptions: ChannelOptions) {
    this.options = newOptions;
    this.endpoint = newEndpoint;
    if (this.latestState !== ConnectivityState.IDLE) {
      this.startConnecting();
    }
  }

  getConnectivityState() {
    return this.latestState;
  }

  getPicker() {
    return this.latestPicker;
  }

  getEndpoint() {
    return this.endpoint;
  }

  exitIdle() {
    this.pickFirstBalancer.exitIdle();
  }

  destroy() {
    this.pickFirstBalancer.destroy();
  }
}

export function setup(): void {
  registerLoadBalancerType(
    TYPE_NAME,
    PickFirstLoadBalancer,
    PickFirstLoadBalancingConfig
  );
  registerDefaultLoadBalancerType(TYPE_NAME);
}
