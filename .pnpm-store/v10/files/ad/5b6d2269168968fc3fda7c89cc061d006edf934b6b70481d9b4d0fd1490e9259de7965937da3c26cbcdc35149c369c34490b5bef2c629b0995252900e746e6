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
