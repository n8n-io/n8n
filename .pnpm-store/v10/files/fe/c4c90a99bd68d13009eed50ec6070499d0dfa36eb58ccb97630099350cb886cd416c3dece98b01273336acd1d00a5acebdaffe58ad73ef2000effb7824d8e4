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

Transport.prototype.peek_size = function (buffer) {
    log.frames('[%s] peek_size %o, %d', this.identifier, this.header_received, buffer.length);
    if (this.header_received && buffer.length >= 4) {
        return buffer.readUInt32BE();
    }
    return undefined;
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
