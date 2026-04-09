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

var log = require('./log');

module.exports = TWebSocketTransport;

/**
 * Constructor Function for the WebSocket transport.
 * @constructor
 * @param {string} [url] - The URL to connect to.
 * @classdesc The Apache Thrift Transport layer performs byte level I/O
 * between RPC clients and servers. The JavaScript TWebSocketTransport object
 * uses the WebSocket protocol. Target servers must implement WebSocket.
 * (see: node.js example server_http.js).
 * @example
 *   var transport = new Thrift.TWebSocketTransport("http://localhost:8585");
 */
function TWebSocketTransport(url) {
    this.__reset(url);
};


TWebSocketTransport.prototype.__reset = function(url) {
  this.url = url;             //Where to connect
  this.socket = null;         //The web socket
  this.callbacks = [];        //Pending callbacks
  this.send_pending = [];     //Buffers/Callback pairs waiting to be sent
  this.send_buf = '';         //Outbound data, immutable until sent
  this.recv_buf = '';         //Inbound data
  this.rb_wpos = 0;           //Network write position in receive buffer
  this.rb_rpos = 0;           //Client read position in receive buffer
};

/**
 * Sends the current WS request and registers callback. The async
 * parameter is ignored (WS flush is always async) and the callback
 * function parameter is required.
 * @param {object} async - Ignored.
 * @param {object} callback - The client completion callback.
 * @returns {undefined|string} Nothing (undefined)
 */
TWebSocketTransport.prototype.flush = function(async, callback) {
  var self = this;
  if (this.isOpen()) {
    //Send data and register a callback to invoke the client callback
    this.socket.send(this.send_buf);
    this.callbacks.push((function() {
      var clientCallback = callback;
      return function(msg) {
        self.setRecvBuffer(msg);
        clientCallback();
      };
    }()));
  } else {
    //Queue the send to go out __onOpen
    this.send_pending.push({
      buf: this.send_buf,
      cb:  callback
    });
  }
};

TWebSocketTransport.prototype.__onOpen = function() {
   var self = this;
   if (this.send_pending.length > 0) {
      //If the user made calls before the connection was fully
      //open, send them now
      this.send_pending.forEach(function(elem) {
         self.socket.send(elem.buf);
         self.callbacks.push((function() {
           var clientCallback = elem.cb;
           return function(msg) {
              self.setRecvBuffer(msg);
              clientCallback();
           };
         }()));
      });
      this.send_pending = [];
   }
};

TWebSocketTransport.prototype.__onClose = function(evt) {
  this.__reset(this.url);
};

TWebSocketTransport.prototype.__onMessage = function(evt) {
  if (this.callbacks.length) {
    this.callbacks.shift()(evt.data);
  }
};

TWebSocketTransport.prototype.__onError = function(evt) {
  log.error('websocket: ' + evt.toString());
  this.socket.close();
};

/**
 * Sets the buffer to use when receiving server responses.
 * @param {string} buf - The buffer to receive server responses.
 */
TWebSocketTransport.prototype.setRecvBuffer = function(buf) {
  this.recv_buf = buf;
  this.recv_buf_sz = this.recv_buf.length;
  this.wpos = this.recv_buf.length;
  this.rpos = 0;
};

/**
 * Returns true if the transport is open
 * @readonly
 * @returns {boolean}
 */
TWebSocketTransport.prototype.isOpen = function() {
  return this.socket && this.socket.readyState == this.socket.OPEN;
};

/**
 * Opens the transport connection
 */
TWebSocketTransport.prototype.open = function() {
  //If OPEN/CONNECTING/CLOSING ignore additional opens
  if (this.socket && this.socket.readyState != this.socket.CLOSED) {
    return;
  }
  //If there is no socket or the socket is closed:
  this.socket = new WebSocket(this.url);
  this.socket.onopen = this.__onOpen.bind(this);
  this.socket.onmessage = this.__onMessage.bind(this);
  this.socket.onerror = this.__onError.bind(this);
  this.socket.onclose = this.__onClose.bind(this);
};

/**
 * Closes the transport connection
 */
TWebSocketTransport.prototype.close = function() {
  this.socket.close();
};

/**
 * Returns the specified number of characters from the response
 * buffer.
 * @param {number} len - The number of characters to return.
 * @returns {string} Characters sent by the server.
 */
TWebSocketTransport.prototype.read = function(len) {
  var avail = this.wpos - this.rpos;

  if (avail === 0) {
    return '';
  }

  var give = len;

  if (avail < len) {
    give = avail;
  }

  var ret = this.read_buf.substr(this.rpos, give);
  this.rpos += give;

  //clear buf when complete?
  return ret;
};

/**
 * Returns the entire response buffer.
 * @returns {string} Characters sent by the server.
 */
TWebSocketTransport.prototype.readAll = function() {
  return this.recv_buf;
};

/**
 * Sets the send buffer to buf.
 * @param {string} buf - The buffer to send.
 */
TWebSocketTransport.prototype.write = function(buf) {
  this.send_buf = buf;
};

/**
 * Returns the send buffer.
 * @readonly
 * @returns {string} The send buffer.
 */
TWebSocketTransport.prototype.getSendBuffer = function() {
  return this.send_buf;
};
