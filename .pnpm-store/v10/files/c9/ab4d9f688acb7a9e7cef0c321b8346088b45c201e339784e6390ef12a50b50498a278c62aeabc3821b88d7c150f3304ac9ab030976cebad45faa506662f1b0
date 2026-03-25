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
