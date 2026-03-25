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

SaslServer.prototype.peek_size = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.peek_size(buffer);
    } else {
        return this.transport.peek_size(buffer);
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

SaslClient.prototype.peek_size = function (buffer) {
    if (this.transport.read_complete) {
        return this.next.peek_size(buffer);
    } else {
        return this.transport.peek_size(buffer);
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

SelectiveServer.prototype.peek_size = function (buffer) {
    if (this.header_received) {
        return this.selected.peek_size(buffer);
    }
    return undefined;
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
