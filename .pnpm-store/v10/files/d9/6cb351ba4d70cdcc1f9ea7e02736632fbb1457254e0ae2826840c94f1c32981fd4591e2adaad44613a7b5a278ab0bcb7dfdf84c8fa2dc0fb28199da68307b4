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
import { APIBaseService } from "../base/base.mjs";
import { ChatCompletions, EmbeddingCompletions, GenerateTextCompletions } from "./completions.mjs";
import { Models } from "./models.mjs";
import { Providers } from "./providers.mjs";
import { Policies } from "./policies.mjs";
import { RateLimits } from "./ratelimit.mjs";
/** Represents the chat functionality of the gateway. */
export class Chat {
    /**
     * Creates an instance of Chat.
     *
     * @param {APIBaseService} gateway - The base API service instance.
     */
    constructor(gateway) {
        this.completion = new ChatCompletions(gateway);
    }
}
/** Represents the embeddings functionality of the gateway. */
export class Embeddings {
    /**
     * Creates an instance of Embeddings.
     *
     * @param {APIBaseService} gateway - The base API service instance.
     */
    constructor(gateway) {
        this.completion = new EmbeddingCompletions(gateway);
    }
}
/** Main gateway class that extends APIBaseService. */
export class Gateway extends APIBaseService {
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
        this.completion = new GenerateTextCompletions(this);
        this.embeddings = new Embeddings(this);
        this.models = new Models(this);
        this.providers = new Providers(this);
        this.policies = new Policies(this);
        this.rateLimit = new RateLimits(this);
    }
}
//# sourceMappingURL=gateway.mjs.map