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
