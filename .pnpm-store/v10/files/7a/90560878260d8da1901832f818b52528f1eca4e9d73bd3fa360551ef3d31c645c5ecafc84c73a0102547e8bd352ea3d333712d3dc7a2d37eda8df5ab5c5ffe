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

/* This file implements gRFC A2 and the service config spec:
 * https://github.com/grpc/proposal/blob/master/A2-service-configs-in-dns.md
 * https://github.com/grpc/grpc/blob/master/doc/service_config.md. Each
 * function here takes an object with unknown structure and returns its
 * specific object type if the input has the right structure, and throws an
 * error otherwise. */

/* The any type is purposely used here. All functions validate their input at
 * runtime */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as os from 'os';
import { Status } from './constants';
import { Duration } from './duration';

export interface MethodConfigName {
  service?: string;
  method?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialBackoff: string;
  maxBackoff: string;
  backoffMultiplier: number;
  retryableStatusCodes: (Status | string)[];
}

export interface HedgingPolicy {
  maxAttempts: number;
  hedgingDelay?: string;
  nonFatalStatusCodes?: (Status | string)[];
}

export interface MethodConfig {
  name: MethodConfigName[];
  waitForReady?: boolean;
  timeout?: Duration;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  retryPolicy?: RetryPolicy;
  hedgingPolicy?: HedgingPolicy;
}

export interface RetryThrottling {
  maxTokens: number;
  tokenRatio: number;
}

export interface LoadBalancingConfig {
  [key: string]: object;
}

export interface ServiceConfig {
  loadBalancingPolicy?: string;
  loadBalancingConfig: LoadBalancingConfig[];
  methodConfig: MethodConfig[];
  retryThrottling?: RetryThrottling;
}

export interface ServiceConfigCanaryConfig {
  clientLanguage?: string[];
  percentage?: number;
  clientHostname?: string[];
  serviceConfig: ServiceConfig;
}

/**
 * Recognizes a number with up to 9 digits after the decimal point, followed by
 * an "s", representing a number of seconds.
 */
const DURATION_REGEX = /^\d+(\.\d{1,9})?s$/;

/**
 * Client language name used for determining whether this client matches a
 * `ServiceConfigCanaryConfig`'s `clientLanguage` list.
 */
const CLIENT_LANGUAGE_STRING = 'node';

function validateName(obj: any): MethodConfigName {
  // In this context, and unset field and '' are considered the same
  if ('service' in obj && obj.service !== '') {
    if (typeof obj.service !== 'string') {
      throw new Error(
        `Invalid method config name: invalid service: expected type string, got ${typeof obj.service}`
      );
    }
    if ('method' in obj && obj.method !== '') {
      if (typeof obj.method !== 'string') {
        throw new Error(
          `Invalid method config name: invalid method: expected type string, got ${typeof obj.service}`
        );
      }
      return {
        service: obj.service,
        method: obj.method,
      };
    } else {
      return {
        service: obj.service,
      };
    }
  } else {
    if ('method' in obj && obj.method !== undefined) {
      throw new Error(
        `Invalid method config name: method set with empty or unset service`
      );
    }
    return {};
  }
}

function validateRetryPolicy(obj: any): RetryPolicy {
  if (
    !('maxAttempts' in obj) ||
    !Number.isInteger(obj.maxAttempts) ||
    obj.maxAttempts < 2
  ) {
    throw new Error(
      'Invalid method config retry policy: maxAttempts must be an integer at least 2'
    );
  }
  if (
    !('initialBackoff' in obj) ||
    typeof obj.initialBackoff !== 'string' ||
    !DURATION_REGEX.test(obj.initialBackoff)
  ) {
    throw new Error(
      'Invalid method config retry policy: initialBackoff must be a string consisting of a positive integer or decimal followed by s'
    );
  }
  if (
    !('maxBackoff' in obj) ||
    typeof obj.maxBackoff !== 'string' ||
    !DURATION_REGEX.test(obj.maxBackoff)
  ) {
    throw new Error(
      'Invalid method config retry policy: maxBackoff must be a string consisting of a positive integer or decimal followed by s'
    );
  }
  if (
    !('backoffMultiplier' in obj) ||
    typeof obj.backoffMultiplier !== 'number' ||
    obj.backoffMultiplier <= 0
  ) {
    throw new Error(
      'Invalid method config retry policy: backoffMultiplier must be a number greater than 0'
    );
  }
  if (
    !('retryableStatusCodes' in obj && Array.isArray(obj.retryableStatusCodes))
  ) {
    throw new Error(
      'Invalid method config retry policy: retryableStatusCodes is required'
    );
  }
  if (obj.retryableStatusCodes.length === 0) {
    throw new Error(
      'Invalid method config retry policy: retryableStatusCodes must be non-empty'
    );
  }
  for (const value of obj.retryableStatusCodes) {
    if (typeof value === 'number') {
      if (!Object.values(Status).includes(value)) {
        throw new Error(
          'Invalid method config retry policy: retryableStatusCodes value not in status code range'
        );
      }
    } else if (typeof value === 'string') {
      if (!Object.values(Status).includes(value.toUpperCase())) {
        throw new Error(
          'Invalid method config retry policy: retryableStatusCodes value not a status code name'
        );
      }
    } else {
      throw new Error(
        'Invalid method config retry policy: retryableStatusCodes value must be a string or number'
      );
    }
  }
  return {
    maxAttempts: obj.maxAttempts,
    initialBackoff: obj.initialBackoff,
    maxBackoff: obj.maxBackoff,
    backoffMultiplier: obj.backoffMultiplier,
    retryableStatusCodes: obj.retryableStatusCodes,
  };
}

function validateHedgingPolicy(obj: any): HedgingPolicy {
  if (
    !('maxAttempts' in obj) ||
    !Number.isInteger(obj.maxAttempts) ||
    obj.maxAttempts < 2
  ) {
    throw new Error(
      'Invalid method config hedging policy: maxAttempts must be an integer at least 2'
    );
  }
  if (
    'hedgingDelay' in obj &&
    (typeof obj.hedgingDelay !== 'string' ||
      !DURATION_REGEX.test(obj.hedgingDelay))
  ) {
    throw new Error(
      'Invalid method config hedging policy: hedgingDelay must be a string consisting of a positive integer followed by s'
    );
  }
  if ('nonFatalStatusCodes' in obj && Array.isArray(obj.nonFatalStatusCodes)) {
    for (const value of obj.nonFatalStatusCodes) {
      if (typeof value === 'number') {
        if (!Object.values(Status).includes(value)) {
          throw new Error(
            'Invalid method config hedging policy: nonFatalStatusCodes value not in status code range'
          );
        }
      } else if (typeof value === 'string') {
        if (!Object.values(Status).includes(value.toUpperCase())) {
          throw new Error(
            'Invalid method config hedging policy: nonFatalStatusCodes value not a status code name'
          );
        }
      } else {
        throw new Error(
          'Invalid method config hedging policy: nonFatalStatusCodes value must be a string or number'
        );
      }
    }
  }
  const result: HedgingPolicy = {
    maxAttempts: obj.maxAttempts,
  };
  if (obj.hedgingDelay) {
    result.hedgingDelay = obj.hedgingDelay;
  }
  if (obj.nonFatalStatusCodes) {
    result.nonFatalStatusCodes = obj.nonFatalStatusCodes;
  }
  return result;
}

function validateMethodConfig(obj: any): MethodConfig {
  const result: MethodConfig = {
    name: [],
  };
  if (!('name' in obj) || !Array.isArray(obj.name)) {
    throw new Error('Invalid method config: invalid name array');
  }
  for (const name of obj.name) {
    result.name.push(validateName(name));
  }
  if ('waitForReady' in obj) {
    if (typeof obj.waitForReady !== 'boolean') {
      throw new Error('Invalid method config: invalid waitForReady');
    }
    result.waitForReady = obj.waitForReady;
  }
  if ('timeout' in obj) {
    if (typeof obj.timeout === 'object') {
      if (
        !('seconds' in obj.timeout) ||
        !(typeof obj.timeout.seconds === 'number')
      ) {
        throw new Error('Invalid method config: invalid timeout.seconds');
      }
      if (
        !('nanos' in obj.timeout) ||
        !(typeof obj.timeout.nanos === 'number')
      ) {
        throw new Error('Invalid method config: invalid timeout.nanos');
      }
      result.timeout = obj.timeout;
    } else if (
      typeof obj.timeout === 'string' &&
      DURATION_REGEX.test(obj.timeout)
    ) {
      const timeoutParts = obj.timeout
        .substring(0, obj.timeout.length - 1)
        .split('.');
      result.timeout = {
        seconds: timeoutParts[0] | 0,
        nanos: (timeoutParts[1] ?? 0) | 0,
      };
    } else {
      throw new Error('Invalid method config: invalid timeout');
    }
  }
  if ('maxRequestBytes' in obj) {
    if (typeof obj.maxRequestBytes !== 'number') {
      throw new Error('Invalid method config: invalid maxRequestBytes');
    }
    result.maxRequestBytes = obj.maxRequestBytes;
  }
  if ('maxResponseBytes' in obj) {
    if (typeof obj.maxResponseBytes !== 'number') {
      throw new Error('Invalid method config: invalid maxRequestBytes');
    }
    result.maxResponseBytes = obj.maxResponseBytes;
  }
  if ('retryPolicy' in obj) {
    if ('hedgingPolicy' in obj) {
      throw new Error(
        'Invalid method config: retryPolicy and hedgingPolicy cannot both be specified'
      );
    } else {
      result.retryPolicy = validateRetryPolicy(obj.retryPolicy);
    }
  } else if ('hedgingPolicy' in obj) {
    result.hedgingPolicy = validateHedgingPolicy(obj.hedgingPolicy);
  }
  return result;
}

export function validateRetryThrottling(obj: any): RetryThrottling {
  if (
    !('maxTokens' in obj) ||
    typeof obj.maxTokens !== 'number' ||
    obj.maxTokens <= 0 ||
    obj.maxTokens > 1000
  ) {
    throw new Error(
      'Invalid retryThrottling: maxTokens must be a number in (0, 1000]'
    );
  }
  if (
    !('tokenRatio' in obj) ||
    typeof obj.tokenRatio !== 'number' ||
    obj.tokenRatio <= 0
  ) {
    throw new Error(
      'Invalid retryThrottling: tokenRatio must be a number greater than 0'
    );
  }
  return {
    maxTokens: +(obj.maxTokens as number).toFixed(3),
    tokenRatio: +(obj.tokenRatio as number).toFixed(3),
  };
}

function validateLoadBalancingConfig(obj: any): LoadBalancingConfig {
  if (!(typeof obj === 'object' && obj !== null)) {
    throw new Error(
      `Invalid loadBalancingConfig: unexpected type ${typeof obj}`
    );
  }
  const keys = Object.keys(obj);
  if (keys.length > 1) {
    throw new Error(
      `Invalid loadBalancingConfig: unexpected multiple keys ${keys}`
    );
  }
  if (keys.length === 0) {
    throw new Error(
      'Invalid loadBalancingConfig: load balancing policy name required'
    );
  }
  return {
    [keys[0]]: obj[keys[0]],
  };
}

export function validateServiceConfig(obj: any): ServiceConfig {
  const result: ServiceConfig = {
    loadBalancingConfig: [],
    methodConfig: [],
  };
  if ('loadBalancingPolicy' in obj) {
    if (typeof obj.loadBalancingPolicy === 'string') {
      result.loadBalancingPolicy = obj.loadBalancingPolicy;
    } else {
      throw new Error('Invalid service config: invalid loadBalancingPolicy');
    }
  }
  if ('loadBalancingConfig' in obj) {
    if (Array.isArray(obj.loadBalancingConfig)) {
      for (const config of obj.loadBalancingConfig) {
        result.loadBalancingConfig.push(validateLoadBalancingConfig(config));
      }
    } else {
      throw new Error('Invalid service config: invalid loadBalancingConfig');
    }
  }
  if ('methodConfig' in obj) {
    if (Array.isArray(obj.methodConfig)) {
      for (const methodConfig of obj.methodConfig) {
        result.methodConfig.push(validateMethodConfig(methodConfig));
      }
    }
  }
  if ('retryThrottling' in obj) {
    result.retryThrottling = validateRetryThrottling(obj.retryThrottling);
  }
  // Validate method name uniqueness
  const seenMethodNames: MethodConfigName[] = [];
  for (const methodConfig of result.methodConfig) {
    for (const name of methodConfig.name) {
      for (const seenName of seenMethodNames) {
        if (
          name.service === seenName.service &&
          name.method === seenName.method
        ) {
          throw new Error(
            `Invalid service config: duplicate name ${name.service}/${name.method}`
          );
        }
      }
      seenMethodNames.push(name);
    }
  }
  return result;
}

function validateCanaryConfig(obj: any): ServiceConfigCanaryConfig {
  if (!('serviceConfig' in obj)) {
    throw new Error('Invalid service config choice: missing service config');
  }
  const result: ServiceConfigCanaryConfig = {
    serviceConfig: validateServiceConfig(obj.serviceConfig),
  };
  if ('clientLanguage' in obj) {
    if (Array.isArray(obj.clientLanguage)) {
      result.clientLanguage = [];
      for (const lang of obj.clientLanguage) {
        if (typeof lang === 'string') {
          result.clientLanguage.push(lang);
        } else {
          throw new Error(
            'Invalid service config choice: invalid clientLanguage'
          );
        }
      }
    } else {
      throw new Error('Invalid service config choice: invalid clientLanguage');
    }
  }
  if ('clientHostname' in obj) {
    if (Array.isArray(obj.clientHostname)) {
      result.clientHostname = [];
      for (const lang of obj.clientHostname) {
        if (typeof lang === 'string') {
          result.clientHostname.push(lang);
        } else {
          throw new Error(
            'Invalid service config choice: invalid clientHostname'
          );
        }
      }
    } else {
      throw new Error('Invalid service config choice: invalid clientHostname');
    }
  }
  if ('percentage' in obj) {
    if (
      typeof obj.percentage === 'number' &&
      0 <= obj.percentage &&
      obj.percentage <= 100
    ) {
      result.percentage = obj.percentage;
    } else {
      throw new Error('Invalid service config choice: invalid percentage');
    }
  }
  // Validate that no unexpected fields are present
  const allowedFields = [
    'clientLanguage',
    'percentage',
    'clientHostname',
    'serviceConfig',
  ];
  for (const field in obj) {
    if (!allowedFields.includes(field)) {
      throw new Error(
        `Invalid service config choice: unexpected field ${field}`
      );
    }
  }
  return result;
}

function validateAndSelectCanaryConfig(
  obj: any,
  percentage: number
): ServiceConfig {
  if (!Array.isArray(obj)) {
    throw new Error('Invalid service config list');
  }
  for (const config of obj) {
    const validatedConfig = validateCanaryConfig(config);
    /* For each field, we check if it is present, then only discard the
     * config if the field value does not match the current client */
    if (
      typeof validatedConfig.percentage === 'number' &&
      percentage > validatedConfig.percentage
    ) {
      continue;
    }
    if (Array.isArray(validatedConfig.clientHostname)) {
      let hostnameMatched = false;
      for (const hostname of validatedConfig.clientHostname) {
        if (hostname === os.hostname()) {
          hostnameMatched = true;
        }
      }
      if (!hostnameMatched) {
        continue;
      }
    }
    if (Array.isArray(validatedConfig.clientLanguage)) {
      let languageMatched = false;
      for (const language of validatedConfig.clientLanguage) {
        if (language === CLIENT_LANGUAGE_STRING) {
          languageMatched = true;
        }
      }
      if (!languageMatched) {
        continue;
      }
    }
    return validatedConfig.serviceConfig;
  }
  throw new Error('No matching service config found');
}

/**
 * Find the "grpc_config" record among the TXT records, parse its value as JSON, validate its contents,
 * and select a service config with selection fields that all match this client. Most of these steps
 * can fail with an error; the caller must handle any errors thrown this way.
 * @param txtRecord The TXT record array that is output from a successful call to dns.resolveTxt
 * @param percentage A number chosen from the range [0, 100) that is used to select which config to use
 * @return The service configuration to use, given the percentage value, or null if the service config
 *     data has a valid format but none of the options match the current client.
 */
export function extractAndSelectServiceConfig(
  txtRecord: string[][],
  percentage: number
): ServiceConfig | null {
  for (const record of txtRecord) {
    if (record.length > 0 && record[0].startsWith('grpc_config=')) {
      /* Treat the list of strings in this record as a single string and remove
       * "grpc_config=" from the beginning. The rest should be a JSON string */
      const recordString = record.join('').substring('grpc_config='.length);
      const recordJson: any = JSON.parse(recordString);
      return validateAndSelectCanaryConfig(recordJson, percentage);
    }
  }
  return null;
}
