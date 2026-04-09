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
var Thrift = require('./thrift');

exports.Multiplexer = Multiplexer;

function Wrapper(serviceName, protocol, connection) {

  function MultiplexProtocol(trans, strictRead, strictWrite) {
    protocol.call(this, trans, strictRead, strictWrite);
  };

  util.inherits(MultiplexProtocol, protocol);

  MultiplexProtocol.prototype.writeMessageBegin = function(name, type, seqid) {
    if (type == Thrift.MessageType.CALL || type == Thrift.MessageType.ONEWAY) {
      connection.seqId2Service[seqid] = serviceName;
      MultiplexProtocol.super_.prototype.writeMessageBegin.call(this,
                                                                serviceName + ":" + name,
                                                                type,
                                                                seqid);
    } else {
      MultiplexProtocol.super_.prototype.writeMessageBegin.call(this, name, type, seqid);
    }
  };

  return MultiplexProtocol;
};

function Multiplexer() {
  this.seqid = 0;
};

Multiplexer.prototype.createClient = function(serviceName, ServiceClient, connection) {
  if (ServiceClient.Client) {
    ServiceClient = ServiceClient.Client;
  }
  var writeCb = function(buf, seqid) {
    connection.write(buf,seqid);
  };
  var transport = new connection.transport(undefined, writeCb);
  var protocolWrapper = new Wrapper(serviceName, connection.protocol, connection);
  var client = new ServiceClient(transport, protocolWrapper);
  var self = this;
  client.new_seqid = function() {
    self.seqid += 1;
    return self.seqid;
  };

  if (typeof connection.client !== 'object') {
    connection.client = {};
  }
  connection.client[serviceName] = client;

  return client;
};
