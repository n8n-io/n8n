"use strict";
/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gateway = exports.Embeddings = exports.Chat = void 0;
const base_1 = require("../base/base.js");
const completions_1 = require("./completions.js");
const models_1 = require("./models.js");
const providers_1 = require("./providers.js");
const policies_1 = require("./policies.js");
const ratelimit_1 = require("./ratelimit.js");
/** Represents the chat functionality of the gateway. */
class Chat {
    /**
     * Creates an instance of Chat.
     *
     * @param {APIBaseService} gateway - The base API service instance.
     */
    constructor(gateway) {
        this.completion = new completions_1.ChatCompletions(gateway);
    }
}
exports.Chat = Chat;
/** Represents the embeddings functionality of the gateway. */
class Embeddings {
    /**
     * Creates an instance of Embeddings.
     *
     * @param {APIBaseService} gateway - The base API service instance.
     */
    constructor(gateway) {
        this.completion = new completions_1.EmbeddingCompletions(gateway);
    }
}
exports.Embeddings = Embeddings;
/** Main gateway class that extends APIBaseService. */
class Gateway extends base_1.APIBaseService {
    /**
     * Constructs an instance of Gateway with passed in options and external configuration.
     *
     * @category Constructor
     * @param {UserOptions} options - The parameters to send to the service.
     * @param {string} options.version - The version date for the API of the form `YYYY-MM-DD`
     * @param {string} options.serviceUrl - The base URL for the service
     * @param {string} [options.serviceName] - The name of the service to configure
     * @param {Authenticator} [options.authenticator] - The Authenticator object used to authenticate
     *   requests to the service
     */
    constructor(options) {
        super(options);
        this.chat = new Chat(this);
        this.completion = new completions_1.GenerateTextCompletions(this);
        this.embeddings = new Embeddings(this);
        this.models = new models_1.Models(this);
        this.providers = new providers_1.Providers(this);
        this.policies = new policies_1.Policies(this);
        this.rateLimit = new ratelimit_1.RateLimits(this);
    }
}
exports.Gateway = Gateway;
//# sourceMappingURL=gateway.js.map