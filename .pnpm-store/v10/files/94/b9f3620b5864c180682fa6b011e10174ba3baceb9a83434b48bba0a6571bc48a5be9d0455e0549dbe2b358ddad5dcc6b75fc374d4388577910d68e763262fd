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
var EventEmitter = require('events').EventEmitter;
var constants = require('constants');
var net = require('net');
var tls = require('tls');
var thrift = require('./thrift');
var log = require('./log');

var TBufferedTransport = require('./buffered_transport');
var TBinaryProtocol = require('./binary_protocol');
var InputBufferUnderrunError = require('./input_buffer_underrun_error');

var createClient = require('./create_client');

var binary = require('./binary');

var Connection = exports.Connection = function(stream, options) {
  var self = this;
  EventEmitter.call(this);

  this.seqId2Service = {};
  this.connection = stream;
  this.ssl = (stream.encrypted);
  this.options = options || {};
  this.transport = this.options.transport || TBufferedTransport;
  this.protocol = this.options.protocol || TBinaryProtocol;
  this.offline_queue = [];
  this.connected = false;
  this.forceClose = false;
  this.initialize_retry_vars();

  this._debug = this.options.debug || false;
  if (this.options.max_attempts &&
      !isNaN(this.options.max_attempts) &&
      this.options.max_attempts > 0) {
     this.max_attempts = +this.options.max_attempts;
  }
  this.retry_max_delay = null;
  if (this.options.retry_max_delay !== undefined &&
      !isNaN(this.options.retry_max_delay) &&
      this.options.retry_max_delay > 0) {
     this.retry_max_delay = this.options.retry_max_delay;
  }
  this.connect_timeout = false;
  if (this.options.connect_timeout &&
      !isNaN(this.options.connect_timeout) &&
      this.options.connect_timeout > 0) {
     this.connect_timeout = +this.options.connect_timeout;
  }

  this.connection.addListener(this.ssl ? "secureConnect" : "connect", function() {
    self.connected = true;

    this.setTimeout(self.options.timeout || 0);
    this.setNoDelay();
    this.frameLeft = 0;
    this.framePos = 0;
    this.frame = null;
    self.initialize_retry_vars();
    self.flush_offline_queue();

    self.emit("connect");
  });

  this.connection.addListener("error", function(err) {
    // Only emit the error if no-one else is listening on the connection
    // or if someone is listening on us, because Node turns unhandled
    // 'error' events into exceptions.
    if (self.connection.listeners('error').length === 1 ||
        self.listeners('error').length > 0) {
      self.emit("error", err);
    }
  });

  // Add a close listener
  this.connection.addListener("close", function() {
    self.connection_gone(); // handle close event. try to reconnect
  });

  this.connection.addListener("timeout", function() {
    self.emit("timeout");
  });

  this.connection.addListener("data", self.transport.receiver(function(transport_with_data) {
    var message = new self.protocol(transport_with_data);
    try {
      while (true) {
        var header = message.readMessageBegin();
        var dummy_seqid = header.rseqid * -1;
        var client = self.client;
        //The Multiplexed Protocol stores a hash of seqid to service names
        //  in seqId2Service. If the SeqId is found in the hash we need to
        //  lookup the appropriate client for this call.
        //  The connection.client object is a single client object when not
        //  multiplexing, when using multiplexing it is a service name keyed
        //  hash of client objects.
        //NOTE: The 2 way interdependencies between protocols, transports,
        //  connections and clients in the Node.js implementation are irregular
        //  and make the implementation difficult to extend and maintain. We
        //  should bring this stuff inline with typical thrift I/O stack
        //  operation soon.
        //  --ra
        var service_name = self.seqId2Service[header.rseqid];
        if (service_name) {
          client = self.client[service_name];
        }
        /*jshint -W083 */
        client._reqs[dummy_seqid] = function(err, success){
          transport_with_data.commitPosition();

          var callback = client._reqs[header.rseqid];
          delete client._reqs[header.rseqid];
          if (service_name) {
            delete self.seqId2Service[header.rseqid];
          }
          if (callback) {
            callback(err, success);
          }
        };
        /*jshint +W083 */

        if(client['recv_' + header.fname]) {
          client['recv_' + header.fname](message, header.mtype, dummy_seqid);
        } else {
          delete client._reqs[dummy_seqid];
          self.emit("error",
                    new thrift.TApplicationException(thrift.TApplicationExceptionType.WRONG_METHOD_NAME,
                             "Received a response to an unknown RPC function"));
        }
      }
    }
    catch (e) {
      if (e instanceof InputBufferUnderrunError) {
        transport_with_data.rollbackPosition();
      }
      else {
        self.emit('error', e);
      }
    }
  }));
};
util.inherits(Connection, EventEmitter);

Connection.prototype.end = function() {
  this.forceClose = true;
  this.connection.end();
};

Connection.prototype.destroy = function() {
  this.connection.destroy();
};

Connection.prototype.initialize_retry_vars = function () {
  this.retry_timer = null;
  this.retry_totaltime = 0;
  this.retry_delay = 150;
  this.retry_backoff = 1.7;
  this.attempts = 0;
};

Connection.prototype.flush_offline_queue = function () {
  var self = this;
  var offline_queue = this.offline_queue;

  // Reset offline queue
  this.offline_queue = [];
  // Attempt to write queued items
  offline_queue.forEach(function(data) {
    self.write(data);
  });
};

Connection.prototype.write = function(data) {
  if (!this.connected) {
    this.offline_queue.push(data);
    return;
  }
  this.connection.write(data);
};

Connection.prototype.connection_gone = function () {
  var self = this;
  this.connected = false;

  // If closed by manual, emit close event and cancel reconnect process
  if(this.forceClose) {
    if (this.retry_timer) {
      clearTimeout(this.retry_timer);
      this.retry_timer = null;
    }
    self.emit("close");
    return;
  }

  // If a retry is already in progress, just let that happen
  if (this.retry_timer) {
    return;
  }
  // We cannot reconnect a secure socket.
  if (!this.max_attempts || this.ssl) {
    self.emit("close");
    return;
  }

  if (this.retry_max_delay !== null && this.retry_delay >= this.retry_max_delay) {
    this.retry_delay = this.retry_max_delay;
  } else {
    this.retry_delay = Math.floor(this.retry_delay * this.retry_backoff);
  }

  log.debug("Retry connection in " + this.retry_delay + " ms");

  if (this.max_attempts && this.attempts >= this.max_attempts) {
    this.retry_timer = null;
    console.error("thrift: Couldn't get thrift connection after " + this.max_attempts + " attempts.");
    self.emit("close");
    return;
  }

  this.attempts += 1;
  this.emit("reconnecting", {
    delay: self.retry_delay,
    attempt: self.attempts
  });

  this.retry_timer = setTimeout(function () {
    log.debug("Retrying connection...");

    self.retry_totaltime += self.retry_delay;

    if (self.connect_timeout && self.retry_totaltime >= self.connect_timeout) {
       self.retry_timer = null;
       console.error("thrift: Couldn't get thrift connection after " + self.retry_totaltime + "ms.");
       self.emit("close");
       return;
    }

    if (self.path !== undefined) {
      self.connection.connect(self.path);
    } else {
      self.connection.connect(self.port, self.host);
    }
    self.retry_timer = null;
  }, this.retry_delay);
};

exports.createConnection = function(host, port, options) {
  var stream = net.createConnection( {
    port: port,
    host: host,
    timeout: options.connect_timeout || options.timeout || 0
  });
  var connection = new Connection(stream, options);
  connection.host = host;
  connection.port = port;

  return connection;
};

exports.createUDSConnection = function(path, options) {
  var stream = net.createConnection(path);
  var connection = new Connection(stream, options);
  connection.path = path;

  return connection;
};

exports.createSSLConnection = function(host, port, options) {
  if (!('secureProtocol' in options) && !('secureOptions' in options)) {
    options.secureProtocol = "SSLv23_method";
    options.secureOptions = constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3;
  }

  var stream = tls.connect(port, host, options);
  var connection = new Connection(stream, options);
  connection.host = host;
  connection.port = port;

  return connection;
};


exports.createClient = createClient;

var child_process = require('child_process');
var StdIOConnection = exports.StdIOConnection = function(command, options) {
  var command_parts = command.split(' ');
  command = command_parts[0];
  var args = command_parts.splice(1,command_parts.length -1);
  var child = this.child = child_process.spawn(command,args);

  var self = this;
  EventEmitter.call(this);

  this.connection = child.stdin;
  this.options = options || {};
  this.transport = this.options.transport || TBufferedTransport;
  this.protocol = this.options.protocol || TBinaryProtocol;
  this.offline_queue = [];

  if (log.getLogLevel() === 'debug') {
    this.child.stderr.on('data', function (err) {
      log.debug(err.toString(), 'CHILD ERROR');
    });

    this.child.on('exit', function (code,signal) {
      log.debug(code + ':' + signal, 'CHILD EXITED');
    });
  }

  this.frameLeft = 0;
  this.framePos = 0;
  this.frame = null;
  this.connected = true;

  self.flush_offline_queue();

  this.connection.addListener("error", function(err) {
    self.emit("error", err);
  });

  // Add a close listener
  this.connection.addListener("close", function() {
    self.emit("close");
  });

  child.stdout.addListener("data", self.transport.receiver(function(transport_with_data) {
    var message = new self.protocol(transport_with_data);
    try {
      var header = message.readMessageBegin();
      var dummy_seqid = header.rseqid * -1;
      var client = self.client;
      client._reqs[dummy_seqid] = function(err, success){
        transport_with_data.commitPosition();

        var callback = client._reqs[header.rseqid];
        delete client._reqs[header.rseqid];
        if (callback) {
          callback(err, success);
        }
      };
      client['recv_' + header.fname](message, header.mtype, dummy_seqid);
    }
    catch (e) {
      if (e instanceof InputBufferUnderrunError) {
        transport_with_data.rollbackPosition();
      }
      else {
        throw e;
      }
    }
  }));
};

util.inherits(StdIOConnection, EventEmitter);

StdIOConnection.prototype.end = function() {
  this.connection.end();
};

StdIOConnection.prototype.flush_offline_queue = function () {
  var self = this;
  var offline_queue = this.offline_queue;

  // Reset offline queue
  this.offline_queue = [];
  // Attempt to write queued items
  offline_queue.forEach(function(data) {
    self.write(data);
  });
};

StdIOConnection.prototype.write = function(data) {
  if (!this.connected) {
    this.offline_queue.push(data);
    return;
  }
  this.connection.write(data);
};

exports.createStdIOConnection = function(command,options){
  return new StdIOConnection(command,options);
};

exports.createStdIOClient = createClient;
