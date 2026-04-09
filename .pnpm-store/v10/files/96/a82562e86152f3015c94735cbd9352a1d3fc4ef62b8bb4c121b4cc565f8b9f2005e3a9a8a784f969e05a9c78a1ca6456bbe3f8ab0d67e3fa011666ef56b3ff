/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var util = require('util');

var disabled = function () {};
var logFunc = console.log;
var logLevel = 'error'; // default level

function factory(level) {
  return function () {
    // better use spread syntax, but due to compatibility,
    // use legacy method here.
    var args = ['thrift: [' + level + '] '].concat(Array.from(arguments));
    return logFunc(util.format.apply(null, args));
  };
}

var trace = disabled;
var debug = disabled;
var error = disabled;
var warning = disabled;
var info = disabled;

exports.setLogFunc = function (func) {
  logFunc = func;
};

var setLogLevel = exports.setLogLevel = function (level) {
  trace = debug = error = warning = info = disabled;
  logLevel = level;
  switch (logLevel) {
  case 'trace':
    trace = factory('TRACE');
  case 'debug':
    debug = factory('DEBUG');
  case 'error':
    error = factory('ERROR');
  case 'warning':
    warning = factory('WARN');
  case 'info':
    info = factory('INFO');
  }
};

// set default
setLogLevel(logLevel);

exports.getLogLevel = function () {
  return logLevel;
};

exports.trace = function () {
  return trace.apply(null, arguments);
};

exports.debug = function () {
  return debug.apply(null, arguments);
};

exports.error = function () {
  return error.apply(null, arguments);
};

exports.warning = function () {
  return warning.apply(null, arguments);
};

exports.info = function () {
  return info.apply(null, arguments);
};
