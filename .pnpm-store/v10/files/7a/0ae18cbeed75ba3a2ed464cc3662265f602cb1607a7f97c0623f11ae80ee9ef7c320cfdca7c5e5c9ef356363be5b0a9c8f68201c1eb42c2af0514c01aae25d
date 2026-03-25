require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,Buffer){(function (){
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

var errors = require('./errors.js');
var frames = require('./frames.js');
var log = require('./log.js');
var sasl = require('./sasl.js');
var util = require('./util.js');
var EndpointState = require('./endpoint.js');
var Session = require('./session.js');
var Transport = require('./transport.js');

var fs = require('fs');
var os = require('os');
var path = require('path');
var net = require('net');
var tls = require('tls');
var EventEmitter = require('events').EventEmitter;

var AMQP_PROTOCOL_ID = 0x00;

function find_connect_config() {
    var paths;
    if (process.env.MESSAGING_CONNECT_FILE) {
        paths = [process.env.MESSAGING_CONNECT_FILE];
    } else {
        paths = [process.cwd(), path.join(os.homedir(), '.config/messaging'),'/etc/messaging'].map(function (base) { return path.join(base, '/connect.json'); });
    }
    for (var i = 0; i < paths.length; i++) {
        if (fs.existsSync(paths[i])) {
            var obj = JSON.parse(fs.readFileSync(paths[i], 'utf8'));
            log.config('using config from %s: %j', paths[i], obj);
            return obj;
        }
    }
    return {};
}

function get_default_connect_config() {
    var config = find_connect_config();
    var options = {};
    if (config.scheme === 'amqps') options.transport = 'tls';
    if (config.host) options.host = config.host;
    if(config.port === 'amqp') options.port = 5672;
    else if(config.port === 'amqps') options.port = 5671;
    else options.port = config.port;
    if (!(config.sasl && config.sasl.enabled === false)) {
        if (config.user) options.username = config.user;
        else options.username = 'anonymous';
        if (config.password) options.password = config.password;
        if (config.sasl_mechanisms) options.sasl_mechanisms = config.sasl_mechanisms;
    }
    if (config.tls) {
        if (config.tls.key) options.key = fs.readFileSync(config.tls.key);
        if (config.tls.cert) options.cert = fs.readFileSync(config.tls.cert);
        if (config.tls.ca) options.ca = [ fs.readFileSync(config.tls.ca) ];
        if (config.verify === false || config.tls.verify === false) options.rejectUnauthorized = false;
    }
    if (options.transport === 'tls') {
        options.servername = options.host;
    }
    return options;
}

function get_socket_id(socket) {
    if (socket.get_id_string) return socket.get_id_string();
    return socket.localAddress + ':' + socket.localPort + ' -> ' + socket.remoteAddress + ':' + socket.remotePort;
}

function session_per_connection(conn) {
    var ssn = null;
    return {
        'get_session' : function () {
            if (!ssn) {
                ssn = conn.create_session();
                ssn.observers.on('session_close', function () { ssn = null; });
                ssn.begin();
            }
            return ssn;
        }
    };
}

function restrict(count, f) {
    if (count) {
        var current = count;
        var reset;
        return function (successful_attempts) {
            if (reset !== successful_attempts) {
                current = count;
                reset = successful_attempts;
            }
            if (current--) return f(successful_attempts);
            else return -1;
        };
    } else {
        return f;
    }
}

function backoff(initial, max) {
    var delay = initial;
    var reset;
    return function (successful_attempts) {
        if (reset !== successful_attempts) {
            delay = initial;
            reset = successful_attempts;
        }
        var current = delay;
        var next = delay*2;
        delay = max > next ? next : max;
        return current;
    };
}

function get_connect_fn(options) {
    if (options.transport === undefined || options.transport === 'tcp') {
        return net.connect;
    } else if (options.transport === 'tls' || options.transport === 'ssl') {
        return tls.connect;
    } else {
        throw Error('Unrecognised transport: ' + options.transport);
    }
}

function connection_details(options) {
    var details = {};
    details.connect = options.connect ? options.connect : get_connect_fn(options);
    details.host = options.host ? options.host : 'localhost';
    details.port = options.port ? options.port : 5672;
    details.options = options;
    return details;
}

var aliases = [
    'container_id',
    'hostname',
    'max_frame_size',
    'channel_max',
    'idle_time_out',
    'outgoing_locales',
    'incoming_locales',
    'offered_capabilities',
    'desired_capabilities',
    'properties'
];

function remote_property_shortcut(name) {
    return function() { return this.remote.open ? this.remote.open[name] : undefined; };
}

function connection_fields(fields) {
    var o = {};
    aliases.forEach(function (name) {
        if (fields[name] !== undefined) {
            o[name] = fields[name];
        }
    });
    return o;
}

function set_reconnect(reconnect, connection) {
    if (typeof reconnect === 'boolean') {
        if (reconnect) {
            var initial = connection.get_option('initial_reconnect_delay', 100);
            var max = connection.get_option('max_reconnect_delay', 60000);
            connection.options.reconnect = restrict(
                connection.get_option('reconnect_limit'),
                backoff(initial, max)
            );
        } else {
            connection.options.reconnect = false;
        }
    } else if (typeof reconnect === 'number') {
        var fixed = connection.options.reconnect;
        connection.options.reconnect = restrict(
            connection.get_option('reconnect_limit'),
            function() {
                return fixed;
            }
        );
    }
}

var conn_counter = 1;

var Connection = function (options, container) {
    this.options = {};
    if (options) {
        for (var k in options) {
            this.options[k] = options[k];
        }
        if ((options.transport === 'tls' || options.transport === 'ssl')
            && options.servername === undefined && options.host !== undefined) {
            this.options.servername = options.host;
        }
    } else {
        this.options = get_default_connect_config();
    }
    this.container = container;
    if (!this.options.id) {
        this.options.id = 'connection-' + conn_counter++;
    }
    if (!this.options.container_id) {
        this.options.container_id = container ? container.id : util.generate_uuid();
    }
    if (!this.options.connection_details) {
        var self = this;
        this.options.connection_details = function() { return connection_details(self.options); };
    }
    var reconnect = this.get_option('reconnect', true);
    set_reconnect(reconnect, this);
    this.registered = false;
    this.state = new EndpointState();
    this.local_channel_map = {};
    this.remote_channel_map = {};
    this.local = {};
    this.remote = {};
    this.local.open = frames.open(connection_fields(this.options));
    this.local.close = frames.close({});
    this.session_policy = session_per_connection(this);
    this.amqp_transport = new Transport(this.options.id, AMQP_PROTOCOL_ID, frames.TYPE_AMQP, this);
    this.sasl_transport = undefined;
    this.transport = this.amqp_transport;
    this.conn_established_counter = 0;
    this.heartbeat_out = undefined;
    this.heartbeat_in = undefined;
    this.abort_idle = false;
    this.socket_ready = false;
    this.scheduled_reconnect = undefined;
    this.default_sender = undefined;
    this.closed_with_non_fatal_error = false;

    var self = this;
    aliases.forEach(function (alias) { Object.defineProperty(self, alias, { get: remote_property_shortcut(alias) }); });
    Object.defineProperty(this, 'error', { get:  function() { return this.remote.close ? this.remote.close.error : undefined; }});
};

Connection.prototype = Object.create(EventEmitter.prototype);
Connection.prototype.constructor = Connection;
Connection.prototype.dispatch = function(name) {
    log.events('[%s] Connection got event: %s', this.options.id, name);
    if (this.listeners(name).length) {
        EventEmitter.prototype.emit.apply(this, arguments);
        return true;
    } else if (this.container) {
        return this.container.dispatch.apply(this.container, arguments);
    } else {
        return false;
    }
};

Connection.prototype._disconnect = function() {
    this.state.disconnected();
    for (var k in this.local_channel_map) {
        this.local_channel_map[k]._disconnect();
    }
    this.socket_ready = false;
};

Connection.prototype._reconnect = function() {
    if (this.abort_idle) {
        this.abort_idle = false;
        this.local.close.error = undefined;
        this.state = new EndpointState();
        this.state.open();
    }

    this.state.reconnect();
    this._reset_remote_state();
};

Connection.prototype._reset_remote_state = function() {
    //reset transport
    this.amqp_transport = new Transport(this.options.id, AMQP_PROTOCOL_ID, frames.TYPE_AMQP, this);
    this.sasl_transport = undefined;
    this.transport = this.amqp_transport;

    //reset remote endpoint state
    this.remote = {};
    //reset sessions:
    this.remote_channel_map = {};
    var localChannelMap = this.local_channel_map;
    for (var k in localChannelMap) {
        localChannelMap[k]._reconnect();
    }
};

Connection.prototype.connect = function () {
    this.is_server = false;
    this.abort_idle = false;
    this._reset_remote_state();
    this._connect(this.options.connection_details(this.conn_established_counter));
    this.open();
    return this;
};

Connection.prototype.reconnect = function () {
    this.scheduled_reconnect = undefined;
    log.reconnect('[%s] reconnecting...', this.options.id);
    this._reconnect();
    this._connect(this.options.connection_details(this.conn_established_counter));
    process.nextTick(this._process.bind(this));
    return this;
};

Connection.prototype.set_reconnect = function (reconnect) {
    set_reconnect(reconnect, this);
};

Connection.prototype._connect = function (details) {
    if (details.connect) {
        this.init(details.connect(details.port, details.host, details.options, this.connected.bind(this)));
    } else {
        this.init(get_connect_fn(details)(details.port, details.host, details.options, this.connected.bind(this)));
    }
    return this;
};

Connection.prototype.accept = function (socket) {
    this.is_server = true;
    log.io('[%s] client accepted: %s', this.id, get_socket_id(socket));
    this.socket_ready = true;
    return this.init(socket);
};


Connection.prototype.abort_socket = function (socket) {
    if (socket === this.socket) {
        log.io('[%s] aborting socket', this.options.id);
        this.socket.end();
        if (this.socket.removeAllListeners) {
            this.socket.removeAllListeners('data');
            this.socket.removeAllListeners('error');
            this.socket.removeAllListeners('end');
        }
        if (typeof this.socket.destroy === 'function') {
            this.socket.destroy();
        }
        this._disconnected();
    }
};

Connection.prototype.init = function (socket) {
    this.socket = socket;
    if (this.get_option('tcp_no_delay', false) && this.socket.setNoDelay) {
        this.socket.setNoDelay(true);
    }
    this.socket.on('data', this.input.bind(this));
    this.socket.on('error', this.on_error.bind(this));
    this.socket.on('end', this.eof.bind(this));

    if (this.is_server) {
        var mechs;
        if (this.container && Object.getOwnPropertyNames(this.container.sasl_server_mechanisms).length) {
            mechs = this.container.sasl_server_mechanisms;
        }
        if (this.socket.encrypted && this.socket.authorized && this.get_option('enable_sasl_external', false)) {
            mechs = sasl.server_add_external(mechs ? util.clone(mechs) : {});
        }
        if (mechs) {
            if (mechs.ANONYMOUS !== undefined && !this.get_option('require_sasl', false)) {
                this.sasl_transport = new sasl.Selective(this, mechs);
            } else {
                this.sasl_transport = new sasl.Server(this, mechs);
            }
        } else {
            if (!this.get_option('disable_sasl', false)) {
                var anon = sasl.server_mechanisms();
                anon.enable_anonymous();
                this.sasl_transport = new sasl.Selective(this, anon);
            }
        }
    } else {
        var mechanisms = this.get_option('sasl_mechanisms');
        if (!mechanisms) {
            var username = this.get_option('username');
            var password = this.get_option('password');
            var token = this.get_option('token');
            if (username) {
                mechanisms = sasl.client_mechanisms();
                if (password) mechanisms.enable_plain(username, password);
                else if (token) mechanisms.enable_xoauth2(username, token);
                else mechanisms.enable_anonymous(username);
            }
        }
        if (this.socket.encrypted && this.options.cert && this.get_option('enable_sasl_external', false)) {
            if (!mechanisms) mechanisms = sasl.client_mechanisms();
            mechanisms.enable_external();
        }

        if (mechanisms) {
            this.sasl_transport = new sasl.Client(this, mechanisms, this.options.sasl_init_hostname || this.options.servername || this.options.host);
        }
    }
    this.transport = this.sasl_transport ? this.sasl_transport : this.amqp_transport;
    return this;
};

Connection.prototype.attach_sender = function (options) {
    return this.session_policy.get_session().attach_sender(options);
};
Connection.prototype.open_sender = Connection.prototype.attach_sender;//alias

Connection.prototype.attach_receiver = function (options) {
    if (this.get_option('tcp_no_delay', true) && this.socket.setNoDelay) {
        this.socket.setNoDelay(true);
    }
    return this.session_policy.get_session().attach_receiver(options);
};
Connection.prototype.open_receiver = Connection.prototype.attach_receiver;//alias

Connection.prototype.get_option = function (name, default_value) {
    if (this.options[name] !== undefined) return this.options[name];
    else if (this.container) return this.container.get_option(name, default_value);
    else return default_value;
};

Connection.prototype.send = function(msg) {
    if (this.default_sender === undefined) {
        this.default_sender = this.open_sender({target:{}});
    }
    return this.default_sender.send(msg);
};

Connection.prototype.connected = function () {
    this.socket_ready = true;
    this.conn_established_counter++;
    log.io('[%s] connected %s', this.options.id, get_socket_id(this.socket));
    this.output();
};

Connection.prototype.sasl_failed = function (text, condition) {
    this.transport_error = new errors.ConnectionError(text, condition ? condition : 'amqp:unauthorized-access', this);
    this._handle_error();
    this.socket.end();
};

Connection.prototype._is_fatal = function (error_condition) {
    var all_errors_non_fatal = this.get_option('all_errors_non_fatal', false);
    if (all_errors_non_fatal) {
        return false;
    } else {
        var non_fatal = this.get_option('non_fatal_errors', ['amqp:connection:forced']);
        return non_fatal.indexOf(error_condition) < 0;
    }
};

Connection.prototype._handle_error = function () {
    var error = this.get_error();
    if (error) {
        var handled = this.dispatch('connection_error', this._context({error:error}));
        handled = this.dispatch('connection_close', this._context({error:error})) || handled;

        if (!this._is_fatal(error.condition)) {
            if (this.state.local_open) {
                this.closed_with_non_fatal_error = true;
            }
        } else if (!handled) {
            this.dispatch('error', new errors.ConnectionError(error.description, error.condition, this));
        }
        return true;
    } else {
        return false;
    }
};

Connection.prototype.get_error = function () {
    if (this.transport_error) return this.transport_error;
    if (this.remote.close && this.remote.close.error) {
        return new errors.ConnectionError(this.remote.close.error.description, this.remote.close.error.condition, this);
    }
    return undefined;
};

Connection.prototype._get_peer_details = function () {
    var s = '';
    if (this.remote.open && this.remote.open.container) {
        s += this.remote.open.container + ' ';
    }
    if (this.remote.open && this.remote.open.properties) {
        s += JSON.stringify(this.remote.open.properties);
    }
    return s;
};

Connection.prototype.output = function () {
    try {
        if (this.socket && this.socket_ready) {
            if (this.heartbeat_out) clearTimeout(this.heartbeat_out);
            this.transport.write(this.socket);
            if (((this.is_closed() && this.state.has_settled()) || this.abort_idle || this.transport_error) && !this.transport.has_writes_pending()) {
                this.socket.end();
            } else if (this.is_open() && this.remote.open.idle_time_out) {
                this.heartbeat_out = setTimeout(this._write_frame.bind(this), this.remote.open.idle_time_out / 2);
            }
            if (this.local.open.idle_time_out && this.heartbeat_in === undefined) {
                this.heartbeat_in = setTimeout(this.idle.bind(this), this.local.open.idle_time_out);
            }
        }
    } catch (e) {
        this.saved_error = e;
        if (e.name === 'ProtocolError') {
            console.error('[' + this.options.id + '] error on write: ' + e + ' ' + this._get_peer_details() + ' ' + e.name);
            this.dispatch('protocol_error', e) || console.error('[' + this.options.id + '] error on write: ' + e + ' ' + this._get_peer_details());
        } else {
            this.dispatch('error', e);
        }
        this.socket.end();
    }
};

function byte_to_hex(value) {
    if (value < 16) return '0x0' + Number(value).toString(16);
    else return '0x' + Number(value).toString(16);
}

function buffer_to_hex(buffer) {
    var bytes = [];
    for (var i = 0; i < buffer.length; i++) {
        bytes.push(byte_to_hex(buffer[i]));
    }
    return bytes.join(',');
}

Connection.prototype.input = function (buff) {
    var buffer;
    try {
        if (this.heartbeat_in) clearTimeout(this.heartbeat_in);
        log.io('[%s] read %d bytes', this.options.id, buff.length);
        if (this.previous_input) {
            buffer = Buffer.concat([this.previous_input, buff], this.previous_input.length + buff.length);
            this.previous_input = null;
        } else {
            buffer = buff;
        }
        var read = this.transport.read(buffer, this);
        if (read < buffer.length) {
            this.previous_input = buffer.slice(read);
        }
        if (this.local.open.idle_time_out) this.heartbeat_in = setTimeout(this.idle.bind(this), this.local.open.idle_time_out);
        if (this.transport.has_writes_pending()) {
            this.output();
        } else if (this.is_closed() && this.state.has_settled()) {
            this.socket.end();
        } else if (this.is_open() && this.remote.open.idle_time_out && !this.heartbeat_out) {
            this.heartbeat_out = setTimeout(this._write_frame.bind(this), this.remote.open.idle_time_out / 2);
        }
    } catch (e) {
        this.saved_error = e;
        if (e.name === 'ProtocolError') {
            this.dispatch('protocol_error', e) ||
                console.error('[' + this.options.id + '] error on read: ' + e + ' ' + this._get_peer_details() + ' (buffer:' + buffer_to_hex(buffer) + ')');
        } else {
            this.dispatch('error', e);
        }
        this.socket.end();
    }

};

Connection.prototype.idle = function () {
    if (!this.is_closed()) {
        this.abort_idle = true;
        this.closed_with_non_fatal_error = true;
        this.local.close.error = {condition:'amqp:resource-limit-exceeded', description:'max idle time exceeded'};
        this.close();
        setTimeout(this.abort_socket.bind(this, this.socket), 1000);
    }
};

Connection.prototype.on_error = function (e) {
    this._disconnected(e);
};

Connection.prototype.eof = function (e) {
    var error = e || this.saved_error;
    this.saved_error = undefined;
    this._disconnected(error);
};

Connection.prototype._disconnected = function (error) {
    if (this.heartbeat_out) {
        clearTimeout(this.heartbeat_out);
        this.heartbeat_out = undefined;
    }
    if (this.heartbeat_in) {
        clearTimeout(this.heartbeat_in);
        this.heartbeat_in = undefined;
    }
    var was_closed_with_non_fatal_error = this.closed_with_non_fatal_error;
    if (this.closed_with_non_fatal_error) {
        this.closed_with_non_fatal_error = false;
        if (this.options.reconnect) this.open();
    }
    if ((!this.is_closed() || was_closed_with_non_fatal_error) && this.scheduled_reconnect === undefined) {
        this._disconnect();
        var disconnect_ctxt = {};
        if (error) {
            disconnect_ctxt.error = error;
        }
        if (!this.is_server && !this.transport_error && this.options.reconnect) {
            var delay = this.options.reconnect(this.conn_established_counter);
            if (delay >= 0) {
                log.reconnect('[%s] Scheduled reconnect in ' + delay + 'ms', this.options.id);
                this.scheduled_reconnect = setTimeout(this.reconnect.bind(this), delay);
                disconnect_ctxt.reconnecting = true;
            } else {
                disconnect_ctxt.reconnecting = false;
            }
        }
        if (!this.dispatch('disconnected', this._context(disconnect_ctxt))) {
            console.warn('[' + this.options.id + '] disconnected %s', disconnect_ctxt.error || '');
        }
    }
};

Connection.prototype.open = function () {
    if (this.state.open()) {
        this._register();
    }
};

Connection.prototype.close = function (error) {
    if (error) this.local.close.error = error;
    if (this.state.close()) {
        this._register();
    }
};

Connection.prototype.is_open = function () {
    return this.state.is_open();
};

Connection.prototype.is_remote_open = function () {
    return this.state.remote_open;
};

Connection.prototype.is_closed = function () {
    return this.state.is_closed();
};

Connection.prototype.create_session = function () {
    var i = 0;
    while (this.local_channel_map[i]) i++;
    var session = new Session(this, i);
    this.local_channel_map[i] = session;
    return session;
};

Connection.prototype.find_sender = function (filter) {
    return this.find_link(util.sender_filter(filter));
};

Connection.prototype.find_receiver = function (filter) {
    return this.find_link(util.receiver_filter(filter));
};

Connection.prototype.find_link = function (filter) {
    for (var channel in this.local_channel_map) {
        var session = this.local_channel_map[channel];
        var result = session.find_link(filter);
        if (result) return result;
    }
    return undefined;
};

Connection.prototype.each_receiver = function (action, filter) {
    this.each_link(action, util.receiver_filter(filter));
};

Connection.prototype.each_sender = function (action, filter) {
    this.each_link(action, util.sender_filter(filter));
};

Connection.prototype.each_link = function (action, filter) {
    for (var channel in this.local_channel_map) {
        var session = this.local_channel_map[channel];
        session.each_link(action, filter);
    }
};

Connection.prototype.on_open = function (frame) {
    if (this.state.remote_opened()) {
        this.remote.open = frame.performative;
        this.open();
        this.dispatch('connection_open', this._context());
    } else {
        throw new errors.ProtocolError('Open already received');
    }
};

Connection.prototype.on_close = function (frame) {
    if (this.state.remote_closed()) {
        this.remote.close = frame.performative;
        if (this.remote.close.error) {
            this._handle_error();
        } else {
            this.dispatch('connection_close', this._context());
        }
        if (this.heartbeat_out) clearTimeout(this.heartbeat_out);
        var self = this;
        process.nextTick(function () {
            self.close();
        });
    } else {
        throw new errors.ProtocolError('Close already received');
    }
};

Connection.prototype._register = function () {
    if (!this.registered) {
        this.registered = true;
        process.nextTick(this._process.bind(this));
    }
};

Connection.prototype._process = function () {
    this.registered = false;
    do {
        if (this.state.need_open()) {
            this._write_open();
        }
        var localChannelMap = this.local_channel_map;
        for (var k in localChannelMap) {
            localChannelMap[k]._process();
        }
        if (this.state.need_close()) {
            this._write_close();
        }
    } while (!this.state.has_settled());
};

Connection.prototype._write_frame = function (channel, frame, payload) {
    this.amqp_transport.encode(frames.amqp_frame(channel, frame, payload));
    this.output();
};

Connection.prototype._write_open = function () {
    this._write_frame(0, this.local.open);
};

Connection.prototype._write_close = function () {
    this._write_frame(0, this.local.close);
};

Connection.prototype.on_begin = function (frame) {
    var session;
    if (frame.performative.remote_channel === null || frame.performative.remote_channel === undefined) {
        //peer initiated
        session = this.create_session();
        session.local.begin.remote_channel = frame.channel;
    } else {
        session = this.local_channel_map[frame.performative.remote_channel];
        if (!session) throw new errors.ProtocolError('Invalid value for remote channel ' + frame.performative.remote_channel);
    }
    session.on_begin(frame);
    this.remote_channel_map[frame.channel] = session;
};

Connection.prototype.get_peer_certificate = function() {
    if (this.socket && this.socket.getPeerCertificate) {
        return this.socket.getPeerCertificate();
    } else {
        return undefined;
    }
};

Connection.prototype.get_tls_socket = function() {
    if (this.socket && (this.options.transport === 'tls' || this.options.transport === 'ssl')) {
        return this.socket;
    } else {
        return undefined;
    }
};

Connection.prototype._context = function (c) {
    var context = c ? c : {};
    context.connection = this;
    if (this.container) context.container = this.container;
    return context;
};

Connection.prototype.remove_session = function (session) {
    if (this.remote_channel_map[session.remote.channel] === session) {
        delete this.remote_channel_map[session.remote.channel];
    }
    if (this.local_channel_map[session.local.channel] === session) {
        delete this.local_channel_map[session.local.channel];
    }
};

Connection.prototype.remove_all_sessions = function () {
    clearObject(this.remote_channel_map);
    clearObject(this.local_channel_map);
};

function clearObject(obj) {
    for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) {
            continue;
        }
        delete obj[k];
    }
}

function delegate_to_session(name) {
    Connection.prototype['on_' + name] = function (frame) {
        var session = this.remote_channel_map[frame.channel];
        if (!session) {
            throw new errors.ProtocolError(name + ' received on invalid channel ' + frame.channel);
        }
        session['on_' + name](frame);
    };
}

delegate_to_session('end');
delegate_to_session('attach');
delegate_to_session('detach');
delegate_to_session('transfer');
delegate_to_session('disposition');
delegate_to_session('flow');

module.exports = Connection;

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"./endpoint.js":2,"./errors.js":3,"./frames.js":6,"./log.js":8,"./sasl.js":10,"./session.js":11,"./transport.js":13,"./util.js":15,"_process":43,"buffer":21,"events":27,"fs":20,"net":20,"os":41,"path":42,"tls":20}],2:[function(require,module,exports){
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

var EndpointState = function () {
    this.init();
};

EndpointState.prototype.init = function () {
    this.local_open = false;
    this.remote_open = false;
    this.open_requests = 0;
    this.close_requests = 0;
    this.initialised = false;
    this.marker = undefined;
};

EndpointState.prototype.mark = function (o) {
    this.marker = o || Date.now();
    return this.marker;
};

EndpointState.prototype.open = function () {
    this.marker = undefined;
    this.initialised = true;
    if (!this.local_open) {
        this.local_open = true;
        this.open_requests++;
        return true;
    } else {
        return false;
    }
};

EndpointState.prototype.close = function () {
    this.marker = undefined;
    if (this.local_open) {
        this.local_open = false;
        this.close_requests++;
        return true;
    } else {
        return false;
    }
};

EndpointState.prototype.disconnected = function () {
    var was_initialised = this.initialised;
    this.was_open = this.local_open;
    this.init();
    this.initialised = was_initialised;
};

EndpointState.prototype.reconnect = function () {
    if (this.was_open) {
        this.open();
        this.was_open = undefined;
    }
};

EndpointState.prototype.remote_opened = function () {
    if (!this.remote_open) {
        this.remote_open = true;
        return true;
    } else {
        return false;
    }
};

EndpointState.prototype.remote_closed = function () {
    if (this.remote_open) {
        this.remote_open = false;
        return true;
    } else {
        return false;
    }
};

EndpointState.prototype.is_open = function () {
    return this.local_open && this.remote_open;
};

EndpointState.prototype.is_closed = function () {
    return this.initialised && !(this.local_open || this.was_open) && !this.remote_open;
};

EndpointState.prototype.has_settled = function () {
    return this.open_requests === 0 && this.close_requests === 0;
};

EndpointState.prototype.need_open = function () {
    if (this.open_requests > 0) {
        this.open_requests--;
        return true;
    } else {
        return false;
    }
};

EndpointState.prototype.need_close = function () {
    if (this.close_requests > 0) {
        this.close_requests--;
        return true;
    } else {
        return false;
    }
};

module.exports = EndpointState;

},{}],3:[function(require,module,exports){
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

var util = require('util');

function ProtocolError(message) {
    Error.call(this);
    this.message = message;
    this.name = 'ProtocolError';
}
util.inherits(ProtocolError, Error);

function TypeError(message) {
    ProtocolError.call(this, message);
    this.message = message;
    this.name = 'TypeError';
}

util.inherits(TypeError, ProtocolError);

function ConnectionError(message, condition, connection) {
    Error.call(this, message);
    this.message = message;
    this.name = 'ConnectionError';
    this.condition = condition;
    this.description = message;
    Object.defineProperty(this, 'connection', { value: connection });
}

util.inherits(ConnectionError, Error);

ConnectionError.prototype.toJSON = function () {
    return {
        type: this.name,
        code: this.condition,
        message: this.description
    };
};

module.exports = {
    ProtocolError: ProtocolError,
    TypeError: TypeError,
    ConnectionError: ConnectionError
};

},{"util":46}],4:[function(require,module,exports){
/*
 * Copyright 2018 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var ReceiverEvents;
(function (ReceiverEvents) {
    /**
     * @property {string} message Raised when a message is received.
     */
    ReceiverEvents['message'] = 'message';
    /**
     * @property {string} receiverOpen Raised when the remote peer indicates the link is
     * open (i.e. attached in AMQP parlance).
     */
    ReceiverEvents['receiverOpen'] = 'receiver_open';
    /**
     * @property {string} receiverDrained Raised when the remote peer
     * indicates that it has drained all credit (and therefore there
     * are no more messages at present that it can send).
     */
    ReceiverEvents['receiverDrained'] = 'receiver_drained';
    /**
     * @property {string} receiverFlow Raised when a flow is received for receiver.
     */
    ReceiverEvents['receiverFlow'] = 'receiver_flow';
    /**
     * @property {string} receiverError Raised when the remote peer
     * closes the receiver with an error. The context may also have an
     * error property giving some information about the reason for the
     * error.
     */
    ReceiverEvents['receiverError'] = 'receiver_error';
    /**
     * @property {string} receiverClose Raised when the remote peer indicates the link is closed.
     */
    ReceiverEvents['receiverClose'] = 'receiver_close';
    /**
     * @property {string} settled Raised when the receiver link receives a disposition.
     */
    ReceiverEvents['settled'] = 'settled';
})(ReceiverEvents || (ReceiverEvents = {}));

var SenderEvents;
(function (SenderEvents) {
    /**
     * @property {string} sendable Raised when the sender has sufficient credit to be able
     * to transmit messages to its peer.
     */
    SenderEvents['sendable'] = 'sendable';
    /**
     * @property {string} senderOpen Raised when the remote peer indicates the link is
     * open (i.e. attached in AMQP parlance).
     */
    SenderEvents['senderOpen'] = 'sender_open';
    /**
     * @property {string} senderDraining Raised when the remote peer
     * requests that the sender drain its credit; sending all
     * available messages within the credit limit and ensuring credit
     * is used up..
     */
    SenderEvents['senderDraining'] = 'sender_draining';
    /**
     * @property {string} senderFlow Raised when a flow is received for sender.
     */
    SenderEvents['senderFlow'] = 'sender_flow';
    /**
     * @property {string} senderError Raised when the remote peer
     * closes the sender with an error. The context may also have an
     * error property giving some information about the reason for the
     * error.
     */
    SenderEvents['senderError'] = 'sender_error';
    /**
     * @property {string} senderClose Raised when the remote peer indicates the link is closed.
     */
    SenderEvents['senderClose'] = 'sender_close';
    /**
     * @property {string} accepted Raised when a sent message is accepted by the peer.
     */
    SenderEvents['accepted'] = 'accepted';
    /**
     * @property {string} released Raised when a sent message is released by the peer.
     */
    SenderEvents['released'] = 'released';
    /**
     * @property {string} rejected Raised when a sent message is rejected by the peer.
     */
    SenderEvents['rejected'] = 'rejected';
    /**
     * @property {string} modified Raised when a sent message is modified by the peer.
     */
    SenderEvents['modified'] = 'modified';
    /**
     * @property {string} settled Raised when the sender link receives a disposition.
     */
    SenderEvents['settled'] = 'settled';
})(SenderEvents || (SenderEvents = {}));


var SessionEvents;
(function (SessionEvents) {
    /**
     * @property {string} sessionOpen Raised when the remote peer indicates the session is
     * open (i.e. attached in AMQP parlance).
     */
    SessionEvents['sessionOpen'] = 'session_open';
    /**
     * @property {string} sessionError Raised when the remote peer receives an error. The context
     * may also have an error property giving some information about the reason for the error.
     */
    SessionEvents['sessionError'] = 'session_error';
    /**
     * @property {string} sessionClose Raised when the remote peer indicates the session is closed.
     */
    SessionEvents['sessionClose'] = 'session_close';
    /**
     * @property {string} settled Raised when the session receives a disposition.
     */
    SessionEvents['settled'] = 'settled';
})(SessionEvents || (SessionEvents = {}));

var ConnectionEvents;
(function (ConnectionEvents) {
    /**
     * @property {string} connectionOpen Raised when the remote peer indicates the connection is open.
     */
    ConnectionEvents['connectionOpen'] = 'connection_open';
    /**
     * @property {string} connectionClose Raised when the remote peer indicates the connection is closed.
     */
    ConnectionEvents['connectionClose'] = 'connection_close';
    /**
     * @property {string} connectionError Raised when the remote peer indicates an error occurred on
     * the connection.
     */
    ConnectionEvents['connectionError'] = 'connection_error';
    /**
     * @property {string} protocolError Raised when a protocol error is received on the underlying socket.
     */
    ConnectionEvents['protocolError'] = 'protocol_error',
    /**
     * @property {string} error Raised when an error is received on the underlying socket.
     */
    ConnectionEvents['error'] = 'error',
    /**
     * @property {string} disconnected Raised when the underlying tcp connection is lost. The context
     * has a reconnecting property which is true if the library is attempting to automatically reconnect
     * and false if it has reached the reconnect limit. If reconnect has not been enabled or if the connection
     * is a tcp server, then the reconnecting property is undefined. The context may also have an error
     * property giving some information about the reason for the disconnect.
     */
    ConnectionEvents['disconnected'] = 'disconnected';
    /**
     * @property {string} settled Raised when the connection receives a disposition.
     */
    ConnectionEvents['settled'] = 'settled';
})(ConnectionEvents || (ConnectionEvents = {}));

module.exports = {
    ReceiverEvents: ReceiverEvents,
    SenderEvents: SenderEvents,
    SessionEvents: SessionEvents,
    ConnectionEvents: ConnectionEvents
};

},{}],5:[function(require,module,exports){
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

var amqp_types = require('./types.js');

module.exports = {
    selector : function (s) {
        return {'jms-selector':amqp_types.wrap_described(s, 0x468C00000004)};
    }
};

},{"./types.js":14}],6:[function(require,module,exports){
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

var types = require('./types.js');
var errors = require('./errors.js');

var frames = {};
var by_descriptor = {};

frames.read_header = function(buffer) {
    var offset = 4;
    var header = {};
    var name = buffer.toString('ascii', 0, offset);
    if (name !== 'AMQP') {
        // output name in hex (null-bytes can be tough to deal with in ascii)
        throw new errors.ProtocolError('Invalid protocol header for AMQP: ' + buffer.toString('hex', 0, offset));
    }
    header.protocol_id = buffer.readUInt8(offset++);
    header.major = buffer.readUInt8(offset++);
    header.minor = buffer.readUInt8(offset++);
    header.revision = buffer.readUInt8(offset++);
    //the protocol header is interpreted in different ways for
    //different versions(!); check some special cases to give clearer
    //error messages:
    if (header.protocol_id === 0 && header.major === 0 && header.minor === 9 && header.revision === 1) {
        throw new errors.ProtocolError('Unsupported AMQP version: 0-9-1');
    }
    if (header.protocol_id === 1 && header.major === 1 && header.minor === 0 && header.revision === 10) {
        throw new errors.ProtocolError('Unsupported AMQP version: 0-10');
    }
    if (header.major !== 1 || header.minor !== 0) {
        throw new errors.ProtocolError('Unsupported AMQP version: ' + JSON.stringify(header));
    }
    return header;
};
frames.write_header = function(buffer, header) {
    var offset = 4;
    buffer.write('AMQP', 0, offset, 'ascii');
    buffer.writeUInt8(header.protocol_id, offset++);
    buffer.writeUInt8(header.major, offset++);
    buffer.writeUInt8(header.minor, offset++);
    buffer.writeUInt8(header.revision, offset++);
    return 8;
};
//todo: define enumeration for frame types
frames.TYPE_AMQP = 0x00;
frames.TYPE_SASL = 0x01;

frames.read_frame = function(buffer) {
    var reader = new types.Reader(buffer);
    var frame = {};
    frame.size = reader.read_uint(4);
    if (reader.remaining() < (frame.size-4)) {
        return null;
    }
    var doff = reader.read_uint(1);
    if (doff < 2) {
        throw new errors.ProtocolError('Invalid data offset, must be at least 2 was ' + doff);
    }
    frame.type = reader.read_uint(1);
    if (frame.type === frames.TYPE_AMQP) {
        frame.channel = reader.read_uint(2);
    } else if (frame.type === frames.TYPE_SASL) {
        reader.skip(2);
        frame.channel = 0;
    } else {
        throw new errors.ProtocolError('Unknown frame type ' + frame.type);
    }
    if (doff > 1) {
        //ignore any extended header
        reader.skip(doff * 4 - 8);
    }
    if (reader.remaining()) {
        frame.performative = reader.read();
        var c = by_descriptor[frame.performative.descriptor.value];
        if (c) {
            frame.performative = new c(frame.performative.value);
        }
        if (reader.remaining()) {
            frame.payload = reader.read_bytes(reader.remaining());
        }
    }
    return frame;
};

frames.write_frame = function(frame) {
    var writer = new types.Writer();
    writer.skip(4);//skip size until we know how much we have written
    writer.write_uint(2, 1);//doff
    writer.write_uint(frame.type, 1);
    if (frame.type === frames.TYPE_AMQP) {
        writer.write_uint(frame.channel, 2);
    } else if (frame.type === frames.TYPE_SASL) {
        writer.write_uint(0, 2);
    } else {
        throw new errors.ProtocolError('Unknown frame type ' + frame.type);
    }
    if (frame.performative) {
        writer.write(frame.performative);
        if (frame.payload) {
            writer.write_bytes(frame.payload);
        }
    }
    var buffer = writer.toBuffer();
    buffer.writeUInt32BE(buffer.length, 0);//fill in the size
    return buffer;
};

frames.amqp_frame = function(channel, performative, payload) {
    return {'channel': channel || 0, 'type': frames.TYPE_AMQP, 'performative': performative, 'payload': payload};
};
frames.sasl_frame = function(performative) {
    return {'channel': 0, 'type': frames.TYPE_SASL, 'performative': performative};
};

function define_frame(type, def) {
    var c = types.define_composite(def);
    frames[def.name] = c.create;
    by_descriptor[Number(c.descriptor.numeric).toString(10)] = c;
    by_descriptor[c.descriptor.symbolic] = c;
}

var open = {
    name: 'open',
    code: 0x10,
    fields: [
        {name: 'container_id', type: 'string', mandatory: true},
        {name: 'hostname', type: 'string'},
        {name: 'max_frame_size', type: 'uint', default_value: 4294967295},
        {name: 'channel_max', type: 'ushort', default_value: 65535},
        {name: 'idle_time_out', type: 'uint'},
        {name: 'outgoing_locales', type: 'symbol', multiple: true},
        {name: 'incoming_locales', type: 'symbol', multiple: true},
        {name: 'offered_capabilities', type: 'symbol', multiple: true},
        {name: 'desired_capabilities', type: 'symbol', multiple: true},
        {name: 'properties', type: 'symbolic_map'}
    ]
};

var begin = {
    name: 'begin',
    code: 0x11,
    fields:[
        {name: 'remote_channel', type: 'ushort'},
        {name: 'next_outgoing_id', type: 'uint', mandatory: true},
        {name: 'incoming_window', type: 'uint', mandatory: true},
        {name: 'outgoing_window', type: 'uint', mandatory: true},
        {name: 'handle_max', type: 'uint', default_value: '4294967295'},
        {name: 'offered_capabilities', type: 'symbol', multiple: true},
        {name: 'desired_capabilities', type: 'symbol', multiple: true},
        {name: 'properties', type: 'symbolic_map'}
    ]
};

var attach = {
    name: 'attach',
    code: 0x12,
    fields:[
        {name: 'name', type: 'string', mandatory: true},
        {name: 'handle', type: 'uint', mandatory: true},
        {name: 'role', type: 'boolean', mandatory: true},
        {name: 'snd_settle_mode', type: 'ubyte', default_value: 2},
        {name: 'rcv_settle_mode', type: 'ubyte', default_value: 0},
        {name: 'source', type: '*'},
        {name: 'target', type: '*'},
        {name: 'unsettled', type: 'map'},
        {name: 'incomplete_unsettled', type: 'boolean', default_value: false},
        {name: 'initial_delivery_count', type: 'uint'},
        {name: 'max_message_size', type: 'ulong'},
        {name: 'offered_capabilities', type: 'symbol', multiple: true},
        {name: 'desired_capabilities', type: 'symbol', multiple: true},
        {name: 'properties', type: 'symbolic_map'}
    ]
};

var flow = {
    name: 'flow',
    code: 0x13,
    fields:[
        {name: 'next_incoming_id', type: 'uint'},
        {name: 'incoming_window', type: 'uint', mandatory: true},
        {name: 'next_outgoing_id', type: 'uint', mandatory: true},
        {name: 'outgoing_window', type: 'uint', mandatory: true},
        {name: 'handle', type: 'uint'},
        {name: 'delivery_count', type: 'uint'},
        {name: 'link_credit', type: 'uint'},
        {name: 'available', type: 'uint'},
        {name: 'drain', type: 'boolean', default_value: false},
        {name: 'echo', type: 'boolean', default_value: false},
        {name: 'properties', type: 'symbolic_map'}
    ]
};

var transfer = {
    name: 'transfer',
    code: 0x14,
    fields:[
        {name: 'handle', type: 'uint', mandatory: true},
        {name: 'delivery_id', type: 'uint'},
        {name: 'delivery_tag', type: 'binary'},
        {name: 'message_format', type: 'uint'},
        {name: 'settled', type: 'boolean'},
        {name: 'more', type: 'boolean', default_value: false},
        {name: 'rcv_settle_mode', type: 'ubyte'},
        {name: 'state', type: 'delivery_state'},
        {name: 'resume', type: 'boolean', default_value: false},
        {name: 'aborted', type: 'boolean', default_value: false},
        {name: 'batchable', type: 'boolean', default_value: false}
    ]
};

var disposition = {
    name: 'disposition',
    code: 0x15,
    fields:[
        {name: 'role', type: 'boolean', mandatory: true},
        {name: 'first', type: 'uint', mandatory: true},
        {name: 'last', type: 'uint'},
        {name: 'settled', type: 'boolean', default_value: false},
        {name: 'state', type: '*'},
        {name: 'batchable', type: 'boolean', default_value: false}
    ]
};

var detach = {
    name: 'detach',
    code: 0x16,
    fields: [
        {name: 'handle', type: 'uint', mandatory: true},
        {name: 'closed', type: 'boolean', default_value: false},
        {name: 'error', type: 'error'}
    ]
};

var end = {
    name: 'end',
    code: 0x17,
    fields: [
        {name: 'error', type: 'error'}
    ]
};

var close = {
    name: 'close',
    code: 0x18,
    fields: [
        {name: 'error', type: 'error'}
    ]
};

define_frame(frames.TYPE_AMQP, open);
define_frame(frames.TYPE_AMQP, begin);
define_frame(frames.TYPE_AMQP, attach);
define_frame(frames.TYPE_AMQP, flow);
define_frame(frames.TYPE_AMQP, transfer);
define_frame(frames.TYPE_AMQP, disposition);
define_frame(frames.TYPE_AMQP, detach);
define_frame(frames.TYPE_AMQP, end);
define_frame(frames.TYPE_AMQP, close);

var sasl_mechanisms = {
    name: 'sasl_mechanisms',
    code: 0x40,
    fields: [
        {name: 'sasl_server_mechanisms', type: 'symbol', multiple: true, mandatory: true}
    ]
};

var sasl_init = {
    name: 'sasl_init',
    code: 0x41,
    fields: [
        {name: 'mechanism', type: 'symbol', mandatory: true},
        {name: 'initial_response', type: 'binary'},
        {name: 'hostname', type: 'string'}
    ]
};

var sasl_challenge = {
    name: 'sasl_challenge',
    code: 0x42,
    fields: [
        {name: 'challenge', type: 'binary', mandatory: true}
    ]
};

var sasl_response = {
    name: 'sasl_response',
    code: 0x43,
    fields: [
        {name: 'response', type: 'binary', mandatory: true}
    ]
};

var sasl_outcome = {
    name: 'sasl_outcome',
    code: 0x44,
    fields: [
        {name: 'code', type: 'ubyte', mandatory: true},
        {name: 'additional_data', type: 'binary'}
    ]
};

define_frame(frames.TYPE_SASL, sasl_mechanisms);
define_frame(frames.TYPE_SASL, sasl_init);
define_frame(frames.TYPE_SASL, sasl_challenge);
define_frame(frames.TYPE_SASL, sasl_response);
define_frame(frames.TYPE_SASL, sasl_outcome);

module.exports = frames;

},{"./errors.js":3,"./types.js":14}],7:[function(require,module,exports){
(function (process,Buffer){(function (){
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

var frames = require('./frames.js');
var log = require('./log.js');
var message = require('./message.js');
var terminus = require('./terminus.js');
var EndpointState = require('./endpoint.js');

var FlowController = function (window) {
    this.window = window;
};
FlowController.prototype.update = function (context) {
    var delta = this.window - context.receiver.credit;
    if (delta >= (this.window/4)) {
        context.receiver.flow(delta);
    }
};

function auto_settle(context) {
    context.delivery.settled = true;
}

function auto_accept(context) {
    context.delivery.update(undefined, message.accepted().described());
}

function LinkError(message, condition, link) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message;
    this.condition = condition;
    this.description = message;
    Object.defineProperty(this, 'link', { value: link });
}
require('util').inherits(LinkError, Error);

var EventEmitter = require('events').EventEmitter;

var link = Object.create(EventEmitter.prototype);
link.dispatch = function(name) {
    log.events('[%s] Link got event: %s', this.connection.options.id, name);
    EventEmitter.prototype.emit.apply(this.observers, arguments);
    if (this.listeners(name).length) {
        EventEmitter.prototype.emit.apply(this, arguments);
        return true;
    } else {
        return this.session.dispatch.apply(this.session, arguments);
    }
};
link.set_source = function (fields) {
    this.local.attach.source = terminus.source(fields).described();
};
link.set_target = function (fields) {
    this.local.attach.target = terminus.target(fields).described();
};

link.attach = function () {
    if (this.state.open()) {
        this.connection._register();
    }
};
link.open = link.attach;

link.detach = function () {
    this.local.detach.closed = false;
    if (this.state.close()) {
        this.connection._register();
    }
};
link.close = function(error) {
    if (error) this.local.detach.error = error;
    this.local.detach.closed = true;
    if (this.state.close()) {
        this.connection._register();
    }
};

/**
 * This forcibly removes the link from the parent session. It should
 * not be called for a link on an active session/connection, where
 * close() should be used instead.
 */
link.remove = function() {
    this.session.remove_link(this);
};

link.is_open = function () {
    return this.session.is_open() && this.state.is_open();
};

link.is_remote_open = function () {
    return this.session.is_remote_open() && this.state.remote_open;
};

link.is_itself_closed = function() {
    return this.state.is_closed();
};

link.is_closed = function () {
    return this.session.is_closed() || this.is_itself_closed();
};

link._process = function () {
    do {
        if (this.state.need_open()) {
            this.session.output(this.local.attach);
        }

        if (this.issue_flow && this.state.local_open) {
            this.session._write_flow(this);
            this.issue_flow = false;
        }

        if (this.state.need_close()) {
            this.session.output(this.local.detach);
        }
    } while (!this.state.has_settled());
};

link.on_attach = function (frame) {
    if (this.state.remote_opened()) {
        if (!this.remote.handle) {
            this.remote.handle = frame.handle;
        }
        frame.performative.source = terminus.unwrap(frame.performative.source);
        frame.performative.target = terminus.unwrap(frame.performative.target);
        this.remote.attach = frame.performative;
        this.open();
        this.dispatch(this.is_receiver() ? 'receiver_open' : 'sender_open', this._context());
    } else {
        throw Error('Attach already received');
    }
};

link.prefix_event = function (event) {
    return (this.local.attach.role ? 'receiver_' : 'sender_') + event;
};

link.on_detach = function (frame) {
    if (this.state.remote_closed()) {
        if (this._incomplete) {
            this._incomplete.settled = true;
        }
        this.remote.detach = frame.performative;
        var error = this.remote.detach.error;
        if (error) {
            var handled = this.dispatch(this.prefix_event('error'), this._context());
            handled = this.dispatch(this.prefix_event('close'), this._context()) || handled;
            if (!handled) {
                EventEmitter.prototype.emit.call(this.connection.container, 'error', new LinkError(error.description, error.condition, this));
            }
        } else {
            this.dispatch(this.prefix_event('close'), this._context());
        }
        var self = this;
        var token = this.state.mark();
        process.nextTick(function () {
            if (self.state.marker === token) {
                self.close();
                process.nextTick(function () { self.remove(); });
            }
        });
    } else {
        throw Error('Detach already received');
    }
};

function is_internal(name) {
    switch (name) {
    case 'name':
    case 'handle':
    case 'role':
    case 'initial_delivery_count':
        return true;
    default:
        return false;
    }
}


var aliases = [
    'snd_settle_mode',
    'rcv_settle_mode',
    'source',
    'target',
    'max_message_size',
    'offered_capabilities',
    'desired_capabilities',
    'properties'
];

function remote_property_shortcut(name) {
    return function() { return this.remote.attach ? this.remote.attach[name] : undefined; };
}

link.init = function (session, name, local_handle, opts, is_receiver) {
    this.session = session;
    this.connection = session.connection;
    this.name = name;
    this.options = opts === undefined ? {} : opts;
    this.state = new EndpointState();
    this.issue_flow = false;
    this.local = {'handle': local_handle};
    this.local.attach = frames.attach({'handle':local_handle,'name':name, role:is_receiver});
    for (var field in this.local.attach) {
        if (!is_internal(field) && this.options[field] !== undefined) {
            this.local.attach[field] = this.options[field];
        }
    }
    this.local.detach = frames.detach({'handle':local_handle, 'closed':true});
    this.remote = {'handle':undefined};
    this.delivery_count = 0;
    this.credit = 0;
    this.observers = new EventEmitter();
    var self = this;
    aliases.forEach(function (alias) { Object.defineProperty(self, alias, { get: remote_property_shortcut(alias) }); });
    Object.defineProperty(this, 'error', { get:  function() { return this.remote.detach ? this.remote.detach.error : undefined; }});
};

link._disconnect = function() {
    this.state.disconnected();
    if (!this.state.was_open) {
        this.remove();
    }
};

link._reconnect = function() {
    this.state.reconnect();
    this.remote = {'handle':undefined};
    this.delivery_count = 0;
    this.credit = 0;
};

link.has_credit = function () {
    return this.credit > 0;
};
link.is_receiver = function () {
    return this.local.attach.role;
};
link.is_sender = function () {
    return !this.is_receiver();
};
link._context = function (c) {
    var context = c ? c : {};
    if (this.is_receiver()) {
        context.receiver = this;
    } else {
        context.sender = this;
    }
    return this.session._context(context);
};
link.get_option = function (name, default_value) {
    if (this.options[name] !== undefined) return this.options[name];
    else return this.session.get_option(name, default_value);
};

var Sender = function (session, name, local_handle, opts) {
    this.init(session, name, local_handle, opts, false);
    this._draining = false;
    this._drained = false;
    this.local.attach.initial_delivery_count = 0;
    this.tag = 0;
    if (this.get_option('autosettle', true)) {
        this.observers.on('settled', auto_settle);
    }
    var sender = this;
    if (this.get_option('treat_modified_as_released', true)) {
        this.observers.on('modified', function (context) {
            sender.dispatch('released', context);
        });
    }
};
Sender.prototype = Object.create(link);
Sender.prototype.constructor = Sender;
Sender.prototype._get_drain = function () {
    if (this._draining && this._drained && this.credit) {
        while (this.credit) {
            ++this.delivery_count;
            --this.credit;
        }
        return true;
    } else {
        return false;
    }
};
Sender.prototype.set_drained = function (drained) {
    this._drained = drained;
    if (this._draining && this._drained) {
        this.issue_flow = true;
    }
};
Sender.prototype.next_tag = function () {
    return Buffer.from(new String(this.tag++));
};
Sender.prototype.sendable = function () {
    return Boolean(this.credit && this.session.outgoing.available());
};
Sender.prototype.on_flow = function (frame) {
    var flow = frame.performative;
    this.credit = flow.delivery_count + flow.link_credit - this.delivery_count;
    this._draining = flow.drain;
    this._drained = this.credit > 0;
    if (this.is_open()) {
        this.dispatch('sender_flow', this._context());
        if (this._draining) {
            this.dispatch('sender_draining', this._context());
        }
        if (this.sendable()) {
            this.dispatch('sendable', this._context());
        }
    }
};
Sender.prototype.on_transfer = function () {
    throw Error('got transfer on sending link');
};

Sender.prototype.send = function (msg, tag, format) {
    var payload = format === undefined ? message.encode(msg) : msg;
    var delivery = this.session.send(this, tag ? tag : this.next_tag(), payload, format);
    if (this.local.attach.snd_settle_mode === 1) {
        delivery.settled = true;
    }
    return delivery;
};

var Receiver = function (session, name, local_handle, opts) {
    this.init(session, name, local_handle, opts, true);
    this.drain = false;
    this.set_credit_window(this.get_option('credit_window', 1000));
    if (this.get_option('autoaccept', true)) {
        this.observers.on('message', auto_accept);
    }
    if (this.local.attach.rcv_settle_mode === 1 && this.get_option('autosettle', true)) {
        this.observers.on('settled', auto_settle);
    }
};
Receiver.prototype = Object.create(link);
Receiver.prototype.constructor = Receiver;
Receiver.prototype.on_flow = function (frame) {
    this.dispatch('receiver_flow', this._context());
    if (frame.performative.drain) {
        this.credit = frame.performative.link_credit;
        this.delivery_count = frame.performative.delivery_count;
        if (frame.performative.link_credit > 0) console.error('ERROR: received flow with drain set, but non zero credit');
        else this.dispatch('receiver_drained', this._context());
    }
};
Receiver.prototype.flow = function(credit) {
    if (credit > 0) {
        this.credit += credit;
        this.issue_flow = true;
        this.connection._register();
    }
};

Receiver.prototype.drain_credit = function() {
    this.drain = true;
    this.issue_flow = true;
    this.connection._register();
};

Receiver.prototype.add_credit = Receiver.prototype.flow;//alias
Receiver.prototype._get_drain = function () {
    return this.drain;
};

Receiver.prototype.set_credit_window = function(credit_window) {
    if (credit_window > 0) {
        var flow_controller = new FlowController(credit_window);
        var listener = flow_controller.update.bind(flow_controller);
        this.observers.on('message', listener);
        this.observers.on('receiver_open', listener);
    }
};

module.exports = {'Sender': Sender, 'Receiver':Receiver};

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"./endpoint.js":2,"./frames.js":6,"./log.js":8,"./message.js":9,"./terminus.js":12,"_process":43,"buffer":21,"events":27,"util":46}],8:[function(require,module,exports){
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

var debug = require('debug');

if (debug.formatters) {
    debug.formatters.h = function (v) {
        return v.toString('hex');
    };
}

module.exports = {
    'config' : debug('rhea:config'),
    'frames' : debug('rhea:frames'),
    'raw' : debug('rhea:raw'),
    'reconnect' : debug('rhea:reconnect'),
    'events' : debug('rhea:events'),
    'message' : debug('rhea:message'),
    'flow' : debug('rhea:flow'),
    'io' : debug('rhea:io')
};

},{"debug":24}],9:[function(require,module,exports){
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

var log = require('./log.js');
var types = require('./types.js');

var by_descriptor = {};
var unwrappers = {};
var wrappers = [];
var message = {};

function define_section(descriptor, unwrap, wrap) {
    unwrap.descriptor = descriptor;
    unwrappers[descriptor.symbolic] = unwrap;
    unwrappers[Number(descriptor.numeric).toString(10)] = unwrap;
    if (wrap) {
        wrappers.push(wrap);
    }
}

function define_composite_section(def) {
    var c = types.define_composite(def);
    message[def.name] = c.create;
    by_descriptor[Number(c.descriptor.numeric).toString(10)] = c;
    by_descriptor[c.descriptor.symbolic] = c;

    var unwrap = function (msg, section) {
        var composite = new c(section.value);
        for (var i = 0; i < def.fields.length; i++) {
            var f = def.fields[i];
            var v = composite[f.name];
            if (v !== undefined && v !== null) {
                msg[f.name] = v;
            }
        }
    };

    var wrap = function (sections, msg) {
        sections.push(c.create(msg).described());
    };
    define_section(c.descriptor, unwrap, wrap);
}


function define_map_section(def, symbolic) {
    var wrapper = symbolic ? types.wrap_symbolic_map : types.wrap_map;
    var descriptor = {numeric:def.code};
    descriptor.symbolic = 'amqp:' + def.name.replace(/_/g, '-') + ':map';
    var unwrap = function (msg, section) {
        msg[def.name] = types.unwrap_map_simple(section);
    };
    var wrap = function (sections, msg) {
        if (msg[def.name]) {
            sections.push(types.described_nc(types.wrap_ulong(descriptor.numeric), wrapper(msg[def.name])));
        }
    };
    define_section(descriptor, unwrap, wrap);
}

function Section(typecode, content, multiple) {
    this.typecode = typecode;
    this.content = content;
    this.multiple = multiple;
}

Section.prototype.described = function (item) {
    return types.described(types.wrap_ulong(this.typecode), types.wrap(item || this.content));
};

Section.prototype.collect_sections = function (sections) {
    if (this.multiple) {
        for (var i = 0; i < this.content.length; i++) {
            sections.push(this.described(this.content[i]));
        }
    } else {
        sections.push(this.described());
    }
};

define_composite_section({
    name:'header',
    code:0x70,
    fields:[
        {name:'durable', type:'boolean', default_value:false},
        {name:'priority', type:'ubyte', default_value:4},
        {name:'ttl', type:'uint'},
        {name:'first_acquirer', type:'boolean', default_value:false},
        {name:'delivery_count', type:'uint', default_value:0}
    ]
});
define_map_section({name:'delivery_annotations', code:0x71}, true);
define_map_section({name:'message_annotations', code:0x72}, true);
define_composite_section({
    name:'properties',
    code:0x73,
    fields:[
        {name:'message_id', type:'message_id'},
        {name:'user_id', type:'binary'},
        {name:'to', type:'string'},
        {name:'subject', type:'string'},
        {name:'reply_to', type:'string'},
        {name:'correlation_id', type:'message_id'},
        {name:'content_type', type:'symbol'},
        {name:'content_encoding', type:'symbol'},
        {name:'absolute_expiry_time', type:'timestamp'},
        {name:'creation_time', type:'timestamp'},
        {name:'group_id', type:'string'},
        {name:'group_sequence', type:'uint'},
        {name:'reply_to_group_id', type:'string'}
    ]
});
define_map_section({name:'application_properties', code:0x74});

function unwrap_body_section (msg, section, typecode) {
    if (msg.body === undefined) {
        msg.body = new Section(typecode, types.unwrap(section));
    } else if (msg.body.constructor === Section && msg.body.typecode === typecode) {
        if (msg.body.multiple) {
            msg.body.content.push(types.unwrap(section));
        } else {
            msg.body.multiple = true;
            msg.body.content = [msg.body.content, types.unwrap(section)];
        }
    }
}

define_section({numeric:0x75, symbolic:'amqp:data:binary'}, function (msg, section) { unwrap_body_section(msg, section, 0x75); });
define_section({numeric:0x76, symbolic:'amqp:amqp-sequence:list'}, function (msg, section) { unwrap_body_section(msg, section, 0x76); });
define_section({numeric:0x77, symbolic:'amqp:value:*'}, function (msg, section) { msg.body = types.unwrap(section); });

define_map_section({name:'footer', code:0x78});


function wrap_body (sections, msg) {
    if (msg.body && msg.body.collect_sections) {
        msg.body.collect_sections(sections);
    } else {
        sections.push(types.described(types.wrap_ulong(0x77), types.wrap(msg.body)));
    }
}

wrappers.push(wrap_body);

message.data_section = function (data) {
    return new Section(0x75, data);
};

message.sequence_section = function (list) {
    return new Section(0x76, list);
};

message.data_sections = function (data_elements) {
    return new Section(0x75, data_elements, true);
};

message.sequence_sections = function (lists) {
    return new Section(0x76, lists, true);
};

function copy(src, tgt) {
    for (var k in src) {
        var v = src[k];
        if (typeof v === 'object') {
            copy(v, tgt[k]);
        } else {
            tgt[k] = v;
        }
    }
}

function Message(o) {
    if (o) {
        copy(o, this);
    }
}

Message.prototype.toJSON = function () {
    var o = {};
    for (var key in this) {
        if (typeof this[key] === 'function') continue;
        o[key] = this[key];
    }
    return o;
};

Message.prototype.toString = function () {
    return JSON.stringify(this.toJSON());
};


message.encode = function(msg) {
    var sections = [];
    wrappers.forEach(function (wrapper_fn) { wrapper_fn(sections, msg); });
    var writer = new types.Writer();
    for (var i = 0; i < sections.length; i++) {
        log.message('Encoding section %d of %d: %o', (i+1), sections.length, sections[i]);
        writer.write(sections[i]);
    }
    var data = writer.toBuffer();
    log.message('encoded %d bytes', data.length);
    return data;
};

message.decode = function(buffer) {
    var msg = new Message();
    var reader = new types.Reader(buffer);
    while (reader.remaining()) {
        var s = reader.read();
        log.message('decoding section: %o of type: %o', s, s.descriptor);
        if (s.descriptor) {
            var unwrap = unwrappers[s.descriptor.value];
            if (unwrap) {
                unwrap(msg, s);
            } else {
                console.warn('WARNING: did not recognise message section with descriptor ' + s.descriptor);
            }
        } else {
            console.warn('WARNING: expected described message section got ' + JSON.stringify(s));
        }
    }
    return msg;
};

var outcomes = {};

function define_outcome(def) {
    var c = types.define_composite(def);
    c.composite_type = def.name;
    message[def.name] = c.create;
    outcomes[Number(c.descriptor.numeric).toString(10)] = c;
    outcomes[c.descriptor.symbolic] = c;
    message['is_' + def.name] = function (o) {
        if (o && o.descriptor) {
            var c = outcomes[o.descriptor.value];
            if (c) {
                return c.descriptor.numeric === def.code;
            }
        }
        return false;
    };
}

message.unwrap_outcome = function (outcome) {
    if (outcome && outcome.descriptor) {
        var c = outcomes[outcome.descriptor.value];
        if (c) {
            return new c(outcome.value);
        }
    }
    console.error('unrecognised outcome: ' + JSON.stringify(outcome));
    return outcome;
};

message.are_outcomes_equivalent = function(a, b) {
    if (a === undefined && b === undefined) return true;
    else if (a === undefined || b === undefined) return false;
    else return a.descriptor.value === b.descriptor.value && a.descriptor.value === 0x24;//only batch accepted
};

define_outcome({
    name:'received',
    code:0x23,
    fields:[
        {name:'section_number', type:'uint', mandatory:true},
        {name:'section_offset', type:'ulong', mandatory:true}
    ]});
define_outcome({name:'accepted', code:0x24, fields:[]});
define_outcome({name:'rejected', code:0x25, fields:[{name:'error', type:'error'}]});
define_outcome({name:'released', code:0x26, fields:[]});
define_outcome({
    name:'modified',
    code:0x27,
    fields:[
        {name:'delivery_failed', type:'boolean'},
        {name:'undeliverable_here', type:'boolean'},
        {name:'message_annotations', type:'map'}
    ]});

module.exports = message;

},{"./log.js":8,"./types.js":14}],10:[function(require,module,exports){
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

var errors = require('./errors.js');
var frames = require('./frames.js');
var Transport = require('./transport.js');
var util = require('./util.js');

var sasl_codes = {
    'OK':0,
    'AUTH':1,
    'SYS':2,
    'SYS_PERM':3,
    'SYS_TEMP':4,
};

var SASL_PROTOCOL_ID = 0x03;

function extract(buffer) {
    var results = [];
    var start = 0;
    var i = 0;
    while (i < buffer.length) {
        if (buffer[i] === 0x00) {
            if (i > start) results.push(buffer.toString('utf8', start, i));
            else results.push(null);
            start = ++i;
        } else {
            ++i;
        }
    }
    if (i > start) results.push(buffer.toString('utf8', start, i));
    else results.push(null);
    return results;
}

var PlainServer = function(callback) {
    this.callback = callback;
    this.outcome = undefined;
    this.username = undefined;
};

PlainServer.prototype.start = function(response, hostname) {
    var fields = extract(response);
    if (fields.length !== 3) {
        return Promise.reject('Unexpected response in PLAIN, got ' + fields.length + ' fields, expected 3');
    }
    var self = this;
    return Promise.resolve(this.callback(fields[1], fields[2], hostname))
        .then(function (result) {
            if (result) {
                self.outcome = true;
                self.username = fields[1];
            } else {
                self.outcome = false;
            }
        });
};

var PlainClient = function(username, password) {
    this.username = username;
    this.password = password;
};

PlainClient.prototype.start = function(callback) {
    var response = util.allocate_buffer(1 + this.username.length + 1 + this.password.length);
    response.writeUInt8(0, 0);
    response.write(this.username, 1);
    response.writeUInt8(0, 1 + this.username.length);
    response.write(this.password, 1 + this.username.length + 1);
    callback(undefined, response);
};

var AnonymousServer = function() {
    this.outcome = undefined;
    this.username = undefined;
};

AnonymousServer.prototype.start = function(response) {
    this.outcome = true;
    this.username = response ? response.toString('utf8') : 'anonymous';
};

var AnonymousClient = function(name) {
    this.username = name ? name : 'anonymous';
};

AnonymousClient.prototype.start = function(callback) {
    var response = util.allocate_buffer(1 + this.username.length);
    response.writeUInt8(0, 0);
    response.write(this.username, 1);
    callback(undefined, response);
};

var ExternalServer = function() {
    this.outcome = undefined;
    this.username = undefined;
};

ExternalServer.prototype.start = function() {
    this.outcome = true;
};

var ExternalClient = function() {
    this.username = undefined;
};

ExternalClient.prototype.start = function(callback) {
    callback(undefined, '');
};

ExternalClient.prototype.step = function(callback) {
    callback(undefined, '');
};

var XOAuth2Client = function(username, token) {
    this.username = username;
    this.token = token;
};

XOAuth2Client.prototype.start = function(callback) {
    var response = util.allocate_buffer(this.username.length + this.token.length + 5 + 12 + 3);
    var count = 0;
    response.write('user=', count);
    count += 5;
    response.write(this.username, count);
    count += this.username.length;
    response.writeUInt8(1, count);
    count += 1;
    response.write('auth=Bearer ', count);
    count += 12;
    response.write(this.token, count);
    count += this.token.length;
    response.writeUInt8(1, count);
    count += 1;
    response.writeUInt8(1, count);
    count += 1;
    callback(undefined, response);
};

/**
 * The mechanisms argument is a map of mechanism names to factory
 * functions for objects that implement that mechanism.
 */
var SaslServer = function (connection, mechanisms) {
    this.connection = connection;
    this.transport = new Transport(connection.amqp_transport.identifier, SASL_PROTOCOL_ID, frames.TYPE_SASL, this);
    this.next = connection.amqp_transport;
    this.mechanisms = mechanisms;
    this.mechanism = undefined;
    this.outcome = undefined;
    this.username = undefined;
    var mechlist = Object.getOwnPropertyNames(mechanisms);
    this.transport.encode(frames.sasl_frame(frames.sasl_mechanisms({sasl_server_mechanisms:mechlist})));
};

SaslServer.prototype.do_step = function (challenge) {
    if (this.mechanism.outcome === undefined) {
        this.transport.encode(frames.sasl_frame(frames.sasl_challenge({'challenge':challenge})));
        this.connection.output();
    } else {
        this.outcome = this.mechanism.outcome ? sasl_codes.OK : sasl_codes.AUTH;
        var frame = frames.sasl_frame(frames.sasl_outcome({code: this.outcome}));
        this.transport.encode(frame);
        this.connection.output();
        if (this.outcome === sasl_codes.OK) {
            this.username = this.mechanism.username;
            this.transport.write_complete = true;
            this.transport.read_complete = true;
        }
    }
};

SaslServer.prototype.on_sasl_init = function (frame) {
    var saslctor = this.mechanisms[frame.performative.mechanism];
    if (saslctor) {
        this.mechanism = saslctor();
        Promise.resolve(this.mechanism.start(frame.performative.initial_response, frame.performative.hostname))
            .then(this.do_step.bind(this))
            .catch(this.do_fail.bind(this));
    } else {
        this.outcome = sasl_codes.AUTH;
        this.transport.encode(frames.sasl_frame(frames.sasl_outcome({code: this.outcome})));
    }
};

SaslServer.prototype.on_sasl_response = function (frame) {
    Promise.resolve(this.mechanism.step(frame.performative.response))
        .then(this.do_step.bind(this))
        .catch(this.do_fail.bind(this));
};

SaslServer.prototype.do_fail = function (e) {
    var frame = frames.sasl_frame(frames.sasl_outcome({code: sasl_codes.SYS}));
    this.transport.encode(frame);
    this.connection.output();
    try {
        this.connection.sasl_failed('Sasl callback promise failed with ' + e, 'amqp:internal-error');
    } catch (e) {
        console.error('Uncaught error: ', e.message);
    }
};

SaslServer.prototype.has_writes_pending = function () {
    return this.transport.has_writes_pending() || this.next.has_writes_pending();
};

SaslServer.prototype.write = function (socket) {
    if (this.transport.write_complete && this.transport.pending.length === 0) {
        return this.next.write(socket);
    } else {
        return this.transport.write(socket);
    }
};

SaslServer.prototype.read = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.read(buffer);
    } else {
        return this.transport.read(buffer);
    }
};

var SaslClient = function (connection, mechanisms, hostname) {
    this.connection = connection;
    this.transport = new Transport(connection.amqp_transport.identifier, SASL_PROTOCOL_ID, frames.TYPE_SASL, this);
    this.next = connection.amqp_transport;
    this.mechanisms = mechanisms;
    this.mechanism = undefined;
    this.mechanism_name = undefined;
    this.hostname = hostname;
    this.failed = false;
};

SaslClient.prototype.on_sasl_mechanisms = function (frame) {
    var offered_mechanisms = [];
    if (Array.isArray(frame.performative.sasl_server_mechanisms)) {
        offered_mechanisms = frame.performative.sasl_server_mechanisms;
    } else if (frame.performative.sasl_server_mechanisms) {
        offered_mechanisms = [frame.performative.sasl_server_mechanisms];
    }
    for (var i = 0; this.mechanism === undefined && i < offered_mechanisms.length; i++) {
        var mech = offered_mechanisms[i];
        var f = this.mechanisms[mech];
        if (f) {
            this.mechanism = typeof f === 'function' ? f() : f;
            this.mechanism_name = mech;
        }
    }
    if (this.mechanism) {
        var self = this;
        this.mechanism.start(function (err, response) {
            if (err) {
                self.failed = true;
                self.connection.sasl_failed('SASL mechanism init failed: ' + err);
            } else {
                var init = {'mechanism':self.mechanism_name,'initial_response':response};
                if (self.hostname) {
                    init.hostname = self.hostname;
                }
                self.transport.encode(frames.sasl_frame(frames.sasl_init(init)));
                self.connection.output();
            }
        });
    } else {
        this.failed = true;
        this.connection.sasl_failed('No suitable mechanism; server supports ' + frame.performative.sasl_server_mechanisms);
    }
};
SaslClient.prototype.on_sasl_challenge = function (frame) {
    var self = this;
    this.mechanism.step(frame.performative.challenge, function (err, response) {
        if (err) {
            self.failed = true;
            self.connection.sasl_failed('SASL mechanism challenge failed: ' + err);
        } else {
            self.transport.encode(frames.sasl_frame(frames.sasl_response({'response':response})));
            self.connection.output();
        }
    });
};
SaslClient.prototype.on_sasl_outcome = function (frame) {
    switch (frame.performative.code) {
    case sasl_codes.OK:
        this.transport.read_complete = true;
        this.transport.write_complete = true;
        break;
    case sasl_codes.SYS:
    case sasl_codes.SYS_PERM:
    case sasl_codes.SYS_TEMP:
        this.transport.write_complete = true;
        this.connection.sasl_failed('Failed to authenticate: ' + frame.performative.code, 'amqp:internal-error');
        break;
    default:
        this.transport.write_complete = true;
        this.connection.sasl_failed('Failed to authenticate: ' + frame.performative.code);
    }
};

SaslClient.prototype.has_writes_pending = function () {
    return this.transport.has_writes_pending() || this.next.has_writes_pending();
};

SaslClient.prototype.write = function (socket) {
    if (this.transport.write_complete) {
        return this.next.write(socket);
    } else {
        return this.transport.write(socket);
    }
};

SaslClient.prototype.read = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.read(buffer);
    } else {
        return this.transport.read(buffer);
    }
};

var SelectiveServer = function (connection, mechanisms) {
    this.header_received = false;
    this.transports = {
        0: connection.amqp_transport,
        3: new SaslServer(connection, mechanisms)
    };
    this.selected = undefined;
};

SelectiveServer.prototype.has_writes_pending = function () {
    return this.header_received && this.selected.has_writes_pending();
};

SelectiveServer.prototype.write = function (socket) {
    if (this.selected) {
        return this.selected.write(socket);
    } else {
        return 0;
    }
};

SelectiveServer.prototype.read = function (buffer) {
    if (!this.header_received) {
        if (buffer.length < 8) {
            return 0;
        } else {
            this.header_received = frames.read_header(buffer);
            this.selected = this.transports[this.header_received.protocol_id];
            if (this.selected === undefined) {
                throw new errors.ProtocolError('Invalid AMQP protocol id ' + this.header_received.protocol_id);
            }
        }
    }
    return this.selected.read(buffer);
};

var default_server_mechanisms = {
    enable_anonymous: function () {
        this['ANONYMOUS'] = function() { return new AnonymousServer(); };
    },
    enable_plain: function (callback) {
        this['PLAIN'] = function() { return new PlainServer(callback); };
    }
};

var default_client_mechanisms = {
    enable_anonymous: function (name) {
        this['ANONYMOUS'] = function() { return new AnonymousClient(name); };
    },
    enable_plain: function (username, password) {
        this['PLAIN'] = function() { return new PlainClient(username, password); };
    },
    enable_external: function () {
        this['EXTERNAL'] = function() { return new ExternalClient(); };
    },
    enable_xoauth2: function (username, token) {
        if (username && token) {
            this['XOAUTH2'] = function() { return new XOAuth2Client(username, token); };
        } else if (token === undefined) {
            throw Error('token must be specified');
        } else if (username === undefined) {
            throw Error('username must be specified');
        }
    }
};

module.exports = {
    Client : SaslClient,
    Server : SaslServer,
    Selective: SelectiveServer,
    server_mechanisms : function () {
        return Object.create(default_server_mechanisms);
    },
    client_mechanisms : function () {
        return Object.create(default_client_mechanisms);
    },
    server_add_external: function (mechs) {
        mechs['EXTERNAL'] = function() { return new ExternalServer(); };
        return mechs;
    }
};

},{"./errors.js":3,"./frames.js":6,"./transport.js":13,"./util.js":15}],11:[function(require,module,exports){
(function (process,Buffer){(function (){
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

var frames = require('./frames.js');
var link = require('./link.js');
var log = require('./log.js');
var message = require('./message.js');
var types = require('./types.js');
var util = require('./util.js');
var EndpointState = require('./endpoint.js');

var EventEmitter = require('events').EventEmitter;

function SessionError(message, condition, session) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.message = message;
    this.condition = condition;
    this.description = message;
    Object.defineProperty(this, 'session', { value: session });
}
require('util').inherits(SessionError, Error);

var CircularBuffer = function (capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.head = 0;
    this.tail = 0;
    this.entries = [];
};

CircularBuffer.prototype.available = function () {
    return this.capacity - this.size;
};

CircularBuffer.prototype.push = function (o) {
    if (this.size < this.capacity) {
        this.entries[this.tail] = o;
        this.tail = (this.tail + 1) % this.capacity;
        this.size++;
    } else {
        throw Error('circular buffer overflow: head=' + this.head + ' tail=' + this.tail + ' size=' + this.size + ' capacity=' + this.capacity);
    }
};

CircularBuffer.prototype.pop_if = function (f) {
    var count = 0;
    while (this.size && f(this.entries[this.head])) {
        this.entries[this.head] = undefined;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        count++;
    }
    return count;
};

CircularBuffer.prototype.by_id = function (id) {
    if (this.size > 0) {
        var gap = id - this.entries[this.head].id;
        if (gap < this.size) {
            return this.entries[(this.head + gap) % this.capacity];
        }
    }
    return undefined;
};

CircularBuffer.prototype.get_head = function () {
    return this.size > 0 ? this.entries[this.head] : undefined;
};

CircularBuffer.prototype.get_tail = function () {
    return this.size > 0 ? this.entries[(this.head + this.size - 1) % this.capacity] : undefined;
};

function write_dispositions(deliveries) {
    var first, last, next_id, i, delivery;

    for (i = 0; i < deliveries.length; i++) {
        delivery = deliveries[i];
        if (first === undefined) {
            first = delivery;
            last = delivery;
            next_id = delivery.id;
        }

        if ((first !== last && !message.are_outcomes_equivalent(last.state, delivery.state)) || last.settled !== delivery.settled || next_id !== delivery.id) {
            first.link.session.output(frames.disposition({'role' : first.link.is_receiver(), 'first' : first.id, 'last' : last.id, 'state' : first.state, 'settled' : first.settled}));
            first = delivery;
            last = delivery;
            next_id = delivery.id;
        } else {
            if (last.id !== delivery.id) {
                last = delivery;
            }
            next_id++;
        }
    }
    if (first !== undefined && last !== undefined) {
        first.link.session.output(frames.disposition({'role' : first.link.is_receiver(), 'first' : first.id, 'last' : last.id, 'state' : first.state, 'settled' : first.settled}));
    }
}

var Outgoing = function (connection) {
    /* TODO: make size configurable? */
    this.deliveries = new CircularBuffer(2048);
    this.updated = [];
    this.pending_dispositions = [];
    this.next_delivery_id = 0;
    this.next_pending_delivery = 0;
    this.next_transfer_id = 0;
    this.window = types.MAX_UINT;
    this.remote_next_transfer_id = undefined;
    this.remote_window = undefined;
    this.connection = connection;
};

Outgoing.prototype.available = function () {
    return this.deliveries.available();
};

Outgoing.prototype.compute_max_payload = function (tag) {
    if (this.connection.max_frame_size) {
        return this.connection.max_frame_size - (50 + tag.length);
    } else {
        return undefined;
    }
};

Outgoing.prototype.send = function (sender, tag, data, format) {
    var fragments = [];
    var max_payload = this.compute_max_payload(tag);
    if (max_payload && data.length > max_payload) {
        var start = 0;
        while (start < data.length) {
            var end = Math.min(start + max_payload, data.length);
            fragments.push(data.slice(start, end));
            start = end;
        }
    } else {
        fragments.push(data);
    }
    var d = {
        'id':this.next_delivery_id++,
        'tag':tag,
        'link':sender,
        'data': fragments,
        'format':format ? format : 0,
        'sent': false,
        'settled': false,
        'state': undefined,
        'remote_settled': false,
        'remote_state': undefined
    };
    var self = this;
    d.update = function (settled, state) {
        self.update(d, settled, state);
    };
    this.deliveries.push(d);
    return d;
};

Outgoing.prototype.on_begin = function (fields) {
    this.remote_window = fields.incoming_window;
};

Outgoing.prototype.on_flow = function (fields) {
    this.remote_next_transfer_id = fields.next_incoming_id;
    this.remote_window = fields.incoming_window;
};

Outgoing.prototype.on_disposition = function (fields) {
    var last = fields.last ? fields.last : fields.first;
    for (var i = fields.first; i <= last; i++) {
        var d = this.deliveries.by_id(i);
        if (d && !d.remote_settled) {
            var updated = false;
            if (fields.settled) {
                d.remote_settled = fields.settled;
                updated = true;
            }
            if (fields.state && fields.state !== d.remote_state) {
                d.remote_state = message.unwrap_outcome(fields.state);
                updated = true;
            }
            if (updated) {
                this.updated.push(d);
            }
        }
    }
};

Outgoing.prototype.update = function (delivery, settled, state) {
    if (delivery) {
        delivery.settled = settled;
        if (state !== undefined) delivery.state = state;
        if (!delivery.remote_settled) {
            this.pending_dispositions.push(delivery);
        }
        delivery.link.connection._register();
    }
};

Outgoing.prototype.transfer_window = function() {
    if (this.remote_window) {
        return this.remote_window - (this.next_transfer_id - this.remote_next_transfer_id);
    } else {
        return 0;
    }
};

Outgoing.prototype.process = function() {
    var d;
    // send pending deliveries for which there is credit:
    while (this.next_pending_delivery < this.next_delivery_id) {
        d = this.deliveries.by_id(this.next_pending_delivery);
        if (d) {
            if (d.link.has_credit()) {
                if (this.transfer_window() >= d.data.length) {
                    this.window -= d.data.length;
                    for (var i = 0; i < d.data.length; i++) {
                        this.next_transfer_id++;
                        var more = (i+1) < d.data.length;
                        var transfer = frames.transfer({'handle':d.link.local.handle,'message_format':d.format,'delivery_id':d.id, 'delivery_tag':d.tag, 'settled':d.settled, 'more':more});
                        d.link.session.output(transfer, d.data[i]);
                        if (d.settled) {
                            d.remote_settled = true;//if sending presettled, it can now be cleaned up
                        }
                    }
                    d.link.credit--;
                    d.link.delivery_count++;
                    this.next_pending_delivery++;
                } else {
                    log.flow('[%s] Incoming window of peer preventing sending further transfers: remote_window=%d, remote_next_transfer_id=%d, next_transfer_id=%d',
                        this.connection.options.id, this.remote_window, this.remote_next_transfer_id, this.next_transfer_id);
                    break;
                }
            } else {
                log.flow('[%s] Link has no credit', this.connection.options.id);
                break;
            }
        } else {
            console.error('ERROR: Next pending delivery not found: ' + this.next_pending_delivery);
            break;
        }
    }

    // notify application of any updated deliveries:
    for (var i = 0; i < this.updated.length; i++) {
        d = this.updated[i];
        if (d.remote_state && d.remote_state.constructor.composite_type) {
            d.link.dispatch(d.remote_state.constructor.composite_type, d.link._context({'delivery':d}));
        }
        if (d.remote_settled) d.link.dispatch('settled', d.link._context({'delivery':d}));
    }
    this.updated = [];

    if (this.pending_dispositions.length) {
        write_dispositions(this.pending_dispositions);
        this.pending_dispositions = [];
    }

    // remove any fully settled deliveries:
    this.deliveries.pop_if(function (d) { return d.settled && d.remote_settled; });
};

var Incoming = function () {
    this.deliveries = new CircularBuffer(2048/*TODO: configurable?*/);
    this.updated = [];
    this.next_transfer_id = 0;
    this.next_delivery_id = undefined;
    Object.defineProperty(this, 'window', { get: function () { return this.deliveries.available(); } });
    this.remote_next_transfer_id = undefined;
    this.remote_window = undefined;
    this.max_transfer_id = this.next_transfer_id + this.window;
};

Incoming.prototype.update = function (delivery, settled, state) {
    if (delivery) {
        delivery.settled = settled;
        if (state !== undefined) delivery.state = state;
        if (!delivery.remote_settled) {
            this.updated.push(delivery);
        }
        delivery.link.connection._register();
    }
};

Incoming.prototype.on_transfer = function(frame, receiver) {
    this.next_transfer_id++;
    if (receiver.is_remote_open()) {
        if (this.next_delivery_id === undefined) {
            this.next_delivery_id = frame.performative.delivery_id;
        }
        var current;
        var data;
        if (receiver._incomplete) {
            current = receiver._incomplete;
            if (util.is_defined(frame.performative.delivery_id) && current.id !== frame.performative.delivery_id) {
                throw Error('frame sequence error: delivery ' + current.id + ' not complete, got ' + frame.performative.delivery_id);
            }
            if (frame.payload) {
                data = Buffer.concat([current.data, frame.payload], current.data.length + frame.payload.length);
            } else {
                data = current.data;
            }
        } else if (this.next_delivery_id === frame.performative.delivery_id) {
            current = {'id':frame.performative.delivery_id,
                'tag':frame.performative.delivery_tag,
                'format':frame.performative.message_format,
                'link':receiver,
                'settled': false,
                'state': undefined,
                'remote_settled': frame.performative.settled === undefined ? false : frame.performative.settled,
                'remote_state': frame.performative.state};
            var self = this;
            current.update = function (settled, state) {
                var settled_ = settled;
                if (settled_ === undefined) {
                    settled_ = receiver.local.attach.rcv_settle_mode !== 1;
                }
                self.update(current, settled_, state);
            };
            current.accept = function () { this.update(undefined, message.accepted().described()); };
            current.release = function (params) {
                if (params) {
                    this.update(undefined, message.modified(params).described());
                } else {
                    this.update(undefined, message.released().described());
                }
            };
            current.reject = function (error) { this.update(undefined, message.rejected({'error':error}).described()); };
            current.modified = function (params) { this.update(undefined, message.modified(params).described()); };

            this.deliveries.push(current);
            this.next_delivery_id++;
            data = frame.payload;
        } else {
            //TODO: better error handling
            throw Error('frame sequence error: expected ' + this.next_delivery_id + ', got ' + frame.performative.delivery_id);
        }
        current.incomplete = frame.performative.more;
        if (current.incomplete) {
            receiver._incomplete = current;
            current.data = data;
        } else {
            receiver._incomplete = undefined;
            if (receiver.credit > 0) receiver.credit--;
            else console.error('Received transfer when credit was %d', receiver.credit);
            receiver.delivery_count++;
            var msgctxt = current.format === 0 ? {'message':message.decode(data), 'delivery':current} : {'message':data, 'delivery':current, 'format':current.format};
            receiver.dispatch('message', receiver._context(msgctxt));
        }
    } else {
        throw Error('transfer after detach');
    }
};

Incoming.prototype.process = function (session) {
    if (this.updated.length > 0) {
        write_dispositions(this.updated);
        this.updated = [];
    }

    // remove any fully settled deliveries:
    this.deliveries.pop_if(function (d) { return d.settled; });

    if (this.max_transfer_id - this.next_transfer_id < (this.window / 2)) {
        session._write_flow();
    }
};

Incoming.prototype.on_begin = function (fields) {
    this.remote_window = fields.outgoing_window;
    this.remote_next_transfer_id = fields.next_outgoing_id;
};

Incoming.prototype.on_flow = function (fields) {
    this.remote_next_transfer_id = fields.next_outgoing_id;
    this.remote_window = fields.outgoing_window;
};

Incoming.prototype.on_disposition = function (fields) {
    var last = fields.last ? fields.last : fields.first;
    for (var i = fields.first; i <= last; i++) {
        var d = this.deliveries.by_id(i);
        if (d && !d.remote_settled) {
            if (fields.state && fields.state !== d.remote_state) {
                d.remote_state = message.unwrap_outcome(fields.state);
            }
            if (fields.settled) {
                d.remote_settled = fields.settled;
                d.link.dispatch('settled', d.link._context({'delivery':d}));
            }
        }
    }
};

var Session = function (connection, local_channel) {
    this.connection = connection;
    this.outgoing = new Outgoing(connection);
    this.incoming = new Incoming();
    this.state = new EndpointState();
    this.local = {'channel': local_channel, 'handles':{}};
    this.local.begin = frames.begin({next_outgoing_id:this.outgoing.next_transfer_id,incoming_window:this.incoming.window,outgoing_window:this.outgoing.window});
    this.local.end = frames.end();
    this.remote = {'handles':{}};
    this.links = {}; // map by name
    this.options = {};
    Object.defineProperty(this, 'error', { get:  function() { return this.remote.end ? this.remote.end.error : undefined; }});
    this.observers = new EventEmitter();
};
Session.prototype = Object.create(EventEmitter.prototype);
Session.prototype.constructor = Session;

Session.prototype._disconnect = function() {
    this.state.disconnected();
    for (var l in this.links) {
        this.links[l]._disconnect();
    }
    if (!this.state.was_open) {
        this.remove();
    }
};

Session.prototype._reconnect = function() {
    this.state.reconnect();
    this.outgoing = new Outgoing(this.connection);
    this.incoming = new Incoming();
    this.remote = {'handles':{}};
    for (var l in this.links) {
        this.links[l]._reconnect();
    }
};

Session.prototype.dispatch = function(name) {
    log.events('[%s] Session got event: %s', this.connection.options.id, name);
    EventEmitter.prototype.emit.apply(this.observers, arguments);
    if (this.listeners(name).length) {
        EventEmitter.prototype.emit.apply(this, arguments);
        return true;
    } else {
        return this.connection.dispatch.apply(this.connection, arguments);
    }
};
Session.prototype.output = function (frame, payload) {
    this.connection._write_frame(this.local.channel, frame, payload);
};

Session.prototype.create_sender = function (name, opts) {
    if (!opts) {
        opts = this.get_option('sender_options', {});
    }
    return this.create_link(name, link.Sender, opts);
};

Session.prototype.create_receiver = function (name, opts) {
    if (!opts) {
        opts = this.get_option('receiver_options', {});
    }
    return this.create_link(name, link.Receiver, opts);
};

function merge(defaults, specific) {
    for (var f in specific) {
        if (f === 'properties' && defaults.properties) {
            merge(defaults.properties, specific.properties);
        } else {
            defaults[f] = specific[f];
        }
    }
}

function attach(factory, args, remote_terminus, default_args) {
    var opts = Object.create(default_args || {});
    if (typeof args === 'string') {
        opts[remote_terminus] = args;
    } else if (args) {
        merge(opts, args);
    }
    if (!opts.name) opts.name = util.generate_uuid();
    var l = factory(opts.name, opts);
    for (var t in {'source':0, 'target':0}) {
        if (opts[t]) {
            if (typeof opts[t] === 'string') {
                opts[t] = {'address' : opts[t]};
            }
            l['set_' + t](opts[t]);
        }
    }
    if (l.is_sender() && opts.source === undefined) {
        opts.source = l.set_source({});
    }
    if (l.is_receiver() && opts.target === undefined) {
        opts.target = l.set_target({});
    }
    l.attach();
    return l;
}

Session.prototype.get_option = function (name, default_value) {
    if (this.options[name] !== undefined) return this.options[name];
    else return this.connection.get_option(name, default_value);
};

Session.prototype.attach_sender = function (args) {
    return attach(this.create_sender.bind(this), args, 'target', this.get_option('sender_options', {}));
};
Session.prototype.open_sender = Session.prototype.attach_sender;//alias

Session.prototype.attach_receiver = function (args) {
    return attach(this.create_receiver.bind(this), args, 'source', this.get_option('receiver_options', {}));
};
Session.prototype.open_receiver = Session.prototype.attach_receiver;//alias

Session.prototype.find_sender = function (filter) {
    return this.find_link(util.sender_filter(filter));
};

Session.prototype.find_receiver = function (filter) {
    return this.find_link(util.receiver_filter(filter));
};

Session.prototype.find_link = function (filter) {
    for (var name in this.links) {
        var link = this.links[name];
        if (filter(link)) return link;
    }
    return undefined;
};

Session.prototype.each_receiver = function (action, filter) {
    this.each_link(action, util.receiver_filter(filter));
};

Session.prototype.each_sender = function (action, filter) {
    this.each_link(action, util.sender_filter(filter));
};

Session.prototype.each_link = function (action, filter) {
    for (var name in this.links) {
        var link = this.links[name];
        if (filter === undefined || filter(link)) action(link);
    }
};

Session.prototype.create_link = function (name, constructor, opts) {
    var i = 0;
    while (this.local.handles[i]) i++;
    var l = new constructor(this, name, i, opts);
    this.links[name] = l;
    this.local.handles[i] = l;
    return l;
};

Session.prototype.begin = function () {
    if (this.state.open()) {
        this.connection._register();
    }
};
Session.prototype.open = Session.prototype.begin;

Session.prototype.end = function (error) {
    if (error) this.local.end.error = error;
    if (this.state.close()) {
        this.connection._register();
    }
};
Session.prototype.close = Session.prototype.end;

Session.prototype.is_open = function () {
    return this.connection.is_open() && this.state.is_open();
};

Session.prototype.is_remote_open = function () {
    return this.connection.is_remote_open() && this.state.remote_open;
};

Session.prototype.is_itself_closed = function () {
    return this.state.is_closed();
};

Session.prototype.is_closed = function () {
    return this.connection.is_closed() || this.is_itself_closed();
};

function notify_sendable(sender) {
    sender.dispatch('sendable', sender._context());
}

function is_sender_sendable(sender) {
    return sender.is_open() && sender.sendable();
}

Session.prototype._process = function () {
    do {
        if (this.state.need_open()) {
            this.output(this.local.begin);
        }

        var was_blocked = this.outgoing.deliveries.available() === 0;
        this.outgoing.process();
        if (was_blocked && this.outgoing.deliveries.available()) {
            this.each_sender(notify_sendable, is_sender_sendable);
        }
        this.incoming.process(this);
        for (var k in this.links) {
            this.links[k]._process();
        }

        if (this.state.need_close()) {
            this.output(this.local.end);
        }
    } while (!this.state.has_settled());
};

Session.prototype.send = function (sender, tag, data, format) {
    var d = this.outgoing.send(sender, tag, data, format);
    this.connection._register();
    return d;
};

Session.prototype._write_flow = function (link) {
    var fields = {'next_incoming_id':this.incoming.next_transfer_id,
        'incoming_window':this.incoming.window,
        'next_outgoing_id':this.outgoing.next_transfer_id,
        'outgoing_window':this.outgoing.window
    };
    this.incoming.max_transfer_id = fields.next_incoming_id + fields.incoming_window;
    if (link) {
        if (link._get_drain()) fields.drain = true;
        fields.delivery_count = link.delivery_count;
        fields.handle = link.local.handle;
        fields.link_credit = link.credit;
    }
    this.output(frames.flow(fields));
};

Session.prototype.on_begin = function (frame) {
    if (this.state.remote_opened()) {
        if (!this.remote.channel) {
            this.remote.channel = frame.channel;
        }
        this.remote.begin = frame.performative;
        this.outgoing.on_begin(frame.performative);
        this.incoming.on_begin(frame.performative);
        this.open();
        this.dispatch('session_open', this._context());
    } else {
        throw Error('Begin already received');
    }
};
Session.prototype.on_end = function (frame) {
    if (this.state.remote_closed()) {
        this.remote.end = frame.performative;
        var error = this.remote.end.error;
        if (error) {
            var handled = this.dispatch('session_error', this._context());
            handled = this.dispatch('session_close', this._context()) || handled;
            if (!handled) {
                EventEmitter.prototype.emit.call(this.connection.container, 'error', new SessionError(error.description, error.condition, this));
            }
        } else {
            this.dispatch('session_close', this._context());
        }
        var self = this;
        var token = this.state.mark();
        process.nextTick(function () {
            if (self.state.marker === token) {
                self.close();
                process.nextTick(function () { self.remove(); });
            }
        });
    } else {
        throw Error('End already received');
    }
};

Session.prototype.on_attach = function (frame) {
    var name = frame.performative.name;
    var link = this.links[name];
    if (!link) {
        // if role is true, peer is receiver, so we are sender
        link = frame.performative.role ? this.create_sender(name) : this.create_receiver(name);
    }
    this.remote.handles[frame.performative.handle] = link;
    link.on_attach(frame);
    link.remote.attach = frame.performative;
};

Session.prototype.on_disposition = function (frame) {
    if (frame.performative.role) {
        log.events('[%s] Received disposition for outgoing transfers', this.connection.options.id);
        this.outgoing.on_disposition(frame.performative);
    } else {
        log.events('[%s] Received disposition for incoming transfers', this.connection.options.id);
        this.incoming.on_disposition(frame.performative);
    }
    this.connection._register();
};

Session.prototype.on_flow = function (frame) {
    this.outgoing.on_flow(frame.performative);
    this.incoming.on_flow(frame.performative);
    if (util.is_defined(frame.performative.handle)) {
        this._get_link(frame).on_flow(frame);
    }
    this.connection._register();
};

Session.prototype._context = function (c) {
    var context = c ? c : {};
    context.session = this;
    return this.connection._context(context);
};

Session.prototype._get_link = function (frame) {
    var handle = frame.performative.handle;
    var link = this.remote.handles[handle];
    if (!link) {
        throw Error('Invalid handle ' + handle);
    }
    return link;
};

Session.prototype.on_detach = function (frame) {
    this._get_link(frame).on_detach(frame);
};

Session.prototype.remove_link = function (link) {
    delete this.remote.handles[link.remote.handle];
    delete this.local.handles[link.local.handle];
    delete this.links[link.name];
};

/**
 * This forcibly removes the session from the parent connection. It
 * should not be called for a link on an active connection, where
 * close() should be used instead.
 */
Session.prototype.remove = function () {
    this.connection.remove_session(this);
};

Session.prototype.on_transfer = function (frame) {
    this.incoming.on_transfer(frame, this._get_link(frame));
};

module.exports = Session;

}).call(this)}).call(this,require('_process'),require("buffer").Buffer)
},{"./endpoint.js":2,"./frames.js":6,"./link.js":7,"./log.js":8,"./message.js":9,"./types.js":14,"./util.js":15,"_process":43,"buffer":21,"events":27,"util":46}],12:[function(require,module,exports){
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

var types = require('./types.js');

var terminus = {};
var by_descriptor = {};

function define_terminus(def) {
    var c = types.define_composite(def);
    terminus[def.name] = c.create;
    by_descriptor[Number(c.descriptor.numeric).toString(10)] = c;
    by_descriptor[c.descriptor.symbolic] = c;
}

terminus.unwrap = function(field) {
    if (field && field.descriptor) {
        var c = by_descriptor[field.descriptor.value];
        if (c) {
            return new c(field.value);
        } else {
            console.warn('Unknown terminus: ' + field.descriptor);
        }
    }
    return null;
};

define_terminus({
    name: 'source',
    code: 0x28,
    fields: [
        {name: 'address', type: 'string'},
        {name: 'durable', type: 'uint', default_value: 0},
        {name: 'expiry_policy', type: 'symbol', default_value: 'session-end'},
        {name: 'timeout', type: 'uint', default_value: 0},
        {name: 'dynamic', type: 'boolean', default_value: false},
        {name: 'dynamic_node_properties', type: 'symbolic_map'},
        {name: 'distribution_mode', type: 'symbol'},
        {name: 'filter', type: 'symbolic_map'},
        {name: 'default_outcome', type: '*'},
        {name: 'outcomes', type: 'symbol', multiple: true},
        {name: 'capabilities', type: 'symbol', multiple: true}
    ]
});

define_terminus({
    name: 'target',
    code: 0x29,
    fields: [
        {name: 'address', type: 'string'},
        {name: 'durable', type: 'uint', default_value: 0},
        {name: 'expiry_policy', type: 'symbol', default_value: 'session-end'},
        {name: 'timeout', type: 'uint', default_value: 0},
        {name: 'dynamic', type: 'boolean', default_value: false},
        {name: 'dynamic_node_properties', type: 'symbolic_map'},
        {name: 'capabilities', type: 'symbol', multiple: true}
    ]
});

module.exports = terminus;

},{"./types.js":14}],13:[function(require,module,exports){
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

var errors = require('./errors.js');
var frames = require('./frames.js');
var log = require('./log.js');
var util = require('./util.js');


var Transport = function (identifier, protocol_id, frame_type, handler) {
    this.identifier = identifier;
    this.protocol_id = protocol_id;
    this.frame_type = frame_type;
    this.handler = handler;
    this.pending = [];
    this.header_sent = undefined;
    this.header_received = undefined;
    this.write_complete = false;
    this.read_complete = false;
};

Transport.prototype.has_writes_pending = function () {
    return this.pending.length > 0 || !this.header_sent;
};

Transport.prototype.encode = function (frame) {
    this.pending.push(frame);
};

Transport.prototype.write = function (socket) {
    if (!this.header_sent) {
        var buffer = util.allocate_buffer(8);
        var header = {protocol_id:this.protocol_id, major:1, minor:0, revision:0};
        log.frames('[%s] -> %o', this.identifier, header);
        frames.write_header(buffer, header);
        socket.write(buffer);
        this.header_sent = header;
    }
    for (var i = 0; i < this.pending.length; i++) {
        var frame = this.pending[i];
        var buffer = frames.write_frame(frame);
        socket.write(buffer);
        if (frame.performative) {
            log.frames('[%s]:%s -> %s %j', this.identifier, frame.channel, frame.performative.constructor, frame.performative, frame.payload || '');
        } else {
            log.frames('[%s]:%s -> empty', this.identifier, frame.channel);
        }
        log.raw('[%s] SENT: %d %h', this.identifier, buffer.length, buffer);
    }
    this.pending = [];
};

Transport.prototype.read = function (buffer) {
    var offset = 0;
    if (!this.header_received) {
        if (buffer.length < 8) {
            return offset;
        } else {
            this.header_received = frames.read_header(buffer);
            log.frames('[%s] <- %o', this.identifier, this.header_received);
            if (this.header_received.protocol_id !== this.protocol_id) {
                if (this.protocol_id === 3 && this.header_received.protocol_id === 0) {
                    throw new errors.ProtocolError('Expecting SASL layer');
                } else if (this.protocol_id === 0 && this.header_received.protocol_id === 3) {
                    throw new errors.ProtocolError('SASL layer not enabled');
                } else {
                    throw new errors.ProtocolError('Invalid AMQP protocol id ' + this.header_received.protocol_id + ' expecting: ' + this.protocol_id);
                }
            }
            offset = 8;
        }
    }
    while (offset < (buffer.length - 4) && !this.read_complete) {
        var frame_size = buffer.readUInt32BE(offset);
        log.io('[%s] got frame of size %d', this.identifier, frame_size);
        if (buffer.length < offset + frame_size) {
            log.io('[%s] incomplete frame; have only %d of %d', this.identifier, (buffer.length - offset), frame_size);
            //don't have enough data for a full frame yet
            break;
        } else {
            var slice = buffer.slice(offset, offset + frame_size);
            log.raw('[%s] RECV: %d %h', this.identifier, slice.length, slice);
            var frame = frames.read_frame(slice);
            if (frame.performative) {
                log.frames('[%s]:%s <- %s %j', this.identifier, frame.channel, frame.performative.constructor, frame.performative, frame.payload || '');
            } else {
                log.frames('[%s]:%s <- empty', this.identifier, frame.channel);

            }
            if (frame.type !== this.frame_type) {
                throw new errors.ProtocolError('Invalid frame type: ' + frame.type);
            }
            offset += frame_size;
            if (frame.performative) {
                frame.performative.dispatch(this.handler, frame);
            }
        }
    }
    return offset;
};

module.exports = Transport;

},{"./errors.js":3,"./frames.js":6,"./log.js":8,"./util.js":15}],14:[function(require,module,exports){
(function (Buffer){(function (){
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

var errors = require('./errors.js');
var util = require('./util.js');

var CAT_FIXED = 1;
var CAT_VARIABLE = 2;
var CAT_COMPOUND = 3;
var CAT_ARRAY = 4;

function Typed(type, value, code, descriptor) {
    this.type = type;
    this.value = value;
    if (code) {
        this.array_constructor = {'typecode':code};
        if (descriptor) {
            this.array_constructor.descriptor = descriptor;
        }
    }
}

Typed.prototype.toString = function() {
    return this.value ? this.value.toString() : null;
};

Typed.prototype.toLocaleString = function() {
    return this.value ? this.value.toLocaleString() : null;
};

Typed.prototype.valueOf = function() {
    return this.value;
};

Typed.prototype.toJSON = function() {
    return this.value && this.value.toJSON ? this.value.toJSON() : this.value;
};

function TypeDesc(name, typecode, props, empty_value) {
    this.name = name;
    this.typecode = typecode;
    var subcategory = typecode >>> 4;
    switch (subcategory) {
    case 0x4:
        this.width = 0;
        this.category = CAT_FIXED;
        break;
    case 0x5:
        this.width = 1;
        this.category = CAT_FIXED;
        break;
    case 0x6:
        this.width = 2;
        this.category = CAT_FIXED;
        break;
    case 0x7:
        this.width = 4;
        this.category = CAT_FIXED;
        break;
    case 0x8:
        this.width = 8;
        this.category = CAT_FIXED;
        break;
    case 0x9:
        this.width = 16;
        this.category = CAT_FIXED;
        break;
    case 0xA:
        this.width = 1;
        this.category = CAT_VARIABLE;
        break;
    case 0xB:
        this.width = 4;
        this.category = CAT_VARIABLE;
        break;
    case 0xC:
        this.width = 1;
        this.category = CAT_COMPOUND;
        break;
    case 0xD:
        this.width = 4;
        this.category = CAT_COMPOUND;
        break;
    case 0xE:
        this.width = 1;
        this.category = CAT_ARRAY;
        break;
    case 0xF:
        this.width = 4;
        this.category = CAT_ARRAY;
        break;
    default:
        //can't happen
        break;
    }

    if (props) {
        if (props.read) {
            this.read = props.read;
        }
        if (props.write) {
            this.write = props.write;
        }
        if (props.encoding) {
            this.encoding = props.encoding;
        }
    }

    var t = this;
    if (subcategory === 0x4) {
        // 'empty' types don't take a value
        this.create = function () {
            return new Typed(t, empty_value);
        };
    } else if (subcategory === 0xE || subcategory === 0xF) {
        this.create = function (v, code, descriptor) {
            return new Typed(t, v, code, descriptor);
        };
    } else {
        this.create = function (v) {
            return new Typed(t, v);
        };
    }
}

TypeDesc.prototype.toString = function () {
    return this.name + '#' + hex(this.typecode);
};

function hex(i) {
    return Number(i).toString(16);
}

var types = {'by_code':{}};
Object.defineProperty(types, 'MAX_UINT', {value: 4294967295, writable: false, configurable: false});
Object.defineProperty(types, 'MAX_USHORT', {value: 65535, writable: false, configurable: false});

function define_type(name, typecode, annotations, empty_value) {
    var t = new TypeDesc(name, typecode, annotations, empty_value);
    t.create.typecode = t.typecode;//hack
    types.by_code[t.typecode] = t;
    types[name] = t.create;
}

function buffer_uint8_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readUInt8(offset); },
        'write': function (buffer, value, offset) { buffer.writeUInt8(value, offset); }
    };
}

function buffer_uint16be_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readUInt16BE(offset); },
        'write': function (buffer, value, offset) { buffer.writeUInt16BE(value, offset); }
    };
}

function buffer_uint32be_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readUInt32BE(offset); },
        'write': function (buffer, value, offset) { buffer.writeUInt32BE(value, offset); }
    };
}

function buffer_int8_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readInt8(offset); },
        'write': function (buffer, value, offset) { buffer.writeInt8(value, offset); }
    };
}

function buffer_int16be_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readInt16BE(offset); },
        'write': function (buffer, value, offset) { buffer.writeInt16BE(value, offset); }
    };
}

function buffer_int32be_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readInt32BE(offset); },
        'write': function (buffer, value, offset) { buffer.writeInt32BE(value, offset); }
    };
}

function buffer_floatbe_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readFloatBE(offset); },
        'write': function (buffer, value, offset) { buffer.writeFloatBE(value, offset); }
    };
}

function buffer_doublebe_ops() {
    return {
        'read': function (buffer, offset) { return buffer.readDoubleBE(offset); },
        'write': function (buffer, value, offset) { buffer.writeDoubleBE(value, offset); }
    };
}

var MAX_UINT = 4294967296; // 2^32
var MIN_INT = -2147483647;
function write_ulong(buffer, value, offset) {
    if ((typeof value) === 'number' || value instanceof Number) {
        var hi = Math.floor(value / MAX_UINT);
        var lo = value % MAX_UINT;
        buffer.writeUInt32BE(hi, offset);
        buffer.writeUInt32BE(lo, offset + 4);
    } else {
        value.copy(buffer, offset);
    }
}

function read_ulong(buffer, offset) {
    var hi = buffer.readUInt32BE(offset);
    var lo = buffer.readUInt32BE(offset + 4);
    if (hi < 2097153) {
        return hi * MAX_UINT + lo;
    } else {
        return buffer.slice(offset, offset + 8);
    }
}

function write_long(buffer, value, offset) {
    if ((typeof value) === 'number' || value instanceof Number) {
        var abs = Math.abs(value);
        var hi = Math.floor(abs / MAX_UINT);
        var lo = abs % MAX_UINT;
        buffer.writeInt32BE(hi, offset);
        buffer.writeUInt32BE(lo, offset + 4);
        if (value < 0) {
            var carry = 1;
            for (var i = 0; i < 8; i++) {
                var index = offset + (7 - i);
                var v = (buffer[index] ^ 0xFF) + carry;
                buffer[index] = v & 0xFF;
                carry = v >> 8;
            }
        }
    } else {
        value.copy(buffer, offset);
    }
}

function write_timestamp(buffer, value, offset) {
    if (typeof value === 'object' && value !== null && typeof value.getTime === 'function') {
        value = value.getTime();
    }
    return write_long(buffer, value, offset);
}

function read_long(buffer, offset) {
    var hi = buffer.readInt32BE(offset);
    var lo = buffer.readUInt32BE(offset + 4);
    if (hi < 2097153 && hi > -2097153) {
        return hi * MAX_UINT + lo;
    } else {
        return buffer.slice(offset, offset + 8);
    }
}

function read_timestamp(buffer, offset) {
    const l = read_long(buffer, offset);
    return new Date(l);
}

define_type('Null', 0x40, undefined, null);
define_type('Boolean', 0x56, buffer_uint8_ops());
define_type('True', 0x41, undefined, true);
define_type('False', 0x42, undefined, false);
define_type('Ubyte', 0x50, buffer_uint8_ops());
define_type('Ushort', 0x60, buffer_uint16be_ops());
define_type('Uint', 0x70, buffer_uint32be_ops());
define_type('SmallUint', 0x52, buffer_uint8_ops());
define_type('Uint0', 0x43, undefined, 0);
define_type('Ulong', 0x80, {'write':write_ulong, 'read':read_ulong});
define_type('SmallUlong', 0x53, buffer_uint8_ops());
define_type('Ulong0', 0x44, undefined, 0);
define_type('Byte', 0x51, buffer_int8_ops());
define_type('Short', 0x61, buffer_int16be_ops());
define_type('Int', 0x71, buffer_int32be_ops());
define_type('SmallInt', 0x54, buffer_int8_ops());
define_type('Long', 0x81, {'write':write_long, 'read':read_long});
define_type('SmallLong', 0x55, buffer_int8_ops());
define_type('Float', 0x72, buffer_floatbe_ops());
define_type('Double', 0x82, buffer_doublebe_ops());
define_type('Decimal32', 0x74);
define_type('Decimal64', 0x84);
define_type('Decimal128', 0x94);
define_type('CharUTF32', 0x73, buffer_uint32be_ops());
define_type('Timestamp', 0x83, {'write':write_timestamp, 'read':read_timestamp});
define_type('Uuid', 0x98);//TODO: convert to/from stringified form?
define_type('Vbin8', 0xa0);
define_type('Vbin32', 0xb0);
define_type('Str8', 0xa1, {'encoding':'utf8'});
define_type('Str32', 0xb1, {'encoding':'utf8'});
define_type('Sym8', 0xa3, {'encoding':'ascii'});
define_type('Sym32', 0xb3, {'encoding':'ascii'});
define_type('List0', 0x45, undefined, []);
define_type('List8', 0xc0);
define_type('List32', 0xd0);
define_type('Map8', 0xc1);
define_type('Map32', 0xd1);
define_type('Array8', 0xe0);
define_type('Array32', 0xf0);

function is_one_of(o, typelist) {
    for (var i = 0; i < typelist.length; i++) {
        if (o.type.typecode === typelist[i].typecode) return true;
    }
    return false;
}
function buffer_zero(b, len, neg) {
    for (var i = 0; i < len && i < b.length; i++) {
        if (b[i] !== (neg ? 0xff : 0)) return false;
    }
    return true;
}
types.is_ulong = function(o) {
    return is_one_of(o, [types.Ulong, types.Ulong0, types.SmallUlong]);
};
types.is_string = function(o) {
    return is_one_of(o, [types.Str8, types.Str32]);
};
types.is_symbol = function(o) {
    return is_one_of(o, [types.Sym8, types.Sym32]);
};
types.is_list = function(o) {
    return is_one_of(o, [types.List0, types.List8, types.List32]);
};
types.is_map = function(o) {
    return is_one_of(o, [types.Map8, types.Map32]);
};

types.wrap_boolean = function(v) {
    return v ? types.True() : types.False();
};
types.wrap_ulong = function(l) {
    if (Buffer.isBuffer(l)) {
        if (buffer_zero(l, 8, false)) return types.Ulong0();
        return buffer_zero(l, 7, false) ? types.SmallUlong(l[7]) : types.Ulong(l);
    } else {
        if (l === 0) return types.Ulong0();
        else return l > 255 ? types.Ulong(l) : types.SmallUlong(l);
    }
};
types.wrap_uint = function(l) {
    if (l === 0) return types.Uint0();
    else return l > 255 ? types.Uint(l) : types.SmallUint(l);
};
types.wrap_ushort = function(l) {
    return types.Ushort(l);
};
types.wrap_ubyte = function(l) {
    return types.Ubyte(l);
};
types.wrap_long = function(l) {
    if (Buffer.isBuffer(l)) {
        var negFlag = (l[0] & 0x80) !== 0;
        if (buffer_zero(l, 7, negFlag) && (l[7] & 0x80) === (negFlag ? 0x80 : 0)) {
            return types.SmallLong(negFlag ? -((l[7] ^ 0xff) + 1) : l[7]);
        }
        return types.Long(l);
    } else {
        return l > 127 || l < -128 ? types.Long(l) : types.SmallLong(l);
    }
};
types.wrap_int = function(l) {
    return l > 127 || l < -128 ? types.Int(l) : types.SmallInt(l);
};
types.wrap_short = function(l) {
    return types.Short(l);
};
types.wrap_byte = function(l) {
    return types.Byte(l);
};
types.wrap_float = function(l) {
    return types.Float(l);
};
types.wrap_double = function(l) {
    return types.Double(l);
};
types.wrap_timestamp = function(l) {
    return types.Timestamp(l);
};
types.wrap_char = function(v) {
    return types.CharUTF32(v);
};
types.wrap_uuid = function(v) {
    return types.Uuid(v);
};
types.wrap_binary = function (s) {
    return s.length > 255 ? types.Vbin32(s) : types.Vbin8(s);
};
types.wrap_string = function (s) {
    return Buffer.byteLength(s) > 255 ? types.Str32(s) : types.Str8(s);
};
types.wrap_symbol = function (s) {
    return Buffer.byteLength(s) > 255 ? types.Sym32(s) : types.Sym8(s);
};
types.wrap_list = function(l) {
    if (l.length === 0) return types.List0();
    var items = l.map(types.wrap);
    return types.List32(items);
};
types.wrap_map = function(m, key_wrapper) {
    var items = [];
    for (var k in m) {
        items.push(key_wrapper ? key_wrapper(k) : types.wrap(k));
        items.push(types.wrap(m[k]));
    }
    return types.Map32(items);
};
types.wrap_symbolic_map = function(m) {
    return types.wrap_map(m, types.wrap_symbol);
};
types.wrap_array = function(l, code, descriptors) {
    if (code) {
        return types.Array32(l, code, descriptors);
    } else {
        console.trace('An array must specify a type for its elements');
        throw new errors.TypeError('An array must specify a type for its elements');
    }
};
types.wrap = function(o) {
    var t = typeof o;
    if (t === 'string') {
        return types.wrap_string(o);
    } else if (t === 'boolean') {
        return o ? types.True() : types.False();
    } else if (t === 'number' || o instanceof Number) {
        if (isNaN(o)) {
            return types.Null();
        } else if (Math.floor(o) - o !== 0) {
            return types.Double(o);
        } else if (o > 0) {
            if (o < MAX_UINT) {
                return types.wrap_uint(o);
            } else {
                return types.wrap_ulong(o);
            }
        } else {
            if (o > MIN_INT) {
                return types.wrap_int(o);
            } else {
                return types.wrap_long(o);
            }
        }
    } else if (o instanceof Date) {
        return types.wrap_timestamp(o.getTime());
    } else if (o instanceof Typed) {
        return o;
    } else if (o instanceof Buffer || o instanceof Uint8Array) {
        return types.wrap_binary(o);
    } else if (t === 'undefined' || o === null) {
        return types.Null();
    } else if (Array.isArray(o)) {
        return types.wrap_list(o);
    } else {
        return types.wrap_map(o);
    }
};

types.wrap_described = function(value, descriptor) {
    var result = types.wrap(value);
    if (descriptor) {
        if (typeof descriptor === 'string') {
            result = types.described(types.wrap_symbol(descriptor), result);
        } else if (typeof descriptor === 'number' || descriptor instanceof Number) {
            result = types.described(types.wrap_ulong(descriptor), result);
        }
    }
    return result;
};

types.wrap_message_id = function(o) {
    var t = typeof o;
    if (t === 'string') {
        return types.wrap_string(o);
    } else if (t === 'number' || o instanceof Number) {
        return types.wrap_ulong(o);
    } else if (Buffer.isBuffer(o)) {
        return types.wrap_uuid(o);
    } else {
        //TODO handle uuids
        throw new errors.TypeError('invalid message id:' + o);
    }
};

/**
 * Converts the list of keys and values that comprise an AMQP encoded
 * map into a proper javascript map/object.
 */
function mapify(elements) {
    var result = {};
    for (var i = 0; i+1 < elements.length;) {
        result[elements[i++]] = elements[i++];
    }
    return result;
}

var by_descriptor = {};

types.unwrap_map_simple = function(o) {
    return mapify(o.value.map(function (i) { return types.unwrap(i, true); }));
};

types.unwrap = function(o, leave_described) {
    if (o instanceof Typed) {
        if (o.descriptor) {
            var c = by_descriptor[o.descriptor.value];
            if (c) {
                return new c(o.value);
            } else if (leave_described) {
                return o;
            }
        }
        var u = types.unwrap(o.value, true);
        return types.is_map(o) ? mapify(u) : u;
    } else if (Array.isArray(o)) {
        return o.map(function (i) { return types.unwrap(i, true); });
    } else {
        return o;
    }
};

/*
types.described = function (descriptor, typedvalue) {
    var o = Object.create(typedvalue);
    if (descriptor.length) {
        o.descriptor = descriptor.shift();
        return types.described(descriptor, o);
    } else {
        o.descriptor = descriptor;
        return o;
    }
};
*/
types.described_nc = function (descriptor, o) {
    if (descriptor.length) {
        o.descriptor = descriptor.shift();
        return types.described(descriptor, o);
    } else {
        o.descriptor = descriptor;
        return o;
    }
};
types.described = types.described_nc;

function get_type(code) {
    var type = types.by_code[code];
    if (!type) {
        throw new errors.TypeError('Unrecognised typecode: ' + hex(code));
    }
    return type;
}

types.Reader = function (buffer) {
    this.buffer = buffer;
    this.position = 0;
};

types.Reader.prototype.read_typecode = function () {
    return this.read_uint(1);
};

types.Reader.prototype.read_uint = function (width) {
    var current = this.position;
    this.position += width;
    if (width === 1) {
        return this.buffer.readUInt8(current);
    } else if (width === 2) {
        return this.buffer.readUInt16BE(current);
    } else if (width === 4) {
        return this.buffer.readUInt32BE(current);
    } else {
        throw new errors.TypeError('Unexpected width for uint ' + width);
    }
};

types.Reader.prototype.read_fixed_width = function (type) {
    var current = this.position;
    this.position += type.width;
    if (type.read) {
        return type.read(this.buffer, current);
    } else {
        return this.buffer.slice(current, this.position);
    }
};

types.Reader.prototype.read_variable_width = function (type) {
    var size = this.read_uint(type.width);
    var slice = this.read_bytes(size);
    return type.encoding ? slice.toString(type.encoding) : slice;
};

types.Reader.prototype.read = function () {
    var constructor = this.read_constructor();
    var value = this.read_value(get_type(constructor.typecode));
    return constructor.descriptor ? types.described_nc(constructor.descriptor, value) : value;
};

types.Reader.prototype.read_constructor = function (descriptors) {
    var code = this.read_typecode();
    if (code === 0x00) {
        if (descriptors === undefined) {
            descriptors = [];
        }
        descriptors.push(this.read());
        return this.read_constructor(descriptors);
    } else {
        if (descriptors === undefined) {
            return {'typecode': code};
        } else if (descriptors.length === 1) {
            return {'typecode': code, 'descriptor':  descriptors[0]};
        } else {
            return {'typecode': code, 'descriptor':  descriptors[0], 'descriptors': descriptors};
        }
    }
};

types.Reader.prototype.read_value = function (type) {
    if (type.width === 0) {
        return type.create();
    } else if (type.category === CAT_FIXED) {
        return type.create(this.read_fixed_width(type));
    } else if (type.category === CAT_VARIABLE) {
        return type.create(this.read_variable_width(type));
    } else if (type.category === CAT_COMPOUND) {
        return this.read_compound(type);
    } else if (type.category === CAT_ARRAY) {
        return this.read_array(type);
    } else {
        throw new errors.TypeError('Invalid category for type: ' + type);
    }
};

types.Reader.prototype.read_array_items = function (n, type) {
    var items = [];
    while (items.length < n) {
        items.push(this.read_value(type));
    }
    return items;
};

types.Reader.prototype.read_n = function (n) {
    var items = new Array(n);
    for (var i = 0; i < n; i++) {
        items[i] = this.read();
    }
    return items;
};

types.Reader.prototype.read_size_count = function (width) {
    return {'size': this.read_uint(width), 'count': this.read_uint(width)};
};

types.Reader.prototype.read_compound = function (type) {
    var limits = this.read_size_count(type.width);
    return type.create(this.read_n(limits.count));
};

types.Reader.prototype.read_array = function (type) {
    var limits = this.read_size_count(type.width);
    var constructor = this.read_constructor();
    return type.create(this.read_array_items(limits.count, get_type(constructor.typecode)), constructor.typecode, constructor.descriptor);
};

types.Reader.prototype.toString = function () {
    var s = 'buffer@' + this.position;
    if (this.position) s += ': ';
    for (var i = this.position; i < this.buffer.length; i++) {
        if (i > 0) s+= ',';
        s += '0x' + Number(this.buffer[i]).toString(16);
    }
    return s;
};

types.Reader.prototype.reset = function () {
    this.position = 0;
};

types.Reader.prototype.skip = function (bytes) {
    this.position += bytes;
};

types.Reader.prototype.read_bytes = function (bytes) {
    var current = this.position;
    this.position += bytes;
    return this.buffer.slice(current, this.position);
};

types.Reader.prototype.remaining = function () {
    return this.buffer.length - this.position;
};

types.Writer = function (buffer) {
    this.buffer = buffer ? buffer : util.allocate_buffer(1024);
    this.position = 0;
};

types.Writer.prototype.toBuffer = function () {
    return this.buffer.slice(0, this.position);
};

function max(a, b) {
    return a > b ? a : b;
}

types.Writer.prototype.ensure = function (length) {
    if (this.buffer.length < length) {
        var bigger = util.allocate_buffer(max(this.buffer.length*2, length));
        this.buffer.copy(bigger);
        this.buffer = bigger;
    }
};

types.Writer.prototype.write_typecode = function (code) {
    this.write_uint(code, 1);
};

types.Writer.prototype.write_uint = function (value, width) {
    var current = this.position;
    this.ensure(this.position + width);
    this.position += width;
    if (width === 1) {
        return this.buffer.writeUInt8(value, current);
    } else if (width === 2) {
        return this.buffer.writeUInt16BE(value, current);
    } else if (width === 4) {
        return this.buffer.writeUInt32BE(value, current);
    } else {
        throw new errors.TypeError('Unexpected width for uint ' + width);
    }
};


types.Writer.prototype.write_fixed_width = function (type, value) {
    var current = this.position;
    this.ensure(this.position + type.width);
    this.position += type.width;
    if (type.write) {
        type.write(this.buffer, value, current);
    } else if (value.copy) {
        value.copy(this.buffer, current);
    } else {
        throw new errors.TypeError('Cannot handle write for ' + type);
    }
};

types.Writer.prototype.write_variable_width = function (type, value) {
    var source = type.encoding ? Buffer.from(value, type.encoding) : Buffer.from(value);//TODO: avoid creating new buffers
    this.write_uint(source.length, type.width);
    this.write_bytes(source);
};

types.Writer.prototype.write_bytes = function (source) {
    var current = this.position;
    this.ensure(this.position + source.length);
    this.position += source.length;
    source.copy(this.buffer, current);
};

types.Writer.prototype.write_constructor = function (typecode, descriptor) {
    if (descriptor) {
        this.write_typecode(0x00);
        this.write(descriptor);
    }
    this.write_typecode(typecode);
};

types.Writer.prototype.write = function (o) {
    if (o.type === undefined) {
        if (o.described) {
            this.write(o.described());
        } else {
            throw new errors.TypeError('Cannot write ' + JSON.stringify(o));
        }
    } else {
        this.write_constructor(o.type.typecode, o.descriptor);
        this.write_value(o.type, o.value, o.array_constructor);
    }
};

types.Writer.prototype.write_value = function (type, value, constructor/*for arrays only*/) {
    if (type.width === 0) {
        return;//nothing further to do
    } else if (type.category === CAT_FIXED) {
        this.write_fixed_width(type, value);
    } else if (type.category === CAT_VARIABLE) {
        this.write_variable_width(type, value);
    } else if (type.category === CAT_COMPOUND) {
        this.write_compound(type, value);
    } else if (type.category === CAT_ARRAY) {
        this.write_array(type, value, constructor);
    } else {
        throw new errors.TypeError('Invalid category ' + type.category + ' for type: ' + type);
    }
};

types.Writer.prototype.backfill_size = function (width, saved) {
    var gap = this.position - saved;
    this.position = saved;
    this.write_uint(gap - width, width);
    this.position += (gap - width);
};

types.Writer.prototype.write_compound = function (type, value) {
    var saved = this.position;
    this.position += type.width;//skip size field
    this.write_uint(value.length, type.width);//count field
    for (var i = 0; i < value.length; i++) {
        if (value[i] === undefined || value[i] === null) {
            this.write(types.Null());
        } else {
            this.write(value[i]);
        }
    }
    this.backfill_size(type.width, saved);
};

types.Writer.prototype.write_array = function (type, value, constructor) {
    var saved = this.position;
    this.position += type.width;//skip size field
    this.write_uint(value.length, type.width);//count field
    this.write_constructor(constructor.typecode, constructor.descriptor);
    var ctype = get_type(constructor.typecode);
    for (var i = 0; i < value.length; i++) {
        this.write_value(ctype, value[i]);
    }
    this.backfill_size(type.width, saved);
};

types.Writer.prototype.toString = function () {
    var s = 'buffer@' + this.position;
    if (this.position) s += ': ';
    for (var i = 0; i < this.position; i++) {
        if (i > 0) s+= ',';
        s += ('00' + Number(this.buffer[i]).toString(16)).slice(-2);
    }
    return s;
};

types.Writer.prototype.skip = function (bytes) {
    this.ensure(this.position + bytes);
    this.position += bytes;
};

types.Writer.prototype.clear = function () {
    this.buffer.fill(0x00);
    this.position = 0;
};

types.Writer.prototype.remaining = function () {
    return this.buffer.length - this.position;
};


function get_constructor(typename) {
    if (typename === 'symbol') {
        return {typecode:types.Sym8.typecode};
    }
    throw new errors.TypeError('TODO: Array of type ' + typename + ' not yet supported');
}

function wrap_field(definition, instance) {
    if (instance !== undefined && instance !== null) {
        if (Array.isArray(instance)) {
            if (!definition.multiple) {
                throw new errors.TypeError('Field ' + definition.name + ' does not support multiple values, got ' + JSON.stringify(instance));
            }
            var constructor = get_constructor(definition.type);
            return types.wrap_array(instance, constructor.typecode, constructor.descriptor);
        } else if (definition.type === '*') {
            return instance;
        } else {
            var wrapper = types['wrap_' + definition.type];
            if (wrapper) {
                return wrapper(instance);
            } else {
                throw new errors.TypeError('No wrapper for field ' + definition.name + ' of type ' + definition.type);
            }
        }
    } else if (definition.mandatory) {
        throw new errors.TypeError('Field ' + definition.name + ' is mandatory');
    } else {
        return types.Null();
    }
}

function get_accessors(index, field_definition) {
    var getter;
    if (field_definition.type === '*') {
        getter = function() { return this.value[index]; };
    } else {
        getter = function() { return types.unwrap(this.value[index]); };
    }
    var setter = function(o) { this.value[index] = wrap_field(field_definition, o); };
    return {'get': getter, 'set': setter, 'enumerable':true, 'configurable':false};
}

types.define_composite = function(def) {
    var c = function(fields) {
        this.value = fields ? fields : [];
    };
    c.descriptor = {
        numeric: def.code,
        symbolic: 'amqp:' + def.name + ':list'
    };
    c.prototype.dispatch = function (target, frame) {
        target['on_' + def.name](frame);
    };
    //c.prototype.descriptor = c.descriptor.numeric;
    //c.prototype = Object.create(types.List8.prototype);
    for (var i = 0; i < def.fields.length; i++) {
        var f = def.fields[i];
        Object.defineProperty(c.prototype, f.name, get_accessors(i, f));
    }
    c.toString = function() {
        return def.name + '#' + Number(def.code).toString(16);
    };
    c.prototype.toJSON = function() {
        var o = {};
        for (var f in this) {
            if (f !== 'value' && this[f]) {
                o[f] = this[f];
            }
        }
        return o;
    };
    c.create = function(fields) {
        var o = new c;
        for (var f in fields) {
            o[f] = fields[f];
        }
        return o;
    };
    c.prototype.described = function() {
        return types.described_nc(types.wrap_ulong(c.descriptor.numeric), types.wrap_list(this.value));
    };
    return c;
};

function add_type(def) {
    var c = types.define_composite(def);
    types['wrap_' + def.name] = function (fields) {
        return c.create(fields).described();
    };
    by_descriptor[Number(c.descriptor.numeric).toString(10)] = c;
    by_descriptor[c.descriptor.symbolic] = c;
}

add_type({
    name: 'error',
    code: 0x1d,
    fields: [
        {name:'condition', type:'symbol', mandatory:true},
        {name:'description', type:'string'},
        {name:'info', type:'map'}
    ]
});

module.exports = types;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./errors.js":3,"./util.js":15,"buffer":21}],15:[function(require,module,exports){
(function (Buffer){(function (){
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

var errors = require('./errors.js');

var util = {};

util.allocate_buffer = function (size) {
    return Buffer.alloc ? Buffer.alloc(size) : new Buffer(size);
};

util.generate_uuid = function () {
    return util.uuid_to_string(util.uuid4());
};

util.uuid4 = function () {
    var bytes = util.allocate_buffer(16);
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = Math.random()*255|0;
    }

    // From RFC4122, the version bits are set to 0100
    bytes[7] &= 0x0F;
    bytes[7] |= 0x40;

    // From RFC4122, the top two bits of byte 8 get set to 01
    bytes[8] &= 0x3F;
    bytes[8] |= 0x80;

    return bytes;
};


util.uuid_to_string = function (buffer) {
    if (buffer.length === 16) {
        var chunks = [buffer.slice(0, 4), buffer.slice(4, 6), buffer.slice(6, 8), buffer.slice(8, 10), buffer.slice(10, 16)];
        return chunks.map(function (b) { return b.toString('hex'); }).join('-');
    } else {
        throw new errors.TypeError('Not a UUID, expecting 16 byte buffer');
    }
};

var parse_uuid = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/;

util.string_to_uuid = function (uuid_string) {
    var parts = parse_uuid.exec(uuid_string.toLowerCase());
    if (parts) {
        return Buffer.from(parts.slice(1).join(''), 'hex');
    } else {
        throw new errors.TypeError('Not a valid UUID string: ' + uuid_string);
    }
};

util.clone = function (o) {
    var copy = Object.create(o.prototype || {});
    var names = Object.getOwnPropertyNames(o);
    for (var i = 0; i < names.length; i++) {
        var key = names[i];
        copy[key] = o[key];
    }
    return copy;
};

util.and = function (f, g) {
    if (g === undefined) return f;
    return function (o) {
        return f(o) && g(o);
    };
};

util.is_sender = function (o) { return o.is_sender(); };
util.is_receiver = function (o) { return o.is_receiver(); };
util.sender_filter = function (filter) { return util.and(util.is_sender, filter); };
util.receiver_filter = function (filter) { return util.and(util.is_receiver, filter); };

util.is_defined = function (field) {
    return field !== undefined && field !== null;
};

module.exports = util;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./errors.js":3,"buffer":21}],16:[function(require,module,exports){
(function (Buffer){(function (){
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

function nulltransform(data) { return data; }

function from_arraybuffer(data) {
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
    else return Buffer.from(data);
}

function to_typedarray(data) {
    return new Uint8Array(data);
}

function wrap(ws) {
    var data_recv = nulltransform;
    var data_send = nulltransform;
    if (ws.binaryType) {
        ws.binaryType = 'arraybuffer';
        data_recv = from_arraybuffer;
        data_send = to_typedarray;
    }
    return {
        end: function() {
            ws.close();
        },
        write: function(data) {
            try {
                ws.send(data_send(data), {binary:true});
            } catch (e) {
                ws.onerror(e);
            }
        },
        on: function(event, handler) {
            if (event === 'data') {
                ws.onmessage = function(msg_evt) {
                    handler(data_recv(msg_evt.data));
                };
            } else if (event === 'end') {
                ws.onclose = handler;
            } else if (event === 'error') {
                ws.onerror = handler;
            } else {
                console.error('ERROR: Attempt to set unrecognised handler on websocket wrapper: ' + event);
            }
        },
        get_id_string: function() {
            return ws.url;
        }
    };
}

module.exports = {

    'connect': function(Impl) {
        return function (url, protocols, options) {
            return function () {
                return {
                    connect: function(port_ignore, host_ignore, options_ignore, callback) {
                        var c = new Impl(url, protocols, options);
                        c.onopen = callback;
                        return wrap(c);
                    }
                };
            };
        };
    },
    'wrap': wrap
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":21}],17:[function(require,module,exports){

/**
 * Array#filter.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Object=} self
 * @return {Array}
 * @throw TypeError
 */

module.exports = function (arr, fn, self) {
  if (arr.filter) return arr.filter(fn, self);
  if (void 0 === arr || null === arr) throw new TypeError;
  if ('function' != typeof fn) throw new TypeError;
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwn.call(arr, i)) continue;
    var val = arr[i];
    if (fn.call(self, val, i, arr)) ret.push(val);
  }
  return ret;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],18:[function(require,module,exports){
(function (global){(function (){
'use strict';

var filter = require('array-filter');

module.exports = function availableTypedArrays() {
	return filter([
		'BigInt64Array',
		'BigUint64Array',
		'Float32Array',
		'Float64Array',
		'Int16Array',
		'Int32Array',
		'Int8Array',
		'Uint16Array',
		'Uint32Array',
		'Uint8Array',
		'Uint8ClampedArray'
	], function (typedArray) {
		return typeof global[typedArray] === 'function';
	});
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"array-filter":17}],19:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],20:[function(require,module,exports){

},{}],21:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":19,"buffer":21,"ieee754":35}],22:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var callBind = require('./');

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};

},{"./":23,"get-intrinsic":31}],23:[function(require,module,exports){
'use strict';

var bind = require('function-bind');
var GetIntrinsic = require('get-intrinsic');

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}

},{"function-bind":30,"get-intrinsic":31}],24:[function(require,module,exports){
(function (process){(function (){
"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
/**
 * Colors.
 */

exports.colors = ['#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC', '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF', '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC', '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF', '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC', '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033', '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366', '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933', '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC', '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF', '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'];
/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */
// eslint-disable-next-line complexity

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
    return true;
  } // Internet Explorer and Edge do not support colors.


  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  } // Is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632


  return typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
  typeof window !== 'undefined' && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
  // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
  typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
  typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
}
/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */


function formatArgs(args) {
  args[0] = (this.useColors ? '%c' : '') + this.namespace + (this.useColors ? ' %c' : ' ') + args[0] + (this.useColors ? '%c ' : ' ') + '+' + module.exports.humanize(this.diff);

  if (!this.useColors) {
    return;
  }

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit'); // The final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into

  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function (match) {
    if (match === '%%') {
      return;
    }

    index++;

    if (match === '%c') {
      // We only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });
  args.splice(lastC, 0, c);
}
/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */


function log() {
  var _console;

  // This hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return (typeof console === "undefined" ? "undefined" : _typeof(console)) === 'object' && console.log && (_console = console).log.apply(_console, arguments);
}
/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */


function save(namespaces) {
  try {
    if (namespaces) {
      exports.storage.setItem('debug', namespaces);
    } else {
      exports.storage.removeItem('debug');
    }
  } catch (error) {// Swallow
    // XXX (@Qix-) should we be logging these?
  }
}
/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */


function load() {
  var r;

  try {
    r = exports.storage.getItem('debug');
  } catch (error) {} // Swallow
  // XXX (@Qix-) should we be logging these?
  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG


  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}
/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */


function localstorage() {
  try {
    // TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
    // The Browser also has localStorage in the global context.
    return localStorage;
  } catch (error) {// Swallow
    // XXX (@Qix-) should we be logging these?
  }
}

module.exports = require('./common')(exports);
var formatters = module.exports.formatters;
/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
  try {
    return JSON.stringify(v);
  } catch (error) {
    return '[UnexpectedJSONParseError]: ' + error.message;
  }
};


}).call(this)}).call(this,require('_process'))
},{"./common":25,"_process":43}],25:[function(require,module,exports){
"use strict";

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */
function setup(env) {
  createDebug.debug = createDebug;
  createDebug.default = createDebug;
  createDebug.coerce = coerce;
  createDebug.disable = disable;
  createDebug.enable = enable;
  createDebug.enabled = enabled;
  createDebug.humanize = require('ms');
  Object.keys(env).forEach(function (key) {
    createDebug[key] = env[key];
  });
  /**
  * Active `debug` instances.
  */

  createDebug.instances = [];
  /**
  * The currently active debug mode names, and names to skip.
  */

  createDebug.names = [];
  createDebug.skips = [];
  /**
  * Map of special "%n" handling functions, for the debug "format" argument.
  *
  * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
  */

  createDebug.formatters = {};
  /**
  * Selects a color for a debug namespace
  * @param {String} namespace The namespace string for the for the debug instance to be colored
  * @return {Number|String} An ANSI color code for the given namespace
  * @api private
  */

  function selectColor(namespace) {
    var hash = 0;

    for (var i = 0; i < namespace.length; i++) {
      hash = (hash << 5) - hash + namespace.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
  }

  createDebug.selectColor = selectColor;
  /**
  * Create a debugger with the given `namespace`.
  *
  * @param {String} namespace
  * @return {Function}
  * @api public
  */

  function createDebug(namespace) {
    var prevTime;

    function debug() {
      // Disabled?
      if (!debug.enabled) {
        return;
      }

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var self = debug; // Set `diff` timestamp

      var curr = Number(new Date());
      var ms = curr - (prevTime || curr);
      self.diff = ms;
      self.prev = prevTime;
      self.curr = curr;
      prevTime = curr;
      args[0] = createDebug.coerce(args[0]);

      if (typeof args[0] !== 'string') {
        // Anything else let's inspect with %O
        args.unshift('%O');
      } // Apply any `formatters` transformations


      var index = 0;
      args[0] = args[0].replace(/%([a-zA-Z%])/g, function (match, format) {
        // If we encounter an escaped % then don't increase the array index
        if (match === '%%') {
          return match;
        }

        index++;
        var formatter = createDebug.formatters[format];

        if (typeof formatter === 'function') {
          var val = args[index];
          match = formatter.call(self, val); // Now we need to remove `args[index]` since it's inlined in the `format`

          args.splice(index, 1);
          index--;
        }

        return match;
      }); // Apply env-specific formatting (colors, etc.)

      createDebug.formatArgs.call(self, args);
      var logFn = self.log || createDebug.log;
      logFn.apply(self, args);
    }

    debug.namespace = namespace;
    debug.enabled = createDebug.enabled(namespace);
    debug.useColors = createDebug.useColors();
    debug.color = selectColor(namespace);
    debug.destroy = destroy;
    debug.extend = extend; // Debug.formatArgs = formatArgs;
    // debug.rawLog = rawLog;
    // env-specific initialization logic for debug instances

    if (typeof createDebug.init === 'function') {
      createDebug.init(debug);
    }

    createDebug.instances.push(debug);
    return debug;
  }

  function destroy() {
    var index = createDebug.instances.indexOf(this);

    if (index !== -1) {
      createDebug.instances.splice(index, 1);
      return true;
    }

    return false;
  }

  function extend(namespace, delimiter) {
    return createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
  }
  /**
  * Enables a debug mode by namespaces. This can include modes
  * separated by a colon and wildcards.
  *
  * @param {String} namespaces
  * @api public
  */


  function enable(namespaces) {
    createDebug.save(namespaces);
    createDebug.names = [];
    createDebug.skips = [];
    var i;
    var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
    var len = split.length;

    for (i = 0; i < len; i++) {
      if (!split[i]) {
        // ignore empty strings
        continue;
      }

      namespaces = split[i].replace(/\*/g, '.*?');

      if (namespaces[0] === '-') {
        createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
      } else {
        createDebug.names.push(new RegExp('^' + namespaces + '$'));
      }
    }

    for (i = 0; i < createDebug.instances.length; i++) {
      var instance = createDebug.instances[i];
      instance.enabled = createDebug.enabled(instance.namespace);
    }
  }
  /**
  * Disable debug output.
  *
  * @api public
  */


  function disable() {
    createDebug.enable('');
  }
  /**
  * Returns true if the given mode name is enabled, false otherwise.
  *
  * @param {String} name
  * @return {Boolean}
  * @api public
  */


  function enabled(name) {
    if (name[name.length - 1] === '*') {
      return true;
    }

    var i;
    var len;

    for (i = 0, len = createDebug.skips.length; i < len; i++) {
      if (createDebug.skips[i].test(name)) {
        return false;
      }
    }

    for (i = 0, len = createDebug.names.length; i < len; i++) {
      if (createDebug.names[i].test(name)) {
        return true;
      }
    }

    return false;
  }
  /**
  * Coerce `val`.
  *
  * @param {Mixed} val
  * @return {Mixed}
  * @api private
  */


  function coerce(val) {
    if (val instanceof Error) {
      return val.stack || val.message;
    }

    return val;
  }

  createDebug.enable(createDebug.load());
  return createDebug;
}

module.exports = setup;


},{"ms":40}],26:[function(require,module,exports){
'use strict';

var GetIntrinsic = require('get-intrinsic');

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%');
if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;

},{"get-intrinsic":31}],27:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function eventListener() {
      if (errorListener !== undefined) {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };
    var errorListener;

    // Adding an error listener is not optional because
    // if an error is thrown on an event emitter we cannot
    // guarantee that the actual event we are waiting will
    // be fired. The result could be a silent way to create
    // memory or file descriptor leaks, which is something
    // we should avoid.
    if (name !== 'error') {
      errorListener = function errorListener(err) {
        emitter.removeListener(name, eventListener);
        reject(err);
      };

      emitter.once('error', errorListener);
    }

    emitter.once(name, eventListener);
  });
}

},{}],28:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],29:[function(require,module,exports){
'use strict';

/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};

},{}],30:[function(require,module,exports){
'use strict';

var implementation = require('./implementation');

module.exports = Function.prototype.bind || implementation;

},{"./implementation":29}],31:[function(require,module,exports){
'use strict';

/* globals
	AggregateError,
	Atomics,
	FinalizationRegistry,
	SharedArrayBuffer,
	WeakRef,
*/

var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		// eslint-disable-next-line no-new-func
		return Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = require('has-symbols')();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var asyncGenFunction = getEvalledConstructor('async function* () {}');
var asyncGenFunctionPrototype = asyncGenFunction ? asyncGenFunction.prototype : undefined;
var asyncGenPrototype = asyncGenFunctionPrototype ? asyncGenFunctionPrototype.prototype : undefined;

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': getEvalledConstructor('async function () {}'),
	'%AsyncGenerator%': asyncGenFunctionPrototype,
	'%AsyncGeneratorFunction%': asyncGenFunction,
	'%AsyncIteratorPrototype%': asyncGenPrototype ? getProto(asyncGenPrototype) : undefined,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': getEvalledConstructor('function* () {}'),
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = require('function-bind');
var hasOwn = require('has');
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};

},{"function-bind":30,"has":34,"has-symbols":32}],32:[function(require,module,exports){
(function (global){(function (){
'use strict';

var origSymbol = global.Symbol;
var hasSymbolSham = require('./shams');

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./shams":33}],33:[function(require,module,exports){
'use strict';

/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};

},{}],34:[function(require,module,exports){
'use strict';

var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":30}],35:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],36:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],37:[function(require,module,exports){
'use strict';

var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;

},{"call-bind/callBound":22}],38:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var generatorFunc = getGeneratorFunc();
var GeneratorFunction = getProto && generatorFunc ? getProto(generatorFunc) : false;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	return getProto && getProto(fn) === GeneratorFunction;
};

},{}],39:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('foreach');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');
var hasSymbols = require('has-symbols')();
var hasToStringTag = hasSymbols && typeof Symbol.toStringTag === 'symbol';

var typedArrays = availableTypedArrays();

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var gOPD = require('es-abstract/helpers/getOwnPropertyDescriptor');
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new global[typedArray]();
		if (!(Symbol.toStringTag in arr)) {
			throw new EvalError('this engine has support for Symbol.toStringTag, but ' + typedArray + ' does not have the property! Please report this.');
		}
		var proto = getPrototypeOf(arr);
		var descriptor = gOPD(proto, Symbol.toStringTag);
		if (!descriptor) {
			var superProto = getPrototypeOf(proto);
			descriptor = gOPD(superProto, Symbol.toStringTag);
		}
		toStrTags[typedArray] = descriptor.get;
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var anyTrue = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!anyTrue) {
			try {
				anyTrue = getter.call(value) === typedArray;
			} catch (e) { /**/ }
		}
	});
	return anyTrue;
};

module.exports = function isTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag) {
		var tag = $slice($toString(value), 8, -1);
		return $indexOf(typedArrays, tag) > -1;
	}
	if (!gOPD) { return false; }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":18,"call-bind/callBound":22,"es-abstract/helpers/getOwnPropertyDescriptor":26,"foreach":28,"has-symbols":32}],40:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\-?\d?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

},{}],41:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],42:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":43}],43:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],44:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],45:[function(require,module,exports){
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict';

var isArgumentsObject = require('is-arguments');
var isGeneratorFunction = require('is-generator-function');
var whichTypedArray = require('which-typed-array');
var isTypedArray = require('is-typed-array');

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
isSharedArrayBufferToString.working = (
  typeof SharedArrayBuffer !== 'undefined' &&
  isSharedArrayBufferToString(new SharedArrayBuffer())
);
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBuffer;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});

},{"is-arguments":37,"is-generator-function":38,"is-typed-array":39,"which-typed-array":47}],46:[function(require,module,exports){
(function (process){(function (){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if (process.env.NODE_DEBUG) {
  var debugEnv = process.env.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = require('./support/types');

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;

}).call(this)}).call(this,require('_process'))
},{"./support/isBuffer":44,"./support/types":45,"_process":43,"inherits":36}],47:[function(require,module,exports){
(function (global){(function (){
'use strict';

var forEach = require('foreach');
var availableTypedArrays = require('available-typed-arrays');
var callBound = require('call-bind/callBound');

var $toString = callBound('Object.prototype.toString');
var hasSymbols = require('has-symbols')();
var hasToStringTag = hasSymbols && typeof Symbol.toStringTag === 'symbol';

var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var gOPD = require('es-abstract/helpers/getOwnPropertyDescriptor');
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		if (typeof global[typedArray] === 'function') {
			var arr = new global[typedArray]();
			if (!(Symbol.toStringTag in arr)) {
				throw new EvalError('this engine has support for Symbol.toStringTag, but ' + typedArray + ' does not have the property! Please report this.');
			}
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			toStrTags[typedArray] = descriptor.get;
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var foundName = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!foundName) {
			try {
				var name = getter.call(value);
				if (name === typedArray) {
					foundName = name;
				}
			} catch (e) {}
		}
	});
	return foundName;
};

var isTypedArray = require('is-typed-array');

module.exports = function whichTypedArray(value) {
	if (!isTypedArray(value)) { return false; }
	if (!hasToStringTag) { return $slice($toString(value), 8, -1); }
	return tryTypedArrays(value);
};

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"available-typed-arrays":18,"call-bind/callBound":22,"es-abstract/helpers/getOwnPropertyDescriptor":26,"foreach":28,"has-symbols":32,"is-typed-array":39}],"rhea":[function(require,module,exports){
(function (process){(function (){
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
        server = net.createServer();
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

}).call(this)}).call(this,require('_process'))
},{"./connection.js":1,"./eventTypes.js":4,"./filter.js":5,"./log.js":8,"./message.js":9,"./sasl.js":10,"./types.js":14,"./util.js":15,"./ws.js":16,"_process":43,"events":27,"net":20,"tls":20}]},{},[]);
