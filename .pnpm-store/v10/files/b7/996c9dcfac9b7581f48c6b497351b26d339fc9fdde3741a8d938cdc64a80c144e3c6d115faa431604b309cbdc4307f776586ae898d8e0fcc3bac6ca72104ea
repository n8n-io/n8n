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
    Error.captureStackTrace(this, ProtocolError);
    this.message = message;
    this.name = 'ProtocolError';
}
util.inherits(ProtocolError, Error);

function TypeError(message) {
    Error.captureStackTrace(this, TypeError);
    this.message = message;
    this.name = 'TypeError';
}
util.inherits(TypeError, ProtocolError);

function ConnectionError(message, condition, connection) {
    Error.captureStackTrace(this, ConnectionError);
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
