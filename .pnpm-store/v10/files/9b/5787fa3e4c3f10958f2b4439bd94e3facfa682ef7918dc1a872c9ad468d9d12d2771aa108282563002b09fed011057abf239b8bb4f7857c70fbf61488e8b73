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
