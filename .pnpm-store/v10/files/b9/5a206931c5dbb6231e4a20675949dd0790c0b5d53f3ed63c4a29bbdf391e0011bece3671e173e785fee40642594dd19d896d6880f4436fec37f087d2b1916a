"use strict";
/**
 * (C) Copyright IBM Corp. 2024.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
const ibm_cloud_sdk_core_1 = require("ibm-cloud-sdk-core");
const get_authenticator_from_environment_1 = require("../auth/utils/get-authenticator-from-environment");
const common_1 = require("../lib/common");
/**
 * SDK entrypoint for IBM watsonx.ai product
 *
 * API Version: v1
 */
const PLATFORM_URLS_MAP = {
    'https://jp-tok.ml.cloud.ibm.com': 'https://api.jp-tok.dataplatform.cloud.ibm.com/wx',
    'https://eu-gb.ml.cloud.ibm.com': 'https://api.eu-gb.dataplatform.cloud.ibm.com/wx',
    'https://eu-de.ml.cloud.ibm.com': 'https://api.eu-de.dataplatform.cloud.ibm.com/wx',
    'https://us-south.ml.cloud.ibm.com': 'https://api.dataplatform.cloud.ibm.com/wx',
    'https://private.jp-tok.ml.cloud.ibm.com': 'https://api.jp-tok.dataplatform.cloud.ibm.com/wx',
    'https://private.eu-gb.ml.cloud.ibm.com': 'https://api.eu-gb.dataplatform.cloud.ibm.com/wx',
    'https://private.eu-de.ml.cloud.ibm.com': 'https://api.eu-de.dataplatform.cloud.ibm.com/wx',
    'https://private.us-south.ml.cloud.ibm.com': 'https://api.dataplatform.cloud.ibm.com/wx',
};
class WatsonxAiMlVml_v1 extends ibm_cloud_sdk_core_1.BaseService {
    /**
     * Constructs a service URL by formatting the parameterized service URL.
     *
     * The parameterized service URL is:
     * 'https://{region}.ml.cloud.ibm.com'
     *
     * The default variable values are:
     * - 'region': 'us-south'
     *
     * @param {Map<string, string>} | null providedUrlVariables Map from variable names to desired values.
     *  If a variable is not provided in this map,
     *  the default variable value will be used instead.
     * @returns {string} The formatted URL with all variable placeholders replaced by values.
     */
    static constructServiceUrl(providedUrlVariables) {
        return (0, ibm_cloud_sdk_core_1.constructServiceUrl)(WatsonxAiMlVml_v1.PARAMETERIZED_SERVICE_URL, WatsonxAiMlVml_v1.defaultUrlVariables, providedUrlVariables);
    }
    /*************************
     * Factory method
     ************************/
    /**
     * Constructs an instance of WatsonxAiMlVml_v1 with passed in options and external configuration.
     *
     * @param {UserOptions} [options] - The parameters to send to the service.
     * @param {string} [options.serviceName] - The name of the service to configure
     * @param {Authenticator} [options.authenticator] - The Authenticator object used to authenticate requests to the service
     * @param {string} [options.serviceUrl] - The base URL for the service
     * @returns {WatsonxAiMlVml_v1}
     *
     * @category constructor
     *
     */
    static newInstance(options) {
        options = options || {};
        if (!options.serviceName) {
            options.serviceName = this.DEFAULT_SERVICE_NAME;
        }
        if (!options.authenticator) {
            options.authenticator = (0, get_authenticator_from_environment_1.getAuthenticatorFromEnvironment)(options.serviceName);
        }
        if (!options.platformUrl) {
            options.platformUrl = (0, ibm_cloud_sdk_core_1.readExternalSources)(options.serviceName).platformUrl;
        }
        const service = new WatsonxAiMlVml_v1(options);
        service.configureService(options.serviceName);
        if (options.serviceUrl) {
            service.setServiceUrl(options.serviceUrl);
        }
        return service;
    }
    /**
     * Construct a WatsonxAiMlVml_v1 object.
     *
     * @param {Object} options - Options for the service.
     * @param {string} options.version - The version date for the API of the form `YYYY-MM-DD`.
     * @param {string} [options.serviceUrl] - The base URL for the service
     * @param {OutgoingHttpHeaders} [options.headers] - Default headers that shall be included with every request to the service.
     * @param {Authenticator} options.authenticator - The Authenticator object used to authenticate requests to the service
     * @constructor
     * @returns {WatsonxAiMlVml_v1}
     */
    constructor(options) {
        options = options || {};
        const _requiredParams = ['version'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(options, _requiredParams, null);
        if (_validationErrors) {
            throw _validationErrors;
        }
        super(options);
        if (options.serviceUrl) {
            this.setServiceUrl(options.serviceUrl);
        }
        else {
            this.setServiceUrl(WatsonxAiMlVml_v1.DEFAULT_SERVICE_URL);
        }
        if (options.platformUrl) {
            this.wxServiceUrl = options.platformUrl.concat('/wx');
        }
        else if (PLATFORM_URLS_MAP[this.baseOptions.serviceUrl]) {
            this.wxServiceUrl = PLATFORM_URLS_MAP[this.baseOptions.serviceUrl];
        }
        else {
            this.wxServiceUrl = this.baseOptions.serviceUrl.concat('/wx');
        }
        this.version = options.version;
    }
    /*************************
     * deployments
     ************************/
    /**
     * Create a new watsonx.ai deployment.
     *
     * Create a new deployment, currently the only supported type is `online`.
     *
     * If this is a deployment for a prompt tune then the `asset` object must exist and the `id` must be the `id` of the
     * `model` that was created after the prompt training.
     *
     * If this is a deployment for a prompt template then the `prompt_template` object should exist and the `id` must be
     * the `id` of the prompt template to be deployed.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the resource.
     * @param {OnlineDeployment} params.online - Indicates that this is an online deployment. An object has to be
     * specified but can be empty.
     * The `serving_name` can be provided in the `online.parameters`.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.description] - A description of the resource.
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {SimpleRel} [params.promptTemplate] - A reference to a resource.
     * @param {HardwareSpec} [params.hardwareSpec] - A hardware specification.
     * @param {HardwareRequest} [params.hardwareRequest] - The requested hardware for deployment.
     * @param {Rel} [params.asset] - A reference to a resource.
     * @param {string} [params.baseModelId] - The base model that is required for this deployment if this is for a prompt
     * template or a prompt tune for an IBM foundation model.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>}
     *
     * @category Deployments
     */
    createDeployment(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['name', 'online'];
        const _validParams = [
            'name',
            'online',
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
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'online': _params.online,
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
            'description': _params.description,
            'tags': _params.tags,
            'custom': _params.custom,
            'prompt_template': _params.promptTemplate,
            'hardware_spec': _params.hardwareSpec,
            'hardware_request': _params.hardwareRequest,
            'asset': _params.asset,
            'base_model_id': _params.baseModelId,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'createDeployment');
        const parameters = {
            options: {
                url: '/ml/v4/deployments',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { Accept: 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the deployments.
     *
     * Retrieve the list of deployments for the specified space or project.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {string} [params.servingName] - Retrieves the deployment, if any, that contains this `serving_name`.
     * @param {string} [params.tagValue] - Retrieves only the resources with the given tag value.
     * @param {string} [params.assetId] - Retrieves only the resources with the given asset_id, asset_id would be the
     * model id.
     * @param {string} [params.promptTemplateId] - Retrieves only the resources with the given prompt_template_id.
     * @param {string} [params.name] - Retrieves only the resources with the given name.
     * @param {string} [params.type] - Retrieves the resources filtered with the given type. There are the deployment
     * types as well as an additional
     * `prompt_template` if the deployment type includes a prompt template.
     *
     * The supported deployment types are (see the description for `deployed_asset_type` in the deployment entity):
     *
     * 1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used on
     * a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation model is deployed.
     *
     * These can be combined with the flag `prompt_template` like this:
     *
     * 1. `type=prompt_tune` - return all prompt tuned model deployments. 2. `type=prompt_tune and prompt_template` -
     * return all prompt tuned model deployments with a prompt template. 3. `type=foundation_model` - return all prompt
     * template deployments. 4. `type=foundation_model and prompt_template` - return all prompt template deployments -
     * this is the same as the previous query because a `foundation_model` can only exist with a prompt template. 5.
     * `type=prompt_template` - return all deployments with a prompt template.
     * @param {string} [params.state] - Retrieves the resources filtered by state. Allowed values are `initializing`,
     * `updating`, `ready` and `failed`.
     * @param {boolean} [params.conflict] - Returns whether `serving_name` is available for use or not. This query
     * parameter cannot be combined with any other parameter except for `serving_name`.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResourceCollection>>}
     *
     * @category Deployments
     */
    listDeployments(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = [];
        const _validParams = [
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
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'serving_name': _params.servingName,
            'tag.value': _params.tagValue,
            'asset_id': _params.assetId,
            'prompt_template_id': _params.promptTemplateId,
            'name': _params.name,
            'type': _params.type,
            'state': _params.state,
            'conflict': _params.conflict,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'listDeployments');
        const parameters = {
            options: {
                url: '/ml/v4/deployments',
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the deployment details.
     *
     * Retrieve the deployment details with the specified identifier.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>}
     *
     * @category Deployments
     */
    getDeployment(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['deploymentId'];
        const _validParams = ['deploymentId', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'deployment_id': _params.deploymentId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deploymentsGet');
        const parameters = {
            options: {
                url: '/ml/v4/deployments/{deployment_id}',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update the deployment metadata.
     *
     * Update the deployment metadata. The following parameters of deployment metadata are supported for the patch
     * operation.
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
     * - `/base_model_id` - `replace` only (applicable only to prompt template deployments referring to IBM base
     * foundation models)
     *
     * The PATCH operation with path specified as `/online/parameters` can be used to update the `serving_name`.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {JsonPatchOperation[]} params.jsonPatch - The json patch.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>}
     *
     * @category Deployments
     */
    updateDeployment(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['deploymentId', 'jsonPatch'];
        const _validParams = ['deploymentId', 'jsonPatch', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = _params.jsonPatch;
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'deployment_id': _params.deploymentId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deploymentsUpdate');
        const parameters = {
            options: {
                url: '/ml/v4/deployments/{deployment_id}',
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json-patch+json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete the deployment.
     *
     * Delete the deployment with the specified identifier.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.deploymentId - The deployment id.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Deployments
     */
    deleteDeployment(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['deploymentId'];
        const _validParams = ['deploymentId', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'deployment_id': _params.deploymentId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deploymentsDelete');
        const parameters = {
            options: {
                url: '/ml/v4/deployments/{deployment_id}',
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters. If a `serving_name` is used then it must
     * match the `serving_name` that is returned in the `inference` section when the deployment was created.
     *
     * ### Return options
     *
     * Note that there is currently a limitation in this operation when using `return_options`, for input only
     * `input_text` will be returned if requested, for output the `input_tokens` and `generated_tokens` will not be
     * returned.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.idOrName - The `id_or_name` can be either the `deployment_id` that identifies the deployment
     * or a `serving_name` that allows a predefined URL to be used to post a prediction.
     *
     * The `project` or `space` for the deployment must have a WML instance that will be used for limits and billing (if a
     * paid plan).
     * @param {string} [params.input] - The prompt to generate completions. Note: The method tokenizes the input
     * internally. It is recommended not to leave any trailing spaces.
     *
     *
     * This field is ignored if there is a prompt template.
     * @param {DeploymentTextGenProperties} [params.parameters] - The template properties if this request refers to a
     * prompt template.
     * @param {Moderations} [params.moderations] - Properties that control the moderations, for usages such as `Hate and
     * profanity` (HAP) and `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextGenResponse>>}
     *
     * @category Deployments
     */
    deploymentGenerateText(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['idOrName'];
        const _validParams = ['idOrName', 'input', 'parameters', 'moderations', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'input': _params.input,
            'parameters': _params.parameters,
            'moderations': _params.moderations,
        };
        const query = {
            'version': this.version,
        };
        const path = {
            'id_or_name': _params.idOrName,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deploymentsTextGeneration');
        const parameters = {
            options: {
                url: '/ml/v1/deployments/{id_or_name}/text/generation',
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    deploymentGenerateTextStream(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const _params = Object.assign({}, params);
            const _requiredParams = ['idOrName'];
            const _validParams = [
                'idOrName',
                'input',
                'parameters',
                'moderations',
                'headers',
                'returnObject',
            ];
            const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
            if (_validationErrors) {
                return Promise.reject(_validationErrors);
            }
            const body = {
                'input': _params.input,
                'parameters': _params.parameters,
                'moderations': _params.moderations,
            };
            const query = {
                'version': this.version,
            };
            const path = {
                'id_or_name': _params.idOrName,
            };
            const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deploymentsTextGenerationStream');
            const parameters = {
                options: {
                    url: '/ml/v1/deployments/{id_or_name}/text/generation_stream',
                    method: 'POST',
                    body,
                    qs: query,
                    path,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), _params.headers) }),
            };
            const apiResponse = yield this.createRequest(parameters);
            const stream = _params.returnObject
                ? (0, common_1.transformStreamToObjectStream)(apiResponse)
                : (0, common_1.transformStreamToStringStream)(apiResponse);
            return stream;
        });
    }
    /*************************
     * foundationModelSpecs
     ************************/
    /**
     * List the available foundation models.
     *
     * Retrieve the list of deployed foundation models.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot be determined by end
     * user. It is generated by the service and it is set in the href available in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is 100. Max limit allowed
     * is 200.
     * @param {string} [params.filters] - A set of filters to specify the list of models, filters are described as the
     * `pattern` shown below.
     * ```text
     *  pattern: tfilter[,tfilter][:(or|and)]
     *  tfilter: filter | !filter
     *    filter: Requires existence of the filter.
     *    !filter: Requires absence of the filter.
     *  filter: one of
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
     * ```.
     * @param {boolean} [params.techPreview] - See all the `Tech Preview` models if entitled.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.FoundationModels>>}
     *
     * @category Foundation Model Specs
     */
    listFoundationModelSpecs(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = [];
        const _validParams = ['start', 'limit', 'filters', 'techPreview', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'start': _params.start,
            'limit': _params.limit,
            'filters': _params.filters,
            'tech_preview': _params.techPreview,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'listFoundationModelSpecs');
        const parameters = {
            options: {
                url: '/ml/v1/foundation_model_specs',
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * List the supported tasks.
     *
     * Retrieve the list of tasks that are supported by the foundation models.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot be determined by end
     * user. It is generated by the service and it is set in the href available in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is 100. Max limit allowed
     * is 200.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.FoundationModelTasks>>}
     *
     * @category Foundation Model Specs
     */
    listFoundationModelTasks(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = [];
        const _validParams = ['start', 'limit', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'start': _params.start,
            'limit': _params.limit,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'listFoundationModelTasks');
        const parameters = {
            options: {
                url: '/ml/v1/foundation_model_tasks',
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * prompts
     ************************/
    /**
     * Create a new prompt / prompt template.
     *
     * This creates a new prompt with the provided parameters.
     *
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
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>}
     *
     * @category Prompts / Prompt Templates
     */
    createPrompt(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['name', 'prompt'];
        const _validParams = [
            'name',
            'prompt',
            'description',
            'createdAt',
            'taskIds',
            'lock',
            'modelVersion',
            'promptVariables',
            'inputMode',
            'projectId',
            'spaceId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'prompt': _params.prompt,
            'description': _params.description,
            'created_at': _params.createdAt,
            'task_ids': _params.taskIds,
            'lock': _params.lock,
            'model_version': _params.modelVersion,
            'prompt_variables': _params.promptVariables,
            'input_mode': _params.inputMode,
        };
        const query = {
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'postPrompt');
        const parameters = {
            options: {
                url: '/v1/prompts',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt.
     *
     * This retrieves a prompt / prompt template with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {string} [params.restrictModelParameters] - Only return a set of model parameters compatiable with
     * inferencing.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>}
     *
     * @category Prompts / Prompt Templates
     */
    getPrompt(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId'];
        const _validParams = ['promptId', 'projectId', 'spaceId', 'restrictModelParameters', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
            'restrict_model_parameters': _params.restrictModelParameters,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPrompt');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update a prompt.
     *
     * This updates a prompt / prompt template with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} params.name - Name used to display the prompt.
     * @param {Prompt} params.prompt -
     * @param {string} [params.id] - The prompt's id. This value cannot be set. It is returned in responses only.
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {string[]} [params.taskIds] -
     * @param {boolean} [params.governanceTracked] -
     * @param {WxPromptPatchModelVersion} [params.modelVersion] -
     * @param {JsonObject} [params.promptVariables] -
     * @param {string} [params.inputMode] - Input mode in use for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>}
     *
     * @category Prompts / Prompt Templates
     */
    updatePrompt(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId', 'name', 'prompt'];
        const _validParams = [
            'promptId',
            'name',
            'prompt',
            'id',
            'description',
            'taskIds',
            'governanceTracked',
            'modelVersion',
            'promptVariables',
            'inputMode',
            'projectId',
            'spaceId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'prompt': _params.prompt,
            'id': _params.id,
            'description': _params.description,
            'task_ids': _params.taskIds,
            'governance_tracked': _params.governanceTracked,
            'model_version': _params.modelVersion,
            'prompt_variables': _params.promptVariables,
            'input_mode': _params.inputMode,
        };
        const query = {
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'patchPrompt');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}',
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt.
     *
     * This delets a prompt / prompt template with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Prompts / Prompt Templates
     */
    deletePrompt(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId'];
        const _validParams = ['promptId', 'projectId', 'spaceId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deletePrompt');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}',
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Prompt lock modifications.
     *
     * Modifies the current locked state of a prompt.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {boolean} params.locked - True if the prompt is currently locked.
     * @param {string} [params.lockType] - Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be
     * supplied in PUT /lock requests.
     * @param {string} [params.lockedBy] - Locked by is computed by the server and shouldn't be passed.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {boolean} [params.force] - Override a lock if it is currently taken.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>}
     *
     * @category Prompts / Prompt Templates
     */
    updatePromptLock(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId', 'locked'];
        const _validParams = [
            'promptId',
            'locked',
            'lockType',
            'lockedBy',
            'projectId',
            'spaceId',
            'force',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'locked': _params.locked,
            'lock_type': _params.lockType,
            'locked_by': _params.lockedBy,
        };
        const query = {
            'project_id': _params.projectId,
            'space_id': _params.spaceId,
            'force': _params.force,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'putPromptLock');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}/lock',
                method: 'PUT',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get current prompt lock status.
     *
     * Retrieves the current locked state of a prompt.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>}
     *
     * @category Prompts / Prompt Templates
     */
    getPromptLock(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId'];
        const _validParams = ['promptId', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptLock');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}/lock',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get the inference input string for a given prompt.
     *
     * Computes the inference input string based on state of a prompt. Optionally replaces template params.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {string} [params.input] - Override input string that will be used to generate the response. The string can
     * contain template parameters.
     * @param {JsonObject} [params.promptVariables] - Supply only to replace placeholders. Object content must be
     * key:value pairs where the 'key' is the parameter to replace and 'value' is the value to use.
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.GetPromptInputResponse>>}
     *
     * @category Prompts / Prompt Templates
     */
    getPromptInput(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId'];
        const _validParams = [
            'promptId',
            'input',
            'promptVariables',
            'spaceId',
            'projectId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'input': _params.input,
            'prompt_variables': _params.promptVariables,
        };
        const query = {
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptInput');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}/input',
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new chat item to a prompt.
     *
     * This adds new chat items to the given prompt.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.promptId - Prompt ID.
     * @param {ChatItem[]} params.chatItem -
     * @param {string} [params.spaceId] - [REQUIRED] Specifies the space ID as the target. One target must be supplied per
     * request.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Prompts / Prompt Templates
     */
    createPromptChatItem(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['promptId', 'chatItem'];
        const _validParams = ['promptId', 'chatItem', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = _params.chatItem;
        const query = {
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'prompt_id': _params.promptId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'postPromptChatItem');
        const parameters = {
            options: {
                url: '/v1/prompts/{prompt_id}/chat_items',
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * promptSessions
     ************************/
    /**
     * Create a new prompt session.
     *
     * This creates a new prompt session.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - Name used to display the prompt session.
     * @param {string} [params.id] - The prompt session's id. This value cannot be set. It is returned in responses only.
     * @param {string} [params.description] - An optional description for the prompt session.
     * @param {number} [params.createdAt] - Time the session was created.
     * @param {string} [params.createdBy] - The ID of the original session creator.
     * @param {number} [params.lastUpdatedAt] - Time the session was updated.
     * @param {string} [params.lastUpdatedBy] - The ID of the last user that modifed the session.
     * @param {PromptLock} [params.lock] -
     * @param {WxPromptSessionEntry[]} [params.prompts] -
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>}
     *
     * @category Prompt Sessions
     */
    createPromptSession(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['name'];
        const _validParams = [
            'name',
            'id',
            'description',
            'createdAt',
            'createdBy',
            'lastUpdatedAt',
            'lastUpdatedBy',
            'lock',
            'prompts',
            'projectId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'id': _params.id,
            'description': _params.description,
            'created_at': _params.createdAt,
            'created_by': _params.createdBy,
            'last_updated_at': _params.lastUpdatedAt,
            'last_updated_by': _params.lastUpdatedBy,
            'lock': _params.lock,
            'prompts': _params.prompts,
        };
        const query = {
            'project_id': _params.projectId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'postPromptSession');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt session.
     *
     * This retrieves a prompt session with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {boolean} [params.prefetch] - Include the most recent entry.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSession>>}
     *
     * @category Prompt Sessions
     */
    getPromptSession(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId'];
        const _validParams = ['sessionId', 'projectId', 'prefetch', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
            'prefetch': _params.prefetch,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptSession');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Update a prompt session.
     *
     * This updates a prompt session with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.name] -
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSession>>}
     *
     * @category Prompt Sessions
     */
    updatePromptSession(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId'];
        const _validParams = ['sessionId', 'name', 'description', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'description': _params.description,
        };
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'patchPromptSession');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}',
                method: 'PATCH',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt session.
     *
     * This deletes a prompt session with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Prompt Sessions
     */
    deletePromptSession(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId'];
        const _validParams = ['sessionId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deletePromptSession');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}',
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new prompt to a prompt session.
     *
     * This creates a new prompt associated with the given session.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.name - Name used to display the prompt.
     * @param {number} params.createdAt - Time the prompt was created.
     * @param {Prompt} params.prompt -
     * @param {string} [params.id] - The prompt's id. This value cannot be set. It is returned in responses only.
     * @param {string} [params.description] - An optional description for the prompt.
     * @param {JsonObject} [params.promptVariables] -
     * @param {boolean} [params.isTemplate] -
     * @param {string} [params.inputMode] - Input mode in use for the prompt.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSessionEntry>>}
     *
     * @category Prompt Sessions
     */
    createPromptSessionEntry(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId', 'name', 'createdAt', 'prompt'];
        const _validParams = [
            'sessionId',
            'name',
            'createdAt',
            'prompt',
            'id',
            'description',
            'promptVariables',
            'isTemplate',
            'inputMode',
            'projectId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'created_at': _params.createdAt,
            'prompt': _params.prompt,
            'id': _params.id,
            'description': _params.description,
            'prompt_variables': _params.promptVariables,
            'is_template': _params.isTemplate,
            'input_mode': _params.inputMode,
        };
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'postPromptSessionEntry');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/entries',
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get entries for a prompt session.
     *
     * List entries from a given session.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {string} [params.bookmark] - Bookmark from a previously limited get request.
     * @param {string} [params.limit] - Limit for results to retrieve, default 20.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSessionEntryList>>}
     *
     * @category Prompt Sessions
     */
    listPromptSessionEntries(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId'];
        const _validParams = ['sessionId', 'projectId', 'bookmark', 'limit', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
            'bookmark': _params.bookmark,
            'limit': _params.limit,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptSessionEntries');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/entries',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Add a new chat item to a prompt session entry.
     *
     * This adds new chat items to the given entry.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {ChatItem[]} params.chatItem -
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Prompt Sessions
     */
    createPromptSessionEntryChatItem(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId', 'entryId', 'chatItem'];
        const _validParams = ['sessionId', 'entryId', 'chatItem', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = _params.chatItem;
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
            'entry_id': _params.entryId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'postPromptSessionEntryChatItem');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/entries/{entry_id}/chat_items',
                method: 'POST',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Prompt session lock modifications.
     *
     * Modifies the current locked state of a prompt session.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {boolean} params.locked - True if the prompt is currently locked.
     * @param {string} [params.lockType] - Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be
     * supplied in PUT /lock requests.
     * @param {string} [params.lockedBy] - Locked by is computed by the server and shouldn't be passed.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {boolean} [params.force] - Override a lock if it is currently taken.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>}
     *
     * @category Prompt Sessions
     */
    updatePromptSessionLock(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId', 'locked'];
        const _validParams = [
            'sessionId',
            'locked',
            'lockType',
            'lockedBy',
            'projectId',
            'force',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'locked': _params.locked,
            'lock_type': _params.lockType,
            'locked_by': _params.lockedBy,
        };
        const query = {
            'project_id': _params.projectId,
            'force': _params.force,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'putPromptSessionLock');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/lock',
                method: 'PUT',
                body,
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get current prompt session lock status.
     *
     * Retrieves the current locked state of a prompt session.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>}
     *
     * @category Prompt Sessions
     */
    getPromptSessionLock(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId'];
        const _validParams = ['sessionId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptSessionLock');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/lock',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Get a prompt session entry.
     *
     * This retrieves a prompt session entry with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>}
     *
     * @category Prompt Sessions
     */
    getPromptSessionEntry(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId', 'entryId'];
        const _validParams = ['sessionId', 'entryId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
            'entry_id': _params.entryId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'getPromptSessionEntry');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/entries/{entry_id}',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Delete a prompt session entry.
     *
     * This deletes a prompt session entry with the given id.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.sessionId - Prompt Session ID.
     * @param {string} params.entryId - Prompt Session Entry ID.
     * @param {string} [params.projectId] - [REQUIRED] Specifies the project ID as the target. One target must be supplied
     * per request.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Prompt Sessions
     */
    deletePromptSessionEntry(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['sessionId', 'entryId'];
        const _validParams = ['sessionId', 'entryId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'project_id': _params.projectId,
        };
        const path = {
            'session_id': _params.sessionId,
            'entry_id': _params.entryId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'deletePromptSessionEntry');
        const parameters = {
            options: {
                url: '/v1/prompt_sessions/{session_id}/entries/{entry_id}',
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { serviceUrl: this.wxServiceUrl, headers: Object.assign(Object.assign({}, sdkHeaders), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * textChat
     ************************/
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The model to use for the chat completion.
     *
     * Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {TextChatMessages[]} params.messages - The messages for this chat session.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {TextChatParameterTools[]} [params.tools] - Tool functions that can be called with the response.
     * @param {string} [params.toolChoiceOption] - Using `none` means the model will not call any tool and instead
     * generates a message.
     *
     * **The following options (`auto` and `required`) are not yet supported.**
     *
     * Using `auto` means the model can pick between generating a message or calling one or more tools. Using `required`
     * means the model must call one or more tools.
     *
     * Only one of `tool_choice_option` or `tool_choice` must be present.
     * @param {TextChatToolChoiceTool} [params.toolChoice] - Specifying a particular tool via `{"type": "function",
     * "function": {"name": "my_function"}}` forces the model to call that tool.
     *
     * Only one of `tool_choice_option` or `tool_choice` must be present.
     * @param {number} [params.frequencyPenalty] - Positive values penalize new tokens based on their existing frequency
     * in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
     * @param {boolean} [params.logprobs] - Whether to return log probabilities of the output tokens or not. If true,
     * returns the log probabilities of each output token returned in the content of message.
     * @param {number} [params.topLogprobs] - An integer specifying the number of most likely tokens to return at each
     * token position, each with an associated log probability. The option `logprobs` must be set to `true` if this
     * parameter is used.
     * @param {number} [params.maxTokens] - The maximum number of tokens that can be generated in the chat completion. The
     * total length of input tokens and generated tokens is limited by the model's context length.
     * @param {number} [params.n] - How many chat completion choices to generate for each input message. Note that you
     * will be charged based on the number of generated tokens across all of the choices. Keep n as 1 to minimize costs.
     * @param {number} [params.presencePenalty] - Positive values penalize new tokens based on whether they appear in the
     * text so far, increasing the model's likelihood to talk about new topics.
     * @param {TextChatResponseFormat} [params.responseFormat] - The chat response format parameters.
     * @param {number} [params.temperature] - What sampling temperature to use,. Higher values like 0.8 will make the
     * output more random, while lower values like 0.2 will make it more focused and deterministic.
     *
     * We generally recommend altering this or `top_p` but not both.
     * @param {number} [params.topP] - An alternative to sampling with temperature, called nucleus sampling, where the
     * model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the
     * top 10% probability mass are considered.
     *
     * We generally recommend altering this or `temperature` but not both.
     * @param {number} [params.timeLimit] - Time limit in milliseconds - if not completed within this time, generation
     * will stop. The text generated so far will be returned along with the `TIME_LIMIT`` stop reason. Depending on the
     * users plan, and on the model being used, there may be an enforced maximum time limit.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextChatResponse>>}
     *
     * @category Text Chat
     */
    textChat(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['modelId', 'messages'];
        const _validParams = [
            'modelId',
            'messages',
            'spaceId',
            'projectId',
            'tools',
            'toolChoiceOption',
            'toolChoice',
            'frequencyPenalty',
            'logprobs',
            'topLogprobs',
            'maxTokens',
            'n',
            'presencePenalty',
            'responseFormat',
            'temperature',
            'topP',
            'timeLimit',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'model_id': _params.modelId,
            'messages': _params.messages,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'tools': _params.tools,
            'tool_choice_option': _params.toolChoiceOption,
            'tool_choice': _params.toolChoice,
            'frequency_penalty': _params.frequencyPenalty,
            'logprobs': _params.logprobs,
            'top_logprobs': _params.topLogprobs,
            'max_tokens': _params.maxTokens,
            'n': _params.n,
            'presence_penalty': _params.presencePenalty,
            'response_format': _params.responseFormat,
            'temperature': _params.temperature,
            'top_p': _params.topP,
            'time_limit': _params.timeLimit,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textChat');
        const parameters = {
            options: {
                url: '/ml/v1/text/chat',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    textChatStream(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const _params = Object.assign({}, params);
            const _requiredParams = ['modelId', 'messages'];
            const _validParams = [
                'modelId',
                'messages',
                'spaceId',
                'projectId',
                'tools',
                'toolChoiceOption',
                'toolChoice',
                'frequencyPenalty',
                'logprobs',
                'topLogprobs',
                'maxTokens',
                'n',
                'presencePenalty',
                'responseFormat',
                'temperature',
                'topP',
                'timeLimit',
                'headers',
                'returnObject',
            ];
            const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
            if (_validationErrors) {
                return Promise.reject(_validationErrors);
            }
            const body = {
                'model_id': _params.modelId,
                'messages': _params.messages,
                'space_id': _params.spaceId,
                'project_id': _params.projectId,
                'tools': _params.tools,
                'tool_choice_option': _params.toolChoiceOption,
                'tool_choice': _params.toolChoice,
                'frequency_penalty': _params.frequencyPenalty,
                'logprobs': _params.logprobs,
                'top_logprobs': _params.topLogprobs,
                'max_tokens': _params.maxTokens,
                'n': _params.n,
                'presence_penalty': _params.presencePenalty,
                'response_format': _params.responseFormat,
                'temperature': _params.temperature,
                'top_p': _params.topP,
                'time_limit': _params.timeLimit,
            };
            const query = {
                'version': this.version,
            };
            const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textChatStream');
            const parameters = {
                options: {
                    url: '/ml/v1/text/chat_stream',
                    method: 'POST',
                    body,
                    qs: query,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), _params.headers) }),
            };
            const apiResponse = yield this.createRequest(parameters);
            const stream = _params.returnObject
                ? (0, common_1.transformStreamToObjectStream)(apiResponse)
                : (0, common_1.transformStreamToStringStream)(apiResponse);
            return stream;
        });
    }
    /*************************
     * textEmbeddings
     ************************/
    /**
     * Generate embeddings.
     *
     * Generate embeddings from text input.
     *
     * See the
     * [documentation](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-embed-overview.html?context=wx&audience=wdp)
     * for a description of text embeddings.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
     * @param {string[]} params.inputs - The input text.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {EmbeddingParameters} [params.parameters] - Parameters for text embedding requests.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmbeddingsResponse>>}
     *
     * @category Embeddings
     */
    embedText(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['modelId', 'inputs'];
        const _validParams = ['modelId', 'inputs', 'spaceId', 'projectId', 'parameters', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'model_id': _params.modelId,
            'inputs': _params.inputs,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'parameters': _params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textEmbeddings');
        const parameters = {
            options: {
                url: '/ml/v1/text/embeddings',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * textGeneration
     ************************/
    /**
     * Infer text.
     *
     * Infer the next tokens for a given deployed model with a set of parameters.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.input - The prompt to generate completions. Note: The method tokenizes the input internally.
     * It is recommended not to leave any trailing spaces.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {TextGenParameters} [params.parameters] - Properties that control the model and response.
     * @param {Moderations} [params.moderations] - Properties that control the moderations, for usages such as `Hate and
     * profanity` (HAP) and `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextGenResponse>>}
     *
     * @category Text Generation
     */
    generateText(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['input', 'modelId'];
        const _validParams = [
            'input',
            'modelId',
            'spaceId',
            'projectId',
            'parameters',
            'moderations',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'input': _params.input,
            'model_id': _params.modelId,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'parameters': _params.parameters,
            'moderations': _params.moderations,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textGeneration');
        const parameters = {
            options: {
                url: '/ml/v1/text/generation',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    generateTextStream(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const _params = Object.assign({}, params);
            const _requiredParams = ['input', 'modelId'];
            const _validParams = [
                'input',
                'modelId',
                'spaceId',
                'projectId',
                'parameters',
                'moderations',
                'headers',
                'returnObject',
            ];
            const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
            if (_validationErrors) {
                return Promise.reject(_validationErrors);
            }
            const body = {
                'input': _params.input,
                'model_id': _params.modelId,
                'space_id': _params.spaceId,
                'project_id': _params.projectId,
                'parameters': _params.parameters,
                'moderations': _params.moderations,
            };
            const query = {
                'version': this.version,
            };
            const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textGenerationStream');
            const parameters = {
                options: {
                    url: '/ml/v1/text/generation_stream',
                    method: 'POST',
                    body,
                    qs: query,
                    responseType: 'stream',
                    adapter: 'fetch',
                },
                defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'text/event-stream', 'Connection': 'keep-alive', 'Content-Type': 'application/json' }), _params.headers) }),
            };
            const apiResponse = yield this.createRequest(parameters);
            const stream = _params.returnObject
                ? (0, common_1.transformStreamToObjectStream)(apiResponse)
                : (0, common_1.transformStreamToStringStream)(apiResponse);
            return stream;
        });
    }
    /*************************
     * tokenization
     ************************/
    /**
     * Text tokenization.
     *
     * The text tokenize operation allows you to check the conversion of provided input to tokens for a given model. It
     * splits text into words or sub-words, which then are converted to ids through a look-up table (vocabulary).
     * Tokenization allows the model to have a reasonable vocabulary size.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     * @param {string} params.input - The input string to tokenize.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {TextTokenizeParameters} [params.parameters] - The parameters for text tokenization.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextTokenizeResponse>>}
     *
     * @category Tokenization
     */
    tokenizeText(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['modelId', 'input'];
        const _validParams = ['modelId', 'input', 'spaceId', 'projectId', 'parameters', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'model_id': _params.modelId,
            'input': _params.input,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'parameters': _params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textTokenization');
        const parameters = {
            options: {
                url: '/ml/v1/text/tokenization',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * trainings
     ************************/
    /**
     * Create a new watsonx.ai training.
     *
     * Create a new watsonx.ai training in a project or a space.
     *
     * The details of the base model and parameters for the training must be provided in the `prompt_tuning` object.
     *
     *
     * In order to deploy the tuned model you need to follow the following steps:
     *
     *   1. Create a WML model asset, in a space or a project,
     *      by providing the `request.json` as shown below:
     *        ```
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
     *        **Notes:**
     *
     *        1. If you used the training request field `auto_update_model: true`
     *        then you can skip this step as the model will have been saved at
     *        the end of the training job.
     *        1. Rather than creating the payload for the model you can use the
     *           generated `request.json` that was stored in the `results_reference`
     *           field, look for the path in the field
     *           `entity.results_reference.location.model_request_path`.
     *        1. The model `type` must be `prompt_tune_1.0`.
     *        1. The software spec name must be `watsonx-textgen-fm-1.0`.
     *
     *   1. Create a tuned model deployment as described in the
     *      [create deployment documentation](#create-deployment).
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.name - The name of the training.
     * @param {ObjectLocation} params.resultsReference - The training results. Normally this is specified as
     * `type=container` which
     * means that it is stored in the space or project.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {string} [params.description] - A description of the training.
     * @param {string[]} [params.tags] - A list of tags for this resource.
     * @param {PromptTuning} [params.promptTuning] - Properties to control the prompt tuning.
     * @param {DataConnectionReference[]} [params.trainingDataReferences] - Training datasets.
     * @param {JsonObject} [params.custom] - User defined properties specified as key-value pairs.
     * @param {boolean} [params.autoUpdateModel] - If set to `true` then the result of the training, if successful, will
     * be uploaded to the repository as a model.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResource>>}
     *
     * @category Trainings
     */
    createTraining(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['name', 'resultsReference'];
        const _validParams = [
            'name',
            'resultsReference',
            'spaceId',
            'projectId',
            'description',
            'tags',
            'promptTuning',
            'trainingDataReferences',
            'custom',
            'autoUpdateModel',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'name': _params.name,
            'results_reference': _params.resultsReference,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'description': _params.description,
            'tags': _params.tags,
            'prompt_tuning': _params.promptTuning,
            'training_data_references': _params.trainingDataReferences,
            'custom': _params.custom,
            'auto_update_model': _params.autoUpdateModel,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'trainingsCreate');
        const parameters = {
            options: {
                url: '/ml/v4/trainings',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the list of trainings.
     *
     * Retrieve the list of trainings for the specified space or project.
     *
     * @param {Object} [params] - The parameters to send to the service.
     * @param {string} [params.start] - Token required for token-based pagination. This token cannot be determined by end
     * user. It is generated by the service and it is set in the href available in the `next` field.
     * @param {number} [params.limit] - How many resources should be returned. By default limit is 100. Max limit allowed
     * is 200.
     * @param {boolean} [params.totalCount] - Compute the total count. May have performance impact.
     * @param {string} [params.tagValue] - Return only the resources with the given tag value.
     * @param {string} [params.state] - Filter based on on the training job state.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResourceCollection>>}
     *
     * @category Trainings
     */
    listTrainings(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = [];
        const _validParams = [
            'start',
            'limit',
            'totalCount',
            'tagValue',
            'state',
            'spaceId',
            'projectId',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'start': _params.start,
            'limit': _params.limit,
            'total_count': _params.totalCount,
            'tag.value': _params.tagValue,
            'state': _params.state,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'trainingsList');
        const parameters = {
            options: {
                url: '/ml/v4/trainings',
                method: 'GET',
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Retrieve the training.
     *
     * Retrieve the training with the specified identifier.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.trainingId - The training identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResource>>}
     *
     * @category Trainings
     */
    getTraining(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['trainingId'];
        const _validParams = ['trainingId', 'spaceId', 'projectId', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
        };
        const path = {
            'training_id': _params.trainingId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'trainingsGet');
        const parameters = {
            options: {
                url: '/ml/v4/trainings/{training_id}',
                method: 'GET',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /**
     * Cancel or delete the training.
     *
     * Cancel the specified training and remove it.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.trainingId - The training identifier.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` query
     * parameter has to be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id`
     * query parameter has to be given.
     * @param {boolean} [params.hardDelete] - Set to true in order to also delete the job or request metadata.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>}
     *
     * @category Trainings
     */
    deleteTraining(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['trainingId'];
        const _validParams = ['trainingId', 'spaceId', 'projectId', 'hardDelete', 'headers'];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const query = {
            'version': this.version,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'hard_delete': _params.hardDelete,
        };
        const path = {
            'training_id': _params.trainingId,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'trainingsDelete');
        const parameters = {
            options: {
                url: '/ml/v4/trainings/{training_id}',
                method: 'DELETE',
                qs: query,
                path,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign({}, sdkHeaders), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
    /*************************
     * textRerank
     ************************/
    /**
     * Generate rerank.
     *
     * Rerank texts based on some queries.
     *
     * @param {Object} params - The parameters to send to the service.
     * @param {string} params.modelId - The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
     * @param {RerankInput[]} params.inputs - The rank input strings.
     * @param {string} params.query - The rank query.
     * @param {string} [params.spaceId] - The space that contains the resource. Either `space_id` or `project_id` has to
     * be given.
     * @param {string} [params.projectId] - The project that contains the resource. Either `space_id` or `project_id` has
     * to be given.
     * @param {RerankParameters} [params.parameters] - The properties used for reranking.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @returns {Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.RerankResponse>>}
     *
     * @category Text Rerank
     */
    textRerank(params) {
        const _params = Object.assign({}, params);
        const _requiredParams = ['modelId', 'inputs', 'query'];
        const _validParams = [
            'modelId',
            'inputs',
            'query',
            'spaceId',
            'projectId',
            'parameters',
            'headers',
        ];
        const _validationErrors = (0, ibm_cloud_sdk_core_1.validateParams)(_params, _requiredParams, _validParams);
        if (_validationErrors) {
            return Promise.reject(_validationErrors);
        }
        const body = {
            'model_id': _params.modelId,
            'inputs': _params.inputs,
            'query': _params.query,
            'space_id': _params.spaceId,
            'project_id': _params.projectId,
            'parameters': _params.parameters,
        };
        const query = {
            'version': this.version,
        };
        const sdkHeaders = (0, common_1.getSdkHeaders)(WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME, 'vml_v1', 'textRerank');
        const parameters = {
            options: {
                url: '/ml/v1/text/rerank',
                method: 'POST',
                body,
                qs: query,
            },
            defaultOptions: Object.assign(Object.assign({}, this.baseOptions), { headers: Object.assign(Object.assign(Object.assign({}, sdkHeaders), { 'Accept': 'application/json', 'Content-Type': 'application/json' }), _params.headers) }),
        };
        return this.createRequest(parameters);
    }
}
/** @hidden */
WatsonxAiMlVml_v1.DEFAULT_SERVICE_URL = 'https://us-south.ml.cloud.ibm.com';
/** @hidden */
WatsonxAiMlVml_v1.DEFAULT_SERVICE_NAME = 'watsonx_ai';
/** @hidden */
WatsonxAiMlVml_v1.PARAMETERIZED_SERVICE_URL = 'https://{region}.ml.cloud.ibm.com';
/** @hidden */
WatsonxAiMlVml_v1.defaultUrlVariables = new Map([['region', 'us-south']]);
/*************************
 * interfaces
 ************************/
(function (WatsonxAiMlVml_v1) {
    /** Constants for the `postPrompt` operation. */
    let PostPromptConstants;
    (function (PostPromptConstants) {
        /** Input mode in use for the prompt. */
        let InputMode;
        (function (InputMode) {
            InputMode["STRUCTURED"] = "structured";
            InputMode["FREEFORM"] = "freeform";
            InputMode["CHAT"] = "chat";
            InputMode["DETACHED"] = "detached";
        })(InputMode = PostPromptConstants.InputMode || (PostPromptConstants.InputMode = {}));
    })(PostPromptConstants = WatsonxAiMlVml_v1.PostPromptConstants || (WatsonxAiMlVml_v1.PostPromptConstants = {}));
    /** Constants for the `patchPrompt` operation. */
    let PatchPromptConstants;
    (function (PatchPromptConstants) {
        /** Input mode in use for the prompt. */
        let InputMode;
        (function (InputMode) {
            InputMode["STRUCTURED"] = "structured";
            InputMode["FREEFORM"] = "freeform";
        })(InputMode = PatchPromptConstants.InputMode || (PatchPromptConstants.InputMode = {}));
    })(PatchPromptConstants = WatsonxAiMlVml_v1.PatchPromptConstants || (WatsonxAiMlVml_v1.PatchPromptConstants = {}));
    /** Constants for the `putPromptLock` operation. */
    let PutPromptLockConstants;
    (function (PutPromptLockConstants) {
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
        let LockType;
        (function (LockType) {
            LockType["EDIT"] = "edit";
            LockType["GOVERNANCE"] = "governance";
        })(LockType = PutPromptLockConstants.LockType || (PutPromptLockConstants.LockType = {}));
    })(PutPromptLockConstants = WatsonxAiMlVml_v1.PutPromptLockConstants || (WatsonxAiMlVml_v1.PutPromptLockConstants = {}));
    /** Constants for the `postPromptSessionEntry` operation. */
    let PostPromptSessionEntryConstants;
    (function (PostPromptSessionEntryConstants) {
        /** Input mode in use for the prompt. */
        let InputMode;
        (function (InputMode) {
            InputMode["STRUCTURED"] = "structured";
            InputMode["FREEFORM"] = "freeform";
            InputMode["CHAT"] = "chat";
        })(InputMode = PostPromptSessionEntryConstants.InputMode || (PostPromptSessionEntryConstants.InputMode = {}));
    })(PostPromptSessionEntryConstants = WatsonxAiMlVml_v1.PostPromptSessionEntryConstants || (WatsonxAiMlVml_v1.PostPromptSessionEntryConstants = {}));
    /** Constants for the `putPromptSessionLock` operation. */
    let PutPromptSessionLockConstants;
    (function (PutPromptSessionLockConstants) {
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
        let LockType;
        (function (LockType) {
            LockType["EDIT"] = "edit";
            LockType["GOVERNANCE"] = "governance";
        })(LockType = PutPromptSessionLockConstants.LockType || (PutPromptSessionLockConstants.LockType = {}));
    })(PutPromptSessionLockConstants = WatsonxAiMlVml_v1.PutPromptSessionLockConstants || (WatsonxAiMlVml_v1.PutPromptSessionLockConstants = {}));
    /** Constants for the `textChat` operation. */
    let TextChatConstants;
    (function (TextChatConstants) {
        /** Using `none` means the model will not call any tool and instead generates a message. **The following options (`auto` and `required`) are not yet supported.** Using `auto` means the model can pick between generating a message or calling one or more tools. Using `required` means the model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be present. */
        let ToolChoiceOption;
        (function (ToolChoiceOption) {
            ToolChoiceOption["NONE"] = "none";
            ToolChoiceOption["AUTO"] = "auto";
            ToolChoiceOption["REQUIRED"] = "required";
        })(ToolChoiceOption = TextChatConstants.ToolChoiceOption || (TextChatConstants.ToolChoiceOption = {}));
    })(TextChatConstants = WatsonxAiMlVml_v1.TextChatConstants || (WatsonxAiMlVml_v1.TextChatConstants = {}));
    /** Constants for the `textChatStream` operation. */
    let TextChatStreamConstants;
    (function (TextChatStreamConstants) {
        /** Using `none` means the model will not call any tool and instead generates a message. **The following options (`auto` and `required`) are not yet supported.** Using `auto` means the model can pick between generating a message or calling one or more tools. Using `required` means the model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be present. */
        let ToolChoiceOption;
        (function (ToolChoiceOption) {
            ToolChoiceOption["NONE"] = "none";
            ToolChoiceOption["AUTO"] = "auto";
            ToolChoiceOption["REQUIRED"] = "required";
        })(ToolChoiceOption = TextChatStreamConstants.ToolChoiceOption || (TextChatStreamConstants.ToolChoiceOption = {}));
    })(TextChatStreamConstants = WatsonxAiMlVml_v1.TextChatStreamConstants || (WatsonxAiMlVml_v1.TextChatStreamConstants = {}));
    /** Constants for the `trainingsList` operation. */
    let TrainingsListConstants;
    (function (TrainingsListConstants) {
        /** Filter based on on the training job state. */
        let State;
        (function (State) {
            State["QUEUED"] = "queued";
            State["PENDING"] = "pending";
            State["RUNNING"] = "running";
            State["STORING"] = "storing";
            State["COMPLETED"] = "completed";
            State["FAILED"] = "failed";
            State["CANCELED"] = "canceled";
        })(State = TrainingsListConstants.State || (TrainingsListConstants.State = {}));
    })(TrainingsListConstants = WatsonxAiMlVml_v1.TrainingsListConstants || (WatsonxAiMlVml_v1.TrainingsListConstants = {}));
    let ApiErrorTarget;
    (function (ApiErrorTarget) {
        let Constants;
        (function (Constants) {
            /** The type of the problematic field. */
            let Type;
            (function (Type) {
                Type["FIELD"] = "field";
                Type["PARAMETER"] = "parameter";
                Type["HEADER"] = "header";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = ApiErrorTarget.Constants || (ApiErrorTarget.Constants = {}));
    })(ApiErrorTarget = WatsonxAiMlVml_v1.ApiErrorTarget || (WatsonxAiMlVml_v1.ApiErrorTarget = {}));
    let DataConnectionReference;
    (function (DataConnectionReference) {
        let Constants;
        (function (Constants) {
            /** The data source type like `connection_asset` or `data_asset`. If the data connection contains just a schema then this field is not required. */
            let Type;
            (function (Type) {
                Type["CONNECTION_ASSET"] = "connection_asset";
                Type["DATA_ASSET"] = "data_asset";
                Type["CONTAINER"] = "container";
                Type["URL"] = "url";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = DataConnectionReference.Constants || (DataConnectionReference.Constants = {}));
    })(DataConnectionReference = WatsonxAiMlVml_v1.DataConnectionReference || (WatsonxAiMlVml_v1.DataConnectionReference = {}));
    let DeploymentEntity;
    (function (DeploymentEntity) {
        let Constants;
        (function (Constants) {
            /** The type of the deployed model. The possible values are the following: 1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used on a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation model is deployed. */
            let DeployedAssetType;
            (function (DeployedAssetType) {
                DeployedAssetType["PROMPT_TUNE"] = "prompt_tune";
                DeployedAssetType["FOUNDATION_MODEL"] = "foundation_model";
                DeployedAssetType["CUSTOM_FOUNDATION_MODEL"] = "custom_foundation_model";
            })(DeployedAssetType = Constants.DeployedAssetType || (Constants.DeployedAssetType = {}));
        })(Constants = DeploymentEntity.Constants || (DeploymentEntity.Constants = {}));
    })(DeploymentEntity = WatsonxAiMlVml_v1.DeploymentEntity || (WatsonxAiMlVml_v1.DeploymentEntity = {}));
    let DeploymentStatus;
    (function (DeploymentStatus) {
        let Constants;
        (function (Constants) {
            /** Specifies the current state of the deployment. */
            let State;
            (function (State) {
                State["INITIALIZING"] = "initializing";
                State["UPDATING"] = "updating";
                State["READY"] = "ready";
                State["FAILED"] = "failed";
            })(State = Constants.State || (Constants.State = {}));
        })(Constants = DeploymentStatus.Constants || (DeploymentStatus.Constants = {}));
    })(DeploymentStatus = WatsonxAiMlVml_v1.DeploymentStatus || (WatsonxAiMlVml_v1.DeploymentStatus = {}));
    let DeploymentTextGenProperties;
    (function (DeploymentTextGenProperties) {
        let Constants;
        (function (Constants) {
            /** Represents the strategy used for picking the tokens during generation of the output text. During text generation when parameter value is set to greedy, each successive token corresponds to the highest probability token given the text that has already been generated. This strategy can lead to repetitive results especially for longer output sequences. The alternative sample strategy generates text by picking subsequent tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k and top_p parameters described below. See this [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation. */
            let DecodingMethod;
            (function (DecodingMethod) {
                DecodingMethod["SAMPLE"] = "sample";
                DecodingMethod["GREEDY"] = "greedy";
            })(DecodingMethod = Constants.DecodingMethod || (Constants.DecodingMethod = {}));
        })(Constants = DeploymentTextGenProperties.Constants || (DeploymentTextGenProperties.Constants = {}));
    })(DeploymentTextGenProperties = WatsonxAiMlVml_v1.DeploymentTextGenProperties || (WatsonxAiMlVml_v1.DeploymentTextGenProperties = {}));
    let FoundationModel;
    (function (FoundationModel) {
        let Constants;
        (function (Constants) {
            /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the details. Note that input tokens and output tokens may be charged differently. */
            let InputTier;
            (function (InputTier) {
                InputTier["CLASS_1"] = "class_1";
                InputTier["CLASS_2"] = "class_2";
                InputTier["CLASS_3"] = "class_3";
                InputTier["CLASS_C1"] = "class_c1";
            })(InputTier = Constants.InputTier || (Constants.InputTier = {}));
            /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the details. Note that input tokens and output tokens may be charged differently. */
            let OutputTier;
            (function (OutputTier) {
                OutputTier["CLASS_1"] = "class_1";
                OutputTier["CLASS_2"] = "class_2";
                OutputTier["CLASS_3"] = "class_3";
                OutputTier["CLASS_C1"] = "class_c1";
            })(OutputTier = Constants.OutputTier || (Constants.OutputTier = {}));
        })(Constants = FoundationModel.Constants || (FoundationModel.Constants = {}));
    })(FoundationModel = WatsonxAiMlVml_v1.FoundationModel || (WatsonxAiMlVml_v1.FoundationModel = {}));
    let HardwareRequest;
    (function (HardwareRequest) {
        let Constants;
        (function (Constants) {
            /** The size of GPU requested for the deployment. */
            let Size;
            (function (Size) {
                Size["GPU_S"] = "gpu_s";
                Size["GPU_M"] = "gpu_m";
                Size["GPU_L"] = "gpu_l";
            })(Size = Constants.Size || (Constants.Size = {}));
        })(Constants = HardwareRequest.Constants || (HardwareRequest.Constants = {}));
    })(HardwareRequest = WatsonxAiMlVml_v1.HardwareRequest || (WatsonxAiMlVml_v1.HardwareRequest = {}));
    let JsonPatchOperation;
    (function (JsonPatchOperation) {
        let Constants;
        (function (Constants) {
            /** The operation to be performed. */
            let Op;
            (function (Op) {
                Op["ADD"] = "add";
                Op["REMOVE"] = "remove";
                Op["REPLACE"] = "replace";
                Op["MOVE"] = "move";
                Op["COPY"] = "copy";
                Op["TEST"] = "test";
            })(Op = Constants.Op || (Constants.Op = {}));
        })(Constants = JsonPatchOperation.Constants || (JsonPatchOperation.Constants = {}));
    })(JsonPatchOperation = WatsonxAiMlVml_v1.JsonPatchOperation || (WatsonxAiMlVml_v1.JsonPatchOperation = {}));
    let LifeCycleState;
    (function (LifeCycleState) {
        let Constants;
        (function (Constants) {
            /** The possible lifecycle stages, in order, are described below: - `available`: this means that the model is available for use. - `deprecated`: this means that the model is still available but the model will be removed soon, so an alternative model should be used. - `constricted`: this means that the model is still available for inferencing but cannot be used for training or in a deployment. The model will be removed soon so an alternative model should be used. - `withdrawn`: this means that the model is no longer available, check the `alternative_model_ids` to see what it can be replaced by. */
            let Id;
            (function (Id) {
                Id["AVAILABLE"] = "available";
                Id["DEPRECATED"] = "deprecated";
                Id["CONSTRICTED"] = "constricted";
                Id["WITHDRAWN"] = "withdrawn";
            })(Id = Constants.Id || (Constants.Id = {}));
        })(Constants = LifeCycleState.Constants || (LifeCycleState.Constants = {}));
    })(LifeCycleState = WatsonxAiMlVml_v1.LifeCycleState || (WatsonxAiMlVml_v1.LifeCycleState = {}));
    let ObjectLocation;
    (function (ObjectLocation) {
        let Constants;
        (function (Constants) {
            /** The data source type like `connection_asset` or `data_asset`. */
            let Type;
            (function (Type) {
                Type["CONNECTION_ASSET"] = "connection_asset";
                Type["DATA_ASSET"] = "data_asset";
                Type["CONTAINER"] = "container";
                Type["URL"] = "url";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = ObjectLocation.Constants || (ObjectLocation.Constants = {}));
    })(ObjectLocation = WatsonxAiMlVml_v1.ObjectLocation || (WatsonxAiMlVml_v1.ObjectLocation = {}));
    let PromptTuning;
    (function (PromptTuning) {
        let Constants;
        (function (Constants) {
            /** Type of Peft (Parameter-Efficient Fine-Tuning) config to build. */
            let TuningType;
            (function (TuningType) {
                TuningType["PROMPT_TUNING"] = "prompt_tuning";
            })(TuningType = Constants.TuningType || (Constants.TuningType = {}));
            /** The `text` method requires `init_text` to be set. */
            let InitMethod;
            (function (InitMethod) {
                InitMethod["RANDOM"] = "random";
                InitMethod["TEXT"] = "text";
            })(InitMethod = Constants.InitMethod || (Constants.InitMethod = {}));
        })(Constants = PromptTuning.Constants || (PromptTuning.Constants = {}));
    })(PromptTuning = WatsonxAiMlVml_v1.PromptTuning || (WatsonxAiMlVml_v1.PromptTuning = {}));
    let TextChatParameterTools;
    (function (TextChatParameterTools) {
        let Constants;
        (function (Constants) {
            /** The tool type. */
            let Type;
            (function (Type) {
                Type["FUNCTION"] = "function";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatParameterTools.Constants || (TextChatParameterTools.Constants = {}));
    })(TextChatParameterTools = WatsonxAiMlVml_v1.TextChatParameterTools || (WatsonxAiMlVml_v1.TextChatParameterTools = {}));
    let TextChatResponseFormat;
    (function (TextChatResponseFormat) {
        let Constants;
        (function (Constants) {
            /** Used to enable JSON mode, which guarantees the message the model generates is valid JSON. **Important:** when using JSON mode, you must also instruct the model to produce JSON yourself via a system or user message. Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit, resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off if `finish_reason="length"`, which indicates the generation exceeded `max_tokens` or the conversation exceeded the max context length. */
            let Type;
            (function (Type) {
                Type["JSON_OBJECT"] = "json_object";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatResponseFormat.Constants || (TextChatResponseFormat.Constants = {}));
    })(TextChatResponseFormat = WatsonxAiMlVml_v1.TextChatResponseFormat || (WatsonxAiMlVml_v1.TextChatResponseFormat = {}));
    let TextChatResultChoice;
    (function (TextChatResultChoice) {
        let Constants;
        (function (Constants) {
            /** The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point or a provided stop sequence. - `length` - The maximum number of tokens specified in the request was reached. - `tool_calls` - The model called a tool. - `time_limit`` - Time limit reached. - `cancelled`` - Request canceled by the client. - `error`` - Error encountered. - `null` - API response still in progress or incomplete. */
            let FinishReason;
            (function (FinishReason) {
                FinishReason["STOP"] = "stop";
                FinishReason["LENGTH"] = "length";
                FinishReason["TOOL_CALLS"] = "tool_calls";
                FinishReason["TIME_LIMIT"] = "time_limit";
                FinishReason["CANCELLED"] = "cancelled";
                FinishReason["ERROR"] = "error";
            })(FinishReason = Constants.FinishReason || (Constants.FinishReason = {}));
        })(Constants = TextChatResultChoice.Constants || (TextChatResultChoice.Constants = {}));
    })(TextChatResultChoice = WatsonxAiMlVml_v1.TextChatResultChoice || (WatsonxAiMlVml_v1.TextChatResultChoice = {}));
    let TextChatToolCall;
    (function (TextChatToolCall) {
        let Constants;
        (function (Constants) {
            /** The type of the tool. Currently, only `function` is supported. */
            let Type;
            (function (Type) {
                Type["FUNCTION"] = "function";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatToolCall.Constants || (TextChatToolCall.Constants = {}));
    })(TextChatToolCall = WatsonxAiMlVml_v1.TextChatToolCall || (WatsonxAiMlVml_v1.TextChatToolCall = {}));
    let TextChatToolChoiceTool;
    (function (TextChatToolChoiceTool) {
        let Constants;
        (function (Constants) {
            /** The tool type. */
            let Type;
            (function (Type) {
                Type["FUNCTION"] = "function";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatToolChoiceTool.Constants || (TextChatToolChoiceTool.Constants = {}));
    })(TextChatToolChoiceTool = WatsonxAiMlVml_v1.TextChatToolChoiceTool || (WatsonxAiMlVml_v1.TextChatToolChoiceTool = {}));
    let TextChatUserImageURL;
    (function (TextChatUserImageURL) {
        let Constants;
        (function (Constants) {
            /** This parameter controls how the model processes the image and generates its textual understanding. The `auto` setting which will look at the image input size and decide if it should use the `low` or `high` setting. */
            let Detail;
            (function (Detail) {
                Detail["LOW"] = "low";
                Detail["HIGH"] = "high";
                Detail["AUTO"] = "auto";
            })(Detail = Constants.Detail || (Constants.Detail = {}));
        })(Constants = TextChatUserImageURL.Constants || (TextChatUserImageURL.Constants = {}));
    })(TextChatUserImageURL = WatsonxAiMlVml_v1.TextChatUserImageURL || (WatsonxAiMlVml_v1.TextChatUserImageURL = {}));
    let TextGenParameters;
    (function (TextGenParameters) {
        let Constants;
        (function (Constants) {
            /** Represents the strategy used for picking the tokens during generation of the output text. During text generation when parameter value is set to greedy, each successive token corresponds to the highest probability token given the text that has already been generated. This strategy can lead to repetitive results especially for longer output sequences. The alternative sample strategy generates text by picking subsequent tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k and top_p parameters described below. See this [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation. */
            let DecodingMethod;
            (function (DecodingMethod) {
                DecodingMethod["SAMPLE"] = "sample";
                DecodingMethod["GREEDY"] = "greedy";
            })(DecodingMethod = Constants.DecodingMethod || (Constants.DecodingMethod = {}));
        })(Constants = TextGenParameters.Constants || (TextGenParameters.Constants = {}));
    })(TextGenParameters = WatsonxAiMlVml_v1.TextGenParameters || (WatsonxAiMlVml_v1.TextGenParameters = {}));
    let TextGenResponseFieldsResultsItem;
    (function (TextGenResponseFieldsResultsItem) {
        let Constants;
        (function (Constants) {
            /** The reason why the call stopped, can be one of: - not_finished - Possibly more tokens to be streamed. - max_tokens - Maximum requested tokens reached. - eos_token - End of sequence token encountered. - cancelled - Request canceled by the client. - time_limit - Time limit reached. - stop_sequence - Stop sequence encountered. - token_limit - Token limit reached. - error - Error encountered. Note that these values will be lower-cased so test for values case insensitive. */
            let StopReason;
            (function (StopReason) {
                StopReason["NOT_FINISHED"] = "not_finished";
                StopReason["MAX_TOKENS"] = "max_tokens";
                StopReason["EOS_TOKEN"] = "eos_token";
                StopReason["CANCELLED"] = "cancelled";
                StopReason["TIME_LIMIT"] = "time_limit";
                StopReason["STOP_SEQUENCE"] = "stop_sequence";
                StopReason["TOKEN_LIMIT"] = "token_limit";
                StopReason["ERROR"] = "error";
            })(StopReason = Constants.StopReason || (Constants.StopReason = {}));
        })(Constants = TextGenResponseFieldsResultsItem.Constants || (TextGenResponseFieldsResultsItem.Constants = {}));
    })(TextGenResponseFieldsResultsItem = WatsonxAiMlVml_v1.TextGenResponseFieldsResultsItem || (WatsonxAiMlVml_v1.TextGenResponseFieldsResultsItem = {}));
    let TrainingStatus;
    (function (TrainingStatus) {
        let Constants;
        (function (Constants) {
            /** Current state of training. */
            let State;
            (function (State) {
                State["QUEUED"] = "queued";
                State["PENDING"] = "pending";
                State["RUNNING"] = "running";
                State["STORING"] = "storing";
                State["COMPLETED"] = "completed";
                State["FAILED"] = "failed";
                State["CANCELED"] = "canceled";
            })(State = Constants.State || (Constants.State = {}));
        })(Constants = TrainingStatus.Constants || (TrainingStatus.Constants = {}));
    })(TrainingStatus = WatsonxAiMlVml_v1.TrainingStatus || (WatsonxAiMlVml_v1.TrainingStatus = {}));
    let ChatItem;
    (function (ChatItem) {
        let Constants;
        (function (Constants) {
            /** Type */
            let Type;
            (function (Type) {
                Type["QUESTION"] = "question";
                Type["ANSWER"] = "answer";
            })(Type = Constants.Type || (Constants.Type = {}));
            /** Status */
            let Status;
            (function (Status) {
                Status["READY"] = "ready";
                Status["ERROR"] = "error";
            })(Status = Constants.Status || (Constants.Status = {}));
        })(Constants = ChatItem.Constants || (ChatItem.Constants = {}));
    })(ChatItem = WatsonxAiMlVml_v1.ChatItem || (WatsonxAiMlVml_v1.ChatItem = {}));
    let PromptLock;
    (function (PromptLock) {
        let Constants;
        (function (Constants) {
            /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
            let LockType;
            (function (LockType) {
                LockType["EDIT"] = "edit";
                LockType["GOVERNANCE"] = "governance";
            })(LockType = Constants.LockType || (Constants.LockType = {}));
        })(Constants = PromptLock.Constants || (PromptLock.Constants = {}));
    })(PromptLock = WatsonxAiMlVml_v1.PromptLock || (WatsonxAiMlVml_v1.PromptLock = {}));
    let WxPromptResponse;
    (function (WxPromptResponse) {
        let Constants;
        (function (Constants) {
            /** Input mode in use for the prompt. */
            let InputMode;
            (function (InputMode) {
                InputMode["STRUCTURED"] = "structured";
                InputMode["FREEFORM"] = "freeform";
                InputMode["CHAT"] = "chat";
                InputMode["DETACHED"] = "detached";
            })(InputMode = Constants.InputMode || (Constants.InputMode = {}));
        })(Constants = WxPromptResponse.Constants || (WxPromptResponse.Constants = {}));
    })(WxPromptResponse = WatsonxAiMlVml_v1.WxPromptResponse || (WatsonxAiMlVml_v1.WxPromptResponse = {}));
    let WxPromptSessionEntry;
    (function (WxPromptSessionEntry) {
        let Constants;
        (function (Constants) {
            /** Input mode in use for the prompt. */
            let InputMode;
            (function (InputMode) {
                InputMode["STRUCTURED"] = "structured";
                InputMode["FREEFORM"] = "freeform";
                InputMode["CHAT"] = "chat";
            })(InputMode = Constants.InputMode || (Constants.InputMode = {}));
        })(Constants = WxPromptSessionEntry.Constants || (WxPromptSessionEntry.Constants = {}));
    })(WxPromptSessionEntry = WatsonxAiMlVml_v1.WxPromptSessionEntry || (WatsonxAiMlVml_v1.WxPromptSessionEntry = {}));
    let TextChatMessagesTextChatMessageAssistant;
    (function (TextChatMessagesTextChatMessageAssistant) {
        let Constants;
        (function (Constants) {
            /** The role of the messages author. */
            let Role;
            (function (Role) {
                Role["ASSISTANT"] = "assistant";
                Role["SYSTEM"] = "system";
                Role["TOOL"] = "tool";
                Role["USER"] = "system";
            })(Role = Constants.Role || (Constants.Role = {}));
        })(Constants = TextChatMessagesTextChatMessageAssistant.Constants || (TextChatMessagesTextChatMessageAssistant.Constants = {}));
    })(TextChatMessagesTextChatMessageAssistant = WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageAssistant || (WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageAssistant = {}));
    let TextChatMessagesTextChatMessageSystem;
    (function (TextChatMessagesTextChatMessageSystem) {
        let Constants;
        (function (Constants) {
            /** The role of the messages author. */
            let Role;
            (function (Role) {
                Role["ASSISTANT"] = "assistant";
                Role["SYSTEM"] = "system";
                Role["TOOL"] = "tool";
                Role["USER"] = "user";
            })(Role = Constants.Role || (Constants.Role = {}));
        })(Constants = TextChatMessagesTextChatMessageSystem.Constants || (TextChatMessagesTextChatMessageSystem.Constants = {}));
    })(TextChatMessagesTextChatMessageSystem = WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageSystem || (WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageSystem = {}));
    let TextChatMessagesTextChatMessageTool;
    (function (TextChatMessagesTextChatMessageTool) {
        let Constants;
        (function (Constants) {
            /** The role of the messages author. */
            let Role;
            (function (Role) {
                Role["ASSISTANT"] = "assistant";
                Role["SYSTEM"] = "system";
                Role["TOOL"] = "tool";
                Role["USER"] = "user";
            })(Role = Constants.Role || (Constants.Role = {}));
        })(Constants = TextChatMessagesTextChatMessageTool.Constants || (TextChatMessagesTextChatMessageTool.Constants = {}));
    })(TextChatMessagesTextChatMessageTool = WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageTool || (WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageTool = {}));
    let TextChatMessagesTextChatMessageUser;
    (function (TextChatMessagesTextChatMessageUser) {
        let Constants;
        (function (Constants) {
            /** The role of the messages author. */
            let Role;
            (function (Role) {
                Role["ASSISTANT"] = "assistant";
                Role["SYSTEM"] = "system";
                Role["TOOL"] = "tool";
                Role["USER"] = "user";
            })(Role = Constants.Role || (Constants.Role = {}));
        })(Constants = TextChatMessagesTextChatMessageUser.Constants || (TextChatMessagesTextChatMessageUser.Constants = {}));
    })(TextChatMessagesTextChatMessageUser = WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageUser || (WatsonxAiMlVml_v1.TextChatMessagesTextChatMessageUser = {}));
    let TextChatUserContentsTextChatUserImageURLContent;
    (function (TextChatUserContentsTextChatUserImageURLContent) {
        let Constants;
        (function (Constants) {
            /** The type of the user content. */
            let Type;
            (function (Type) {
                Type["TEXT"] = "text";
                Type["IMAGE_URL"] = "image_url";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatUserContentsTextChatUserImageURLContent.Constants || (TextChatUserContentsTextChatUserImageURLContent.Constants = {}));
    })(TextChatUserContentsTextChatUserImageURLContent = WatsonxAiMlVml_v1.TextChatUserContentsTextChatUserImageURLContent || (WatsonxAiMlVml_v1.TextChatUserContentsTextChatUserImageURLContent = {}));
    let TextChatUserContentsTextChatUserTextContent;
    (function (TextChatUserContentsTextChatUserTextContent) {
        let Constants;
        (function (Constants) {
            /** The type of the user content. */
            let Type;
            (function (Type) {
                Type["TEXT"] = "text";
                Type["IMAGE_URL"] = "image_url";
            })(Type = Constants.Type || (Constants.Type = {}));
        })(Constants = TextChatUserContentsTextChatUserTextContent.Constants || (TextChatUserContentsTextChatUserTextContent.Constants = {}));
    })(TextChatUserContentsTextChatUserTextContent = WatsonxAiMlVml_v1.TextChatUserContentsTextChatUserTextContent || (WatsonxAiMlVml_v1.TextChatUserContentsTextChatUserTextContent = {}));
    /*************************
     * pager classes
     ************************/
    /**
     * FoundationModelSpecsPager can be used to simplify the use of listFoundationModelSpecs().
     */
    class FoundationModelSpecsPager {
        /**
         * Construct a FoundationModelSpecsPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listFoundationModelSpecs()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelSpecs()
         * @constructor
         * @returns {FoundationModelSpecsPager}
         */
        constructor(client, params) {
            if (params && params.start) {
                throw new Error(`the params.start field should not be set`);
            }
            this._hasNext = true;
            this.pageContext = { next: undefined };
            this.client = client;
            this.params = JSON.parse(JSON.stringify(params || {}));
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext() {
            return this._hasNext;
        }
        /**
         * Returns the next page of results by invoking listFoundationModelSpecs().
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModel[]>}
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
                        next = (0, ibm_cloud_sdk_core_1.getQueryParam)(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this._hasNext = false;
                }
                return result.resources;
            });
        }
        /**
         * Returns all results by invoking listFoundationModelSpecs() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModel[]>}
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
    WatsonxAiMlVml_v1.FoundationModelSpecsPager = FoundationModelSpecsPager;
    /**
     * FoundationModelTasksPager can be used to simplify the use of listFoundationModelTasks().
     */
    class FoundationModelTasksPager {
        /**
         * Construct a FoundationModelTasksPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listFoundationModelTasks()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelTasks()
         * @constructor
         * @returns {FoundationModelTasksPager}
         */
        constructor(client, params) {
            if (params && params.start) {
                throw new Error(`the params.start field should not be set`);
            }
            this._hasNext = true;
            this.pageContext = { next: undefined };
            this.client = client;
            this.params = JSON.parse(JSON.stringify(params || {}));
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext() {
            return this._hasNext;
        }
        /**
         * Returns the next page of results by invoking listFoundationModelTasks().
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>}
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
                        next = (0, ibm_cloud_sdk_core_1.getQueryParam)(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this._hasNext = false;
                }
                return result.resources;
            });
        }
        /**
         * Returns all results by invoking listFoundationModelTasks() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>}
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
    WatsonxAiMlVml_v1.FoundationModelTasksPager = FoundationModelTasksPager;
    /**
     * TrainingsListPager can be used to simplify the use of listTrainings().
     */
    class TrainingsListPager {
        /**
         * Construct a TrainingsListPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listTrainings()
         * @param {Object} [params] - The parameters to be passed to listTrainings()
         * @constructor
         * @returns {TrainingsListPager}
         */
        constructor(client, params) {
            if (params && params.start) {
                throw new Error(`the params.start field should not be set`);
            }
            this._hasNext = true;
            this.pageContext = { next: undefined };
            this.client = client;
            this.params = JSON.parse(JSON.stringify(params || {}));
        }
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext() {
            return this._hasNext;
        }
        /**
         * Returns the next page of results by invoking listTrainings().
         * @returns {Promise<WatsonxAiMlVml_v1.TrainingResource[]>}
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
                        next = (0, ibm_cloud_sdk_core_1.getQueryParam)(result.next.href, 'start');
                    }
                }
                this.pageContext.next = next;
                if (!this.pageContext.next) {
                    this._hasNext = false;
                }
                return result.resources;
            });
        }
        /**
         * Returns all results by invoking listTrainings() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.TrainingResource[]>}
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
    WatsonxAiMlVml_v1.TrainingsListPager = TrainingsListPager;
})(WatsonxAiMlVml_v1 || (WatsonxAiMlVml_v1 = {}));
module.exports = WatsonxAiMlVml_v1;
//# sourceMappingURL=vml_v1.js.map