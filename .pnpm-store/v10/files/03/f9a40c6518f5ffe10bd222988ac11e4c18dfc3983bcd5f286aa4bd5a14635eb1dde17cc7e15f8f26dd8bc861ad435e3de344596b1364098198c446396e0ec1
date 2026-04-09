/**
 * (C) Copyright IBM Corp. 2024-2026.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import fs from 'fs';
import { constructServiceUrl, getQueryParam } from 'ibm-cloud-sdk-core';
import FormData from 'form-data';
import { getSdkHeaders, transformStreamToObjectStream, transformStreamToStringStream, } from "./lib/common.mjs";
import { validateRequestParams } from "./helpers/validators.mjs";
import { WatsonxBaseService } from "./base/index.mjs";
import * as Types from "./types/index.mjs";
import { ML_CLOUD_BASE_URL, ENDPOINTS } from "./config/index.mjs";
/**
 * SDK entrypoint for IBM watsonx.ai product. Provides access to IBM watsonx.ai services including
 * text generation, embeddings, deployments, and model management.
 *
 * @example
 *   ```typescript
 *    const service = new WatsonXAI({
 *     version: '2024-03-14',
 *     serviceUrl: 'https://us-south.ml.cloud.ibm.com',
 *     authenticator: new IamAuthenticator({ apikey: 'your-api-key' })
 *   });
 *   ```;
 *
 * @class WatsonXAI
 * @extends WatsonxBaseService
 */
class WatsonXAI extends WatsonxBaseService {
    /**
     * Constructs a service URL by formatting the parameterized service URL.
     *
     * The parameterized service URL is: 'https://{region}.ml.cloud.ibm.com'
     *
     * The default variable values are:
     *
     * - 'region': 'us-south'
     *
     * @param {Map<string, string> | Null} [providedUrlVariables] Map from variable names to desired
     *   values. If a variable is not provided in this map, the default variable value will be used
     *   instead.
     * @returns {string} The formatted URL with all variable placeholders replaced by values.
     */
    static constructServiceUrl(providedUrlVariables) {
        return constructServiceUrl(WatsonXAI.PARAMETERIZED_SERVICE_URL, WatsonXAI.defaultUrlVariables, providedUrlVariables);
    }
    /** Factory method */
    /**
     * Constructs an instance of WatsonXAI with passed in options and external configuration.
     *
     * Ensuring backwards compatibility from v1.7.1. You can now use:
     *
     * ```typescript
     * const service = new WatsonXAI(options);
     * ```
     *
     * @category Constructor
     * @param {UserOptions} [options] - The parameters to send to the service.
     * @param {string} [options.serviceName] - The name of the service to configure
     * @param {Authenticator} [options.authenticator] - The Authenticator object used to authenticate
     *   requests to the service
     * @param {string} [options.serviceUrl] - The base URL for the service
     * @returns {WatsonXAI} - An instance of the WatsonXAI service
     */
    // Ensuring backwards compatibility
    static newInstance(options) {
        return new WatsonXAI(options);
    }
    /**
     * Creates and executes an HTTP request to the watsonx.ai API. Handles HTTPS agent configuration,
     * encryption parameters, and callback hooks.
     *
     * @template T - The expected response type
     * @param {CreateRequestParams} parameters - Request parameters including URL, method, headers,
     *   and body
     * @param {AdditionalCreateRequestParams} [additionalParameters] - Optional additional parameters
     * @param {object} [additionalParameters.crypto] - Encryption configuration for the request body
     * @param {object} [additionalParameters.callbacks] - Callback handlers for request/response
     *   lifecycle
     * @returns {Promise<T>} Promise resolving to the API response
     * @protected
     */
    createRequest(parameters, additionalParameters) {
        var _a;
        var _b;
        const apiType = parameters.defaultOptions.serviceUrl && parameters.defaultOptions.serviceUrl.includes('api')
            ? 'dataplatform'
            : 'service';
        parameters.defaultOptions.axiosOptions.httpsAgent = this.httpsAgentMap[apiType];
        if (additionalParameters) {
            const { crypto } = additionalParameters;
            if (crypto) {
                (_a = (_b = parameters.options).body) !== null && _a !== void 0 ? _a : (_b.body = {});
                parameters.options.body = Object.assign({ crypto }, parameters.options.body);
            }
        }
        const callbackHandler = (additionalParameters === null || additionalParameters === void 0 ? void 0 : additionalParameters.callbacks)
            ? new WatsonXAI.CallbackHandler(additionalParameters === null || additionalParameters === void 0 ? void 0 : additionalParameters.callbacks)
            : undefined;
        callbackHandler === null || callbackHandler === void 0 ? void 0 : callbackHandler.handleRequest(parameters);
        const response = super.createRequest(parameters);
        callbackHandler === null || callbackHandler === void 0 ? void 0 : callbackHandler.handleResponse(response);
        return response;
    }
    /** Deployments */
    /**
     * Create a new watsonx.ai deployment.
     *
     * Create a new deployment, currently the only supported type is `online`.
     *
     * If this is a deployment for a prompt tune then the `asset` object must exist and the `id` must
     * be the `id` of the `model` that was created after the prompt training.
     *
     * If this is a deployment for a prompt template then the `prompt_template` object should exist
     * and the `id` must be the `id` of the prompt template to be deployed.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the resource.
     * @param {OnlineDeployment} params.online - Indicates that this is an online deployment. An
     *   object has to be specified but can be empty. The `serving_name` can be provided in the
     *   `online.parameters`.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.description] - A description of the resource.
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {SimpleRel} [params.promptTemplate] - A reference to a resource.
     * @param {HardwareSpec} [params.hardwareSpec] - A hardware specification.
     * @param {HardwareRequest} [params.hardwareRequest] - The requested hardware for deployment.
     * @param {Rel} [params.asset] - A reference to a resource.
     * @param {string} [params.baseModelId] - The base model that is required for this deployment if
     *   this is for a prompt template or a prompt tune for an IBM foundation model.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DeploymentResource>>} A promise that resolves to
     *   the response with deployment's data
     */
    createDeployment(params) {
        const requiredParams = ['name', 'online'];
        const validParams = [
            'projectId',
            'spaceId',
            'description',
            'tags',
            'custom',
            'promptTemplate',
            'hardwareSpec',
            'hardwareRequest',
            'asset',
            'baseModelId',
            'baseDeploymentId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'online': params.online,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'description': params.description,
            'tags': params.tags,
            'custom': params.custom,
            'prompt_template': params.promptTemplate,
            'hardware_spec': params.hardwareSpec,
            'hardware_request': params.hardwareRequest,
            'asset': params.asset,
            'base_model_id': params.baseModelId,
            'base_deployment_id': params.baseDeploymentId,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { Accept: 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the deployments.
     *
     * Retrieve the list of deployments for the specified space or project.
     *
     * @category Deployments
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.servingName] - Retrieves the deployment, if any, that contains this
     *   `serving_name`.
     * @param {string} [params.tagValue] - Retrieves only the resources with the given tag value.
     * @param {string} [params.assetId] - Retrieves only the resources with the given asset_id,
     *   asset_id would be the model id.
     * @param {string} [params.promptTemplateId] - Retrieves only the resources with the given
     *   prompt_template_id.
     * @param {string} [params.name] - Retrieves only the resources with the given name.
     * @param {string} [params.type] - Retrieves the resources filtered with the given type. There are
     *   the deployment types as well as an additional `prompt_template` if the deployment type
     *   includes a prompt template.
     *
     *   The supported deployment types are (see the description for `deployed_asset_type` in the
     *   deployment entity):
     *
     *   1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt
     *        template is used on a pre-deployed IBM provided model. 3. `custom_foundation_model` -
     *        when a custom foundation model is deployed.
     *
     *   These can be combined with the flag `prompt_template` like this:
     *
     *   1. `type=prompt_tune` - return all prompt tuned model deployments. 2. `type=prompt_tune and
     *        prompt_template` - return all prompt tuned model deployments with a prompt template. 3.
     *        `type=foundation_model`
     *
     *        - Return all prompt template deployments. 4. `type=foundation_model and prompt_template` - return
     *                 all prompt template deployments - this is the same as the previous query
     *                 because a `foundation_model` can only exist with a prompt template. 5.
     *                 `type=prompt_template` - return all deployments with a prompt template.
     *
     * @param {string} [params.state] - Retrieves the resources filtered by state. Allowed values are
     *   `initializing`, `updating`, `ready` and `failed`.
     * @param {boolean} [params.conflict] - Returns whether `serving_name` is available for use or
     *   not. This query parameter cannot be combined with any other parameter except for
     *   `serving_name`.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DeploymentResourceCollection>>} A Promise that
     *   resolves to a collection of deployment resources
     */
    listDeployments(params = {}) {
        const requiredParams = [];
        const validParams = [
            'spaceId',
            'projectId',
            'servingName',
            'tagValue',
            'assetId',
            'promptTemplateId',
            'name',
            'type',
            'state',
            'conflict',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'serving_name': params.servingName,
            'tag.value': params.tagValue,
            'asset_id': params.assetId,
            'prompt_template_id': params.promptTemplateId,
            'name': params.name,
            'type': params.type,
            'state': params.state,
            'conflict': params.conflict,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the deployment details.
     *
     * Retrieve the deployment details with the specified identifier.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DeploymentResource>>} A Promise that resolves to
     *   a deployment resource
     */
    getDeployment(params) {
        const requiredParams = ['deploymentId'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'deployment_id': params.deploymentId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update the deployment metadata.
     *
     * Update the deployment metadata. The following parameters of deployment metadata are supported
     * for the patch operation.
     *
     * - `/name`
     * - `/description`
     * - `/tags`
     * - `/custom`
     * - `/online/parameters`
     * - `/asset` - `replace` only
     * - `/prompt_template` - `replace` only
     * - `/hardware_spec`
     * - `/hardware_request`
     * - `/base_model_id` - `replace` only (applicable only to prompt template deployments referring to
     *   IBM base foundation models)
     *
     * The PATCH operation with path specified as `/online/parameters` can be used to update the
     * `serving_name`.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {JsonPatchOperation[]} params.jsonPatch - The json patch.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DeploymentResource>>} A Promise that resolves to
     *   a deployment resource
     */
    updateDeployment(params) {
        const requiredParams = ['deploymentId', 'jsonPatch'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.jsonPatch;
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'deployment_id': params.deploymentId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.BY_ID,
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json-patch+json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the deployment.
     *
     * Delete the deployment with the specified identifier.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteDeployment(params) {
        const requiredParams = ['deploymentId'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'deployment_id': params.deploymentId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters. If a `serving_name`
     * is used then it must match the `serving_name` that is returned in the `inference` section when
     * the deployment was created.
     *
     * ### Return options
     *
     * Note that there is currently a limitation in this operation when using `return_options`, for
     * input only `input_text` will be returned if requested, for output the `input_tokens` and
     * `generated_tokens` will not be returned.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.idOrName - The `id_or_name` can be either the `deployment_id` that
     *   identifies the deployment or a `serving_name` that allows a predefined URL to be used to post
     *   a prediction.
     *
     *   The `project` or `space` for the deployment must have a WML instance that will be used for
     *   limits and billing (if a paid plan).
     * @param {string} [params.input] - The prompt to generate completions. Note: The method tokenizes
     *   the input internally. It is recommended not to leave any trailing spaces.
     *
     *   This field is ignored if there is a prompt template.
     * @param {DeploymentTextGenProperties} [params.parameters]
     *
     *   - The template properties if this request refers to a prompt template.
     *
     * @param {Moderations} [params.moderations] - Properties that control the moderations, for usages
     *   such as `Hate and profanity` (HAP) and `Personal identifiable information` (PII) filtering.
     *   This list can be extended with new types of moderations.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {Object} callbacks - The parameters to send to the service.
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextGenResponse>>} A Promise that resolves to a
     *   text generation response
     */
    deploymentGenerateText(params, callbacks) {
        const requiredParams = ['idOrName'];
        const validParams = ['input', 'parameters', 'moderations'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'input': params.input,
            'parameters': params.parameters,
            'moderations': params.moderations,
        };
        const query = {
            'version': this.version,
        };
        const path = {
            'id_or_name': params.idOrName,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.TEXT_GENERATION,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, {
            callbacks,
        });
    }
    deploymentGenerateTextStream(params, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = ['idOrName'];
            const validParams = ['input', 'parameters', 'moderations', 'returnObject'];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const body = {
                'input': params.input,
                'parameters': params.parameters,
                'moderations': params.moderations,
            };
            const query = {
                'version': this.version,
            };
            const path = {
                'id_or_name': params.idOrName,
            };
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url: ENDPOINTS.DEPLOYMENT.TEXT_GENERATION_STREAM,
                    method: 'POST',
                    body,
                    qs: query,
                    path,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                        signal: params.signal,
                    } }),
            };
            const apiResponse = yield this.createRequest(parameters, { callbacks });
            const stream = params.returnObject
                ? transformStreamToObjectStream(apiResponse)
                : transformStreamToStringStream(apiResponse);
            return stream;
        });
    }
    /**
     * Infer text chat.
     *
     * Infer the next chat message for a given deployment. The deployment must reference a prompt
     * template which has `input_mode` set to `chat`. The model to the chat request will be from the
     * deployment `base_model_id`. Parameters to the chat request will be from the prompt template
     * `model_parameters`. Related guides:
     * [Deployment](https://cloud.ibm.com/apidocs/watsonx-ai#create-deployment), [Prompt
     * template](https://cloud.ibm.com/apidocs/watsonx-ai#post-prompt), [Text
     * chat](https://cloud.ibm.com/apidocs/watsonx-ai#text-chat).
     *
     * If a `serving_name` is used then it must match the `serving_name` that is returned in the
     * `inference` section when the deployment was created.
     *
     * @category Deployments
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.idOrName - The `id_or_name` can be either the `deployment_id` that
     *   identifies the deployment or a `serving_name` that allows a predefined URL to be used to post
     *   a prediction. The deployment must reference a prompt template with `input_mode` `chat`.
     *
     *   The WML instance that is associated with the deployment will be used for limits and billing (if
     *   a paid plan).
     * @param {DeploymentTextChatMessages[]} params.messages
     *
     *   - The messages for this chat session. You cannot specify `system` `role` in the messages.
     *       Depending on the model, the `content` of `system` `role` may be from `system_prompt` of
     *       the prompt template, and will be automatically inserted into `messages`.
     *
     *   As an example, depending on the model, if `system_prompt` of a prompt template is "You are
     *   Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You
     *   carefully follow instructions. You are helpful and harmless and you follow ethical guidelines
     *   and promote positive behavior.", a message with `system` `role` having `content` the same as
     *   `system_prompt` is inserted.
     * @param {string} [params.context] - If specified, `context` will be inserted into `messages`.
     *   Depending on the model, `context` may be inserted into the `content` with `system` `role`; or
     *   into the `content` of the last message of `user` `role`.
     *
     *   In the example, `context` "Today is Wednesday" is inserted as such `content` of `user` becomes
     *   "Today is Wednesday. Who are you and which day is tomorrow?".
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {WatsonXAI.RequestCallbacks<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} callbacks
     *   - The object containing callbacks for requests and response
     *
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} A Promise that resolves to a
     *   text chat response
     */
    deploymentsTextChat(params, callbacks) {
        const requiredParams = ['idOrName', 'messages'];
        const validParams = [
            'context',
            'tools',
            'toolChoiceOption',
            'toolChoice',
            'frequencyPenalty',
            'logitBias',
            'logprobs',
            'topLogprobs',
            'maxTokens',
            'maxCompletionTokens',
            'n',
            'presencePenalty',
            'responseFormat',
            'seed',
            'stop',
            'temperature',
            'topP',
            'timeLimit',
            'repetitionPenalty',
            'lengthPenalty',
            'includeReasoning',
            'reasoningEffort',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'messages': params.messages,
            'tools': params.tools,
            'tool_choice_option': params.toolChoiceOption,
            'tool_choice': params.toolChoice,
            'frequency_penalty': params.frequencyPenalty,
            'logit_bias': params.logitBias,
            'logprobs': params.logprobs,
            'top_logprobs': params.topLogprobs,
            'max_tokens': params.maxTokens,
            'max_completion_tokens': params.maxCompletionTokens,
            'n': params.n,
            'presence_penalty': params.presencePenalty,
            'response_format': params.responseFormat,
            'seed': params.seed,
            'stop': params.stop,
            'temperature': params.temperature,
            'top_p': params.topP,
            'repetition_penalty': params.repetitionPenalty,
            'length_penalty': params.lengthPenalty,
            'include_reasoning': params.includeReasoning,
            'reasoning_effort': params.reasoningEffort,
            'time_limit': params.timeLimit,
        };
        const query = {
            'version': this.version,
        };
        const path = {
            'id_or_name': params.idOrName,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.CHAT,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { callbacks });
    }
    deploymentsTextChatStream(params, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = ['idOrName', 'messages'];
            const validParams = [
                'context',
                'tools',
                'toolChoiceOption',
                'toolChoice',
                'frequencyPenalty',
                'logitBias',
                'logprobs',
                'topLogprobs',
                'maxTokens',
                'maxCompletionTokens',
                'n',
                'presencePenalty',
                'responseFormat',
                'seed',
                'stop',
                'temperature',
                'topP',
                'timeLimit',
                'repetitionPenalty',
                'lengthPenalty',
                'includeReasoning',
                'reasoningEffort',
                'returnObject',
            ];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const body = {
                'messages': params.messages,
                'tools': params.tools,
                'tool_choice_option': params.toolChoiceOption,
                'tool_choice': params.toolChoice,
                'frequency_penalty': params.frequencyPenalty,
                'logit_bias': params.logitBias,
                'logprobs': params.logprobs,
                'top_logprobs': params.topLogprobs,
                'max_tokens': params.maxTokens,
                'max_completion_tokens': params.maxCompletionTokens,
                'n': params.n,
                'presence_penalty': params.presencePenalty,
                'response_format': params.responseFormat,
                'seed': params.seed,
                'stop': params.stop,
                'temperature': params.temperature,
                'top_p': params.topP,
                'repetition_penalty': params.repetitionPenalty,
                'length_penalty': params.lengthPenalty,
                'include_reasoning': params.includeReasoning,
                'reasoning_effort': params.reasoningEffort,
                'time_limit': params.timeLimit,
            };
            const query = {
                'version': this.version,
            };
            const path = {
                'id_or_name': params.idOrName,
            };
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url: ENDPOINTS.DEPLOYMENT.CHAT_STREAM,
                    method: 'POST',
                    body,
                    qs: query,
                    path,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                        signal: params.signal,
                    } }),
            };
            const apiResponse = yield this.createRequest(parameters, { callbacks });
            const stream = params.returnObject
                ? transformStreamToObjectStream(apiResponse)
                : transformStreamToStringStream(apiResponse);
            return stream;
        });
    }
    /**
     * Time series forecast.
     *
     * Generate forecasts, or predictions for future time points, given historical time series data.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.idOrName - The `id_or_name` can be either the `deployment_id` that
     *   identifies the deployment or a `serving_name` that allows a predefined URL to be used to post
     *   a prediction.
     *
     *   The WML instance that is associated with the deployment will be used for limits and billing (if
     *   a paid plan).
     * @param {JsonObject} params.data - A payload of data matching `schema`. We assume the following
     *   about your data: All timeseries are of equal length and are uniform in nature (the time
     *   difference between two successive rows is constant). This implies that there are no missing
     *   rows of data; The data meet the minimum model-dependent historical context length which can
     *   be any number of rows per timeseries;
     *
     *   Note that the example payloads shown are for illustration purposes only. An actual payload
     *   would necessary be much larger to meet minimum model-specific context lengths.
     * @param {TSForecastInputSchema} params.schema - Contains metadata about your timeseries data
     *   input.
     * @param {DeploymentTSForecastParameters} [params.parameters]
     *
     *   - The parameters for the forecast request.
     *
     * @param {JsonObject} [params.futureData] - Exogenous or supporting features that extend into the
     *   forecasting horizon (e.g., a weather forecast or calendar of special promotions) which are
     *   known in advance. `future_data` would be in the same format as `data` except that all
     *   timestamps would be in the forecast horizon and it would not include previously specified
     *   `target_columns`.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TSForecastResponse>>} A Promise that resolves to
     *   a time series forecast response
     */
    deploymentsTimeSeriesForecast(params) {
        const requiredParams = ['idOrName', 'data', 'schema'];
        const validParams = ['parameters', 'futureData'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'data': params.data,
            'schema': params.schema,
            'parameters': params.parameters,
            'future_data': params.futureData,
        };
        const query = {
            'version': this.version,
        };
        const path = {
            'id_or_name': params.idOrName,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.DEPLOYMENT.TIME_SERIES_FORECAST,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** FoundationModelSpecs */
    /**
     * List the available foundation models.
     *
     * Retrieve the list of deployed foundation models.
     *
     * @category Foundation Model Specs
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {string} [params.filters] - A set of filters to specify the list of models, filters are
     *   described as the `pattern` shown below.
     *
     *   ```text
     *    pattern: tfilter[,tfilter][:(or|and)]
     *    tfilter: filter | !filter
     *    filter: Requires existence of the filter.
     *    !filter: Requires absence of the filter.
     *    filter: one of
     *    modelid_*:     Filters by model id.
     *                   Namely, select a model with a specific model id.
     *    provider_*:    Filters by provider.
     *                   Namely, select all models with a specific provider.
     *    source_*:      Filters by source.
     *                   Namely, select all models with a specific source.
     *    input_tier_*:  Filters by input tier.
     *                   Namely, select all models with a specific input tier.
     *    output_tier_*: Filters by output tier.
     *                   Namely, select all models with a specific output tier.
     *    tier_*:        Filters by tier.
     *                   Namely, select all models with a specific input or output tier.
     *    task_*:        Filters by task id.
     *                   Namely, select all models that support a specific task id.
     *    lifecycle_*:   Filters by lifecycle state.
     *                   Namely, select all models that are currently in the specified lifecycle state.
     *    function_*:    Filters by function.
     *                   Namely, select all models that support a specific function.
     *   ```.
     * ```
     *
     *   @param {boolean} [params.techPreview] - See all the `Tech Preview` models if entitled. @param
     *   {OutgoingHttpHeaders} [params.headers] - Custom request headers @returns
     *   {Promise<WatsonXAI.Response<WatsonXAI.FoundationModels>>} A Promise that resolves to a list
     *   of foundation models
     */
    listFoundationModelSpecs(params = {}) {
        const requiredParams = [];
        const validParams = ['start', 'limit', 'filters', 'techPreview'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'start': params.start,
            'limit': params.limit,
            'filters': params.filters,
            'tech_preview': params.techPreview,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FOUNDATION_MODEL.LIST_SPECS,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * List the supported tasks.
     *
     * Retrieve the list of tasks that are supported by the foundation models.
     *
     * @category Foundation Model Specs
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.FoundationModelTasks>>} A Promise that resolves
     *   to a list of foundation model tasks
     */
    listFoundationModelTasks(params = {}) {
        const requiredParams = [];
        const validParams = ['start', 'limit'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'start': params.start,
            'limit': params.limit,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FOUNDATION_MODEL.LIST_TASKS,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** Prompts */
    /**
     * Create a new prompt / prompt template.
     *
     * This creates a new prompt with the provided parameters.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - Name used to display the prompt.
     * @param {PromptWithExternal} params.prompt -
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {number} [params.createdAt] - Time the prompt was created.
     * @param {string[]} [params.taskIds] -
     * @param {PromptLock} [params.lock] -
     * @param {WxPromptPostModelVersion} [params.modelVersion] -
     * @param {JsonObject} [params.promptVariables] -
     * @param {string} [params.inputMode] - Input mode in use for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptResponse>>} A Promise that resolves to a
     *   prompt response
     */
    createPrompt(params) {
        const requiredParams = ['name', 'prompt'];
        const validParams = [
            'description',
            'createdAt',
            'taskIds',
            'lock',
            'modelVersion',
            'promptVariables',
            'inputMode',
            'projectId',
            'spaceId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'prompt': params.prompt,
            'description': params.description,
            'created_at': params.createdAt,
            'task_ids': params.taskIds,
            'lock': params.lock,
            'model_version': params.modelVersion,
            'prompt_variables': params.promptVariables,
            'input_mode': params.inputMode,
        };
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt.
     *
     * This retrieves a prompt / prompt template with the given id.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {string} [params.restrictModelParameters] - Only return a set of model parameters
     *   compatiable with inferencing.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptResponse>>} A Promise that resolves to a
     *   prompt response
     */
    getPrompt(params) {
        const requiredParams = ['promptId'];
        const validParams = ['projectId', 'spaceId', 'restrictModelParameters'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'restrict_model_parameters': params.restrictModelParameters,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * List all prompts.
     *
     * This retrieves all prompts within the given project/space.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {string} [params.limit] - The limit request body field can be specified to limit the
     *   number of assets in the search results. The default limit is 200. The maximum limit value is
     *   200, and any greater value is ignored.
     * @param {string} [params.counts] - Returns the number of query results for each unique value of
     *   each named field.
     * @param {string} [params.drilldown] - Restrict results to documents with a dimension equal to
     *   the specified label. Note that, multiple values for a single key in a drilldown means an OR
     *   relation between them and there is an AND relation between multiple keys.
     * @param {string} [params.bookmark] - Bookmark of the query result
     * @param {string} [params.sort] - Sort order for the query
     * @param {string} [params.include] - Entity
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.ListPromptsResponse>>} A Promise that resolves
     *   to a list of prompts
     */
    listPrompts(params) {
        const requiredParams = [];
        const validParams = [
            'projectId',
            'spaceId',
            'query',
            'limit',
            'counts',
            'drilldown',
            'bookmark',
            'sort',
            'include',
            'skip',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const body = {
            'query': 'asset.asset_type:wx_prompt',
            'limit': params.limit,
            'counts': params.counts,
            'drilldown': params.drilldown,
            'bookmark': params.bookmark,
            'sort': params.sort,
            'include': params.include,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.SEARCH,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update a prompt.
     *
     * This updates a prompt / prompt template with the given id.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} params.name - Name used to display the prompt.
     * @param {Prompt} params.prompt -
     * @param {string} [params.id] - The prompt's id. This value cannot be set. It is returned in
     *   responses only.
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {string[]} [params.taskIds] -
     * @param {boolean} [params.governanceTracked] -
     * @param {WxPromptPatchModelVersion} [params.modelVersion] -
     * @param {JsonObject} [params.promptVariables] -
     * @param {string} [params.inputMode] - Input mode in use for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptResponse>>} A Promise that resolves to a
     *   prompt response
     */
    updatePrompt(params) {
        const requiredParams = ['promptId', 'name', 'prompt'];
        const validParams = [
            'id',
            'description',
            'taskIds',
            'governanceTracked',
            'modelVersion',
            'promptVariables',
            'inputMode',
            'projectId',
            'spaceId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'prompt': params.prompt,
            'id': params.id,
            'description': params.description,
            'task_ids': params.taskIds,
            'governance_tracked': params.governanceTracked,
            'model_version': params.modelVersion,
            'prompt_variables': params.promptVariables,
            'input_mode': params.inputMode,
        };
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.BY_ID,
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt.
     *
     * This delets a prompt / prompt template with the given id.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deletePrompt(params) {
        const requiredParams = ['promptId'];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Prompt lock modifications.
     *
     * Modifies the current locked state of a prompt.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {boolean} params.locked - True if the prompt is currently locked.
     * @param {string} [params.lockType] - Lock type: 'edit' for working on prompts/templates or
     *   'governance'. Can only be supplied in PUT /lock requests.
     * @param {string} [params.lockedBy] - Locked by is computed by the server and shouldn't be
     *   passed.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {boolean} [params.force] - Override a lock if it is currently taken.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.PromptLock>>} A Promise that resolves to a
     *   prompt lock
     */
    updatePromptLock(params) {
        const requiredParams = ['promptId', 'locked'];
        const validParams = ['lockType', 'lockedBy', 'projectId', 'spaceId', 'force'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'locked': params.locked,
            'lock_type': params.lockType,
            'locked_by': params.lockedBy,
        };
        const query = {
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'force': params.force,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.LOCK,
                method: 'PUT',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get current prompt lock status.
     *
     * Retrieves the current locked state of a prompt.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.PromptLock>>} A Promise that resolves to a
     *   prompt lock
     */
    getPromptLock(params) {
        const requiredParams = ['promptId'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.LOCK,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get the inference input string for a given prompt.
     *
     * Computes the inference input string based on state of a prompt. Optionally replaces template
     * params.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.input] - Override input string that will be used to generate the
     *   response. The string can contain template parameters.
     * @param {JsonObject} [params.promptVariables] - Supply only to replace placeholders. Object
     *   content must be key:value pairs where the 'key' is the parameter to replace and 'value' is
     *   the value to use.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.GetPromptInputResponse>>} A Promise that
     *   resolves to prompt input data
     */
    getPromptInput(params) {
        const requiredParams = ['promptId'];
        const validParams = ['input', 'promptVariables', 'spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'input': params.input,
            'prompt_variables': params.promptVariables,
        };
        const query = {
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.INPUT,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new chat item to a prompt.
     *
     * This adds new chat items to the given prompt.
     *
     * @category Prompts / Prompt Templates
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {ChatItem[]} params.chatItem -
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target
     *   must be supplied per request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    createPromptChatItem(params) {
        const requiredParams = ['promptId', 'chatItem'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.chatItem;
        const query = {
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'prompt_id': params.promptId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT.CHAT_ITEMS,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** PromptSessions */
    /**
     * Create a new prompt session.
     *
     * This creates a new prompt session.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - Name used to display the prompt session.
     * @param {string} [params.id] - The prompt session's id. This value cannot be set. It is returned
     *   in responses only.
     * @param {string} [params.description] - An optional description for the prompt session.
     * @param {number} [params.createdAt] - Time the session was created.
     * @param {string} [params.createdBy] - The ID of the original session creator.
     * @param {number} [params.lastUpdatedAt] - Time the session was updated.
     * @param {string} [params.lastUpdatedBy] - The ID of the last user that modifed the session.
     * @param {PromptLock} [params.lock] -
     * @param {WxPromptSessionEntry[]} [params.prompts] -
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptResponse>>} A Promise that resolves to a
     *   prompt response
     */
    createPromptSession(params) {
        const requiredParams = ['name'];
        const validParams = [
            'id',
            'description',
            'createdAt',
            'createdBy',
            'lastUpdatedAt',
            'lastUpdatedBy',
            'lock',
            'prompts',
            'projectId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'id': params.id,
            'description': params.description,
            'created_at': params.createdAt,
            'created_by': params.createdBy,
            'last_updated_at': params.lastUpdatedAt,
            'last_updated_by': params.lastUpdatedBy,
            'lock': params.lock,
            'prompts': params.prompts,
        };
        const query = {
            'project_id': params.projectId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt session.
     *
     * This retrieves a prompt session with the given id.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {boolean} [params.prefetch] - Include the most recent entry.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptSession>>} A Promise that resolves to a
     *   prompt session
     */
    getPromptSession(params) {
        const requiredParams = ['sessionId'];
        const validParams = ['projectId', 'prefetch'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
            'prefetch': params.prefetch,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update a prompt session.
     *
     * This updates a prompt session with the given id.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.name] -
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptSession>>} A Promise that resolves to a
     *   prompt session
     */
    updatePromptSession(params) {
        const requiredParams = ['sessionId'];
        const validParams = ['name', 'description', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'description': params.description,
        };
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.BY_ID,
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt session.
     *
     * This deletes a prompt session with the given id.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deletePromptSession(params) {
        const requiredParams = ['sessionId'];
        const validParams = ['projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new prompt to a prompt session.
     *
     * This creates a new prompt associated with the given session.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.name - Name used to display the prompt.
     * @param {number} params.createdAt - Time the prompt was created.
     * @param {Prompt} params.prompt -
     * @param {string} [params.id] - The prompt's id. This value cannot be set. It is returned in
     *   responses only.
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {JsonObject} [params.promptVariables] -
     * @param {boolean} [params.isTemplate] -
     * @param {string} [params.inputMode] - Input mode in use for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptSessionEntry>>} A Promise that resolves
     *   to a prompt session entry
     */
    createPromptSessionEntry(params) {
        const requiredParams = ['sessionId', 'name', 'createdAt', 'prompt'];
        const validParams = [
            'id',
            'description',
            'promptVariables',
            'isTemplate',
            'inputMode',
            'projectId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'created_at': params.createdAt,
            'prompt': params.prompt,
            'id': params.id,
            'description': params.description,
            'prompt_variables': params.promptVariables,
            'is_template': params.isTemplate,
            'input_mode': params.inputMode,
        };
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.ENTRIES,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get entries for a prompt session.
     *
     * List entries from a given session.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {string} [params.bookmark] - Bookmark from a previously limited get request.
     * @param {string} [params.limit] - Limit for results to retrieve, default 20.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptSessionEntryList>>} A Promise that
     *   resolves to a list of prompt session entries
     */
    listPromptSessionEntries(params) {
        const requiredParams = ['sessionId'];
        const validParams = ['projectId', 'bookmark', 'limit'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
            'bookmark': params.bookmark,
            'limit': params.limit,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.ENTRIES,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new chat item to a prompt session entry.
     *
     * This adds new chat items to the given entry.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {ChatItem[]} params.chatItem -
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    createPromptSessionEntryChatItem(params) {
        const requiredParams = ['sessionId', 'entryId', 'chatItem'];
        const validParams = ['projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.chatItem;
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
            'entry_id': params.entryId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.ENTRY_CHAT_ITEMS,
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Prompt session lock modifications.
     *
     * Modifies the current locked state of a prompt session.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {boolean} params.locked - True if the prompt is currently locked.
     * @param {string} [params.lockType] - Lock type: 'edit' for working on prompts/templates or
     *   'governance'. Can only be supplied in PUT /lock requests.
     * @param {string} [params.lockedBy] - Locked by is computed by the server and shouldn't be
     *   passed.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {boolean} [params.force] - Override a lock if it is currently taken.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.PromptLock>>} A Promise that resolves to a
     *   prompt lock
     */
    updatePromptSessionLock(params) {
        const requiredParams = ['sessionId', 'locked'];
        const validParams = ['lockType', 'lockedBy', 'projectId', 'force'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'locked': params.locked,
            'lock_type': params.lockType,
            'locked_by': params.lockedBy,
        };
        const query = {
            'project_id': params.projectId,
            'force': params.force,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.LOCK,
                method: 'PUT',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get current prompt session lock status.
     *
     * Retrieves the current locked state of a prompt session.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.PromptLock>>} A Promise that resolves to a
     *   prompt lock
     */
    getPromptSessionLock(params) {
        const requiredParams = ['sessionId'];
        const validParams = ['projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.LOCK,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt session entry.
     *
     * This retrieves a prompt session entry with the given id.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxPromptResponse>>} A Promise that resolves to a
     *   prompt response
     */
    getPromptSessionEntry(params) {
        const requiredParams = ['sessionId', 'entryId'];
        const validParams = ['projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
            'entry_id': params.entryId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.ENTRY_BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt session entry.
     *
     * This deletes a prompt session entry with the given id.
     *
     * @category Prompt Sessions
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One
     *   target must be supplied per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deletePromptSessionEntry(params) {
        const requiredParams = ['sessionId', 'entryId'];
        const validParams = ['projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'project_id': params.projectId,
        };
        const path = {
            'session_id': params.sessionId,
            'entry_id': params.entryId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.PROMPT_SESSION.ENTRY_BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** TextChat */
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters.
     *
     * @category Text Chat
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The model to use for the chat completion.
     *
     *   Please refer to the [list of
     *   models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {TextChatMessages[]} params.messages - The messages for this chat session.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {TextChatParameterTools[]} [params.tools] - Tool functions that can be called with the
     *   response.
     * @param {string} [params.toolChoiceOption] - Using `none` means the model will not call any tool
     *   and instead generates a message.
     *
     *   The following options (`auto` and `required`) are not yet supported
     *
     *   Using `auto` means the model can pick between generating a message or calling one or more
     *   tools. Using `required` means the model must call one or more tools.
     *
     *   Only one of `tool_choice_option` or `tool_choice` must be present.
     * @param {TextChatToolChoiceTool} [params.toolChoice] - Specifying a particular tool via
     *   `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that
     *   tool.
     *
     *   Only one of `tool_choice_option` or `tool_choice` must be present.
     * @param {number} [params.frequencyPenalty] - Positive values penalize new tokens based on their
     *   existing frequency in the text so far, decreasing the model's likelihood to repeat the same
     *   line verbatim.
     * @param {boolean} [params.logprobs] - Whether to return log probabilities of the output tokens
     *   or not. If true, returns the log probabilities of each output token returned in the content
     *   of message.
     * @param {number} [params.topLogprobs] - An integer specifying the number of most likely tokens
     *   to return at each token position, each with an associated log probability. The option
     *   `logprobs` must be set to `true` if this parameter is used.
     * @param {number} [params.maxTokens] - The maximum number of tokens that can be generated in the
     *   chat completion. The total length of input tokens and generated tokens is limited by the
     *   model's context length.
     * @param {number} [params.n] - How many chat completion choices to generate for each input
     *   message. Note that you will be charged based on the number of generated tokens across all of
     *   the choices. Keep n as 1 to minimize costs.
     * @param {number} [params.presencePenalty] - Positive values penalize new tokens based on whether
     *   they appear in the text so far, increasing the model's likelihood to talk about new topics.
     * @param {TextChatResponseFormat} [params.responseFormat]
     *
     *   - The chat response format parameters.
     *
     * @param {number} [params.temperature] - What sampling temperature to use,. Higher values like
     *   0.8 will make the output more random, while lower values like 0.2 will make it more focused
     *   and deterministic.
     *
     *   We generally recommend altering this or `top_p` but not both.
     * @param {number} [params.topP] - An alternative to sampling with temperature, called nucleus
     *   sampling, where the model considers the results of the tokens with top_p probability mass. So
     *   0.1 means only the tokens comprising the top 10% probability mass are considered.
     *
     *   We generally recommend altering this or `temperature` but not both.
     * @param {number} [params.timeLimit] - Time limit in milliseconds
     *
     *   - If not completed within this time, generation will stop. The text generated so far will be
     *       returned along with the `TIME_LIMIT`` stop reason. Depending on the users plan, and on
     *       the model being used, there may be an enforced maximum time limit.
     *
     * @param {number} [params.repetitionPenalty] - Represents the penalty for penalizing tokens that
     *   have already been generated or belong to the context.
     * @param {number} [params.lengthPenalty] - Exponential penalty to the length that is used with
     *   beam-based generation. It is applied as an exponent to the sequence length, which in turn is
     *   used to divide the score of the sequence. Since the score is the log likelihood of the
     *   sequence (i.e. negative), `lengthPenalty` > 0.0 promotes longer sequences, while
     *   `lengthPenalty` < 0.0 encourages shorter sequences.
     * @param {Crypto} [params.crypto] - Encryption configuration for securing inference requests.
     *   Contains `key_ref` (identifier of the DEK in the keys management service IBM Key Protect CRN
     *   format).
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {WatsonXAI.RequestCallbacks<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} callbacks
     *   - The object containing callbacks for requests and response
     *
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} A Promise that resolves to a
     *   text chat response
     */
    textChat(params, callbacks) {
        const requiredParams = ['modelId', 'messages'];
        const validParams = [
            'spaceId',
            'projectId',
            'tools',
            'toolChoiceOption',
            'toolChoice',
            'frequencyPenalty',
            'logitBias',
            'logprobs',
            'topLogprobs',
            'maxTokens',
            'maxCompletionTokens',
            'n',
            'presencePenalty',
            'responseFormat',
            'seed',
            'stop',
            'temperature',
            'topP',
            'timeLimit',
            'guidedChoice',
            'guidedRegex',
            'guidedGrammar',
            'guidedJSON',
            'repetitionPenalty',
            'lengthPenalty',
            'includeReasoning',
            'reasoningEffort',
            'crypto',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model_id': params.modelId,
            'messages': params.messages,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'tools': params.tools,
            'tool_choice_option': params.toolChoiceOption,
            'tool_choice': params.toolChoice,
            'frequency_penalty': params.frequencyPenalty,
            'logit_bias': params.logitBias,
            'logprobs': params.logprobs,
            'top_logprobs': params.topLogprobs,
            'max_tokens': params.maxTokens,
            'max_completion_tokens': params.maxCompletionTokens,
            'n': params.n,
            'presence_penalty': params.presencePenalty,
            'response_format': params.responseFormat,
            'seed': params.seed,
            'stop': params.stop,
            'temperature': params.temperature,
            'top_p': params.topP,
            'guided_choice': params.guidedChoice,
            'guided_regex': params.guidedRegex,
            'guided_grammar': params.guidedGrammar,
            'guided_json': params.guidedJSON,
            'repetition_penalty': params.repetitionPenalty,
            'length_penalty': params.lengthPenalty,
            'include_reasoning': params.includeReasoning,
            'reasoning_effort': params.reasoningEffort,
            'time_limit': params.timeLimit,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.CHAT,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { crypto: params.crypto, callbacks });
    }
    textChatStream(params, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = ['modelId', 'messages'];
            const validParams = [
                'spaceId',
                'projectId',
                'tools',
                'toolChoiceOption',
                'toolChoice',
                'frequencyPenalty',
                'logitBias',
                'logprobs',
                'topLogprobs',
                'maxTokens',
                'maxCompletionTokens',
                'n',
                'presencePenalty',
                'responseFormat',
                'seed',
                'stop',
                'temperature',
                'topP',
                'timeLimit',
                'guidedChoice',
                'guidedRegex',
                'guidedGrammar',
                'guidedJSON',
                'repetitionPenalty',
                'lengthPenalty',
                'includeReasoning',
                'reasoningEffort',
                'returnObject',
            ];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const body = {
                'model_id': params.modelId,
                'messages': params.messages,
                'space_id': params.spaceId,
                'project_id': params.projectId,
                'tools': params.tools,
                'tool_choice_option': params.toolChoiceOption,
                'tool_choice': params.toolChoice,
                'frequency_penalty': params.frequencyPenalty,
                'logit_bias': params.logitBias,
                'logprobs': params.logprobs,
                'top_logprobs': params.topLogprobs,
                'max_tokens': params.maxTokens,
                'max_completion_tokens': params.maxCompletionTokens,
                'n': params.n,
                'presence_penalty': params.presencePenalty,
                'response_format': params.responseFormat,
                'seed': params.seed,
                'stop': params.stop,
                'temperature': params.temperature,
                'top_p': params.topP,
                'time_limit': params.timeLimit,
                'guided_choice': params.guidedChoice,
                'guided_regex': params.guidedRegex,
                'guided_grammar': params.guidedGrammar,
                'guided_json': params.guidedJSON,
                'repetition_penalty': params.repetitionPenalty,
                'length_penalty': params.lengthPenalty,
                'include_reasoning': params.includeReasoning,
                'reasoning_effort': params.reasoningEffort,
            };
            const query = {
                'version': this.version,
            };
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url: ENDPOINTS.TEXT.CHAT_STREAM,
                    method: 'POST',
                    body,
                    qs: query,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                        signal: params.signal,
                    } }),
            };
            const apiResponse = yield this.createRequest(parameters, { callbacks });
            const stream = params.returnObject
                ? transformStreamToObjectStream(apiResponse)
                : transformStreamToStringStream(apiResponse);
            return stream;
        });
    }
    /** TextEmbeddings */
    /**
     * Generate embeddings.
     *
     * Generate embeddings from text input.
     *
     * See the
     * [documentation](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-embed-overview.html?context=wx&audience=wdp)
     * for a description of text embeddings.
     *
     * @category Embeddings
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please
     *   refer to the [list of
     *   models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
     * @param {string[]} params.inputs - The input text.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {EmbeddingParameters} [params.parameters] - Parameters for text embedding requests.
     * @param {Crypto} [params.crypto] - Encryption configuration for securing inference requests.
     *   Contains `key_ref` (identifier of the DEK in the keys management service IBM Key Protect CRN
     *   format).
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {WatsonXAI.RequestCallbacks<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} callbacks
     *   - The object containing callbacks for requests and response
     *
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmbeddingsResponse>>} A Promise that resolves to
     *   an embeddings response
     */
    embedText(params, callbacks) {
        const requiredParams = ['modelId', 'inputs'];
        const validParams = ['spaceId', 'projectId', 'parameters', 'crypto'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model_id': params.modelId,
            'inputs': params.inputs,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'parameters': params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.EMBEDDINGS,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { crypto: params.crypto, callbacks });
    }
    /** CreateTextExtraction */
    /**
     * Start a text extraction request.
     *
     * Start a request to extract text and metadata from documents.
     *
     * See the
     * [documentation](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-api-text-extraction.html?context=wx&audience=wdp)
     * for a description of text extraction.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {TextExtractionDataReference} params.documentReference
     *
     *   - A reference to data.
     *
     * @param {TextExtractionDataReference} params.resultsReference
     *
     *   - A reference to data.
     *
     * @param {TextExtractionSteps} [params.steps] - The steps for the text extraction pipeline.
     * @param {JsonObject} [params.assemblyJson] - Set this as an empty object to specify `json`
     *   output.
     *
     *   Note that this is not strictly required because if an `assembly_md` object is not found then
     *   the default will be `json`.
     * @param {JsonObject} [params.assemblyMd] - Set this as an empty object to specify `markdown`
     *   output.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextExtractionResponse>>} A Promise that
     *   resolves to a text extraction response
     */
    createTextExtraction(params) {
        const requiredParams = ['documentReference', 'resultsReference'];
        const validParams = ['steps', 'assemblyJson', 'assemblyMd', 'custom', 'projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'document_reference': params.documentReference,
            'results_reference': params.resultsReference,
            'steps': params.steps,
            'assembly_json': params.assemblyJson,
            'assembly_md': params.assemblyMd,
            'custom': params.custom,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.EXTRACTIONS,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the text extraction requests.
     *
     * Retrieve the list of text extraction requests for the specified space or project.
     *
     * This operation does not save the history, any requests that were deleted or purged will not
     * appear in this list.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextExtractionResources>>} A Promise that
     *   resolves to text extraction resources
     */
    listTextExtractions(params = {}) {
        const requiredParams = [];
        const validParams = ['spaceId', 'projectId', 'start', 'limit'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'start': params.start,
            'limit': params.limit,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.EXTRACTIONS,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get the results of the request.
     *
     * Retrieve the text extraction request with the specified identifier.
     *
     * Note that there is a retention period of 2 days. If this retention period is exceeded then the
     * request will be deleted and the results no longer available. In this case this operation will
     * return `404`.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The identifier of the extraction request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextExtractionResponse>>} A Promise that
     *   resolves to a text extraction response
     */
    getTextExtraction(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.EXTRACTION_BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the request.
     *
     * Cancel the specified text extraction request and delete any associated results.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The identifier of the extraction request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job or request
     *   metadata.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteTextExtraction(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.EXTRACTION_BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** TextGeneration */
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters.
     *
     * @category Text Generation
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.input - The prompt to generate completions. Note: The method tokenizes
     *   the input internally. It is recommended not to leave any trailing spaces.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please
     *   refer to the [list of
     *   models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {TextGenParameters} [params.parameters] - Properties that control the model and
     *   response.
     * @param {Moderations} [params.moderations] - Properties that control the moderations, for usages
     *   such as `Hate and profanity` (HAP) and `Personal identifiable information` (PII) filtering.
     *   This list can be extended with new types of moderations.
     * @param {Crypto} [params.crypto] - Encryption configuration for securing inference requests.
     *   Contains `key_ref` (identifier of the DEK in the keys management service IBM Key Protect CRN
     *   format).
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {WatsonXAI.RequestCallbacks<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} callbacks
     *   - The object containing callbacks for requests and response
     *
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextGenResponse>>} A Promise that resolves to a
     *   text generation response
     */
    generateText(params, callbacks) {
        const requiredParams = ['input', 'modelId'];
        const validParams = ['spaceId', 'projectId', 'parameters', 'moderations', 'crypto'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'input': params.input,
            'model_id': params.modelId,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'parameters': params.parameters,
            'moderations': params.moderations,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.GENERATION,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { crypto: params.crypto, callbacks });
    }
    generateTextStream(params, callbacks) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredParams = ['input', 'modelId'];
            const validParams = ['spaceId', 'projectId', 'parameters', 'moderations', 'returnObject'];
            const validationErrors = validateRequestParams(params, requiredParams, validParams);
            if (validationErrors) {
                return Promise.reject(validationErrors);
            }
            const body = {
                'input': params.input,
                'model_id': params.modelId,
                'space_id': params.spaceId,
                'project_id': params.projectId,
                'parameters': params.parameters,
                'moderations': params.moderations,
            };
            const query = {
                'version': this.version,
            };
            const sdkHeaders = getSdkHeaders();
            const parameters = {
                options: {
                    url: ENDPOINTS.TEXT.GENERATION_STREAM,
                    method: 'POST',
                    body,
                    qs: query,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                        signal: params.signal,
                    } }),
            };
            const apiResponse = yield this.createRequest(parameters, { callbacks });
            const stream = params.returnObject
                ? transformStreamToObjectStream(apiResponse)
                : transformStreamToStringStream(apiResponse);
            return stream;
        });
    }
    /** Tokenization */
    /**
     * Text tokenization.
     *
     * The text tokenize operation allows you to check the conversion of provided input to tokens for
     * a given model. It splits text into words or sub-words, which then are converted to ids through
     * a look-up table (vocabulary). Tokenization allows the model to have a reasonable vocabulary
     * size.
     *
     * @category Tokenization
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please
     *   refer to the [list of
     *   models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {string} params.input - The input string to tokenize.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {TextTokenizeParameters} [params.parameters] - The parameters for text tokenization.
     * @param {Crypto} [params.crypto] - Encryption configuration for securing inference requests.
     *   Contains `key_ref` (identifier of the DEK in the keys management service IBM Key Protect CRN
     *   format).
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextTokenizeResponse>>} A Promise that resolves
     *   to a tokenization response
     */
    tokenizeText(params) {
        const requiredParams = ['modelId', 'input'];
        const validParams = ['spaceId', 'projectId', 'parameters', 'crypto'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model_id': params.modelId,
            'input': params.input,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'parameters': params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.TOKENIZATION,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { crypto: params.crypto });
    }
    /** TimeSeriesTechPreview */
    /**
     * Time series forecast.
     *
     * Generate forecasts, or predictions for future time points, given historical time series data.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The model to be used for generating a forecast.
     * @param {JsonObject} params.data - A payload of data matching `schema`. We assume the following
     *   about your data: All timeseries are of equal length and are uniform in nature (the time
     *   difference between two successive rows is constant). This implies that there are no missing
     *   rows of data; The data meet the minimum model-dependent historical context length which can
     *   be 512 or more rows per timeseries; Note that the example payloads shown are for illustration
     *   purposes only. An actual payload would necessary be much larger to meet minimum
     *   model-specific context lengths.
     * @param {TSForecastInputSchema} params.schema - Contains metadata about your timeseries data
     *   input.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {TSForecastParameters} [params.parameters] - The parameters for the forecast request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TSForecastResponse>>} A Promise that resolves to
     *   a time series forecast response
     */
    timeSeriesForecast(params) {
        const requiredParams = ['modelId', 'data', 'schema'];
        const validParams = ['projectId', 'spaceId', 'parameters'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model_id': params.modelId,
            'data': params.data,
            'schema': params.schema,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'parameters': params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TIME_SERIES.FORECAST,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** Trainings */
    /**
     * Create a new watsonx.ai training.
     *
     * Create a new watsonx.ai training in a project or a space.
     *
     * The details of the base model and parameters for the training must be provided in the
     * `prompt_tuning` object.
     *
     * In order to deploy the tuned model you need to follow the following steps:
     *
     * 1. Create a WML model asset, in a space or a project, by providing the `request.json` as shown
     *    below:
     *
     *        curl -X POST "https://{cpd_cluster}/ml/v4/models?version=2024-01-29" \
     *          -H "Authorization: Bearer <replace with your token>" \
     *          -H "content-type: application/json" \
     *          --data '{
     *             "name": "replace_with_a_meaningful_name",
     *             "space_id": "replace_with_your_space_id",
     *             "type": "prompt_tune_1.0",
     *             "software_spec": {
     *               "name": "watsonx-textgen-fm-1.0"
     *             },
     *             "metrics": [ from the training job ],
     *             "training": {
     *               "id": "05859469-b25b-420e-aefe-4a5cb6b595eb",
     *               "base_model": {
     *                 "model_id": "google/flan-t5-xl"
     *               },
     *               "task_id": "generation",
     *               "verbalizer": "Input: {{input}} Output:"
     *             },
     *             "training_data_references": [
     *               {
     *                 "connection": {
     *                   "id": "20933468-7e8a-4706-bc90-f0a09332b263"
     *                 },
     *                 "id": "file_to_tune1.json",
     *                 "location": {
     *                   "bucket": "wxproject-donotdelete-pr-xeyivy0rx3vrbl",
     *                   "path": "file_to_tune1.json"
     *                 },
     *                 "type": "connection_asset"
     *               }
     *             ]
     *           }'
     *        ```
     *
     *
     *        Notes:
     *
     *    1. If you used the training request field `auto_update_model: true` then you can skip this step as
     *          the model will have been saved at the end of the training job.
     *    2. Rather than creating the payload for the model you can use the generated `request.json` that
     *          was stored in the `results_reference` field, look for the path in the field
     *          `entity.results_reference.location.model_request_path`.
     *    3. The model `type` must be `prompt_tune_1.0`.
     *    4. The software spec name must be `watsonx-textgen-fm-1.0`.
     * 2. Create a tuned model deployment as described in the [create deployment
     *    documentation](#create-deployment).
     *
     * @category Trainings @param {Object} params - The parameters to send to the service. @param
     * {string} params.name - The name of the training. @param {ObjectLocation}
     * params.resultsReference - The training results. Normally this is specified as `type=container`
     * which means that it is stored in the space or project. @param {string} [params.spaceId] - The
     * space that contains the resource. Either `space_id` or `project_id` has to be given. @param
     * {string} [params.projectId] - The project that contains the resource. Either `space_id` or
     * `project_id` has to be given. @param {string} [params.description] - A description of the
     * training. @param {string[]} [params.tags] - A list of tags for this resource. @param
     * {PromptTuning} [params.promptTuning] - Properties to control the prompt tuning. @param
     * {DataConnectionReference[]} [params.trainingDataReferences]
     *
     * - Training datasets.
     *
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {boolean} [params.autoUpdateModel] - If set to `true` then the result of the training,
     * if successful, will be uploaded to the repository as a model. @param {OutgoingHttpHeaders}
     * [params.headers] - Custom request headers @returns
     * {Promise<WatsonXAI.Response<WatsonXAI.TrainingResource>>} A Promise that resolves to a training
     * resource
     *
     * @category Trainings
     */
    createTraining(params) {
        const requiredParams = ['name', 'resultsReference'];
        const validParams = [
            'spaceId',
            'projectId',
            'description',
            'tags',
            'promptTuning',
            'trainingDataReferences',
            'custom',
            'autoUpdateModel',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'results_reference': params.resultsReference,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'description': params.description,
            'tags': params.tags,
            'prompt_tuning': params.promptTuning,
            'training_data_references': params.trainingDataReferences,
            'custom': params.custom,
            'auto_update_model': params.autoUpdateModel,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TRAINING.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the list of trainings.
     *
     * Retrieve the list of trainings for the specified space or project.
     *
     * @category Trainings
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {boolean} [params.totalCount] - Compute the total count. May have performance impact.
     * @param {string} [params.tagValue] - Return only the resources with the given tag value.
     * @param {string} [params.state] - Filter based on on the training job state.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TrainingResourceCollection>>} A Promise that
     *   resolves to a collection of training resources
     */
    listTrainings(params = {}) {
        const requiredParams = [];
        const validParams = [
            'start',
            'limit',
            'totalCount',
            'tagValue',
            'state',
            'spaceId',
            'projectId',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'start': params.start,
            'limit': params.limit,
            'total_count': params.totalCount,
            'tag.value': params.tagValue,
            'state': params.state,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TRAINING.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the training.
     *
     * Retrieve the training with the specified identifier.
     *
     * @category Trainings
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.trainingId - The training identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TrainingResource>>} A Promise that resolves to a
     *   training resource
     */
    getTraining(params) {
        const requiredParams = ['trainingId'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'training_id': params.trainingId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TRAINING.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel or delete the training.
     *
     * Cancel the specified training and remove it.
     *
     * @category Trainings
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.trainingId - The training identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job or request
     *   metadata.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteTraining(params) {
        const requiredParams = ['trainingId'];
        const validParams = ['spaceId', 'projectId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'training_id': params.trainingId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TRAINING.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** TextRerank */
    /**
     * Generate rerank.
     *
     * Rerank texts based on some queries.
     *
     * @category Text Rerank
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please
     *   refer to the [list of
     *   models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
     * @param {RerankInput[]} params.inputs - The rank input strings.
     * @param {string} params.query - The rank query.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {RerankParameters} [params.parameters] - The properties used for reranking.
     * @param {Crypto} [params.crypto] - Encryption configuration for securing inference requests.
     *   Contains `key_ref` (identifier of the DEK in the keys management service IBM Key Protect CRN
     *   format).
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request header
     * @param {Object} callbacks - The parameters to send to the service.
     * @param {InvokeRequestCallback} [callbacks.requestCallback] - Callback invoked with paramteres
     *   payload for API call
     * @param {ReceiveResponseCallback} [callbacks.responseCallback] - Callback invoked with
     *   paramteres response from API call
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.RerankResponse>>} A Promise that resolves to a
     *   rerank response
     */
    textRerank(params, callbacks) {
        const requiredParams = ['modelId', 'inputs', 'query'];
        const validParams = ['spaceId', 'projectId', 'parameters', 'crypto'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'model_id': params.modelId,
            'inputs': params.inputs,
            'query': params.query,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'parameters': params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.RERANK,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters, { crypto: params.crypto, callbacks });
    }
    /** FineTunings */
    /**
     * Create a fine tuning job.
     *
     * Create a fine tuning job that will fine tune an LLM.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the job.
     * @param {ObjectLocation[]} params.trainingDataReferences
     *
     *   - The training datasets.
     *
     * @param {ObjectLocation} params.resultsReference - The training results. Normally this is
     *   specified as `type=container` which means that it is stored in the space or project.
     * @param {string} [params.description] - The description of the job.
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {boolean} [params.autoUpdateModel] - This field must not be set while creating a fine
     *   tuning job with InstructLab.
     *
     *   If set to `true` then the result of the training, if successful, will be uploaded to the
     *   repository as a model.
     * @param {FineTuningParameters} [params.parameters] - This field must not be set while creating a
     *   fine tuning job with InstructLab.
     *
     *   The parameters for the job. Note that if `verbalizer` is provided then `response_template` must
     *   also be provided (and vice versa).
     * @param {string} [params.type] - The `type` of Fine Tuning training. The `type` is set to `ilab`
     *   for InstructLab training.
     * @param {ObjectLocation[]} [params.testDataReferences]
     *
     *   - This field must not be set while creating a fine tuning job with InstructLab.
     *
     *   The holdout/test datasets.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.FineTuningResource>>} A Promise that resolves to
     *   a fine-tuning resource
     */
    createFineTuning(params) {
        const requiredParams = ['name', 'trainingDataReferences', 'resultsReference'];
        const validParams = [
            'description',
            'tags',
            'projectId',
            'spaceId',
            'autoUpdateModel',
            'parameters',
            'type',
            'testDataReferences',
            'custom',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'training_data_references': params.trainingDataReferences,
            'results_reference': params.resultsReference,
            'description': params.description,
            'tags': params.tags,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'auto_update_model': params.autoUpdateModel,
            'parameters': params.parameters,
            'type': params.type,
            'test_data_references': params.testDataReferences,
            'custom': params.custom,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FINE_TUNING.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the list of fine tuning jobs.
     *
     * Retrieve the list of fine tuning jobs for the specified space or project.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned.
     * @param {boolean} [params.totalCount] - Compute the total count. May have performance impact.
     * @param {string} [params.tagValue] - Return only the resources with the given tag value.
     * @param {string} [params.state] - Filter based on on the job state: queued, running, completed,
     *   failed etc.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.FineTuningResources>>} A Promise that resolves
     *   to fine-tuning resources
     */
    listFineTunings(params = {}) {
        const requiredParams = [];
        const validParams = [
            'start',
            'limit',
            'totalCount',
            'tagValue',
            'state',
            'spaceId',
            'projectId',
            'type',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'start': params.start,
            'limit': params.limit,
            'total_count': params.totalCount,
            'tag.value': params.tagValue,
            'state': params.state,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'type': params.type,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FINE_TUNING.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a fine tuning job.
     *
     * Get the results of a fine tuning job, or details if the job failed.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.FineTuningResource>>} A Promise that resolves to
     *   a fine-tuning resource
     */
    getFineTuning(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FINE_TUNING.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel or delete a fine tuning job.
     *
     * Delete a fine tuning job if it exists, once deleted all trace of the job is gone.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job or request
     *   metadata.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteFineTuning(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.FINE_TUNING.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** DocumentExtractionTechPreview */
    /**
     * Create a document extraction.
     *
     * Create a document extraction.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the document.
     * @param {DocumentExtractionObjectLocation[]} params.documentReferences
     *
     *   - The documents for text extraction.
     *
     * @param {ObjectLocationGithub} params.resultsReference
     *
     *   - A reference to data.
     *
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DocumentExtractionResource>>} A Promise that
     *   resolves to a document extraction resource
     */
    createDocumentExtraction(params) {
        const requiredParams = ['name', 'documentReferences'];
        const validParams = ['resultsReference', 'tags', 'projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'document_references': params.documentReferences,
            'results_reference': params.resultsReference,
            'tags': params.tags,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TUNING_DOCUMENT.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get document extractions.
     *
     * Get document extractions.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DocumentExtractionResources>>} A Promise that
     *   resolves to document extraction resources
     */
    listDocumentExtractions(params) {
        const requiredParams = [];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TUNING_DOCUMENT.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get document extraction.
     *
     * Get document extraction.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.DocumentExtractionResource>>} A Promise that
     *   resolves to a document extraction resource
     */
    getDocumentExtraction(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TUNING_DOCUMENT.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel the document extraction.
     *
     * Cancel the specified document extraction and remove it.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job metadata
     *   information.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    cancelDocumentExtractions(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TUNING_DOCUMENT.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** SyntheticDataGenerationTechPreview */
    /**
     * Create a synthetic data generation job.
     *
     * Create a synthetic data generation job.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the data.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {SyntheticDataGenerationDataReference} [params.dataReference]
     *
     *   - A reference to data.
     *
     * @param {ObjectLocation} [params.resultsReference] - A reference to data.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.SyntheticDataGenerationResource>>} A Promise
     *   that resolves to a synthetic data generation resource
     */
    createSyntheticDataGeneration(params) {
        const requiredParams = ['name'];
        const validParams = ['spaceId', 'projectId', 'dataReference', 'resultsReference'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'data_reference': params.dataReference,
            'results_reference': params.resultsReference,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SYNTHETIC_DATA.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get synthetic data generation jobs.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.SyntheticDataGenerationResources>>} A Promise
     *   that resolves to synthetic data generation resources
     */
    listSyntheticDataGenerations(params) {
        const requiredParams = [];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SYNTHETIC_DATA.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get synthetic data generation job.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.SyntheticDataGenerationResource>>} A Promise
     *   that resolves to a synthetic data generation resource
     */
    getSyntheticDataGeneration(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SYNTHETIC_DATA.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel the synthetic data generation.
     *
     * Cancel the synthetic data generation and remove it.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job metadata
     *   information.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    cancelSyntheticDataGeneration(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SYNTHETIC_DATA.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** TaxonomyTechPreview */
    /**
     * Create a taxonomy job.
     *
     * Create a taxonomy job.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the document.
     * @param {string} [params.description] - The description of the Taxonomy job.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {ObjectLocation} [params.dataReference] - A reference to data.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TaxonomyResource>>} A Promise that resolves to a
     *   taxonomy resource
     */
    createTaxonomy(params) {
        const requiredParams = ['name'];
        const validParams = [
            'description',
            'spaceId',
            'projectId',
            'dataReference',
            'resultsReference',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'description': params.description,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'data_reference': params.dataReference,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TAXONOMY.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get taxonomy jobs.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TaxonomyResources>>} A Promise that resolves to
     *   taxonomy resources
     */
    listTaxonomies(params = {}) {
        const requiredParams = [];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TAXONOMY.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get taxonomy job.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TaxonomyResource>>} A Promise that resolves to a
     *   taxonomy resource
     */
    getTaxonomy(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TAXONOMY.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel or delete the taxonomy job.
     *
     * Cancel or delete the taxonomy job.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The `id` is the identifier that was returned in the `metadata.id`
     *   field of the request.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to `true` in order to also delete the job metadata
     *   information.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteTaxonomy(params) {
        const requiredParams = ['id'];
        const validParams = ['projectId', 'spaceId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TAXONOMY.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** Models */
    /**
     * Create a new model.
     *
     * Create a new model with the given payload. A model represents a machine learning model asset.
     * If a `202` status is returned then the model will be ready when the `content_import_state` in
     * the model status (/ml/v4/models/{model_id}) is `completed`. If `content_import_state` is not
     * used then a `201` status is returned.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the resource.
     * @param {string} params.type - The model type. The supported model types can be found in the
     *   documentation
     *   [here](https://dataplatform.cloud.ibm.com/docs/content/wsj/wmls/wmls-deploy-python-types.html?context=analytics).
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.description] - A description of the resource.
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {SoftwareSpecRel} [params.softwareSpec] - A software specification.
     * @param {Rel} [params.pipeline] - A reference to a resource.
     * @param {ModelDefinitionId} [params.modelDefinition] - The model definition.
     * @param {JsonObject} [params.hyperParameters] - Hyper parameters used for training this model.
     * @param {string} [params.domain] - User provided domain name for this model. For example:
     *   sentiment, entity, visual-recognition, finance, retail, real estate etc.
     * @param {DataConnectionReference[]} [params.trainingDataReferences]
     *
     *   - The training data that was used to create this model.
     *
     * @param {DataConnectionReference[]} [params.testDataReferences] The holdout/test datasets.
     * @param {ModelEntitySchemas} [params.schemas] - If the prediction schemas are provided here then
     *   they take precedent over any schemas provided in the data references. Note that data
     *   references contain the schema for the associated data and this object contains the schema(s)
     *   for the associated prediction, if any. In the case that the prediction input data matches
     *   exactly the schema of the training data references then the prediction schema can be omitted.
     *   However it is highly recommended to always specify the prediction schemas using this field.
     * @param {string} [params.labelColumn] - The name of the label column.
     * @param {string} [params.transformedLabelColumn] - The name of the label column seen by the
     *   estimator, which may have been transformed by the previous transformers in the pipeline. This
     *   is not necessarily the same column as the `label_column` in the initial data set.
     * @param {ModelEntitySize} [params.size] - This will be used by scoring to record the size of the
     *   model.
     * @param {Metric[]} [params.metrics] - Metrics that can be returned by an operation.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {JsonObject} [params.userDefinedObjects] - User defined objects referenced by the model.
     *   For any user defined class or function used in the model, its name, as referenced in the
     *   model, must be specified as the `key` and its fully qualified class or function name must be
     *   specified as the `value`. This is applicable for `Tensorflow 2.X` models serialized in `H5`
     *   format using the `tf.keras` API.
     * @param {SoftwareSpecRel[]} [params.hybridPipelineSoftwareSpecs]
     *
     *   - The list of the software specifications that are used by the pipeline that generated this
     *       model, if the model was generated by a pipeline.
     *
     * @param {ModelEntityModelVersion} [params.modelVersion]
     *
     *   - Optional metadata that can be used to provide information about this model that can be tracked
     *       with IBM AI Factsheets. See [Using AI
     *       Factsheets](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/factsheets-model-inventory.html)
     *       for more details.
     *
     * @param {string} [params.trainingId] - Deprecated: this is replaced by `training.id`. This field
     *   can be used to store the `id` of the training job that was used to produce this model.
     * @param {DataPreprocessingTransformation[]} [params.dataPreprocessing]
     *
     *   - An optional array which contains the data preprocessing transformations that were executed by
     *       the training job that created this model.
     *
     * @param {TrainingDetails} [params.training] - Information about the training job that created
     *   this model.
     * @param {ContentLocation} [params.contentLocation] - Details about the attachments that should
     *   be uploaded with this model.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.ModelResource>>} A Promise that resolves to a
     *   model resource
     */
    createModel(params) {
        const requiredParams = ['name', 'type'];
        const validParams = [
            'projectId',
            'spaceId',
            'description',
            'tags',
            'softwareSpec',
            'pipeline',
            'modelDefinition',
            'hyperParameters',
            'domain',
            'trainingDataReferences',
            'testDataReferences',
            'schemas',
            'labelColumn',
            'transformedLabelColumn',
            'size',
            'metrics',
            'custom',
            'userDefinedObjects',
            'hybridPipelineSoftwareSpecs',
            'modelVersion',
            'trainingId',
            'dataPreprocessing',
            'training',
            'contentLocation',
            'foundationModel',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'name': params.name,
            'type': params.type,
            'project_id': params.projectId,
            'space_id': params.spaceId,
            'description': params.description,
            'tags': params.tags,
            'software_spec': params.softwareSpec,
            'pipeline': params.pipeline,
            'model_definition': params.modelDefinition,
            'hyper_parameters': params.hyperParameters,
            'domain': params.domain,
            'training_data_references': params.trainingDataReferences,
            'test_data_references': params.testDataReferences,
            'schemas': params.schemas,
            'label_column': params.labelColumn,
            'transformed_label_column': params.transformedLabelColumn,
            'size': params.size,
            'metrics': params.metrics,
            'custom': params.custom,
            'user_defined_objects': params.userDefinedObjects,
            'hybrid_pipeline_software_specs': params.hybridPipelineSoftwareSpecs,
            'model_version': params.modelVersion,
            'training_id': params.trainingId,
            'data_preprocessing': params.dataPreprocessing,
            'training': params.training,
            'content_location': params.contentLocation,
            'foundation_model': params.foundationModel,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.MODEL.BASE,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the models.
     *
     * Retrieve the models for the specified space or project.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {string} [params.tagValue] - Return only the resources with the given tag values,
     *   separated by `or` or `and` to support multiple tags.
     * @param {string} [params.search] - Returns only resources that match this search string. The
     *   path to the field must be the complete path to the field, and this field must be one of the
     *   indexed fields for this resource type. Note that the search string must be URL encoded.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.ModelResources>>} A Promise that resolves to
     *   model resources
     */
    listModels(params) {
        const requiredParams = [];
        const validParams = ['spaceId', 'projectId', 'start', 'limit', 'tagValue', 'search'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'start': params.start,
            'limit': params.limit,
            'tag.value': params.tagValue,
            'search': params.search,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.MODEL.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the model.
     *
     * Retrieve the model with the specified identifier. If `rev` query parameter is provided,
     * `rev=latest` will fetch the latest revision. A call with `rev={revision_number}` will fetch the
     * given revision_number record. Either `space_id` or `project_id` has to be provided and is
     * mandatory.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - Model identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.rev] - The revision number of the resource.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.ModelResource>>} A Promise that resolves to a
     *   model resource
     */
    getModel(params) {
        const requiredParams = ['modelId'];
        const validParams = ['spaceId', 'projectId', 'rev'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'rev': params.rev,
        };
        const path = {
            'model_id': params.modelId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.MODEL.BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update the model.
     *
     * Update the model with the provided patch data. The following fields can be patched:
     *
     * - `/tags`
     * - `/name`
     * - `/description`
     * - `/custom`
     * - `/software_spec` (operation `replace` only)
     * - `/model_version` (operation `add` and `replace` only).
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - Model identifier.
     * @param {JsonPatchOperation[]} params.jsonPatch - Input For Patch. This is the patch body which
     *   corresponds to the JavaScript Object Notation (JSON) Patch standard (RFC 6902).
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.ModelResource>>} A Promise that resolves to a
     *   model resource
     */
    updateModel(params) {
        const requiredParams = ['modelId', 'jsonPatch'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.jsonPatch;
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'model_id': params.modelId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.MODEL.BY_ID,
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the model.
     *
     * Delete the model with the specified identifier. This will delete all revisions of this model as
     * well. For each revision all attachments will also be deleted.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - Model identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteModel(params) {
        const requiredParams = ['modelId'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'model_id': params.modelId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.MODEL.BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** UtilityAgentToolsBeta */
    /**
     * Get utility agent tools.
     *
     * This retrieves the complete list of supported utility agent tools and contains information
     * required for running each tool.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxUtilityAgentToolsResponse>>} A Promise that
     *   resolves to utility agent tools response
     */
    listUtilityAgentTools(params = {}) {
        const requiredParams = [];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.UTILITY_AGENT_TOOL.BASE,
                method: 'GET',
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get utility agent tool.
     *
     * This retrieves the details of an utility agent tool and contains information required for
     * running the tool. Providing authentication and configuration params may return additional
     * details.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.toolId - Tool name.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.UtilityAgentTool>>} A Promise that resolves to a
     *   utility agent tool
     */
    getUtilityAgentTool(params) {
        const requiredParams = ['toolId'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const path = {
            'tool_id': params.toolId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.UTILITY_AGENT_TOOL.BY_ID,
                method: 'GET',
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Run a utility agent tool.
     *
     * This runs a utility agent tool given an input and optional configuration parameters.
     *
     * Some tools can choose to tailor the response based on the access token identity.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {WxUtilityAgentToolsRunRequest} params.wxUtilityAgentToolsRunRequest - Tool call body
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxUtilityAgentToolsRunResponse>>} A Promise that
     *   resolves to a utility agent tools run response
     */
    runUtilityAgentTool(params) {
        const requiredParams = ['wxUtilityAgentToolsRunRequest'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.wxUtilityAgentToolsRunRequest;
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.UTILITY_AGENT_TOOL.RUN,
                method: 'POST',
                body,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Run a utility agent tool.
     *
     * This runs a utility agent tool given an input and optional configuration parameters.
     *
     * Some tools can choose to tailor the response based on the access token identity.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.toolId - Tool name.
     * @param {WxUtilityAgentToolsRunRequest} params.wxUtilityAgentToolsRunRequest - Tool call body
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.WxUtilityAgentToolsRunResponse>>} A Promise that
     *   resolves to a utility agent tools run response
     */
    runUtilityAgentToolByName(params) {
        const requiredParams = ['toolId', 'wxUtilityAgentToolsRunRequest'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = params.wxUtilityAgentToolsRunRequest;
        const path = {
            'tool_id': params.toolId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.UTILITY_AGENT_TOOL.RUN_BY_ID,
                method: 'POST',
                body,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** Spaces */
    /**
     * Create a new space.
     *
     * Creates a new space to scope other assets. Authorized user must have the following roles (see
     * https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-iams):
     *
     * - Platform management role: Administrator
     * - Service access role: Manager
     *
     * On Public Cloud, user is required to provide Cloud Object Storage instance details in the
     * 'storage' property. On private CPD installations, the default storage is used instead.
     *
     * @param {CreateSpaceRequest} params - The parameters to send to the service.
     * @param {string} params.name - Name of space.
     * @param {string} [params.description] - Description of space.
     * @param {CreateSpaceStorage} [params.storage] - Cloud Object Storage instance is required for
     *   spaces created on Public Cloud. On private CPD installations, the default storage is used
     *   instead. This flag is not supported on CPD.
     * @param {CreateSpaceCompute[]} [params.compute] - This flag is not supported on CPD.
     * @param {string[]} [params.tags] - User-defined tags associated with a space.
     * @param {string} [params.generator] - A consistent label used to identify a client that created
     *   a space. A generator must be comprised of the following characters - alphanumeric, dash,
     *   underscore, space.
     * @param {CreateSpaceStage} [params.stage] - Space production and stage name.
     * @param {string} [params.type] - Space type.
     * @param {CreateSpaceSettings} [params.settings] - Space settings.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<CloudantV1.Response<WatsonXAI.SpaceResource>>} A Promise that resolves to a
     *   space resource
     */
    createSpace(params) {
        const requiredParams = this.wxServiceUrl.includes('.cloud.ibm.com')
            ? ['name', 'storage']
            : ['name'];
        const validParams = [
            'description',
            'storage',
            'compute',
            'tags',
            'generator',
            'stage',
            'type',
            'settings',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const path = {
            name: params.name,
        };
        const body = {
            'name': params.name,
            'description': params.description,
            'storage': params.storage,
            'compute': params.compute,
            'tags': params.tags,
            'generator': params.generator,
            'stage': params.stage,
            'type': params.type,
            'settings': params.settings,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SPACES.BASE,
                method: 'POST',
                body,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the space.
     *
     * Retrieves the space with the specified identifier.
     *
     * @param {GetSpaceParams} [params] - The parameters to send to the service.
     * @param {string} params.spaceId - The space identification.
     * @param {string} [params.include] - A list of comma-separated space sections to include in the
     *   query results. Example: '?include=members'. Available fields: members (returns up to 100
     *   members) nothing (does not return space entity and metadata)
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.Space>>} A Promise that resolves to a space
     */
    getSpace(params) {
        const requiredParams = ['spaceId'];
        const validParams = ['include'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            include: params.include,
        };
        const path = {
            'space_id': params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SPACES.BY_ID,
                method: 'GET',
                path,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the space.
     *
     * Deletes the space with the specified identifier.
     *
     * @param {DeleteSpaceParams} params - The parameters to send to the service.
     * @param {string} params.spaceId - The space identification.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteSpace(params) {
        const requiredParams = ['spaceId'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const path = {
            space_id: params.spaceId,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SPACES.BY_ID,
                method: 'DELETE',
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update the space.
     *
     * Partially update this space. Allowed paths are:
     *
     * - /name
     * - /description
     * - /compute
     * - /stage/name
     * - /type
     * - /settings/folders/enabled
     * - /settings/access_restrictions/reporting/authorized
     *
     * @param {WatsonXAI.SpacePatchParams} params - The parameters to send to the service.
     * @param {string} params.spaceId - The space identification.
     * @param {WatsonXAI.JsonPatchOperation} params.jsonPatch - The patch operation.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.Space>>} A Promise that resolves to a space
     */
    updateSpace(params) {
        const requiredParams = ['spaceId', 'jsonPatch'];
        const validParams = [];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const path = {
            space_id: params.spaceId,
        };
        const body = params.jsonPatch;
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SPACES.BY_ID,
                method: 'PATCH',
                path,
                body,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), this.baseOptions.headers), { 'Accept': 'application/json', 'Content-Type': 'application/json-patch+json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the spaces.
     *
     * Retrieves the space list.
     *
     * @category Spaces
     * @param {Object} params - The parameters to send to the service.
     * @param {string} [params.start] - Token representing first resource.
     * @param {number} [params.limit] - The number of resources returned. Default value is 100. Max
     *   value is 200.
     * @param {boolean} [params.totalCount] - Include details about total number of resources. This
     *   flag is not supported on CPD 3.0.1.
     * @param {string} [params.id] - Comma-separated list of ids to be returned. This flag is not
     *   supported on CPD 3.0.1.
     * @param {string} [params.tags] - A list of comma-separated, user-defined tags to use to filter
     *   the query results.
     * @param {string} [params.include] - A list of comma-separated space sections to include in the
     *   query results. Example: '?include=members'. Available fields:
     *
     *   - Members (returns up to 100 members)
     *   - Nothing (does not return space entity and metadata)
     *
     * @param {string} [params.member] - Filters the result list to only include spaces where the user
     *   with a matching user id is a member.
     * @param {string} [params.roles] - Must be used in conjunction with the member query parameter.
     *   Filters the result set to include only spaces where the specified member has one of the roles
     *   specified. Values:
     *
     *   - Admin
     *   - Editor
     *   - Viewer
     *
     * @param {string} [params.bssAccountId] - Filtering by bss_account_id is allowed only for
     *   accredited services.
     * @param {string} [params.name] - Filters the result list to only include space with specified
     *   name.
     * @param {string} [params.subName] - Filters the result list to only include spaces which name
     *   contains specified case-insensitive substring.
     * @param {string} [params.compute.crn] - Filters the result list to only include spaces with
     *   specified compute.crn.
     * @param {string} [params.type] - Filters the result list to only include space with specified
     *   type.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.SpaceResources>>} A Promise that resolves to
     *   space resources
     */
    listSpaces(params = {}) {
        const requiredParams = [];
        const validParams = [
            'start',
            'limit',
            'totalCount',
            'id',
            'tags',
            'include',
            'member',
            'roles',
            'bssAccountId',
            'name',
            'subName',
            'computeCrn',
            'type',
        ];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'start': params.start,
            'limit': params.limit,
            'total_count': params.totalCount,
            'id': params.id,
            'tags': params.tags,
            'include': params.include,
            'member': params.member,
            'roles': params.roles,
            'bss_account_id': params.bssAccountId,
            'name': params.name,
            'sub_name': params.subName,
            'compute.crn': params.computeCrn,
            'type': params.type,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.SPACES.BASE,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.serviceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { Accept: 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Transcribes an audio file using the Watson AI ML VML service.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.model - The model to use for audio transcriptions.
     * @param {string | ReadStream} params.file - The path to a mp3 or wav audio file to transcribe or
     *   a ReadStream object containing a file stream: `fs.createReadStream(path)`.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {string} [params.language] - Optional target language to which to transcribe; for
     *   example, fr for French. Default is English.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {string} [params.signal] - A list of comma-separated, user-defined tags to use to filter
     *   the query results.
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextChatResponse>>} - A promise that resolves
     *   with the transcription response.
     * @throws {Error} Will throw an error if required or invalid parameters are provided.
     */
    transcribeAudio(params) {
        const requiredParams = ['model', 'file'];
        const validParams = ['projectId', 'spaceId', 'language'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const { file } = params;
        const form = new FormData();
        form.append('model', params.model);
        if (params.language)
            form.append('language', params.language);
        if (typeof file === 'string') {
            const files = fs.createReadStream(file);
            form.append('file', files);
        }
        else
            form.append('file', file);
        if (params.projectId) {
            form.append('project_id', params.projectId);
        }
        else if (params.spaceId) {
            form.append('space_id', params.spaceId);
        }
        else
            throw new Error('Either projectId or spaceId need to be provided');
        const sdkHeaders = getSdkHeaders();
        const query = {
            'version': this.version,
        };
        const parameters = {
            options: {
                url: ENDPOINTS.AUDIO.TRANSCRIPTIONS,
                method: 'POST',
                body: form,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' }), form.getHeaders()), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /** Text classification */
    /**
     * Start a text classification request.
     *
     * Start a request to classify text from a document or an image (using OCR).
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {TextClassificationDataReference} params.documentReference
     *
     *   - A reference to data.
     *
     * @param {TextClassificationParameters} params.parameters
     *
     *   - The parameters for the text extraction.
     *
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` has to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextClassificationResponse>>} A Promise that
     *   resolves to a text classification response
     */
    createTextClassification(params) {
        const requiredParams = ['documentReference', 'parameters'];
        const validParams = ['custom', 'projectId', 'spaceId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const body = {
            'document_reference': params.documentReference,
            'parameters': params.parameters,
            'custom': params.custom,
            'project_id': params.projectId,
            'space_id': params.spaceId,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.CLASSIFICATIONS,
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the text classification requests.
     *
     * Retrieve the list of text classification requests for the specified space or project.
     *
     * This operation does not save the history, any requests that were deleted or purged will not
     * appear in this list.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot
     *   be determined by end user. It is generated by the service and it is set in the href available
     *   in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is
     *   100. Max limit allowed is 200.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextClassificationResources>>} A Promise that
     *   resolves to text classification resources
     */
    listTextClassifications(params = {}) {
        const requiredParams = [];
        const validParams = ['spaceId', 'projectId', 'start', 'limit'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'start': params.start,
            'limit': params.limit,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.CLASSIFICATIONS,
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get the results of the request.
     *
     * Retrieve the text classification request with the specified identifier.
     *
     * Note that there is a retention period of 2 days. If this retention period is exceeded then the
     * request will be deleted and the results no longer available. In this case this operation will
     * return `404`.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The identifier of the classification request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.TextClassificationResponse>>} A Promise that
     *   resolves to a text classification response
     */
    getTextClassification(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.CLASSIFICATION_BY_ID,
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the request.
     *
     * Cancel the specified text classification request and delete any associated results.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.id - The identifier of the classification request.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or
     *   `project_id` query parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id`
     *   or `project_id` query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job or request
     *   metadata.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonXAI.Response<WatsonXAI.EmptyObject>>} A Promise that resolves to an
     *   empty response object
     */
    deleteTextClassification(params) {
        const requiredParams = ['id'];
        const validParams = ['spaceId', 'projectId', 'hardDelete'];
        const validationErrors = validateRequestParams(params, requiredParams, validParams);
        if (validationErrors) {
            return Promise.reject(validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': params.spaceId,
            'project_id': params.projectId,
            'hard_delete': params.hardDelete,
        };
        const path = {
            'id': params.id,
        };
        const sdkHeaders = getSdkHeaders();
        const parameters = {
            options: {
                url: ENDPOINTS.TEXT.CLASSIFICATION_BY_ID,
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), params.headers), axiosOptions: {
                    signal: params.signal,
                } }),
        };
        return this.createRequest(parameters);
    }
}
/** @ignore */
WatsonXAI.PARAMETERIZED_SERVICE_URL = ML_CLOUD_BASE_URL;
/** @ignore */
WatsonXAI.defaultUrlVariables = new Map([['region', 'us-south']]);
/** Interfaces */
(function (WatsonXAI) {
    WatsonXAI.ApiErrorTarget = Types.ApiErrorTarget;
    WatsonXAI.DataConnectionReference = Types.DataConnectionReference;
    WatsonXAI.DeploymentEntity = Types.DeploymentEntity;
    WatsonXAI.DeploymentStatus = Types.DeploymentStatus;
    WatsonXAI.DeploymentTextGenProperties = Types.DeploymentTextGenProperties;
    WatsonXAI.FoundationModel = Types.FoundationModel;
    WatsonXAI.HardwareRequest = Types.HardwareRequest;
    WatsonXAI.JsonPatchOperation = Types.JsonPatchOperation;
    WatsonXAI.LifeCycleState = Types.LifeCycleState;
    WatsonXAI.ObjectLocation = Types.ObjectLocation;
    WatsonXAI.PromptTuning = Types.PromptTuning;
    WatsonXAI.TextChatParameterTools = Types.TextChatParameterTools;
    WatsonXAI.TextChatResponseFormat = Types.TextChatResponseFormat;
    WatsonXAI.TextChatResultChoice = Types.TextChatResultChoice;
    WatsonXAI.TextChatResultChoiceStream = Types.TextChatResultChoiceStream;
    WatsonXAI.TextChatToolCall = Types.TextChatToolCall;
    WatsonXAI.TextChatToolChoiceTool = Types.TextChatToolChoiceTool;
    WatsonXAI.TextChatUserImageURL = Types.TextChatUserImageURL;
    WatsonXAI.TextExtractionDataReference = Types.TextExtractionDataReference;
    WatsonXAI.TextExtractionResults = Types.TextExtractionResults;
    WatsonXAI.TextGenParameters = Types.TextGenParameters;
    WatsonXAI.TextGenResponseFieldsResultsItem = Types.TextGenResponseFieldsResultsItem;
    WatsonXAI.TrainingStatus = Types.TrainingStatus;
    WatsonXAI.ChatItem = Types.ChatItem;
    WatsonXAI.PromptLock = Types.PromptLock;
    WatsonXAI.WxPromptResponse = Types.WxPromptResponse;
    WatsonXAI.WxPromptSessionEntry = Types.WxPromptSessionEntry;
    WatsonXAI.TextChatMessagesTextChatMessageAssistant = Types.TextChatMessagesTextChatMessageAssistant;
    WatsonXAI.TextChatMessagesTextChatMessageSystem = Types.TextChatMessagesTextChatMessageSystem;
    WatsonXAI.TextChatMessagesTextChatMessageTool = Types.TextChatMessagesTextChatMessageTool;
    WatsonXAI.TextChatMessagesTextChatMessageUser = Types.TextChatMessagesTextChatMessageUser;
    WatsonXAI.TextChatUserContentsTextChatUserImageURLContent = Types.TextChatUserContentsTextChatUserImageURLContent;
    WatsonXAI.TextChatUserContentsTextChatUserTextContent = Types.TextChatUserContentsTextChatUserTextContent;
    WatsonXAI.FineTuningEntity = Types.FineTuningEntity;
    WatsonXAI.FineTuningPeftParameters = Types.FineTuningPeftParameters;
    WatsonXAI.DocumentExtractionStatus = Types.DocumentExtractionStatus;
    WatsonXAI.SyntheticDataGenerationDataReference = Types.SyntheticDataGenerationDataReference;
    WatsonXAI.SyntheticDataGenerationStatus = Types.SyntheticDataGenerationStatus;
    WatsonXAI.TaxonomyStatus = Types.TaxonomyStatus;
    WatsonXAI.ModelResourceEntity = Types.ModelResourceEntity;
    WatsonXAI.ContentLocation = Types.ContentLocation;
    WatsonXAI.DocumentExtractionObjectLocation = Types.DocumentExtractionObjectLocation;
    WatsonXAI.ObjectLocationGithub = Types.ObjectLocationGithub;
    WatsonXAI.TextClassificationDataReference = Types.TextClassificationDataReference;
    WatsonXAI.TextClassificationParameters = Types.TextClassificationParameters;
    WatsonXAI.TextClassificationResults = Types.TextClassificationResults;
    WatsonXAI.TextClassificationSemanticConfig = Types.TextClassificationSemanticConfig;
    WatsonXAI.PostPromptConstants = Types.PostPromptConstants;
    WatsonXAI.PatchPromptConstants = Types.PatchPromptConstants;
    WatsonXAI.PutPromptLockConstants = Types.PutPromptLockConstants;
    WatsonXAI.PostPromptSessionEntryConstants = Types.PostPromptSessionEntryConstants;
    WatsonXAI.PutPromptSessionLockConstants = Types.PutPromptSessionLockConstants;
    WatsonXAI.TextChatConstants = Types.TextChatConstants;
    WatsonXAI.TextChatStreamConstants = Types.TextChatStreamConstants;
    WatsonXAI.TrainingsListConstants = Types.TrainingsListConstants;
    WatsonXAI.CreateFineTuningConstants = Types.CreateFineTuningConstants;
    // === AUTO-GENERATED TYPES END ===
    /** Pager classes */
    /**
     * Abstract base class for all pager implementations. Provides common pagination functionality for
     * list operations.
     *
     * @abstract
     * @template TResource - The type of resource being paginated
     * @template TParams - The type of parameters for the list operation
     */
    class Pager {
        /**
         * Construct a Pager object.
         *
         * @param {WatsonXAI} client - The service client instance
         * @param {TParams} [params] - The parameters to be passed to the list operation
         * @throws {Error} If params.start is set (pagination should be handled internally)
         */
        constructor(client, params) {
            if (params && params.start) {
                throw new Error(`the params.start field should not be set`);
            }
            this.hasNextPage = true;
            this.pageContext = { next: undefined };
            this.client = client;
            this.params = JSON.parse(JSON.stringify(params || {}));
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         *
         * @returns {boolean} True if there are more results available, false otherwise
         */
        hasNext() {
            return this.hasNextPage;
        }
        /**
         * Returns all results by repeatedly invoking getNext() until all pages of results have been
         * retrieved.
         *
         * @returns {Promise<TResource[]>} A Promise that resolves to an array of all resources
         */
        getAll() {
            return __awaiter(this, void 0, void 0, function* () {
                const results = [];
                while (this.hasNext()) {
                    const nextPage = yield this.getNext();
                    results.push(...nextPage);
                }
                return results;
            });
        }
    }
    WatsonXAI.Pager = Pager;
    /** FoundationModelSpecsPager can be used to simplify the use of listFoundationModelSpecs(). */
    class FoundationModelSpecsPager extends Pager {
        /**
         * Construct a FoundationModelSpecsPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke
         *   listFoundationModelSpecs()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelSpecs()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking listFoundationModelSpecs().
         *
         * @returns {Promise<WatsonXAI.FoundationModel[]>} A Promise that resolves to an array of
         *   foundation models
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listFoundationModelSpecs(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.FoundationModelSpecsPager = FoundationModelSpecsPager;
    /** FoundationModelTasksPager can be used to simplify the use of listFoundationModelTasks(). */
    class FoundationModelTasksPager extends Pager {
        /**
         * Construct a FoundationModelTasksPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke
         *   listFoundationModelTasks()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelTasks()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking listFoundationModelTasks().
         *
         * @returns {Promise<WatsonXAI.FoundationModelTask[]>} A Promise that resolves to an array of
         *   foundation model tasks
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listFoundationModelTasks(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.FoundationModelTasksPager = FoundationModelTasksPager;
    /** TextExtractionsPager can be used to simplify the use of listTextExtractions(). */
    class TextExtractionsPager extends Pager {
        /**
         * Construct a TextExtractionsPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke listTextExtractions()
         * @param {Object} [params] - The parameters to be passed to listTextExtractions()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking listTextExtractions().
         *
         * @returns {Promise<WatsonXAI.TextExtractionResource[]>} A Promise that resolves to an array of
         *   text extraction resources
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listTextExtractions(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.TextExtractionsPager = TextExtractionsPager;
    /** TrainingsListPager can be used to simplify the use of listTrainings(). */
    class TrainingsListPager extends Pager {
        /**
         * Construct a TrainingsListPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke listTrainings()
         * @param {Object} [params] - The parameters to be passed to listTrainings()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking listTrainings().
         *
         * @returns {Promise<WatsonXAI.TrainingResource[]>} A Promise that resolves to an array of
         *   training resources
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listTrainings(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.TrainingsListPager = TrainingsListPager;
    /** FineTuningListPager can be used to simplify the use of fineTuningList(). */
    class FineTuningListPager extends Pager {
        /**
         * Construct a FineTuningListPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke fineTuningList()
         * @param {Object} [params] - The parameters to be passed to fineTuningList()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking fineTuningList().
         *
         * @returns {Promise<WatsonXAI.FineTuningResource[]>} A Promise that resolves to an array of
         *   fine-tuning resources
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listFineTunings(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.FineTuningListPager = FineTuningListPager;
    /** ModelsListPager can be used to simplify the use of modelsList(). */
    class ModelsListPager extends Pager {
        /**
         * Construct a ModelsListPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke modelsList()
         * @param {Object} [params] - The parameters to be passed to modelsList()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking modelsList().
         *
         * @returns {Promise<WatsonXAI.ModelResource[]>} A Promise that resolves to an array of model
         *   resources
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listModels(this.params);
                const { result } = response;
                let next;
                if (result && result.next) {
                    if (result.next.href) {
                        next = getQueryParam(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('Something went wrong when retrieving results.');
                return result.resources;
            });
        }
    }
    WatsonXAI.ModelsListPager = ModelsListPager;
    /** ListPromptsPager can be used to simplify the use of listPrompts(). */
    class ListPromptsPager {
        /**
         * Construct a ListPromptsPager object.
         *
         * @class
         * @param {WatsonXAI} client - The service client instance used to invoke listPrompts()
         * @param {WatsonXAI.PromptListParams} [params] - The parameters to be passed to listPrompts()
         */
        constructor(client, params) {
            this.hasNextPage = true;
            this.client = client;
            this.params = params;
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         *
         * @returns {boolean} True if there are more results available, false otherwise
         */
        hasNext() {
            return this.hasNextPage;
        }
        /**
         * Returns the next page of results by invoking listPrompts().
         *
         * @returns {Promise<WatsonXAI.CatalogSearchResponseAsset[]>} A Promise that resolves to an
         *   array of catalog search response assets
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                const response = yield this.client.listPrompts(this.params);
                const { result } = response;
                const { next } = result;
                this.params = Object.assign(Object.assign({}, this.params), next);
                if (!next) {
                    this.hasNextPage = false;
                }
                return result.results || [];
            });
        }
        /**
         * Returns all results by invoking listPrompts() repeatedly until all pages of results have been
         * retrieved.
         *
         * @returns {Promise<WatsonXAI.CatalogSearchResponseAsset[]>} A Promise that resolves to an
         *   array of catalog search response assets
         */
        getAll() {
            return __awaiter(this, void 0, void 0, function* () {
                const results = [];
                while (this.hasNext()) {
                    const nextPage = yield this.getNext();
                    results.push(...nextPage);
                }
                return results;
            });
        }
    }
    WatsonXAI.ListPromptsPager = ListPromptsPager;
    /** ListSpacesPager can be used to simplify the use of listSpaces(). */
    class ListSpacesPager {
        /**
         * Construct a ListPromptsPager object.
         *
         * @class
         * @param {WatsonXAI} client - The service client instance used to invoke listPrompts()
         * @param {WatsonXAI.ListSpacesParams} [params] - The parameters to be passed to listPrompts()
         */
        constructor(client, params) {
            this.hasNextPage = true;
            this.client = client;
            this.params = params || {};
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         *
         * @returns {boolean} True if there are more results available, false otherwise
         */
        hasNext() {
            return this.hasNextPage;
        }
        /**
         * Returns the next page of results by invoking listSpaces().
         *
         * @returns {Promise<WatsonXAI.SpaceResource[]>} A Promise that resolves to an array of space
         *   resources
         */
        getNext() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                const response = yield this.client.listSpaces(this.params);
                const { result: { next, resources }, } = response;
                if (!next) {
                    this.hasNextPage = false;
                }
                else {
                    const urlObject = new URL(next.href);
                    const searchParams = new URLSearchParams(urlObject.searchParams);
                    const startParam = searchParams.get('start');
                    if (startParam)
                        this.params = Object.assign(Object.assign({}, this.params), { start: startParam });
                    else
                        throw new Error("'start' param is not present in provided url");
                }
                return resources;
            });
        }
        /**
         * Returns all results by invoking listPrompts() repeatedly until all pages of results have been
         * retrieved.
         *
         * @returns {Promise<WatsonXAI.SpaceResource[]>} A Promise that resolves to an array of space
         *   resources
         */
        getAll() {
            return __awaiter(this, void 0, void 0, function* () {
                const results = [];
                while (this.hasNext()) {
                    const nextPage = yield this.getNext();
                    results.push(...nextPage);
                }
                return results;
            });
        }
    }
    WatsonXAI.ListSpacesPager = ListSpacesPager;
    /** TextClassificationsPager can be used to simplify the use of listTextClassifications(). */
    class TextClassificationsPager extends Pager {
        /**
         * Construct a TextClassificationsPager object.
         *
         * @param {WatsonXAI} client - The service client instance used to invoke
         *   listTextClassifications()
         * @param {Object} [params] - The parameters to be passed to listTextClassifications()
         */
        constructor(client, params) {
            super(client, params);
        }
        /**
         * Returns the next page of results by invoking listTextClassifications().
         *
         * @returns {Promise<WatsonXAI.TextClassificationResource[]>} A Promise that resolves to an
         *   array of text classification resources
         */
        getNext() {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.hasNext()) {
                    throw new Error('No more results available');
                }
                if (this.pageContext.next) {
                    this.params.start = this.pageContext.next;
                }
                const response = yield this.client.listTextClassifications(this.params);
                const { result } = response;
                const next = ((_a = result === null || result === void 0 ? void 0 : result.next) === null || _a === void 0 ? void 0 : _a.href) ? getQueryParam(result.next.href, 'start') : undefined;
                this.pageContext.next = next;
                if (!next) {
                    this.hasNextPage = false;
                }
                if (!result.resources)
                    throw new Error('No `resources` in the response.');
                return result.resources;
            });
        }
    }
    WatsonXAI.TextClassificationsPager = TextClassificationsPager;
    /**
     * CallbackHandler class to be used with callbacks provided by user in requests. Manages request
     * and response lifecycle callbacks for API operations.
     *
     * @class CallbackHandler
     */
    class CallbackHandler {
        /**
         * Creates a new CallbackHandler instance.
         *
         * @param {RequestCallbacks} callbacks - Object containing request and response callback
         *   functions
         */
        constructor(callbacks) {
            this.requestCallback = callbacks === null || callbacks === void 0 ? void 0 : callbacks.requestCallback;
            this.responseCallback = callbacks === null || callbacks === void 0 ? void 0 : callbacks.responseCallback;
        }
        /**
         * Handles the request callback by invoking it with sanitized parameters. Removes headers from
         * the parameters before passing to the callback.
         *
         * @param {RequestParameters} parameters - The request parameters to pass to the callback
         */
        handleRequest(parameters) {
            if (!this.requestCallback)
                return;
            const { defaultOptions, options } = parameters;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { headers } = defaultOptions, defaultOptionsNoHeaders = __rest(defaultOptions, ["headers"]);
            const parametersNoHeaders = { options, defaultOptions: defaultOptionsNoHeaders };
            this.requestCallback(parametersNoHeaders);
        }
        /**
         * Handles the response callback by invoking it with the resolved response. Waits for the
         * response promise to resolve before invoking the callback.
         *
         * @template T - The type of the response
         * @param {Promise<T>} response - The response promise to handle
         * @returns {Promise<void>} A promise that resolves when the callback completes
         */
        handleResponse(response) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.responseCallback)
                    return;
                const res = yield response;
                this.responseCallback(res);
            });
        }
    }
    WatsonXAI.CallbackHandler = CallbackHandler;
})(WatsonXAI || (WatsonXAI = {}));
export { WatsonXAI };
export default WatsonXAI;
//# sourceMappingURL=vml_v1.mjs.map