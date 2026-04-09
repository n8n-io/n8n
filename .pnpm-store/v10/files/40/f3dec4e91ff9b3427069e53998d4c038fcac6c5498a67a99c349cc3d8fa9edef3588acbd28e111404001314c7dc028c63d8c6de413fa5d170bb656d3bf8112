/*
 * Copyright 2025 gRPC authors.
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

import { StatusOr } from './call-interface';
import { ChannelOptions } from './channel-options';
import { ConnectivityState } from './connectivity-state';
import { LogVerbosity } from './constants';
import { Duration, durationMessageToDuration, durationToMs, durationToString, isDuration, isDurationMessage, msToDuration, parseDuration } from './duration';
import { OrcaLoadReport__Output } from './generated/xds/data/orca/v3/OrcaLoadReport';
import { ChannelControlHelper, createChildChannelControlHelper, LoadBalancer, registerLoadBalancerType, TypedLoadBalancingConfig } from './load-balancer';
import { LeafLoadBalancer } from './load-balancer-pick-first';
import * as logging from './logging';
import { createMetricsReader, MetricsListener, OrcaOobMetricsSubchannelWrapper } from './orca';
import { PickArgs, Picker, PickResult, PickResultType, QueuePicker, UnavailablePicker } from './picker';
import { PriorityQueue } from './priority-queue';
import { Endpoint, endpointToString } from './subchannel-address';

const TRACER_NAME = 'weighted_round_robin';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

const TYPE_NAME = 'weighted_round_robin';

const DEFAULT_OOB_REPORTING_PERIOD_MS = 10_000;
const DEFAULT_BLACKOUT_PERIOD_MS = 10_000;
const DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS = 3 * 60_000;
const DEFAULT_WEIGHT_UPDATE_PERIOD_MS = 1_000;
const DEFAULT_ERROR_UTILIZATION_PENALTY = 1;

type TypeofValues =
  | 'object'
  | 'boolean'
  | 'function'
  | 'number'
  | 'string'
  | 'undefined';

function validateFieldType(
  obj: any,
  fieldName: string,
  expectedType: TypeofValues
) {
  if (
    fieldName in obj &&
    obj[fieldName] !== undefined &&
    typeof obj[fieldName] !== expectedType
  ) {
    throw new Error(
      `weighted round robin config ${fieldName} parse error: expected ${expectedType}, got ${typeof obj[
        fieldName
      ]}`
    );
  }
}

function parseDurationField(obj: any, fieldName: string): number | null {
  if (fieldName in obj && obj[fieldName] !== undefined && obj[fieldName] !== null) {
    let durationObject: Duration;
    if (isDuration(obj[fieldName])) {
      durationObject = obj[fieldName];
    } else if (isDurationMessage(obj[fieldName])) {
      durationObject = durationMessageToDuration(obj[fieldName]);
    } else if (typeof obj[fieldName] === 'string') {
      const parsedDuration = parseDuration(obj[fieldName]);
      if (!parsedDuration) {
        throw new Error(`weighted round robin config ${fieldName}: failed to parse duration string ${obj[fieldName]}`);
      }
      durationObject = parsedDuration;
    } else {
      throw new Error(`weighted round robin config ${fieldName}: expected duration, got ${typeof obj[fieldName]}`);
    }
    return durationToMs(durationObject);
  }
  return null;
}

export class WeightedRoundRobinLoadBalancingConfig implements TypedLoadBalancingConfig {
  private readonly enableOobLoadReport: boolean;
  private readonly oobLoadReportingPeriodMs: number;
  private readonly blackoutPeriodMs: number;
  private readonly weightExpirationPeriodMs: number;
  private readonly weightUpdatePeriodMs: number;
  private readonly errorUtilizationPenalty: number;

  constructor(
    enableOobLoadReport: boolean | null,
    oobLoadReportingPeriodMs: number | null,
    blackoutPeriodMs: number | null,
    weightExpirationPeriodMs: number | null,
    weightUpdatePeriodMs: number | null,
    errorUtilizationPenalty: number | null
  ) {
    this.enableOobLoadReport = enableOobLoadReport ?? false;
    this.oobLoadReportingPeriodMs = oobLoadReportingPeriodMs ?? DEFAULT_OOB_REPORTING_PERIOD_MS;
    this.blackoutPeriodMs = blackoutPeriodMs ?? DEFAULT_BLACKOUT_PERIOD_MS;
    this.weightExpirationPeriodMs = weightExpirationPeriodMs ?? DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS;
    this.weightUpdatePeriodMs = Math.max(weightUpdatePeriodMs ?? DEFAULT_WEIGHT_UPDATE_PERIOD_MS, 100);
    this.errorUtilizationPenalty = errorUtilizationPenalty ?? DEFAULT_ERROR_UTILIZATION_PENALTY;
  }

  getLoadBalancerName(): string {
    return TYPE_NAME;
  }
  toJsonObject(): object {
    return {
      enable_oob_load_report: this.enableOobLoadReport,
      oob_load_reporting_period: durationToString(msToDuration(this.oobLoadReportingPeriodMs)),
      blackout_period: durationToString(msToDuration(this.blackoutPeriodMs)),
      weight_expiration_period: durationToString(msToDuration(this.weightExpirationPeriodMs)),
      weight_update_period: durationToString(msToDuration(this.weightUpdatePeriodMs)),
      error_utilization_penalty: this.errorUtilizationPenalty
    };
  }
  static createFromJson(obj: any): WeightedRoundRobinLoadBalancingConfig {
    validateFieldType(obj, 'enable_oob_load_report', 'boolean');
    validateFieldType(obj, 'error_utilization_penalty', 'number');
    if (obj.error_utilization_penalty < 0) {
      throw new Error('weighted round robin config error_utilization_penalty < 0');
    }
    return new WeightedRoundRobinLoadBalancingConfig(
      obj.enable_oob_load_report,
      parseDurationField(obj, 'oob_load_reporting_period'),
      parseDurationField(obj, 'blackout_period'),
      parseDurationField(obj, 'weight_expiration_period'),
      parseDurationField(obj, 'weight_update_period'),
      obj.error_utilization_penalty
    )
  }

  getEnableOobLoadReport() {
    return this.enableOobLoadReport;
  }
  getOobLoadReportingPeriodMs() {
    return this.oobLoadReportingPeriodMs;
  }
  getBlackoutPeriodMs() {
    return this.blackoutPeriodMs;
  }
  getWeightExpirationPeriodMs() {
    return this.weightExpirationPeriodMs;
  }
  getWeightUpdatePeriodMs() {
    return this.weightUpdatePeriodMs;
  }
  getErrorUtilizationPenalty() {
    return this.errorUtilizationPenalty;
  }
}

interface WeightedPicker {
  endpointName: string;
  picker: Picker;
  weight: number;
}

interface QueueEntry {
  endpointName: string;
  picker: Picker;
  period: number;
  deadline: number;
}

type MetricsHandler = (loadReport: OrcaLoadReport__Output, endpointName: string) => void;

class WeightedRoundRobinPicker implements Picker {
  private queue: PriorityQueue<QueueEntry> = new PriorityQueue((a, b) => a.deadline < b.deadline);
  constructor(children: WeightedPicker[], private readonly metricsHandler: MetricsHandler | null) {
    const positiveWeight = children.filter(picker => picker.weight > 0);
    let averageWeight: number;
    if (positiveWeight.length < 2) {
      averageWeight = 1;
    } else {
      let weightSum: number = 0;
      for (const { weight } of positiveWeight) {
        weightSum += weight;
      }
      averageWeight = weightSum / positiveWeight.length;
    }
    for (const child of children) {
      const period = child.weight > 0 ? 1 / child.weight : averageWeight;
      this.queue.push({
        endpointName: child.endpointName,
        picker: child.picker,
        period: period,
        deadline: Math.random() * period
      });
    }
  }
  pick(pickArgs: PickArgs): PickResult {
    const entry = this.queue.pop()!;
    this.queue.push({
      ...entry,
      deadline: entry.deadline + entry.period
    })
    const childPick = entry.picker.pick(pickArgs);
    if (childPick.pickResultType === PickResultType.COMPLETE) {
      if (this.metricsHandler) {
        return {
          ...childPick,
          onCallEnded: createMetricsReader(loadReport => this.metricsHandler!(loadReport, entry.endpointName), childPick.onCallEnded)
        };
      } else {
        const subchannelWrapper = childPick.subchannel as OrcaOobMetricsSubchannelWrapper;
        return {
          ...childPick,
          subchannel: subchannelWrapper.getWrappedSubchannel()
        }
      }
    } else {
      return childPick;
    }
  }
}

interface ChildEntry {
  child: LeafLoadBalancer;
  lastUpdated: Date;
  nonEmptySince: Date | null;
  weight: number;
  oobMetricsListener: MetricsListener | null;
}

class WeightedRoundRobinLoadBalancer implements LoadBalancer {
  private latestConfig: WeightedRoundRobinLoadBalancingConfig | null = null;

  private children: Map<string, ChildEntry> = new Map();

  private currentState: ConnectivityState = ConnectivityState.IDLE;

  private updatesPaused = false;

  private lastError: string | null = null;

  private weightUpdateTimer: NodeJS.Timeout | null = null;

  constructor(private readonly channelControlHelper: ChannelControlHelper) {}

  private countChildrenWithState(state: ConnectivityState) {
    let count = 0;
    for (const entry of this.children.values()) {
      if (entry.child.getConnectivityState() === state) {
        count += 1;
      }
    }
    return count;
  }

  updateWeight(entry: ChildEntry, loadReport: OrcaLoadReport__Output): void {
    const qps = loadReport.rps_fractional;
    let utilization = loadReport.application_utilization;
    if (utilization > 0 && qps > 0) {
      utilization += (loadReport.eps / qps) * (this.latestConfig?.getErrorUtilizationPenalty() ?? 0);
    }
    const newWeight = utilization === 0 ? 0 : qps / utilization;
    if (newWeight === 0) {
      return;
    }
    const now = new Date();
    if (entry.nonEmptySince === null) {
      entry.nonEmptySince = now;
    }
    entry.lastUpdated = now;
    entry.weight = newWeight;
  }

  getWeight(entry: ChildEntry): number {
    if (!this.latestConfig) {
      return 0;
    }
    const now = new Date().getTime();
    if (now - entry.lastUpdated.getTime() >= this.latestConfig.getWeightExpirationPeriodMs()) {
      entry.nonEmptySince = null;
      return 0;
    }
    const blackoutPeriod = this.latestConfig.getBlackoutPeriodMs();
    if (blackoutPeriod > 0 && (entry.nonEmptySince === null || now - entry.nonEmptySince.getTime() < blackoutPeriod)) {
      return 0;
    }
    return entry.weight;
  }

  private calculateAndUpdateState() {
    if (this.updatesPaused || !this.latestConfig) {
      return;
    }
    if (this.countChildrenWithState(ConnectivityState.READY) > 0) {
      const weightedPickers: WeightedPicker[] = [];
      for (const [endpoint, entry] of this.children) {
        if (entry.child.getConnectivityState() !== ConnectivityState.READY) {
          continue;
        }
        weightedPickers.push({
          endpointName: endpoint,
          picker: entry.child.getPicker(),
          weight: this.getWeight(entry)
        });
      }
      trace('Created picker with weights: ' + weightedPickers.map(entry => entry.endpointName + ':' + entry.weight).join(','));
      let metricsHandler: MetricsHandler | null;
      if (!this.latestConfig.getEnableOobLoadReport()) {
        metricsHandler = (loadReport, endpointName) => {
          const childEntry = this.children.get(endpointName);
          if (childEntry) {
            this.updateWeight(childEntry, loadReport);
          }
        };
      } else {
        metricsHandler = null;
      }
      this.updateState(
        ConnectivityState.READY,
        new WeightedRoundRobinPicker(
          weightedPickers,
          metricsHandler
        ),
        null
      );
    } else if (this.countChildrenWithState(ConnectivityState.CONNECTING) > 0) {
      this.updateState(ConnectivityState.CONNECTING, new QueuePicker(this), null);
    } else if (
      this.countChildrenWithState(ConnectivityState.TRANSIENT_FAILURE) > 0
    ) {
      const errorMessage = `weighted_round_robin: No connection established. Last error: ${this.lastError}`;
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
    for (const {child} of this.children.values()) {
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
    this.currentState = newState;
    this.channelControlHelper.updateState(newState, picker, errorMessage);
  }

  updateAddressList(maybeEndpointList: StatusOr<Endpoint[]>, lbConfig: TypedLoadBalancingConfig, options: ChannelOptions, resolutionNote: string): boolean {
    if (!(lbConfig instanceof WeightedRoundRobinLoadBalancingConfig)) {
      return false;
    }
    if (!maybeEndpointList.ok) {
      if (this.children.size === 0) {
        this.updateState(
          ConnectivityState.TRANSIENT_FAILURE,
          new UnavailablePicker(maybeEndpointList.error),
          maybeEndpointList.error.details
        );
      }
      return true;
    }
    if (maybeEndpointList.value.length === 0) {
      const errorMessage = `No addresses resolved. Resolution note: ${resolutionNote}`;
      this.updateState(
        ConnectivityState.TRANSIENT_FAILURE,
        new UnavailablePicker({details: errorMessage}),
        errorMessage
      );
      return false;
    }
    trace('Connect to endpoint list ' + maybeEndpointList.value.map(endpointToString));
    const now = new Date();
    const seenEndpointNames = new Set<string>();
    this.updatesPaused = true;
    this.latestConfig = lbConfig;
    for (const endpoint of maybeEndpointList.value) {
      const name = endpointToString(endpoint);
      seenEndpointNames.add(name);
      let entry = this.children.get(name);
      if (!entry) {
        entry = {
          child: new LeafLoadBalancer(endpoint, createChildChannelControlHelper(this.channelControlHelper, {
            updateState: (connectivityState, picker, errorMessage) => {
              /* Ensure that name resolution is requested again after active
                * connections are dropped. This is more aggressive than necessary to
                * accomplish that, so we are counting on resolvers to have
                * reasonable rate limits. */
              if (this.currentState === ConnectivityState.READY && connectivityState !== ConnectivityState.READY) {
                this.channelControlHelper.requestReresolution();
              }
              if (connectivityState === ConnectivityState.READY) {
                entry!.nonEmptySince = null;
              }
              if (errorMessage) {
                this.lastError = errorMessage;
              }
              this.calculateAndUpdateState();
            },
            createSubchannel: (subchannelAddress, subchannelArgs) => {
              const subchannel = this.channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
              if (entry?.oobMetricsListener) {
                return new OrcaOobMetricsSubchannelWrapper(subchannel, entry.oobMetricsListener, this.latestConfig!.getOobLoadReportingPeriodMs());
              } else {
                return subchannel;
              }
            }
          }), options, resolutionNote),
          lastUpdated: now,
          nonEmptySince: null,
          weight: 0,
          oobMetricsListener: null
        };
        this.children.set(name, entry);
      }
      if (lbConfig.getEnableOobLoadReport()) {
        entry.oobMetricsListener = loadReport => {
          this.updateWeight(entry!, loadReport);
        };
      } else {
        entry.oobMetricsListener = null;
      }
    }
    for (const [endpointName, entry] of this.children) {
      if (seenEndpointNames.has(endpointName)) {
        entry.child.startConnecting();
      } else {
        entry.child.destroy();
        this.children.delete(endpointName);
      }
    }
    this.updatesPaused = false;
    this.calculateAndUpdateState();
    if (this.weightUpdateTimer) {
      clearInterval(this.weightUpdateTimer);
    }
    this.weightUpdateTimer = setInterval(() => {
      if (this.currentState === ConnectivityState.READY) {
        this.calculateAndUpdateState();
      }
    }, lbConfig.getWeightUpdatePeriodMs()).unref?.();
    return true;
  }
  exitIdle(): void {
    /* The weighted_round_robin LB policy is only in the IDLE state if it has
     * no addresses to try to connect to and it has no picked subchannel.
     * In that case, there is no meaningful action that can be taken here. */
  }
  resetBackoff(): void {
    // This LB policy has no backoff to reset
  }
  destroy(): void {
    for (const entry of this.children.values()) {
      entry.child.destroy();
    }
    this.children.clear();
    if (this.weightUpdateTimer) {
      clearInterval(this.weightUpdateTimer);
    }
  }
  getTypeName(): string {
    return TYPE_NAME;
  }
}

export function setup() {
  registerLoadBalancerType(
    TYPE_NAME,
    WeightedRoundRobinLoadBalancer,
    WeightedRoundRobinLoadBalancingConfig
  );
}
