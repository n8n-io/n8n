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
  ChannelControlHelper,
  LoadBalancer,
  TypedLoadBalancingConfig,
  selectLbConfigFromList,
} from './load-balancer';
import {
  MethodConfig,
  ServiceConfig,
  validateServiceConfig,
} from './service-config';
import { ConnectivityState } from './connectivity-state';
import { CHANNEL_ARGS_CONFIG_SELECTOR_KEY, ConfigSelector, createResolver, Resolver } from './resolver';
import { Picker, UnavailablePicker, QueuePicker } from './picker';
import { BackoffOptions, BackoffTimeout } from './backoff-timeout';
import { Status } from './constants';
import { StatusObject, StatusOr } from './call-interface';
import { Metadata } from './metadata';
import * as logging from './logging';
import { LogVerbosity } from './constants';
import { Endpoint } from './subchannel-address';
import { GrpcUri, uriToString } from './uri-parser';
import { ChildLoadBalancerHandler } from './load-balancer-child-handler';
import { ChannelOptions } from './channel-options';

const TRACER_NAME = 'resolving_load_balancer';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

type NameMatchLevel = 'EMPTY' | 'SERVICE' | 'SERVICE_AND_METHOD';

/**
 * Name match levels in order from most to least specific. This is the order in
 * which searches will be performed.
 */
const NAME_MATCH_LEVEL_ORDER: NameMatchLevel[] = [
  'SERVICE_AND_METHOD',
  'SERVICE',
  'EMPTY',
];

function hasMatchingName(
  service: string,
  method: string,
  methodConfig: MethodConfig,
  matchLevel: NameMatchLevel
): boolean {
  for (const name of methodConfig.name) {
    switch (matchLevel) {
      case 'EMPTY':
        if (!name.service && !name.method) {
          return true;
        }
        break;
      case 'SERVICE':
        if (name.service === service && !name.method) {
          return true;
        }
        break;
      case 'SERVICE_AND_METHOD':
        if (name.service === service && name.method === method) {
          return true;
        }
    }
  }
  return false;
}

function findMatchingConfig(
  service: string,
  method: string,
  methodConfigs: MethodConfig[],
  matchLevel: NameMatchLevel
): MethodConfig | null {
  for (const config of methodConfigs) {
    if (hasMatchingName(service, method, config, matchLevel)) {
      return config;
    }
  }
  return null;
}

function getDefaultConfigSelector(
  serviceConfig: ServiceConfig | null
): ConfigSelector {
  return {
      invoke(
      methodName: string,
      metadata: Metadata
    ) {
      const splitName = methodName.split('/').filter(x => x.length > 0);
      const service = splitName[0] ?? '';
      const method = splitName[1] ?? '';
      if (serviceConfig && serviceConfig.methodConfig) {
        /* Check for the following in order, and return the first method
        * config that matches:
        * 1. A name that exactly matches the service and method
        * 2. A name with no method set that matches the service
        * 3. An empty name
        */
        for (const matchLevel of NAME_MATCH_LEVEL_ORDER) {
          const matchingConfig = findMatchingConfig(
            service,
            method,
            serviceConfig.methodConfig,
            matchLevel
          );
          if (matchingConfig) {
            return {
              methodConfig: matchingConfig,
              pickInformation: {},
              status: Status.OK,
              dynamicFilterFactories: [],
            };
          }
        }
      }
      return {
        methodConfig: { name: [] },
        pickInformation: {},
        status: Status.OK,
        dynamicFilterFactories: [],
      };
    },
    unref() {}
  };
}

export interface ResolutionCallback {
  (serviceConfig: ServiceConfig, configSelector: ConfigSelector): void;
}

export interface ResolutionFailureCallback {
  (status: StatusObject): void;
}

export class ResolvingLoadBalancer implements LoadBalancer {
  /**
   * The resolver class constructed for the target address.
   */
  private readonly innerResolver: Resolver;

  private readonly childLoadBalancer: ChildLoadBalancerHandler;
  private latestChildState: ConnectivityState = ConnectivityState.IDLE;
  private latestChildPicker: Picker = new QueuePicker(this);
  private latestChildErrorMessage: string | null = null;
  /**
   * This resolving load balancer's current connectivity state.
   */
  private currentState: ConnectivityState = ConnectivityState.IDLE;
  private readonly defaultServiceConfig: ServiceConfig;
  /**
   * The service config object from the last successful resolution, if
   * available. A value of null indicates that we have not yet received a valid
   * service config from the resolver.
   */
  private previousServiceConfig: ServiceConfig | null = null;

  /**
   * The backoff timer for handling name resolution failures.
   */
  private readonly backoffTimeout: BackoffTimeout;

  /**
   * Indicates whether we should attempt to resolve again after the backoff
   * timer runs out.
   */
  private continueResolving = false;

  /**
   * Wrapper class that behaves like a `LoadBalancer` and also handles name
   * resolution internally.
   * @param target The address of the backend to connect to.
   * @param channelControlHelper `ChannelControlHelper` instance provided by
   *     this load balancer's owner.
   * @param defaultServiceConfig The default service configuration to be used
   *     if none is provided by the name resolver. A `null` value indicates
   *     that the default behavior should be the default unconfigured behavior.
   *     In practice, that means using the "pick first" load balancer
   *     implmentation
   */
  constructor(
    private readonly target: GrpcUri,
    private readonly channelControlHelper: ChannelControlHelper,
    private readonly channelOptions: ChannelOptions,
    private readonly onSuccessfulResolution: ResolutionCallback,
    private readonly onFailedResolution: ResolutionFailureCallback
  ) {
    if (channelOptions['grpc.service_config']) {
      this.defaultServiceConfig = validateServiceConfig(
        JSON.parse(channelOptions['grpc.service_config']!)
      );
    } else {
      this.defaultServiceConfig = {
        loadBalancingConfig: [],
        methodConfig: [],
      };
    }

    this.updateState(ConnectivityState.IDLE, new QueuePicker(this), null);
    this.childLoadBalancer = new ChildLoadBalancerHandler(
      {
        createSubchannel:
          channelControlHelper.createSubchannel.bind(channelControlHelper),
        requestReresolution: () => {
          /* If the backoffTimeout is running, we're still backing off from
           * making resolve requests, so we shouldn't make another one here.
           * In that case, the backoff timer callback will call
           * updateResolution */
          if (this.backoffTimeout.isRunning()) {
            trace(
              'requestReresolution delayed by backoff timer until ' +
                this.backoffTimeout.getEndTime().toISOString()
            );
            this.continueResolving = true;
          } else {
            this.updateResolution();
          }
        },
        updateState: (newState: ConnectivityState, picker: Picker, errorMessage: string | null) => {
          this.latestChildState = newState;
          this.latestChildPicker = picker;
          this.latestChildErrorMessage = errorMessage;
          this.updateState(newState, picker, errorMessage);
        },
        addChannelzChild:
          channelControlHelper.addChannelzChild.bind(channelControlHelper),
        removeChannelzChild:
          channelControlHelper.removeChannelzChild.bind(channelControlHelper),
      }
    );
    this.innerResolver = createResolver(
      target,
      this.handleResolverResult.bind(this),
      channelOptions
    );
    const backoffOptions: BackoffOptions = {
      initialDelay: channelOptions['grpc.initial_reconnect_backoff_ms'],
      maxDelay: channelOptions['grpc.max_reconnect_backoff_ms'],
    };
    this.backoffTimeout = new BackoffTimeout(() => {
      if (this.continueResolving) {
        this.updateResolution();
        this.continueResolving = false;
      } else {
        this.updateState(this.latestChildState, this.latestChildPicker, this.latestChildErrorMessage);
      }
    }, backoffOptions);
    this.backoffTimeout.unref();
  }

  private handleResolverResult(
    endpointList: StatusOr<Endpoint[]>,
    attributes: { [key: string]: unknown },
    serviceConfig: StatusOr<ServiceConfig> | null,
    resolutionNote: string
  ): boolean {
    this.backoffTimeout.stop();
    this.backoffTimeout.reset();
    let resultAccepted = true;
    let workingServiceConfig: ServiceConfig | null = null;
    if (serviceConfig === null) {
      workingServiceConfig = this.defaultServiceConfig;
    } else if (serviceConfig.ok) {
      workingServiceConfig = serviceConfig.value;
    } else {
      if (this.previousServiceConfig !== null) {
        workingServiceConfig = this.previousServiceConfig;
      } else {
        resultAccepted = false;
        this.handleResolutionFailure(serviceConfig.error);
      }
    }

    if (workingServiceConfig !== null) {
      const workingConfigList =
        workingServiceConfig?.loadBalancingConfig ?? [];
      const loadBalancingConfig = selectLbConfigFromList(
        workingConfigList,
        true
      );
      if (loadBalancingConfig === null) {
        resultAccepted = false;
        this.handleResolutionFailure({
          code: Status.UNAVAILABLE,
          details:
            'All load balancer options in service config are not compatible',
          metadata: new Metadata(),
        });
      } else {
        resultAccepted = this.childLoadBalancer.updateAddressList(
          endpointList,
          loadBalancingConfig,
          {...this.channelOptions, ...attributes},
          resolutionNote
        );
      }
    }
    if (resultAccepted) {
      this.onSuccessfulResolution(
        workingServiceConfig!,
        attributes[CHANNEL_ARGS_CONFIG_SELECTOR_KEY] as ConfigSelector ?? getDefaultConfigSelector(workingServiceConfig!)
      );
    }
    return resultAccepted;
  }

  private updateResolution() {
    this.innerResolver.updateResolution();
    if (this.currentState === ConnectivityState.IDLE) {
      /* this.latestChildPicker is initialized as new QueuePicker(this), which
       * is an appropriate value here if the child LB policy is unset.
       * Otherwise, we want to delegate to the child here, in case that
       * triggers something. */
      this.updateState(ConnectivityState.CONNECTING, this.latestChildPicker, this.latestChildErrorMessage);
    }
    this.backoffTimeout.runOnce();
  }

  private updateState(connectivityState: ConnectivityState, picker: Picker, errorMessage: string | null) {
    trace(
      uriToString(this.target) +
        ' ' +
        ConnectivityState[this.currentState] +
        ' -> ' +
        ConnectivityState[connectivityState]
    );
    // Ensure that this.exitIdle() is called by the picker
    if (connectivityState === ConnectivityState.IDLE) {
      picker = new QueuePicker(this, picker);
    }
    this.currentState = connectivityState;
    this.channelControlHelper.updateState(connectivityState, picker, errorMessage);
  }

  private handleResolutionFailure(error: StatusObject) {
    if (this.latestChildState === ConnectivityState.IDLE) {
      this.updateState(
        ConnectivityState.TRANSIENT_FAILURE,
        new UnavailablePicker(error),
        error.details
      );
      this.onFailedResolution(error);
    }
  }

  exitIdle() {
    if (
      this.currentState === ConnectivityState.IDLE ||
      this.currentState === ConnectivityState.TRANSIENT_FAILURE
    ) {
      if (this.backoffTimeout.isRunning()) {
        this.continueResolving = true;
      } else {
        this.updateResolution();
      }
    }
    this.childLoadBalancer.exitIdle();
  }

  updateAddressList(
    endpointList: StatusOr<Endpoint[]>,
    lbConfig: TypedLoadBalancingConfig | null
  ): never {
    throw new Error('updateAddressList not supported on ResolvingLoadBalancer');
  }

  resetBackoff() {
    this.backoffTimeout.reset();
    this.childLoadBalancer.resetBackoff();
  }

  destroy() {
    this.childLoadBalancer.destroy();
    this.innerResolver.destroy();
    this.backoffTimeout.reset();
    this.backoffTimeout.stop();
    this.latestChildState = ConnectivityState.IDLE;
    this.latestChildPicker = new QueuePicker(this);
    this.currentState = ConnectivityState.IDLE;
    this.previousServiceConfig = null;
    this.continueResolving = false;
  }

  getTypeName() {
    return 'resolving_load_balancer';
  }
}
