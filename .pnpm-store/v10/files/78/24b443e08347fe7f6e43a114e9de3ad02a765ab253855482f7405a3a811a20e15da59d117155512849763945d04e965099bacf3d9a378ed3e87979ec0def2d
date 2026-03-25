// Copyright (c) 2024, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

/**
 * TraceHandler interface defination which application needs to implement
 * the hooks defined. The hooks will be called by the driver with traceContext
 * data.
 *
 * TraceContext Data details.
 * connectLevelConfig - Connection Config details.
 *      protcol         - tcp/tcps protocol.
 *      user            - user/schema associated.
 *      instanceName    - instance Name.
 *      pdbName         - PDB name.
 *      serviceName     - service name.
 *      connectString   - connect string passed.
 *      hostName        - host name.
 *      port            - port number.
 *      poolMin         - pool Min.
 *      poolMax         - pool Max.
 *      poolIncrement   - pool Increment.
 *
 * callLevelConfig - Post connection, call leveldetails.
 *      statement       - SQL statement.
 *      values          - Bind values.
 *
 * additionalConfig - Custom Config based on the methods executed.
 *      args            - input arguments of function.
 *      self            - the current instance on which function is called.
 *      result          - the result object returned after calling function.
 *      implicitRelease - true if implicit release is done.
 *
 */

class TraceHandlerBase {

  constructor() {
    this._config = {};
  }

  // check if sending traces is enabled.
  isEnabled() {
    return (this._config.enable);
  }

  // Enable sending traces
  enable() {
    this._config.enable = true;
  }

  // Disable sending traces
  disable() {
    this._config.enable = false;
  }

  // It is called before invoking a public async method.
  onEnterFn(/*traceContext*/) {
  }

  // It is called after invoking a public async method.
  // The same traceContext object passed inside onEnterFn
  // will be passed in this function.
  onExitFn(/*traceContext*/) {
  }

  // called when a round trip is begun
  // OpenTelemetry will start a new span as a child of the public API span.
  onBeginRoundTrip(/*traceContext*/) {
  }

  // called when a round trip has ended
  // OpenTelemetry will end the span
  // The same traceContext object passed inside onBeginRoundTrip
  // is passed here.
  onEndRoundTrip(/*traceContext*/) {
  }

}

// singleton object pointing to traceHandler instance.
let _currentTraceObject;

// It enables user defined implementation of
// TraceHandlerBase interface to be used.
function setTraceInstance(obj) {
  _currentTraceObject = obj;
}

// It returns the user defined instance implementing the interface.
function getTraceInstance() {
  return _currentTraceObject;
}

// returns if tracing is enabled.
function isEnabled() {
  return _currentTraceObject?.isEnabled();
}

module.exports = {
  // class
  TraceHandlerBase,

  // methods
  setTraceInstance,
  getTraceInstance,
  isEnabled

};
