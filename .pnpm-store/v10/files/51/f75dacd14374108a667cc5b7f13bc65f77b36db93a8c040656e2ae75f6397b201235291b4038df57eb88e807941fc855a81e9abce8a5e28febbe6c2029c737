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

import { ChannelOptions } from './channel-options';
import { Endpoint, SubchannelAddress } from './subchannel-address';
import { ConnectivityState } from './connectivity-state';
import { Picker } from './picker';
import type { ChannelRef, SubchannelRef } from './channelz';
import { SubchannelInterface } from './subchannel-interface';
import { LoadBalancingConfig } from './service-config';
import { log } from './logging';
import { LogVerbosity } from './constants';
import { StatusOr } from './call-interface';

/**
 * A collection of functions associated with a channel that a load balancer
 * can call as necessary.
 */
export interface ChannelControlHelper {
  /**
   * Returns a subchannel connected to the specified address.
   * @param subchannelAddress The address to connect to
   * @param subchannelArgs Channel arguments to use to construct the subchannel
   */
  createSubchannel(
    subchannelAddress: SubchannelAddress,
    subchannelArgs: ChannelOptions
  ): SubchannelInterface;
  /**
   * Passes a new subchannel picker up to the channel. This is called if either
   * the connectivity state changes or if a different picker is needed for any
   * other reason.
   * @param connectivityState New connectivity state
   * @param picker New picker
   */
  updateState(
    connectivityState: ConnectivityState,
    picker: Picker,
    errorMessage: string | null
  ): void;
  /**
   * Request new data from the resolver.
   */
  requestReresolution(): void;
  addChannelzChild(child: ChannelRef | SubchannelRef): void;
  removeChannelzChild(child: ChannelRef | SubchannelRef): void;
}

/**
 * Create a child ChannelControlHelper that overrides some methods of the
 * parent while letting others pass through to the parent unmodified. This
 * allows other code to create these children without needing to know about
 * all of the methods to be passed through.
 * @param parent
 * @param overrides
 */
export function createChildChannelControlHelper(
  parent: ChannelControlHelper,
  overrides: Partial<ChannelControlHelper>
): ChannelControlHelper {
  return {
    createSubchannel:
      overrides.createSubchannel?.bind(overrides) ??
      parent.createSubchannel.bind(parent),
    updateState:
      overrides.updateState?.bind(overrides) ?? parent.updateState.bind(parent),
    requestReresolution:
      overrides.requestReresolution?.bind(overrides) ??
      parent.requestReresolution.bind(parent),
    addChannelzChild:
      overrides.addChannelzChild?.bind(overrides) ??
      parent.addChannelzChild.bind(parent),
    removeChannelzChild:
      overrides.removeChannelzChild?.bind(overrides) ??
      parent.removeChannelzChild.bind(parent),
  };
}

/**
 * Tracks one or more connected subchannels and determines which subchannel
 * each request should use.
 */
export interface LoadBalancer {
  /**
   * Gives the load balancer a new list of addresses to start connecting to.
   * The load balancer will start establishing connections with the new list,
   * but will continue using any existing connections until the new connections
   * are established
   * @param endpointList The new list of addresses to connect to
   * @param lbConfig The load balancing config object from the service config,
   *     if one was provided
   * @param channelOptions Channel options from the channel, plus resolver
   *     attributes
   * @param resolutionNote A not from the resolver to include in errors
   */
  updateAddressList(
    endpointList: StatusOr<Endpoint[]>,
    lbConfig: TypedLoadBalancingConfig,
    channelOptions: ChannelOptions,
    resolutionNote: string
  ): boolean;
  /**
   * If the load balancer is currently in the IDLE state, start connecting.
   */
  exitIdle(): void;
  /**
   * If the load balancer is currently in the CONNECTING or TRANSIENT_FAILURE
   * state, reset the current connection backoff timeout to its base value and
   * transition to CONNECTING if in TRANSIENT_FAILURE.
   */
  resetBackoff(): void;
  /**
   * The load balancer unrefs all of its subchannels and stops calling methods
   * of its channel control helper.
   */
  destroy(): void;
  /**
   * Get the type name for this load balancer type. Must be constant across an
   * entire load balancer implementation class and must match the name that the
   * balancer implementation class was registered with.
   */
  getTypeName(): string;
}

export interface LoadBalancerConstructor {
  new (
    channelControlHelper: ChannelControlHelper
  ): LoadBalancer;
}

export interface TypedLoadBalancingConfig {
  getLoadBalancerName(): string;
  toJsonObject(): object;
}

export interface TypedLoadBalancingConfigConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any): TypedLoadBalancingConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createFromJson(obj: any): TypedLoadBalancingConfig;
}

const registeredLoadBalancerTypes: {
  [name: string]: {
    LoadBalancer: LoadBalancerConstructor;
    LoadBalancingConfig: TypedLoadBalancingConfigConstructor;
  };
} = {};

let defaultLoadBalancerType: string | null = null;

export function registerLoadBalancerType(
  typeName: string,
  loadBalancerType: LoadBalancerConstructor,
  loadBalancingConfigType: TypedLoadBalancingConfigConstructor
) {
  registeredLoadBalancerTypes[typeName] = {
    LoadBalancer: loadBalancerType,
    LoadBalancingConfig: loadBalancingConfigType,
  };
}

export function registerDefaultLoadBalancerType(typeName: string) {
  defaultLoadBalancerType = typeName;
}

export function createLoadBalancer(
  config: TypedLoadBalancingConfig,
  channelControlHelper: ChannelControlHelper
): LoadBalancer | null {
  const typeName = config.getLoadBalancerName();
  if (typeName in registeredLoadBalancerTypes) {
    return new registeredLoadBalancerTypes[typeName].LoadBalancer(
      channelControlHelper
    );
  } else {
    return null;
  }
}

export function isLoadBalancerNameRegistered(typeName: string): boolean {
  return typeName in registeredLoadBalancerTypes;
}

export function parseLoadBalancingConfig(
  rawConfig: LoadBalancingConfig
): TypedLoadBalancingConfig {
  const keys = Object.keys(rawConfig);
  if (keys.length !== 1) {
    throw new Error(
      'Provided load balancing config has multiple conflicting entries'
    );
  }
  const typeName = keys[0];
  if (typeName in registeredLoadBalancerTypes) {
    try {
      return registeredLoadBalancerTypes[
        typeName
      ].LoadBalancingConfig.createFromJson(rawConfig[typeName]);
    } catch (e) {
      throw new Error(`${typeName}: ${(e as Error).message}`);
    }
  } else {
    throw new Error(`Unrecognized load balancing config name ${typeName}`);
  }
}

export function getDefaultConfig() {
  if (!defaultLoadBalancerType) {
    throw new Error('No default load balancer type registered');
  }
  return new registeredLoadBalancerTypes[
    defaultLoadBalancerType
  ]!.LoadBalancingConfig();
}

export function selectLbConfigFromList(
  configs: LoadBalancingConfig[],
  fallbackTodefault = false
): TypedLoadBalancingConfig | null {
  for (const config of configs) {
    try {
      return parseLoadBalancingConfig(config);
    } catch (e) {
      log(
        LogVerbosity.DEBUG,
        'Config parsing failed with error',
        (e as Error).message
      );
      continue;
    }
  }
  if (fallbackTodefault) {
    if (defaultLoadBalancerType) {
      return new registeredLoadBalancerTypes[
        defaultLoadBalancerType
      ]!.LoadBalancingConfig();
    } else {
      return null;
    }
  } else {
    return null;
  }
}
