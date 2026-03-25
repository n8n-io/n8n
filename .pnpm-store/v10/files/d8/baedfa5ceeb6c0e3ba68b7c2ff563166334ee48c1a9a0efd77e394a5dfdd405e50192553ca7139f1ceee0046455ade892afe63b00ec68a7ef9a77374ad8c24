/*
 * Copyright 2015 Red Hat Inc.
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
 */
'use strict';

var Connection = require('./connection.js');
var log = require('./log.js');
var sasl = require('./sasl.js');
var util = require('./util.js');
var eventTypes = require('./eventTypes.js');

var net = require('net');
var tls = require('tls');
var EventEmitter = require('events').EventEmitter;

var Container = function (options) {
    this.options = options ? Object.create(options) : {};
    if (!this.options.id) {
        this.options.id = util.generate_uuid();
    }
    this.id = this.options.id;
    this.sasl_server_mechanisms = sasl.server_mechanisms();
};

Container.prototype = Object.create(EventEmitter.prototype);
Container.prototype.constructor = Container;
Container.prototype.dispatch = function(name) {
    log.events('[%s] Container got event: ' + name, this.id);
    EventEmitter.prototype.emit.apply(this, arguments);
    if (this.listeners(name).length) {
        return true;
    } else {
        return false;
    }
};

Container.prototype.connect = function (options) {
    return new Connection(options, this).connect();
};

Container.prototype.create_connection = function (options) {
    return new Connection(options, this);
};

Container.prototype.listen = function (options) {
    var container = this;
    var server;
    if (options.transport === undefined || options.transport === 'tcp') {
        server = net.createServer(options);
        server.on('connection', function (socket) {
            new Connection(options, container).accept(socket);
        });
    } else if (options.transport === 'tls' || options.transport === 'ssl') {
        server = tls.createServer(options);
        server.on('secureConnection', function (socket) {
            new Connection(options, container).accept(socket);
        });
    } else {
        throw Error('Unrecognised transport: ' + options.transport);
    }
    if (process.version.match(/v0\.10\.\d+/)) {
        server.listen(options.port, options.host);
    } else {
        server.listen(options);
    }
    return server;
};

Container.prototype.create_container = function (options) {
    return new Container(options);
};

Container.prototype.get_option = function (name, default_value) {
    if (this.options[name] !== undefined) return this.options[name];
    else return default_value;
};

Container.prototype.generate_uuid = util.generate_uuid;
Container.prototype.string_to_uuid = util.string_to_uuid;
Container.prototype.uuid_to_string = util.uuid_to_string;
var ws = require('./ws.js');
Container.prototype.websocket_accept = function(socket, options) {
    new Connection(options, this).accept(ws.wrap(socket));
};
Container.prototype.websocket_connect = ws.connect;
Container.prototype.filter = require('./filter.js');
Container.prototype.types = require('./types.js');
Container.prototype.message = require('./message.js');
Container.prototype.sasl = sasl;
Container.prototype.ReceiverEvents = eventTypes.ReceiverEvents;
Container.prototype.SenderEvents = eventTypes.SenderEvents;
Container.prototype.SessionEvents = eventTypes.SessionEvents;
Container.prototype.ConnectionEvents = eventTypes.ConnectionEvents;

module.exports = new Container();
