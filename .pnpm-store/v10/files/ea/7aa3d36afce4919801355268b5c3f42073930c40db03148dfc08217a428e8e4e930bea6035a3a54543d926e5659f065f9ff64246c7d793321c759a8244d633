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

import { LogVerbosity } from './constants';
import { pid } from 'process';

const clientVersion = require('../../package.json').version;

const DEFAULT_LOGGER: Partial<Console> = {
  error: (message?: any, ...optionalParams: any[]) => {
    console.error('E ' + message, ...optionalParams);
  },
  info: (message?: any, ...optionalParams: any[]) => {
    console.error('I ' + message, ...optionalParams);
  },
  debug: (message?: any, ...optionalParams: any[]) => {
    console.error('D ' + message, ...optionalParams);
  },
};

let _logger: Partial<Console> = DEFAULT_LOGGER;
let _logVerbosity: LogVerbosity = LogVerbosity.ERROR;

const verbosityString =
  process.env.GRPC_NODE_VERBOSITY ?? process.env.GRPC_VERBOSITY ?? '';

switch (verbosityString.toUpperCase()) {
  case 'DEBUG':
    _logVerbosity = LogVerbosity.DEBUG;
    break;
  case 'INFO':
    _logVerbosity = LogVerbosity.INFO;
    break;
  case 'ERROR':
    _logVerbosity = LogVerbosity.ERROR;
    break;
  case 'NONE':
    _logVerbosity = LogVerbosity.NONE;
    break;
  default:
  // Ignore any other values
}

export const getLogger = (): Partial<Console> => {
  return _logger;
};

export const setLogger = (logger: Partial<Console>): void => {
  _logger = logger;
};

export const setLoggerVerbosity = (verbosity: LogVerbosity): void => {
  _logVerbosity = verbosity;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (severity: LogVerbosity, ...args: any[]): void => {
  let logFunction: typeof DEFAULT_LOGGER.error;
  if (severity >= _logVerbosity) {
    switch (severity) {
      case LogVerbosity.DEBUG:
        logFunction = _logger.debug;
        break;
      case LogVerbosity.INFO:
        logFunction = _logger.info;
        break;
      case LogVerbosity.ERROR:
        logFunction = _logger.error;
        break;
    }
    /* Fall back to _logger.error when other methods are not available for
     * compatiblity with older behavior that always logged to _logger.error */
    if (!logFunction) {
      logFunction = _logger.error;
    }
    if (logFunction) {
      logFunction.bind(_logger)(...args);
    }
  }
};

const tracersString =
  process.env.GRPC_NODE_TRACE ?? process.env.GRPC_TRACE ?? '';
const enabledTracers = new Set<string>();
const disabledTracers = new Set<string>();
for (const tracerName of tracersString.split(',')) {
  if (tracerName.startsWith('-')) {
    disabledTracers.add(tracerName.substring(1));
  } else {
    enabledTracers.add(tracerName);
  }
}
const allEnabled = enabledTracers.has('all');

export function trace(
  severity: LogVerbosity,
  tracer: string,
  text: string
): void {
  if (isTracerEnabled(tracer)) {
    log(
      severity,
      new Date().toISOString() +
        ' | v' +
        clientVersion +
        ' ' +
        pid +
        ' | ' +
        tracer +
        ' | ' +
        text
    );
  }
}

export function isTracerEnabled(tracer: string): boolean {
  return (
    !disabledTracers.has(tracer) && (allEnabled || enabledTracers.has(tracer))
  );
}
