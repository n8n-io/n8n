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
exports.GenerateTextCompletions = exports.EmbeddingCompletions = exports.ChatCompletions = exports.Completions = void 0;
const config_1 = require("../config/index.js");
const validators_1 = require("../helpers/validators.js");
/** Abstract class for handling text completion requests. */
class Completions {
    /**
     * Constructor for Completions class.
     *
     * @param {APIBaseService} gateway - The APIBaseService instance.
     */
    constructor(gateway) {
        this.client = gateway;
    }
}
exports.Completions = Completions;
/** Class for handling chat completion requests. */
class ChatCompletions extends Completions {
    create(params) {
        const requiredParams = ['messages', 'model'];
        const validParams = [
            'audio',
            'cache',
            'frequencyPenalty',
            'functionCall',
            'functions',
            'logitBias',
            'logprobs',
            'maxCompletionTokens',
            'maxTokens',
            'metadata',
            'modalities',
            'n',
            'parallelToolCalls',
            'prediction',
            'presencePenalty',
            'reasoningEffort',
            'responseFormat',
            'router',
            'seed',
            'serviceTier',
            'stop',
            'store',
            'stream',
            'streamOptions',
            'temperature',
            'toolChoice',
            'tools',
            'topLogprobs',
            'topP',
            'user',
            'returnObject',
        ];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'messages': params.messages,
            'model': params.model,
            'audio': params.audio,
            'cache': params.cache,
            'frequency_penalty': params.frequencyPenalty,
            'function_call': params.functionCall,
            'functions': params.functions,
            'logit_bias': params.logitBias,
            'logprobs': params.logprobs,
            'max_completion_tokens': params.maxCompletionTokens,
            'max_tokens': params.maxTokens,
            'metadata': params.metadata,
            'modalities': params.modalities,
            'n': params.n,
            'parallel_tool_calls': params.parallelToolCalls,
            'prediction': params.prediction,
            'presence_penalty': params.presencePenalty,
            'reasoning_effort': params.reasoningEffort,
            'response_format': params.responseFormat,
            'router': params.router,
            'seed': params.seed,
            'service_tier': params.serviceTier,
            'stop': params.stop,
            'store': params.store,
            'stream': params.stream,
            'stream_options': params.streamOptions,
            'temperature': params.temperature,
            'tool_choice': params.toolChoice,
            'tools': params.tools,
            'top_logprobs': params.topLogprobs,
            'top_p': params.topP,
            'user': params.user,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.COMPLETION.CHAT,
            body,
            signal: params.signal,
            headers: params.headers,
        };
        if (body.stream) {
            return this.client._postStream(Object.assign(Object.assign({}, parameters), { returnObject: params.returnObject }));
        }
        return this.client._post(parameters);
    }
}
exports.ChatCompletions = ChatCompletions;
/** Class for handling embedding completion requests. */
class EmbeddingCompletions extends Completions {
    /**
     * Create Embeddings completions.
     *
     * Generate embeddings based on the provided input using the provided model.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {EmbeddingsInput} params.input - Input text to embed, encoded as a string, array of
     *   strings, array of integers, or array of integer arrays. The input must not exceed the max
     *   input tokens for the model (8192 tokens for OpenAI's `text-embedding-ada-002`) and cannot be
     *   an empty string. Any array must be 2048 dimensions or less. Some models may also impose a
     *   limit on total number of tokens summed across inputs.
     * @param {string} params.model - ID of the model to use.
     * @param {number} [params.dimensions] - Number of dimensions the resulting output embeddings
     *   should have. For OpenAI, only supported in `text-embedding-3` and later models.
     * @param {string} [params.encodingFormat] - Format to return the embeddings in. Can be either
     *   `"float"` or `"base64"`.
     * @param {string} [params.user] - A unique identifier representing your end-user.
     * @param {AbortSignal} [params.signal] - Signal from AbortController
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<Response<EmbeddingResponse>>} - Embeddings response for provided text
     * @throws {Error} If validation fails or an error occurs during the request.
     */
    create(params) {
        const requiredParams = ['input', 'model'];
        const validParams = ['dimensions', 'encodingFormat', 'user'];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'input': params.input,
            'model': params.model,
            'dimensions': params.dimensions,
            'encoding_format': params.encodingFormat,
            'user': params.user,
        };
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.COMPLETION.EMBEDDINGS,
            body,
            signal: params.signal,
            headers: params.headers,
        };
        return this.client._post(parameters);
    }
}
exports.EmbeddingCompletions = EmbeddingCompletions;
/** Class for handling basic text completion requests. */
class GenerateTextCompletions extends Completions {
    create(params) {
        const requiredParams = ['model', 'prompt'];
        const validParams = [
            'bestOf',
            'cache',
            'echo',
            'frequencyPenalty',
            'logitBias',
            'logprobs',
            'maxTokens',
            'metadata',
            'n',
            'presencePenalty',
            'router',
            'seed',
            'stop',
            'stream',
            'streamOptions',
            'suffix',
            'temperature',
            'topP',
            'user',
            'returnObject',
        ];
        const validationErrors = (0, validators_1.validateRequestParams)(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model': params.model,
            'prompt': params.prompt,
            'best_of': params.bestOf,
            'cache': params.cache,
            'echo': params.echo,
            'frequency_penalty': params.frequencyPenalty,
            'logit_bias': params.logitBias,
            'logprobs': params.logprobs,
            'max_tokens': params.maxTokens,
            'metadata': params.metadata,
            'n': params.n,
            'presence_penalty': params.presencePenalty,
            'router': params.router,
            'seed': params.seed,
            'stop': params.stop,
            'stream': params.stream,
            'stream_options': params.streamOptions,
            'suffix': params.suffix,
            'temperature': params.temperature,
            'top_p': params.topP,
            'user': params.user,
        };
        if (params.stream) {
            const parameters = {
                url: config_1.ENDPOINTS.GATEWAY.COMPLETION.TEXT,
                body,
                signal: params.signal,
                headers: params.headers,
            };
            return params.returnObject === false
                ? this.client._postStream(Object.assign(Object.assign({}, parameters), { returnObject: false }))
                : this.client._postStream(Object.assign(Object.assign({}, parameters), { returnObject: true }));
        }
        const parameters = {
            url: config_1.ENDPOINTS.GATEWAY.COMPLETION.TEXT,
            body,
            signal: params.signal,
            headers: params.headers,
        };
        return this.client._post(parameters);
    }
}
exports.GenerateTextCompletions = GenerateTextCompletions;
//# sourceMappingURL=completions.js.map