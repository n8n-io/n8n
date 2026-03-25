"use strict";
// Copyright 2014 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginTicket = void 0;
class LoginTicket {
    /**
     * Create a simple class to extract user ID from an ID Token
     *
     * @param {string} env Envelope of the jwt
     * @param {TokenPayload} pay Payload of the jwt
     * @constructor
     */
    constructor(env, pay) {
        this.envelope = env;
        this.payload = pay;
    }
    getEnvelope() {
        return this.envelope;
    }
    getPayload() {
        return this.payload;
    }
    /**
     * Create a simple class to extract user ID from an ID Token
     *
     * @return The user ID
     */
    getUserId() {
        const payload = this.getPayload();
        if (payload && payload.sub) {
            return payload.sub;
        }
        return null;
    }
    /**
     * Returns attributes from the login ticket.  This can contain
     * various information about the user session.
     *
     * @return The envelope and payload
     */
    getAttributes() {
        return { envelope: this.getEnvelope(), payload: this.getPayload() };
    }
}
exports.LoginTicket = LoginTicket;
