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
