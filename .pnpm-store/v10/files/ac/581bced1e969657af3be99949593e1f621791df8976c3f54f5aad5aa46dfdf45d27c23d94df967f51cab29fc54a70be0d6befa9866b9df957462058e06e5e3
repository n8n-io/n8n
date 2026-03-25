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
