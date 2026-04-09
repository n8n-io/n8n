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
var Thrift = require('./thrift');

exports.MultiplexedProcessor = MultiplexedProcessor;

function MultiplexedProcessor(stream, options) {
  this.services = {};
};

MultiplexedProcessor.prototype.registerProcessor = function(name, handler) {
  this.services[name] = handler;
};

MultiplexedProcessor.prototype.process = function(inp, out) {
  var begin = inp.readMessageBegin();

  if (begin.mtype != Thrift.MessageType.CALL && begin.mtype != Thrift.MessageType.ONEWAY) {
    throw new Thrift.TException('TMultiplexedProcessor: Unexpected message type');
  }

  var p = begin.fname.split(':');
  var sname = p[0];
  var fname = p[1];

  if (! (sname in this.services)) {
    throw new Thrift.TException('TMultiplexedProcessor: Unknown service: ' + sname);
  }

  //construct a proxy object which stubs the readMessageBegin
  //for the service
  var inpProxy = {};

  for (var attr in inp) {
    inpProxy[attr] = inp[attr];
  }

  inpProxy.readMessageBegin = function() {
    return {
      fname: fname,
      mtype: begin.mtype,
      rseqid: begin.rseqid
    };
  };

  this.services[sname].process(inpProxy, out);
};
