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
