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
/// <reference types="node" />
/**
 * IBM OpenAPI SDK Code Generator Version: 3.90.0-5aad763d-20240506-203857
 */
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { BaseService, UserOptions } from 'ibm-cloud-sdk-core';
import { ObjectStreamed, Stream } from '../lib/common';
declare class WatsonxAiMlVml_v1 extends BaseService {
    /** @hidden */
    static DEFAULT_SERVICE_URL: string;
    /** @hidden */
    static DEFAULT_SERVICE_NAME: string;
    /** @hidden */
    static PARAMETERIZED_SERVICE_URL: string;
    /** @hidden */
    private static defaultUrlVariables;
    static wxServiceUrl: string;
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
    static constructServiceUrl(providedUrlVariables: Map<string, string> | null): string;
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
    static newInstance(options: UserOptions): WatsonxAiMlVml_v1;
    /** The version date for the API of the form `YYYY-MM-DD`. */
    version: string;
    wxServiceUrl: string;
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
    constructor(options: UserOptions);
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
    createDeployment(params: WatsonxAiMlVml_v1.CreateDeploymentParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>;
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
    listDeployments(params?: WatsonxAiMlVml_v1.ListDeploymentsParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResourceCollection>>;
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
    getDeployment(params: WatsonxAiMlVml_v1.DeploymentsGetParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>;
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
    updateDeployment(params: WatsonxAiMlVml_v1.DeploymentsUpdateParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.DeploymentResource>>;
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
    deleteDeployment(params: WatsonxAiMlVml_v1.DeploymentsDeleteParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    deploymentGenerateText(params: WatsonxAiMlVml_v1.DeploymentsTextGenerationParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextGenResponse>>;
    /**
     * Infer text event stream.
     *
     * Infer the next tokens for a given deployed model with a set of parameters. This operation will return the output
     * tokens as a stream of events. If a `serving_name` is used then it must match the `serving_name` that is returned in
     * the `inference` when the deployment was created.
     *
     * ### Return options
     *
     * Note that there is currently a limitation in this operation when using `return_options`, for input only
     * `input_text` will be returned if requested, for output the `input_tokens` and `generated_tokens` will not be
     * returned, also the
     * `rank` and `top_tokens` will not be returned.
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
     * ### Response
     * Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> represents a source of streaming data. If request performed successfully Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> returns
     * either stream line by line. Output will stream as follow:
     * - id: 1
     * - event: message
     * - data: {data}
     * - empty line which separates the next Event Message
     *
     * or stream of objects. Output will stream as follow:
     * {
     *  id: 2,
     *  event: 'message',
     *  data: {data}
     * }
     * Here is one of the possibilities to read streaming output:
     *
     * const stream = await watsonxAiMlService.generateTextStream(parameters);
     * for await (const line of stream) {
     *   console.log(line);
     * }
     *
     * This field is ignored if there is a prompt template.
     * @param {DeploymentTextGenProperties} [params.parameters] - The template properties if this request refers to a
     * prompt template.
     * @param {Moderations} [params.moderations] - Properties that control the moderations, for usages such as `Hate and
     * profanity` (HAP) and `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     * @param {OutgoingHttpHeaders} [params.headers] - Custom request headers
     * @param {boolean} [params.returnObject] - Flag that indicates return type. Set 'true' to return objects.
     * @returns {Promise<Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextChatResponse[]>>>} return - Promise resolving to Stream object. Stream object is AsyncIterable based class. Stream object contains an additional property holding an AbortController, read more below.
     * @returns {AbortController} return.controller - Abort controller. Allows user to abort when reading from stream without transition to Readable
     *
     * @category Deployments
     */
    deploymentGenerateTextStream(params: WatsonxAiMlVml_v1.DeploymentsTextGenerationStreamParams & {
        returnObject?: false;
    }): Promise<Stream<string>>;
    deploymentGenerateTextStream(params: WatsonxAiMlVml_v1.DeploymentsTextGenerationStreamParams & {
        returnObject: true;
    }): Promise<Stream<ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>>>;
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
    listFoundationModelSpecs(params?: WatsonxAiMlVml_v1.ListFoundationModelSpecsParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.FoundationModels>>;
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
    listFoundationModelTasks(params?: WatsonxAiMlVml_v1.ListFoundationModelTasksParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.FoundationModelTasks>>;
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
    createPrompt(params: WatsonxAiMlVml_v1.PostPromptParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>;
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
    getPrompt(params: WatsonxAiMlVml_v1.GetPromptParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>;
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
    updatePrompt(params: WatsonxAiMlVml_v1.PatchPromptParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>;
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
    deletePrompt(params: WatsonxAiMlVml_v1.DeletePromptParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    updatePromptLock(params: WatsonxAiMlVml_v1.PutPromptLockParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>;
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
    getPromptLock(params: WatsonxAiMlVml_v1.GetPromptLockParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>;
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
    getPromptInput(params: WatsonxAiMlVml_v1.GetPromptInputParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.GetPromptInputResponse>>;
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
    createPromptChatItem(params: WatsonxAiMlVml_v1.PostPromptChatItemParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    createPromptSession(params: WatsonxAiMlVml_v1.PostPromptSessionParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>;
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
    getPromptSession(params: WatsonxAiMlVml_v1.GetPromptSessionParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSession>>;
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
    updatePromptSession(params: WatsonxAiMlVml_v1.PatchPromptSessionParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSession>>;
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
    deletePromptSession(params: WatsonxAiMlVml_v1.DeletePromptSessionParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    createPromptSessionEntry(params: WatsonxAiMlVml_v1.PostPromptSessionEntryParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSessionEntry>>;
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
    listPromptSessionEntries(params: WatsonxAiMlVml_v1.GetPromptSessionEntriesParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptSessionEntryList>>;
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
    createPromptSessionEntryChatItem(params: WatsonxAiMlVml_v1.PostPromptSessionEntryChatItemParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    updatePromptSessionLock(params: WatsonxAiMlVml_v1.PutPromptSessionLockParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>;
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
    getPromptSessionLock(params: WatsonxAiMlVml_v1.GetPromptSessionLockParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.PromptLock>>;
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
    getPromptSessionEntry(params: WatsonxAiMlVml_v1.GetPromptSessionEntryParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.WxPromptResponse>>;
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
    deletePromptSessionEntry(params: WatsonxAiMlVml_v1.DeletePromptSessionEntryParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    textChat(params: WatsonxAiMlVml_v1.TextChatParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextChatResponse>>;
    /**
     * Infer text event stream.
     *
     * Infer the next tokens for a given deployed model with a set of parameters. This operation will return the output
     * tokens as a stream of events
     *
     * ### Response
     * Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> represents a source of streaming data. If request performed successfully Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> returns
     * either stream line by line. Output will stream as follow:
     * - id: 1
     * - event: message
     * - data: {data}
     * - empty line which separates the next Event Message
     *
     * or stream of objects. Output will stream as follow:
     * {
     *  id: 2,
     *  event: 'message',
     *  data: {data}
     * }
     * Here is one of the possibilities to read streaming output:
     *
     * const stream = await watsonxAiMlService.generateTextStream(parameters);
     * for await (const line of stream) {
     *   console.log(line);
     * }.
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
     * @param {boolean} [params.returnObject] - Flag that indicates return type. Set 'true' to return objects.
     * @returns {Promise<Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextChatResponse[]>>>} return - Promise resolving to Stream object. Stream object is AsyncIterable based class. Stream object contains an additional property holding an AbortController, read more below.
     * @returns {AbortController} return.controller - Abort controller. Allows user to abort when reading from stream without transition to Readable
     *
     * @category Text Chat
     */
    textChatStream(params: WatsonxAiMlVml_v1.TextChatStreamParams & {
        returnObject?: false;
    }): Promise<Stream<string>>;
    textChatStream(params: WatsonxAiMlVml_v1.TextChatStreamParams & {
        returnObject: true;
    }): Promise<Stream<ObjectStreamed<WatsonxAiMlVml_v1.TextChatResponse[]>>>;
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
    embedText(params: WatsonxAiMlVml_v1.TextEmbeddingsParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmbeddingsResponse>>;
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
    generateText(params: WatsonxAiMlVml_v1.TextGenerationParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextGenResponse>>;
    /**
     * Infer text event stream.
     *
     * Infer the next tokens for a given deployed model with a set of parameters. This operation will return the output
     * tokens as a stream of events.
     *
     * ### Response
     * Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> represents a source of streaming data. If request performed successfully Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>> returns
     * either stream line by line. Output will stream as follow:
     * - id: 1
     * - event: message
     * - data: {data}
     * - empty line which separates the next Event Message
     *
     * or stream of objects. Output will stream as follow:
     * {
     *  id: ,
     *  event: 'message',
     *  data: {data}
     * }
     *
     * Here is one of the possibilities to read streaming output:
     *
     * const stream = await watsonxAiMlService.generateTextStream(parameters);
     * for await (const line of stream) {
     *   console.log(line);
     * }
     *
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
     * @param {boolean} [params.returnObject] - Flag that indicates return type. Set 'true' to return objects.
     * @returns {Promise<Stream<string | ObjectStreamed<WatsonxAiMlVml_v1.TextChatResponse[]>>>} return - Promise resolving to Stream object. Stream object is AsyncIterable based class. Stream object contains an additional property holding an AbortController, read more below.
     * @returns {AbortController} return.controller - Abort controller. Allows user to abort when reading from stream without transition to Readable
     *
     * @category Text Generation
     */
    generateTextStream(params: WatsonxAiMlVml_v1.TextGenerationStreamParams & {
        returnObject?: false;
    }): Promise<Stream<string>>;
    generateTextStream(params: WatsonxAiMlVml_v1.TextGenerationStreamParams & {
        returnObject: true;
    }): Promise<Stream<ObjectStreamed<WatsonxAiMlVml_v1.TextGenResponse>>>;
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
    tokenizeText(params: WatsonxAiMlVml_v1.TextTokenizationParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TextTokenizeResponse>>;
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
    createTraining(params: WatsonxAiMlVml_v1.TrainingsCreateParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResource>>;
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
    listTrainings(params?: WatsonxAiMlVml_v1.TrainingsListParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResourceCollection>>;
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
    getTraining(params: WatsonxAiMlVml_v1.TrainingsGetParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.TrainingResource>>;
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
    deleteTraining(params: WatsonxAiMlVml_v1.TrainingsDeleteParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.EmptyObject>>;
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
    textRerank(params: WatsonxAiMlVml_v1.TextRerankParams): Promise<WatsonxAiMlVml_v1.Response<WatsonxAiMlVml_v1.RerankResponse>>;
}
/*************************
 * interfaces
 ************************/
declare namespace WatsonxAiMlVml_v1 {
    /** Options for the `WatsonxAiMlVml_v1` constructor. */
    interface Options extends UserOptions {
        /** The version date for the API of the form `YYYY-MM-DD`. */
        version: string;
    }
    /** An operation response. */
    interface Response<T = any> {
        result: T;
        status: number;
        statusText: string;
        headers: IncomingHttpHeaders;
    }
    /** The callback for a service request. */
    type Callback<T> = (error: any, response?: Response<T>) => void;
    /** The body of a service request that returns no response data. */
    interface EmptyObject {
    }
    /** A standard JS object, defined to avoid the limitations of `Object` and `object` */
    interface JsonObject {
        [key: string]: any;
    }
    /*************************
     * request interfaces
     ************************/
    /** Parameters for the `createDeployment` operation. */
    interface CreateDeploymentParams {
        /** The name of the resource. */
        name: string;
        /** Indicates that this is an online deployment. An object has to be specified but can be empty.
         *  The `serving_name` can be provided in the `online.parameters`.
         */
        online: OnlineDeployment;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** A description of the resource. */
        description?: string;
        /** A list of tags for this resource. */
        tags?: string[];
        /** User defined properties specified as key-value pairs. */
        custom?: JsonObject;
        /** A reference to a resource. */
        promptTemplate?: SimpleRel;
        /** A hardware specification. */
        hardwareSpec?: HardwareSpec;
        /** The requested hardware for deployment. */
        hardwareRequest?: HardwareRequest;
        /** A reference to a resource. */
        asset?: Rel;
        /** The base model that is required for this deployment if this is for a prompt template or a prompt tune for an
         *  IBM foundation model.
         */
        baseModelId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `listDeployments` operation. */
    interface ListDeploymentsParams {
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        /** Retrieves the deployment, if any, that contains this `serving_name`. */
        servingName?: string;
        /** Retrieves only the resources with the given tag value. */
        tagValue?: string;
        /** Retrieves only the resources with the given asset_id, asset_id would be the model id. */
        assetId?: string;
        /** Retrieves only the resources with the given prompt_template_id. */
        promptTemplateId?: string;
        /** Retrieves only the resources with the given name. */
        name?: string;
        /** Retrieves the resources filtered with the given type. There are the deployment types as well as an
         *  additional
         *  `prompt_template` if the deployment type includes a prompt template.
         *
         *  The supported deployment types are (see the description for `deployed_asset_type` in the deployment entity):
         *
         *  1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used
         *  on a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation model is deployed.
         *
         *  These can be combined with the flag `prompt_template` like this:
         *
         *  1. `type=prompt_tune` - return all prompt tuned model deployments. 2. `type=prompt_tune and prompt_template` -
         *  return all prompt tuned model deployments with a prompt template. 3. `type=foundation_model` - return all prompt
         *  template deployments. 4. `type=foundation_model and prompt_template` - return all prompt template deployments -
         *  this is the same as the previous query because a `foundation_model` can only exist with a prompt template. 5.
         *  `type=prompt_template` - return all deployments with a prompt template.
         */
        type?: string;
        /** Retrieves the resources filtered by state. Allowed values are `initializing`, `updating`, `ready` and
         *  `failed`.
         */
        state?: string;
        /** Returns whether `serving_name` is available for use or not. This query parameter cannot be combined with any
         *  other parameter except for `serving_name`.
         */
        conflict?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deploymentsGet` operation. */
    interface DeploymentsGetParams {
        /** The deployment id. */
        deploymentId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deploymentsUpdate` operation. */
    interface DeploymentsUpdateParams {
        /** The deployment id. */
        deploymentId: string;
        /** The json patch. */
        jsonPatch: JsonPatchOperation[];
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deploymentsDelete` operation. */
    interface DeploymentsDeleteParams {
        /** The deployment id. */
        deploymentId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deploymentsTextGeneration` operation. */
    interface DeploymentsTextGenerationParams {
        /** The `id_or_name` can be either the `deployment_id` that identifies the deployment or a `serving_name` that
         *  allows a predefined URL to be used to post a prediction.
         *
         *  The `project` or `space` for the deployment must have a WML instance that will be used for limits and billing
         *  (if a paid plan).
         */
        idOrName: string;
        /** The prompt to generate completions. Note: The method tokenizes the input internally. It is recommended not
         *  to leave any trailing spaces.
         *
         *
         *  This field is ignored if there is a prompt template.
         */
        input?: string;
        /** The template properties if this request refers to a prompt template. */
        parameters?: DeploymentTextGenProperties;
        /** Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and `Personal
         *  identifiable information` (PII) filtering. This list can be extended with new types of moderations.
         */
        moderations?: Moderations;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deploymentsTextGenerationStream` operation. */
    interface DeploymentsTextGenerationStreamParams {
        /** The `id_or_name` can be either the `deployment_id` that identifies the deployment or a `serving_name` that
         *  allows a predefined URL to be used to post a prediction.
         *
         *  The `project` or `space` for the deployment must have a WML instance that will be used for limits and billing
         *  (if a paid plan).
         */
        idOrName: string;
        /** The prompt to generate completions. Note: The method tokenizes the input internally. It is recommended not
         *  to leave any trailing spaces.
         *
         *
         *  This field is ignored if there is a prompt template.
         */
        input?: string;
        /** The template properties if this request refers to a prompt template. */
        parameters?: DeploymentTextGenProperties;
        /** Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and `Personal
         *  identifiable information` (PII) filtering. This list can be extended with new types of moderations.
         */
        moderations?: Moderations;
        headers?: OutgoingHttpHeaders;
        returnObject?: boolean;
    }
    /** Parameters for the `listFoundationModelSpecs` operation. */
    interface ListFoundationModelSpecsParams {
        /** Token required for token-based pagination. This token cannot be determined by end user. It is generated by
         *  the service and it is set in the href available in the `next` field.
         */
        start?: string;
        /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
        limit?: number;
        /** A set of filters to specify the list of models, filters are described as the `pattern` shown below.
         *  ```text
         *   pattern: tfilter[,tfilter][:(or|and)]
         *   tfilter: filter | !filter
         *     filter: Requires existence of the filter.
         *     !filter: Requires absence of the filter.
         *   filter: one of
         *     modelid_*:     Filters by model id.
         *                    Namely, select a model with a specific model id.
         *     provider_*:    Filters by provider.
         *                    Namely, select all models with a specific provider.
         *     source_*:      Filters by source.
         *                    Namely, select all models with a specific source.
         *     input_tier_*:  Filters by input tier.
         *                    Namely, select all models with a specific input tier.
         *     output_tier_*: Filters by output tier.
         *                    Namely, select all models with a specific output tier.
         *     tier_*:        Filters by tier.
         *                    Namely, select all models with a specific input or output tier.
         *     task_*:        Filters by task id.
         *                    Namely, select all models that support a specific task id.
         *     lifecycle_*:   Filters by lifecycle state.
         *                    Namely, select all models that are currently in the specified lifecycle state.
         *     function_*:    Filters by function.
         *                    Namely, select all models that support a specific function.
         *  ```.
         */
        filters?: string;
        /** See all the `Tech Preview` models if entitled. */
        techPreview?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `listFoundationModelTasks` operation. */
    interface ListFoundationModelTasksParams {
        /** Token required for token-based pagination. This token cannot be determined by end user. It is generated by
         *  the service and it is set in the href available in the `next` field.
         */
        start?: string;
        /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
        limit?: number;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `postPrompt` operation. */
    interface PostPromptParams {
        /** Name used to display the prompt. */
        name: string;
        prompt: PromptWithExternal;
        /** An optional description for the prompt. */
        description?: string;
        /** Time the prompt was created. */
        createdAt?: number;
        taskIds?: string[];
        lock?: PromptLock;
        modelVersion?: WxPromptPostModelVersion;
        promptVariables?: JsonObject;
        /** Input mode in use for the prompt. */
        inputMode?: PostPromptConstants.InputMode | string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `postPrompt` operation. */
    namespace PostPromptConstants {
        /** Input mode in use for the prompt. */
        enum InputMode {
            STRUCTURED = "structured",
            FREEFORM = "freeform",
            CHAT = "chat",
            DETACHED = "detached"
        }
    }
    /** Parameters for the `getPrompt` operation. */
    interface GetPromptParams {
        /** Prompt ID. */
        promptId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        /** Only return a set of model parameters compatiable with inferencing. */
        restrictModelParameters?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `patchPrompt` operation. */
    interface PatchPromptParams {
        /** Prompt ID. */
        promptId: string;
        /** Name used to display the prompt. */
        name: string;
        prompt: Prompt;
        /** The prompt's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** An optional description for the prompt. */
        description?: string;
        taskIds?: string[];
        governanceTracked?: boolean;
        modelVersion?: WxPromptPatchModelVersion;
        promptVariables?: JsonObject;
        /** Input mode in use for the prompt. */
        inputMode?: PatchPromptConstants.InputMode | string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `patchPrompt` operation. */
    namespace PatchPromptConstants {
        /** Input mode in use for the prompt. */
        enum InputMode {
            STRUCTURED = "structured",
            FREEFORM = "freeform"
        }
    }
    /** Parameters for the `deletePrompt` operation. */
    interface DeletePromptParams {
        /** Prompt ID. */
        promptId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `putPromptLock` operation. */
    interface PutPromptLockParams {
        /** Prompt ID. */
        promptId: string;
        /** True if the prompt is currently locked. */
        locked: boolean;
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock
         *  requests.
         */
        lockType?: PutPromptLockConstants.LockType | string;
        /** Locked by is computed by the server and shouldn't be passed. */
        lockedBy?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        /** Override a lock if it is currently taken. */
        force?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `putPromptLock` operation. */
    namespace PutPromptLockConstants {
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
        enum LockType {
            EDIT = "edit",
            GOVERNANCE = "governance"
        }
    }
    /** Parameters for the `getPromptLock` operation. */
    interface GetPromptLockParams {
        /** Prompt ID. */
        promptId: string;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `getPromptInput` operation. */
    interface GetPromptInputParams {
        /** Prompt ID. */
        promptId: string;
        /** Override input string that will be used to generate the response. The string can contain template
         *  parameters.
         */
        input?: string;
        /** Supply only to replace placeholders. Object content must be key:value pairs where the 'key' is the parameter
         *  to replace and 'value' is the value to use.
         */
        promptVariables?: JsonObject;
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `postPromptChatItem` operation. */
    interface PostPromptChatItemParams {
        /** Prompt ID. */
        promptId: string;
        chatItem: ChatItem[];
        /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
        spaceId?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `postPromptSession` operation. */
    interface PostPromptSessionParams {
        /** Name used to display the prompt session. */
        name: string;
        /** The prompt session's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** An optional description for the prompt session. */
        description?: string;
        /** Time the session was created. */
        createdAt?: number;
        /** The ID of the original session creator. */
        createdBy?: string;
        /** Time the session was updated. */
        lastUpdatedAt?: number;
        /** The ID of the last user that modifed the session. */
        lastUpdatedBy?: string;
        lock?: PromptLock;
        prompts?: WxPromptSessionEntry[];
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `getPromptSession` operation. */
    interface GetPromptSessionParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** Include the most recent entry. */
        prefetch?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `patchPromptSession` operation. */
    interface PatchPromptSessionParams {
        /** Prompt Session ID. */
        sessionId: string;
        name?: string;
        /** An optional description for the prompt. */
        description?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deletePromptSession` operation. */
    interface DeletePromptSessionParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `postPromptSessionEntry` operation. */
    interface PostPromptSessionEntryParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** Name used to display the prompt. */
        name: string;
        /** Time the prompt was created. */
        createdAt: number;
        prompt: Prompt;
        /** The prompt's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** An optional description for the prompt. */
        description?: string;
        promptVariables?: JsonObject;
        isTemplate?: boolean;
        /** Input mode in use for the prompt. */
        inputMode?: PostPromptSessionEntryConstants.InputMode | string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `postPromptSessionEntry` operation. */
    namespace PostPromptSessionEntryConstants {
        /** Input mode in use for the prompt. */
        enum InputMode {
            STRUCTURED = "structured",
            FREEFORM = "freeform",
            CHAT = "chat"
        }
    }
    /** Parameters for the `getPromptSessionEntries` operation. */
    interface GetPromptSessionEntriesParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** Bookmark from a previously limited get request. */
        bookmark?: string;
        /** Limit for results to retrieve, default 20. */
        limit?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `postPromptSessionEntryChatItem` operation. */
    interface PostPromptSessionEntryChatItemParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** Prompt Session Entry ID. */
        entryId: string;
        chatItem: ChatItem[];
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `putPromptSessionLock` operation. */
    interface PutPromptSessionLockParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** True if the prompt is currently locked. */
        locked: boolean;
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock
         *  requests.
         */
        lockType?: PutPromptSessionLockConstants.LockType | string;
        /** Locked by is computed by the server and shouldn't be passed. */
        lockedBy?: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        /** Override a lock if it is currently taken. */
        force?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `putPromptSessionLock` operation. */
    namespace PutPromptSessionLockConstants {
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
        enum LockType {
            EDIT = "edit",
            GOVERNANCE = "governance"
        }
    }
    /** Parameters for the `getPromptSessionLock` operation. */
    interface GetPromptSessionLockParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `getPromptSessionEntry` operation. */
    interface GetPromptSessionEntryParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** Prompt Session Entry ID. */
        entryId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `deletePromptSessionEntry` operation. */
    interface DeletePromptSessionEntryParams {
        /** Prompt Session ID. */
        sessionId: string;
        /** Prompt Session Entry ID. */
        entryId: string;
        /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `textChat` operation. */
    interface TextChatParams {
        /** The model to use for the chat completion.
         *
         *  Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        modelId: string;
        /** The messages for this chat session. */
        messages: TextChatMessages[];
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** Tool functions that can be called with the response. */
        tools?: TextChatParameterTools[];
        /** Using `none` means the model will not call any tool and instead generates a message.
         *
         *  **The following options (`auto` and `required`) are not yet supported.**
         *
         *  Using `auto` means the model can pick between generating a message or calling one or more tools. Using
         *  `required` means the model must call one or more tools.
         *
         *  Only one of `tool_choice_option` or `tool_choice` must be present.
         */
        toolChoiceOption?: TextChatConstants.ToolChoiceOption | string;
        /** Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the
         *  model to call that tool.
         *
         *  Only one of `tool_choice_option` or `tool_choice` must be present.
         */
        toolChoice?: TextChatToolChoiceTool;
        /** Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the
         *  model's likelihood to repeat the same line verbatim.
         */
        frequencyPenalty?: number;
        /** Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of
         *  each output token returned in the content of message.
         */
        logprobs?: boolean;
        /** An integer specifying the number of most likely tokens to return at each token position, each with an
         *  associated log probability. The option `logprobs` must be set to `true` if this parameter is used.
         */
        topLogprobs?: number;
        /** The maximum number of tokens that can be generated in the chat completion. The total length of input tokens
         *  and generated tokens is limited by the model's context length.
         */
        maxTokens?: number;
        /** How many chat completion choices to generate for each input message. Note that you will be charged based on
         *  the number of generated tokens across all of the choices. Keep n as 1 to minimize costs.
         */
        n?: number;
        /** Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's
         *  likelihood to talk about new topics.
         */
        presencePenalty?: number;
        /** The chat response format parameters. */
        responseFormat?: TextChatResponseFormat;
        /** What sampling temperature to use,. Higher values like 0.8 will make the output more random, while lower
         *  values like 0.2 will make it more focused and deterministic.
         *
         *  We generally recommend altering this or `top_p` but not both.
         */
        temperature?: number;
        /** An alternative to sampling with temperature, called nucleus sampling, where the model considers the results
         *  of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass
         *  are considered.
         *
         *  We generally recommend altering this or `temperature` but not both.
         */
        topP?: number;
        /** Time limit in milliseconds - if not completed within this time, generation will stop. The text generated so
         *  far will be returned along with the `TIME_LIMIT`` stop reason. Depending on the users plan, and on the model
         *  being used, there may be an enforced maximum time limit.
         */
        timeLimit?: number;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `textChat` operation. */
    namespace TextChatConstants {
        /** Using `none` means the model will not call any tool and instead generates a message. **The following options (`auto` and `required`) are not yet supported.** Using `auto` means the model can pick between generating a message or calling one or more tools. Using `required` means the model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be present. */
        enum ToolChoiceOption {
            NONE = "none",
            AUTO = "auto",
            REQUIRED = "required"
        }
    }
    /** Parameters for the `textChatStream` operation. */
    interface TextChatStreamParams {
        /** The model to use for the chat completion.
         *
         *  Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        modelId: string;
        /** The messages for this chat session. */
        messages: TextChatMessages[];
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** Tool functions that can be called with the response. */
        tools?: TextChatParameterTools[];
        /** Using `none` means the model will not call any tool and instead generates a message.
         *
         *  **The following options (`auto` and `required`) are not yet supported.**
         *
         *  Using `auto` means the model can pick between generating a message or calling one or more tools. Using
         *  `required` means the model must call one or more tools.
         *
         *  Only one of `tool_choice_option` or `tool_choice` must be present.
         */
        toolChoiceOption?: TextChatStreamConstants.ToolChoiceOption | string;
        /** Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the
         *  model to call that tool.
         *
         *  Only one of `tool_choice_option` or `tool_choice` must be present.
         */
        toolChoice?: TextChatToolChoiceTool;
        /** Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the
         *  model's likelihood to repeat the same line verbatim.
         */
        frequencyPenalty?: number;
        /** Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of
         *  each output token returned in the content of message.
         */
        logprobs?: boolean;
        /** An integer specifying the number of most likely tokens to return at each token position, each with an
         *  associated log probability. The option `logprobs` must be set to `true` if this parameter is used.
         */
        topLogprobs?: number;
        /** The maximum number of tokens that can be generated in the chat completion. The total length of input tokens
         *  and generated tokens is limited by the model's context length.
         */
        maxTokens?: number;
        /** How many chat completion choices to generate for each input message. Note that you will be charged based on
         *  the number of generated tokens across all of the choices. Keep n as 1 to minimize costs.
         */
        n?: number;
        /** Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's
         *  likelihood to talk about new topics.
         */
        presencePenalty?: number;
        /** The chat response format parameters. */
        responseFormat?: TextChatResponseFormat;
        /** What sampling temperature to use,. Higher values like 0.8 will make the output more random, while lower
         *  values like 0.2 will make it more focused and deterministic.
         *
         *  We generally recommend altering this or `top_p` but not both.
         */
        temperature?: number;
        /** An alternative to sampling with temperature, called nucleus sampling, where the model considers the results
         *  of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass
         *  are considered.
         *
         *  We generally recommend altering this or `temperature` but not both.
         */
        topP?: number;
        /** Time limit in milliseconds - if not completed within this time, generation will stop. The text generated so
         *  far will be returned along with the `TIME_LIMIT`` stop reason. Depending on the users plan, and on the model
         *  being used, there may be an enforced maximum time limit.
         */
        timeLimit?: number;
        headers?: OutgoingHttpHeaders;
        returnObject?: boolean;
    }
    /** Constants for the `textChatStream` operation. */
    namespace TextChatStreamConstants {
        /** Using `none` means the model will not call any tool and instead generates a message. **The following options (`auto` and `required`) are not yet supported.** Using `auto` means the model can pick between generating a message or calling one or more tools. Using `required` means the model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be present. */
        enum ToolChoiceOption {
            NONE = "none",
            AUTO = "auto",
            REQUIRED = "required"
        }
    }
    /** Parameters for the `textEmbeddings` operation. */
    interface TextEmbeddingsParams {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
         */
        modelId: string;
        /** The input text. */
        inputs: string[];
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** Parameters for text embedding requests. */
        parameters?: EmbeddingParameters;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `textGeneration` operation. */
    interface TextGenerationParams {
        /** The prompt to generate completions. Note: The method tokenizes the input internally. It is recommended not
         *  to leave any trailing spaces.
         */
        input: string;
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        modelId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** Properties that control the model and response. */
        parameters?: TextGenParameters;
        /** Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and `Personal
         *  identifiable information` (PII) filtering. This list can be extended with new types of moderations.
         */
        moderations?: Moderations;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `textGenerationStream` operation. */
    interface TextGenerationStreamParams {
        /** The prompt to generate completions. Note: The method tokenizes the input internally. It is recommended not
         *  to leave any trailing spaces.
         */
        input: string;
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        modelId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** Properties that control the model and response. */
        parameters?: TextGenParameters;
        /** Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and `Personal
         *  identifiable information` (PII) filtering. This list can be extended with new types of moderations.
         */
        moderations?: Moderations;
        headers?: OutgoingHttpHeaders;
        returnObject?: boolean;
    }
    /** Parameters for the `textTokenization` operation. */
    interface TextTokenizationParams {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        modelId: string;
        /** The input string to tokenize. */
        input: string;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** The parameters for text tokenization. */
        parameters?: TextTokenizeParameters;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `trainingsCreate` operation. */
    interface TrainingsCreateParams {
        /** The name of the training. */
        name: string;
        /** The training results. Normally this is specified as `type=container` which
         *  means that it is stored in the space or project.
         */
        resultsReference: ObjectLocation;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** A description of the training. */
        description?: string;
        /** A list of tags for this resource. */
        tags?: string[];
        /** Properties to control the prompt tuning. */
        promptTuning?: PromptTuning;
        /** Training datasets. */
        trainingDataReferences?: DataConnectionReference[];
        /** User defined properties specified as key-value pairs. */
        custom?: JsonObject;
        /** If set to `true` then the result of the training, if successful, will be uploaded to the repository as a
         *  model.
         */
        autoUpdateModel?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `trainingsList` operation. */
    interface TrainingsListParams {
        /** Token required for token-based pagination. This token cannot be determined by end user. It is generated by
         *  the service and it is set in the href available in the `next` field.
         */
        start?: string;
        /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
        limit?: number;
        /** Compute the total count. May have performance impact. */
        totalCount?: boolean;
        /** Return only the resources with the given tag value. */
        tagValue?: string;
        /** Filter based on on the training job state. */
        state?: TrainingsListConstants.State | string;
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Constants for the `trainingsList` operation. */
    namespace TrainingsListConstants {
        /** Filter based on on the training job state. */
        enum State {
            QUEUED = "queued",
            PENDING = "pending",
            RUNNING = "running",
            STORING = "storing",
            COMPLETED = "completed",
            FAILED = "failed",
            CANCELED = "canceled"
        }
    }
    /** Parameters for the `trainingsGet` operation. */
    interface TrainingsGetParams {
        /** The training identifier. */
        trainingId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `trainingsDelete` operation. */
    interface TrainingsDeleteParams {
        /** The training identifier. */
        trainingId: string;
        /** The space that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` query parameter has to be given. */
        projectId?: string;
        /** Set to true in order to also delete the job or request metadata. */
        hardDelete?: boolean;
        headers?: OutgoingHttpHeaders;
    }
    /** Parameters for the `textRerank` operation. */
    interface TextRerankParams {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
         */
        modelId: string;
        /** The rank input strings. */
        inputs: RerankInput[];
        /** The rank query. */
        query: string;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        spaceId?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        projectId?: string;
        /** The properties used for reranking. */
        parameters?: RerankParameters;
        headers?: OutgoingHttpHeaders;
    }
    /*************************
     * model interfaces
     ************************/
    /** An error message. */
    interface ApiError {
        /** A simple code that should convey the general sense of the error. */
        code: string;
        /** The message that describes the error. */
        message: string;
        /** A reference to a more detailed explanation when available. */
        more_info?: string;
        /** The target of the error. */
        target?: ApiErrorTarget;
    }
    /** The data returned when an error is encountered. */
    interface ApiErrorResponse {
        /** An identifier that can be used to trace the request. */
        trace: string;
        /** The list of errors. */
        errors: ApiError[];
    }
    /** The target of the error. */
    interface ApiErrorTarget {
        /** The type of the problematic field. */
        type: ApiErrorTarget.Constants.Type | string;
        /** The name of the problematic field. */
        name: string;
    }
    namespace ApiErrorTarget {
        namespace Constants {
            /** The type of the problematic field. */
            enum Type {
                FIELD = "field",
                PARAMETER = "parameter",
                HEADER = "header"
            }
        }
    }
    /** The model id of the base model for prompt tuning. */
    interface BaseModel {
        /** The model id of the base model. */
        model_id?: string;
    }
    /** The limits that may be set per request. */
    interface ConsumptionsLimit {
        /** The hard limit on the call time for a request, if set. */
        call_time?: string;
        /** The hard limit on the number of input tokens for a request, if set. A value of zero will disable this
         *  feature.
         */
        max_input_tokens?: number;
        /** The hard limit on the number of output tokens for a request, if set. A value of zero will disable this
         *  feature.
         */
        max_output_tokens?: number;
    }
    /** Contains a set of fields specific to each connection. See here for [details about specifying connections](#datareferences). */
    interface DataConnection {
        /** DataConnection accepts additional properties. */
        [propName: string]: any;
    }
    /** A reference to data with an optional data schema. If necessary, it is possible to provide a data connection that contains just the data schema. */
    interface DataConnectionReference {
        /** Optional item identification inside a collection. */
        id?: string;
        /** The data source type like `connection_asset` or `data_asset`. If the data connection contains just a schema
         *  then this field is not required.
         */
        type: DataConnectionReference.Constants.Type | string;
        /** Contains a set of fields specific to each connection.
         *  See here for [details about specifying connections](#datareferences).
         */
        connection?: DataConnection;
        /** Contains a set of fields that describe the location of the data with respect to the `connection`. */
        location?: JsonObject;
        /** The schema of the expected data, see
         *  [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json)
         *  for the schema definition.
         */
        schema?: DataSchema;
    }
    namespace DataConnectionReference {
        namespace Constants {
            /** The data source type like `connection_asset` or `data_asset`. If the data connection contains just a schema then this field is not required. */
            enum Type {
                CONNECTION_ASSET = "connection_asset",
                DATA_ASSET = "data_asset",
                CONTAINER = "container",
                URL = "url"
            }
        }
    }
    /** The schema of the expected data, see [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json) for the schema definition. */
    interface DataSchema {
        /** An id to identify a schema. */
        id: string;
        /** A name for the schema. */
        name?: string;
        /** The fields that describe the data schema. */
        fields: JsonObject[];
        /** The type of the schema, can be ignored or set to `struct` or `DataFrame`. */
        type?: string;
    }
    /** The definition of the deployment. */
    interface DeploymentEntity {
        /** User defined properties specified as key-value pairs. */
        custom?: JsonObject;
        /** A reference to a resource. */
        prompt_template?: SimpleRel;
        /** Indicates that this is an online deployment. An object has to be specified but can be empty.
         *  The `serving_name` can be provided in the `online.parameters`.
         */
        online: OnlineDeployment;
        /** A hardware specification. */
        hardware_spec?: HardwareSpec;
        /** The requested hardware for deployment. */
        hardware_request?: HardwareRequest;
        /** A reference to a resource. */
        asset?: ModelRel;
        /** The base model that is required for this deployment if this is for a prompt template or a prompt tune for an
         *  IBM foundation model.
         */
        base_model_id?: string;
        /** The type of the deployed model. The possible values are the following:
         *
         *  1. `prompt_tune` - when a prompt tuned model is deployed.
         *
         *  2. `foundation_model` - when a prompt template is used on a pre-deployed IBM provided model.
         *
         *  3. `custom_foundation_model` - when a custom foundation model is deployed.
         */
        deployed_asset_type?: DeploymentEntity.Constants.DeployedAssetType | string;
        /** The verbalizer that was used to train this model if the deployment has `deployed_asset_type` of
         *  `prompt_tune`.
         */
        verbalizer?: string;
        /** Specifies the current status, additional information about the deployment
         *  and any failure messages in case of deployment failures.
         */
        status?: DeploymentStatus;
    }
    namespace DeploymentEntity {
        namespace Constants {
            /** The type of the deployed model. The possible values are the following: 1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used on a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation model is deployed. */
            enum DeployedAssetType {
                PROMPT_TUNE = "prompt_tune",
                FOUNDATION_MODEL = "foundation_model",
                CUSTOM_FOUNDATION_MODEL = "custom_foundation_model"
            }
        }
    }
    /** A deployment resource. */
    interface DeploymentResource {
        /** Common metadata for a resource where `project_id` or `space_id` must be present. */
        metadata?: ResourceMeta;
        /** The definition of the deployment. */
        entity?: DeploymentEntity;
    }
    /** The deployment resources. */
    interface DeploymentResourceCollection {
        /** The total number of resources. Computed explicitly only when 'total_count=true' query parameter is present.
         *  This is in order to avoid performance penalties.
         */
        total_count?: number;
        /** The number of items to return in each page. */
        limit: number;
        /** The reference to the first item in the current page. */
        first: PaginationFirst;
        /** A reference to the first item of the next page, if any. */
        next?: PaginationNext;
        /** A list of deployment resources. */
        resources?: DeploymentResource[];
        /** System details including warnings. */
        system?: DeploymentSystem;
    }
    /** The common fields that can be patched. This is a helper for `cpdctl`. */
    interface DeploymentResourcePatch {
        /** A list of tags for this resource. */
        tags?: string[];
        /** The name of the resource. */
        name?: string;
        /** A description of the resource. */
        description?: string;
        /** User defined properties specified as key-value pairs. */
        custom?: JsonObject;
        /** A reference to a resource. */
        asset?: Rel;
    }
    /** Specifies the current status, additional information about the deployment and any failure messages in case of deployment failures. */
    interface DeploymentStatus {
        /** Specifies the current state of the deployment. */
        state?: DeploymentStatus.Constants.State | string;
        /** Optional messages related to the deployment. */
        message?: Message;
        /** The data returned when an error is encountered. */
        failure?: ApiErrorResponse;
        /** The URLs that can be used to submit inference API requests. These URLs will contain the
         *  `deployment_id` and the `serving_name`, if the `serving_name` was set.
         */
        inference?: Inference[];
    }
    namespace DeploymentStatus {
        namespace Constants {
            /** Specifies the current state of the deployment. */
            enum State {
                INITIALIZING = "initializing",
                UPDATING = "updating",
                READY = "ready",
                FAILED = "failed"
            }
        }
    }
    /** System details including warnings. */
    interface DeploymentSystem {
        /** Optional details provided by the service about statistics of the number of deployments created. The
         *  deployments that are counted will depend on the request parameters.
         */
        system?: DeploymentSystemDetails;
    }
    /** Optional details provided by the service about statistics of the number of deployments created. The deployments that are counted will depend on the request parameters. */
    interface DeploymentSystemDetails {
        /** Any warnings coming from the system. */
        warnings?: Warning[];
        /** The stats about deployments. */
        stats?: Stats[];
    }
    /** The template properties if this request refers to a prompt template. */
    interface DeploymentTextGenProperties {
        /** Represents the strategy used for picking the tokens during generation of the output text.
         *
         *  During text generation when parameter value is set to greedy, each successive token corresponds to the highest
         *  probability token given the text that has already been generated. This strategy can lead to repetitive results
         *  especially for longer output sequences. The alternative sample strategy generates text by picking subsequent
         *  tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the
         *  already-generated text and the top_k and top_p parameters described below. See this
         *  [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation.
         */
        decoding_method?: DeploymentTextGenProperties.Constants.DecodingMethod | string;
        /** It can be used to exponentially increase the likelihood of the text generation terminating once a specified
         *  number of tokens have been generated.
         */
        length_penalty?: TextGenLengthPenalty;
        /** The maximum number of new tokens to be generated. The maximum supported value for this field depends on the
         *  model being used.
         *
         *  How the "token" is defined depends on the tokenizer and vocabulary size, which in turn depends on the model.
         *  Often the tokens are a mix of full words and sub-words. To learn more about tokenization, [see
         *  here](https://huggingface.co/course/chapter2/4).
         *
         *  Depending on the users plan, and on the model being used, there may be an enforced maximum number of new tokens.
         */
        max_new_tokens?: number;
        /** If stop sequences are given, they are ignored until minimum tokens are generated. */
        min_new_tokens?: number;
        /** Random number generator seed to use in sampling mode for experimental repeatability. */
        random_seed?: number;
        /** Stop sequences are one or more strings which will cause the text generation to stop if/when they are
         *  produced as part of the output. Stop sequences encountered prior to the minimum number of tokens being generated
         *  will be ignored.
         */
        stop_sequences?: string[];
        /** A value used to modify the next-token probabilities in sampling mode. Values less than 1.0 sharpen the
         *  probability distribution, resulting in "less random" output. Values greater than 1.0 flatten the probability
         *  distribution, resulting in "more random" output. A value of 1.0 has no effect.
         */
        temperature?: number;
        /** Time limit in milliseconds - if not completed within this time, generation will stop. The text generated so
         *  far will be returned along with the TIME_LIMIT stop reason.
         *
         *  Depending on the users plan, and on the model being used, there may be an enforced maximum time limit.
         */
        time_limit?: number;
        /** The number of highest probability vocabulary tokens to keep for top-k-filtering. Only applies for sampling
         *  mode. When decoding_strategy is set to sample, only the top_k most likely tokens are considered as candidates
         *  for the next generated token.
         */
        top_k?: number;
        /** Similar to top_k except the candidates to generate the next token are the most likely tokens with
         *  probabilities that add up to at least top_p. Also known as nucleus sampling. A value of 1.0 is equivalent to
         *  disabled.
         */
        top_p?: number;
        /** Represents the penalty for penalizing tokens that have already been generated or belong to the context. The
         *  value 1.0 means that there is no penalty.
         */
        repetition_penalty?: number;
        /** Represents the maximum number of input tokens accepted. This can be used to avoid requests failing due to
         *  input being longer than configured limits. If the text is truncated, then it truncates the start of the input
         *  (on the left), so the end of the input will remain the same. If this value exceeds the `maximum sequence length`
         *  (refer to the documentation to find this value for the model) then the call will fail if the total number of
         *  tokens exceeds the `maximum sequence length`.
         */
        truncate_input_tokens?: number;
        /** Properties that control what is returned. */
        return_options?: ReturnOptionProperties;
        /** Pass `false` to omit matched stop sequences from the end of the output text. The default is `true`, meaning
         *  that the output will end with the stop sequence text when matched.
         */
        include_stop_sequence?: boolean;
        /** Local typicality measures how similar the conditional probability of predicting a target token next is to
         *  the expected conditional probability of predicting a random token next, given the partial text already
         *  generated. If less than 1, the smallest set of the most locally typical tokens with probabilities that add up to
         *  typical_p or higher are kept for generation.
         */
        typical_p?: number;
        /** The prompt variables. */
        prompt_variables?: JsonObject;
    }
    namespace DeploymentTextGenProperties {
        namespace Constants {
            /** Represents the strategy used for picking the tokens during generation of the output text. During text generation when parameter value is set to greedy, each successive token corresponds to the highest probability token given the text that has already been generated. This strategy can lead to repetitive results especially for longer output sequences. The alternative sample strategy generates text by picking subsequent tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k and top_p parameters described below. See this [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation. */
            enum DecodingMethod {
                SAMPLE = "sample",
                GREEDY = "greedy"
            }
        }
    }
    /** The embedding values for a text string. The `input` field is only set if the corresponding `return_option` is set. */
    interface Embedding {
        /** The text input to the model. */
        input?: string;
        /** The embedding values. */
        embedding: number[];
    }
    /** Parameters for text embedding requests. */
    interface EmbeddingParameters {
        /** Represents the maximum number of input tokens accepted. This can be used to avoid requests failing due to
         *  input being longer than configured limits. If the text is truncated, then it truncates the end of the input (on
         *  the right), so the start of the input will remain the same. If this value exceeds the `maximum sequence length`
         *  (refer to the documentation to find this value for the model) then the call will fail if the total number of
         *  tokens exceeds the `maximum sequence length`.
         */
        truncate_input_tokens?: number;
        /** The return options for text embeddings. */
        return_options?: EmbeddingReturnOptions;
    }
    /** The return options for text embeddings. */
    interface EmbeddingReturnOptions {
        /** Include the `input` text in each of the `results` documents. */
        input_text?: boolean;
    }
    /** System details. */
    interface EmbeddingsResponse {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
         */
        model_id: string;
        /** The embedding values for a given text. */
        results: Embedding[];
        /** The time when the response was created. */
        created_at: string;
        /** The number of input tokens that were consumed. */
        input_token_count: number;
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** ExternalInformationExternalModel. */
    interface ExternalInformationExternalModel {
        name: string;
        url: string;
    }
    /** ExternalInformationExternalPrompt. */
    interface ExternalInformationExternalPrompt {
        url: string;
        additional_information?: ExternalPromptAdditionalInformationItem[][];
    }
    /** ExternalPromptAdditionalInformationItem. */
    interface ExternalPromptAdditionalInformationItem {
        key?: string;
    }
    /** A supported foundation model. */
    interface FoundationModel {
        /** The id of the foundation model. */
        model_id: string;
        /** A short label that will be displayed in the UI. */
        label: string;
        /** The provider of the model. */
        provider: string;
        /** The organization or person that tuned this model. */
        tuned_by?: string;
        /** A short description of the model suitable for a title. */
        short_description: string;
        /** A longer description of the model, that may be used if no `description_url` is provided. */
        long_description?: string;
        /** Limits per plan that may be set per request. */
        limits?: FoundationModelLimits;
        /** Deprecated: Deprecated: please use `tasks` instead. */
        task_ids?: string[];
        /** The tasks that are supported by this model. */
        tasks?: TaskDescription[];
        /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the
         *  details. Note that input tokens and output tokens may be charged differently.
         */
        input_tier: FoundationModel.Constants.InputTier | string;
        /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the
         *  details. Note that input tokens and output tokens may be charged differently.
         */
        output_tier: FoundationModel.Constants.OutputTier | string;
        /** Specifies the provider of this model. */
        source: string;
        /** The minimum number of examples required for the model. */
        min_shot_size?: number;
        /** The number of parameters used for the model, it will accept `m` for million, `b` for billion and `t` for
         *  trillion.
         */
        number_params: string;
        /** The limits that are applied for the model, for all the plans. */
        model_limits?: ModelLimits;
        /** The information related to the lifecycle of this model. */
        lifecycle?: LifeCycleState[];
        /** Training parameters for a given model. */
        training_parameters?: TrainingParameters;
        /** The information related to the minor versions of this model. */
        versions?: FoundationModelVersion[];
        /** If `true` then this model is only available in the `Tech Preview`. */
        tech_preview?: boolean;
    }
    namespace FoundationModel {
        namespace Constants {
            /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the details. Note that input tokens and output tokens may be charged differently. */
            enum InputTier {
                CLASS_1 = "class_1",
                CLASS_2 = "class_2",
                CLASS_3 = "class_3",
                CLASS_C1 = "class_c1"
            }
            /** The tier of the model, depending on the `tier` the billing will be different, refer to the plan for the details. Note that input tokens and output tokens may be charged differently. */
            enum OutputTier {
                CLASS_1 = "class_1",
                CLASS_2 = "class_2",
                CLASS_3 = "class_3",
                CLASS_C1 = "class_c1"
            }
        }
    }
    /** Limits per plan that may be set per request. */
    interface FoundationModelLimits {
        /** The limits that may be set per request. */
        lite?: ConsumptionsLimit;
    }
    /** A task that is covered by some of the foundation models that are supported in the service. */
    interface FoundationModelTask {
        /** The id of the task. */
        task_id: string;
        /** The label of the task. */
        label: string;
        /** The description of the task. */
        description?: string;
        /** The rank of the task that is mainly for the UI. */
        rank: number;
    }
    /** System details. */
    interface FoundationModelTasks {
        /** The total number of resources. */
        total_count?: number;
        /** The number of items to return in each page. */
        limit: number;
        /** The reference to the first item in the current page. */
        first: PaginationFirst;
        /** A reference to the first item of the next page, if any. */
        next?: PaginationNext;
        /** The supported foundation model tasks. */
        resources?: FoundationModelTask[];
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** A minor or patch version for the model. */
    interface FoundationModelVersion {
        /** The version of the model. This must follow semantic versioning semantics. */
        version?: string;
        /** The date (ISO 8601 format YYYY-MM-DD) when this version first became available. */
        available_date?: string;
    }
    /** System details. */
    interface FoundationModels {
        /** The total number of resources. */
        total_count?: number;
        /** The number of items to return in each page. */
        limit: number;
        /** The reference to the first item in the current page. */
        first: PaginationFirst;
        /** A reference to the first item of the next page, if any. */
        next?: PaginationNext;
        /** The supported foundation models. */
        resources?: FoundationModel[];
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** GetPromptInputResponse. */
    interface GetPromptInputResponse {
        /** The prompt's input string used for inferences. */
        input?: string;
    }
    /** The requested hardware for deployment. */
    interface HardwareRequest {
        /** The size of GPU requested for the deployment. */
        size?: HardwareRequest.Constants.Size | string;
        /** The number of nodes for the GPU requested for deployment. */
        num_nodes?: number;
    }
    namespace HardwareRequest {
        namespace Constants {
            /** The size of GPU requested for the deployment. */
            enum Size {
                GPU_S = "gpu_s",
                GPU_M = "gpu_m",
                GPU_L = "gpu_l"
            }
        }
    }
    /** A hardware specification. */
    interface HardwareSpec {
        /** The id of the hardware specification. */
        id?: string;
        /** The revision of the hardware specification. */
        rev?: string;
        /** The name of the hardware specification. */
        name?: string;
        /** The number of nodes applied to a computation. */
        num_nodes?: number;
    }
    /** The details of an inference API. */
    interface Inference {
        /** The inference URL. */
        url: string;
        /** This is `true` if the inference API supports SSE streaming. */
        sse?: boolean;
        /** This is `true` if the inference API uses the `serving_name` that was defined in this deployment. */
        uses_serving_name?: boolean;
    }
    /** This model represents an individual patch operation to be performed on a JSON document, as defined by RFC 6902. */
    interface JsonPatchOperation {
        /** The operation to be performed. */
        op: JsonPatchOperation.Constants.Op | string;
        /** The JSON Pointer that identifies the field that is the target of the operation. */
        path: string;
        /** The JSON Pointer that identifies the field that is the source of the operation. */
        from?: string;
        /** The value to be used within the operation. */
        value?: any;
    }
    namespace JsonPatchOperation {
        namespace Constants {
            /** The operation to be performed. */
            enum Op {
                ADD = "add",
                REMOVE = "remove",
                REPLACE = "replace",
                MOVE = "move",
                COPY = "copy",
                TEST = "test"
            }
        }
    }
    /** The lifecycle details. */
    interface LifeCycleState {
        /** The possible lifecycle stages, in order, are described below:
         *
         *  - `available`: this means that the model is available for use.
         *  - `deprecated`: this means that the model is still available but the model will be removed soon, so an
         *  alternative model should be used.
         *  - `constricted`: this means that the model is still available for inferencing but cannot be used for training or
         *  in a deployment. The model will be removed soon so an alternative model should be used.
         *  - `withdrawn`: this means that the model is no longer available, check the `alternative_model_ids` to see what
         *  it can be replaced by.
         */
        id: LifeCycleState.Constants.Id | string;
        /** An optional label that may be used in the UI. */
        label?: string;
        /** The date (ISO 8601 format YYYY-MM-DD) when this lifecycle stage starts. */
        start_date?: string;
        /** Alternative models, or model versions, that can be used instead of this model. */
        alternative_model_ids?: string[];
        /** A link to the documentation specifying details on the lifecycle plan for this model. */
        url?: string;
    }
    namespace LifeCycleState {
        namespace Constants {
            /** The possible lifecycle stages, in order, are described below: - `available`: this means that the model is available for use. - `deprecated`: this means that the model is still available but the model will be removed soon, so an alternative model should be used. - `constricted`: this means that the model is still available for inferencing but cannot be used for training or in a deployment. The model will be removed soon so an alternative model should be used. - `withdrawn`: this means that the model is no longer available, check the `alternative_model_ids` to see what it can be replaced by. */
            enum Id {
                AVAILABLE = "available",
                DEPRECATED = "deprecated",
                CONSTRICTED = "constricted",
                WITHDRAWN = "withdrawn"
            }
        }
    }
    /** The properties specific to masking. If this object exists, even if it is empty, then masking will be applied. */
    interface MaskProperties {
        /** If this field is `true` then the entity value, that contains the text that was masked, will also be removed
         *  from the output.
         */
        remove_entity_value?: boolean;
    }
    /** Optional messages related to the resource. */
    interface Message {
        /** The level of the message, normally one of `debug`, `info` or `warning`. */
        level?: string;
        /** The message. */
        text?: string;
    }
    /** Provides extra information for this training stage in the context of auto-ml. */
    interface MetricsContext {
        /** The deployment that created the metrics. */
        deployment_id?: string;
        /** The context for prompt tuning metrics. */
        prompt_tuning?: PromptTuningMetricsContext;
    }
    /** The limits that are applied for the model, for all the plans. */
    interface ModelLimits {
        /** This is the maximum allowed value for the number of tokens in the input prompt plus the number of tokens in
         *  the output generated by the model.
         */
        max_sequence_length?: number;
        /** This is the maximum number of records that can be accepted when training this model. */
        training_data_max_records?: number;
    }
    /** A reference to a resource. */
    interface ModelRel {
        /** The id of the referenced resource. */
        id: string;
        /** The revision of the referenced resource. */
        rev?: string;
        /** The resource key for this asset if it exists. */
        resource_key?: string;
    }
    /** The properties specific to HAP. */
    interface ModerationHapProperties {
        /** Properties that control the moderation on the text. */
        input?: TextModeration;
        /** Properties that control the moderation on the text. */
        output?: TextModeration;
        /** The properties specific to masking. If this object exists,
         *  even if it is empty, then masking will be applied.
         */
        mask?: MaskProperties;
        /** ModerationHapProperties accepts additional properties. */
        [propName: string]: any;
    }
    /** The properties specific to PII. */
    interface ModerationPiiProperties {
        /** Properties that control the moderation on the text. */
        input?: TextModerationWithoutThreshold;
        /** Properties that control the moderation on the text. */
        output?: TextModerationWithoutThreshold;
        /** The properties specific to masking. If this object exists,
         *  even if it is empty, then masking will be applied.
         */
        mask?: MaskProperties;
        /** ModerationPiiProperties accepts additional properties. */
        [propName: string]: any;
    }
    /** The properties for the moderation. Each type of moderation may have additional properties that are specific to that moderation. */
    interface ModerationProperties {
        /** Properties that control the moderation on the text. */
        input?: TextModeration;
        /** Properties that control the moderation on the text. */
        output?: TextModeration;
        /** ModerationProperties accepts additional properties. */
        [propName: string]: any;
    }
    /** A specific moderation result. */
    interface ModerationResult {
        /** the probability that this is a real match. */
        score: number;
        /** This defines if this was found in the input (`true`) or the output (`false`). */
        input: boolean;
        /** A range of text. */
        position: ModerationTextRange;
        /** The entity that was identified by the moderation. */
        entity: string;
        /** The text that was identified for this entity.
         *
         *  This field may be removed if requested in the moderation request body.
         */
        word?: string;
    }
    /** The result of any detected moderations. */
    interface ModerationResults {
        /** The HAP results. */
        hap?: ModerationResult[];
        /** The PII results. */
        pii?: ModerationResult[];
        /** ModerationResults accepts additional properties. */
        [propName: string]: any;
    }
    /** A range of text. */
    interface ModerationTextRange {
        /** The start index of the range. */
        start: number;
        /** The end index of the range. The end index is exclusive meaning that the character at this index will not be
         *  included in the range.
         */
        end: number;
    }
    /** Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and `Personal identifiable information` (PII) filtering. This list can be extended with new types of moderations. */
    interface Moderations {
        /** The properties specific to HAP. */
        hap?: ModerationHapProperties;
        /** The properties specific to PII. */
        pii?: ModerationPiiProperties;
        /** If set, then only these ranges will be applied to the moderations. This is useful in the case that certain
         *  parts of the input text have already been checked.
         */
        input_ranges?: ModerationTextRange[];
        /** Moderations accepts additional properties. */
        [propName: string]: any;
    }
    /** A reference to data. */
    interface ObjectLocation {
        /** Item identification inside a collection. */
        id?: string;
        /** The data source type like `connection_asset` or `data_asset`. */
        type: ObjectLocation.Constants.Type | string;
        /** Contains a set of fields specific to each connection.
         *  See here for [details about specifying connections](#datareferences).
         */
        connection?: DataConnection;
        /** Contains a set of fields that describe the location of the data with respect to the `connection`. */
        location: JsonObject;
    }
    namespace ObjectLocation {
        namespace Constants {
            /** The data source type like `connection_asset` or `data_asset`. */
            enum Type {
                CONNECTION_ASSET = "connection_asset",
                DATA_ASSET = "data_asset",
                CONTAINER = "container",
                URL = "url"
            }
        }
    }
    /** Indicates that this is an online deployment. An object has to be specified but can be empty. The `serving_name` can be provided in the `online.parameters`. */
    interface OnlineDeployment {
        /** A set of key-value pairs that are used to configure the deployment. */
        parameters?: OnlineDeploymentParameters;
    }
    /** A set of key-value pairs that are used to configure the deployment. */
    interface OnlineDeploymentParameters {
        /** The `serving_name` can be used in the inference URL in place of the `deployment_id`. */
        serving_name?: string;
        /** OnlineDeploymentParameters accepts additional properties. */
        [propName: string]: any;
    }
    /** The reference to the first item in the current page. */
    interface PaginationFirst {
        /** The uri of the first resource returned. */
        href: string;
    }
    /** A reference to the first item of the next page, if any. */
    interface PaginationNext {
        /** The uri of the next set of resources. */
        href: string;
    }
    /** PromptModelParameters. */
    interface PromptModelParameters {
        decoding_method?: string;
        max_new_tokens?: number;
        min_new_tokens?: number;
        random_seed?: number;
        stop_sequences?: string[];
        temperature?: number;
        top_k?: number;
        top_p?: number;
        repetition_penalty?: number;
    }
    /** Properties to control the prompt tuning. */
    interface PromptTuning {
        /** The model id of the base model for this job. */
        base_model?: BaseModel;
        /** The task that is targeted for this model. */
        task_id: string;
        /** Type of Peft (Parameter-Efficient Fine-Tuning) config to build. */
        tuning_type?: PromptTuning.Constants.TuningType | string;
        /** Number of epochs to tune the prompt vectors, this affects the quality of the trained model. */
        num_epochs?: number;
        /** Learning rate to be used while tuning prompt vectors. */
        learning_rate?: number;
        /** Number of steps to be used for gradient accumulation. Gradient accumulation refers to a method of collecting
         *  gradient for configured number of steps instead of updating the model variables at every step and then applying
         *  the update to model variables. This can be used as a tool to overcome smaller batch size limitation. Often also
         *  referred in conjunction with "effective batch size".
         */
        accumulate_steps?: number;
        /** Verbalizer template to be used for formatting data at train and inference time. This template may use
         *  brackets to indicate where fields from the data model must be rendered.
         */
        verbalizer?: string;
        /** The batch size is a number of samples processed before the model is updated. */
        batch_size?: number;
        /** Maximum length of input tokens being considered. */
        max_input_tokens?: number;
        /** Maximum length of output tokens being predicted. */
        max_output_tokens?: number;
        /** The `text` method requires `init_text` to be set. */
        init_method?: PromptTuning.Constants.InitMethod | string;
        /** Initialization text to be used if `init_method` is set to `text` otherwise this will be ignored. */
        init_text?: string;
    }
    namespace PromptTuning {
        namespace Constants {
            /** Type of Peft (Parameter-Efficient Fine-Tuning) config to build. */
            enum TuningType {
                PROMPT_TUNING = "prompt_tuning"
            }
            /** The `text` method requires `init_text` to be set. */
            enum InitMethod {
                RANDOM = "random",
                TEXT = "text"
            }
        }
    }
    /** The context for prompt tuning metrics. */
    interface PromptTuningMetricsContext {
        /** The location where the prompt tuning metrics are stored. */
        metrics_location?: string;
    }
    /** PromptWithExternalModelParameters. */
    interface PromptWithExternalModelParameters {
        decoding_method?: string;
        max_new_tokens?: number;
        min_new_tokens?: number;
        random_seed?: number;
        stop_sequences?: string[];
        temperature?: number;
        top_k?: number;
        top_p?: number;
        repetition_penalty?: number;
    }
    /** A reference to a resource. */
    interface Rel {
        /** The id of the referenced resource. */
        id: string;
        /** The revision of the referenced resource. */
        rev?: string;
    }
    /** A text to rank. */
    interface RerankInput {
        /** The text to rank. */
        text: string;
    }
    /** The properties used for reranking. */
    interface RerankParameters {
        /** Represents the maximum number of input tokens accepted. This can be used to avoid requests failing due to
         *  input being longer than configured limits. If the text is truncated, then it truncates the end of the input (on
         *  the right), so the start of the input will remain the same. If this value exceeds the `maximum sequence length`
         *  (refer to the documentation to find this value for the model) then the call will fail if the total number of
         *  tokens exceeds the `maximum sequence length`.
         */
        truncate_input_tokens?: number;
        /** The return options for text reranking. */
        return_options?: RerankReturnOptions;
    }
    /** System details. */
    interface RerankResponse {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
         */
        model_id: string;
        /** The model version (using semantic versioning) if set. */
        model_version?: string;
        /** The ranked results. */
        results: RerankedResults[];
        /** The time when the response was created. */
        created_at: string;
        /** The number of input tokens that were consumed. */
        input_token_count: number;
        /** The rank query, if requested. */
        query?: string;
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** The return options for text reranking. */
    interface RerankReturnOptions {
        /** Just show the top `n` results if set. */
        top_n?: number;
        /** If `true` then the inputs will be returned in the response. */
        inputs?: boolean;
        /** If `true` then the queries will be returned in the response. */
        query?: boolean;
    }
    /** The ranking score for the input. */
    interface RerankedResults {
        /** The index of the text from the input in the original request `inputs` array. */
        index: number;
        /** The score of the input. */
        score: number;
        /** The text that was ranked, if requested. */
        input?: string;
    }
    /** Information related to the revision. */
    interface ResourceCommitInfo {
        /** The time when the revision was committed. */
        committed_at: string;
        /** The message that was provided when the revision was created. */
        commit_message?: string;
    }
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    interface ResourceMeta {
        /** The id of the resource. */
        id: string;
        /** The time when the resource was created. */
        created_at: string;
        /** The revision of the resource. */
        rev?: string;
        /** The user id which created this resource. */
        owner?: string;
        /** The time when the resource was last modified. */
        modified_at?: string;
        /** The id of the parent resource where applicable. */
        parent_id?: string;
        /** The name of the resource. */
        name?: string;
        /** A description of the resource. */
        description?: string;
        /** A list of tags for this resource. */
        tags?: string[];
        /** Information related to the revision. */
        commit_info?: ResourceCommitInfo;
        /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
        space_id?: string;
        /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
        project_id?: string;
    }
    /** Properties that control what is returned. */
    interface ReturnOptionProperties {
        /** Include input text in the `generated_text` field. */
        input_text?: boolean;
        /** Include the list of individual generated tokens. Extra token information is included based on the other
         *  flags below.
         */
        generated_tokens?: boolean;
        /** Include the list of input tokens. Extra token information is included based on the other flags here, but
         *  only for decoder-only models.
         */
        input_tokens?: boolean;
        /** Include logprob (natural log of probability) for each returned token. Applicable only if generated_tokens ==
         *  true and/or input_tokens == true.
         */
        token_logprobs?: boolean;
        /** Include rank of each returned token. Applicable only if generated_tokens == true and/or input_tokens ==
         *  true.
         */
        token_ranks?: boolean;
        /** Include top n candidate tokens at the position of each returned token. The maximum value permitted is 5, but
         *  more may be returned if there is a tie for nth place. Applicable only if generated_tokens == true and/or
         *  input_tokens == true.
         */
        top_n_tokens?: number;
    }
    /** A reference to a resource. */
    interface SimpleRel {
        /** The id of the referenced resource. */
        id: string;
    }
    /** The stats about deployments for a space. */
    interface Stats {
        /** An `id` associated with the space. */
        space_id?: string;
        /** The total number of deployments created in a space including `online` and `batch`. */
        total_count?: number;
        /** The number of online deployments created in a space. */
        online_count?: number;
        /** The number of batch deployments created in a space. */
        batch_count?: number;
    }
    /** Optional details coming from the service and related to the API call or the associated resource. */
    interface SystemDetails {
        /** Any warnings coming from the system. */
        warnings?: Warning[];
    }
    /** The benchmarking result for this task for this model. */
    interface TaskBenchmark {
        /** Type of benchmarks used. */
        type?: string;
        /** Description of benchmark used. */
        description?: string;
        /** Benchmarked language (multilingual benchmarks). */
        language?: string;
        /** Benchmarking dataset properties. */
        dataset?: TaskBenchmarkDataset;
        /** The benchmarking prompt properties. */
        prompt?: TaskBenchmarkPrompt;
        /** The scores for a given benchmark. */
        metrics?: TaskBenchmarkMetric[];
    }
    /** Benchmarking dataset properties. */
    interface TaskBenchmarkDataset {
        /** The benchmarking dataset name. */
        name?: string;
    }
    /** The metric for a given property. */
    interface TaskBenchmarkMetric {
        /** The name of the metric. */
        name?: string;
        /** The mean value calculated over all records in the dataset. */
        value?: number;
    }
    /** The benchmarking prompt properties. */
    interface TaskBenchmarkPrompt {
        number_of_shots?: number;
    }
    /** The attributes of the task for this model. */
    interface TaskDescription {
        /** The `id` of the task. */
        id: string;
        /** The ratings for this task for this model. */
        ratings?: TaskRating;
        /** The benchmarks for a given task. */
        benchmarks?: TaskBenchmark[];
        /** The tags for a given task. */
        tags?: string[];
    }
    /** The ratings for this task for this model. */
    interface TaskRating {
        /** A metric that indicates the cost expected to be incurred by the model's support of an inference task, in
         *  terms of resource consumption and processing time, on a scale of 1 to 5, where 5 is the least cost and 1 is the
         *  most cost. A missing value means that the cost is not known.
         */
        cost?: number;
        /** A metric that indicates the quality of the model's support of an inference task, on a scale of 1 to 5, where
         *  5 is the best support and 1 is poor support. A missing value means that the quality is not known.
         */
        quality?: number;
    }
    /** The function call. */
    interface TextChatFunctionCall {
        /** The name of the function. */
        name: string;
        /** The arguments to call the function with, as generated by the model in JSON format.
         *
         *  Note that the model does not always generate valid JSON, and may hallucinate parameters not defined by your
         *  function schema. Validate the arguments in your code before calling your function.
         */
        arguments: string;
    }
    /** TextChatMessages. */
    interface TextChatMessages {
    }
    /** The parameters specific to chat. */
    interface TextChatParameterFunction {
        /** The name of the function. */
        name: string;
        /** A description of what the function does, used by the model to choose when and how to call the function. */
        description?: string;
        /** The parameters the functions accepts, described as a JSON Schema object. See the [JSON Schema
         *  reference](https://json-schema.org/learn/getting-started-step-by-step) for documentation about the format.
         *
         *  Omitting parameters defines a function with an empty parameter list.
         */
        parameters?: JsonObject;
    }
    /** The chat tool parameters. */
    interface TextChatParameterTools {
        /** The tool type. */
        type: TextChatParameterTools.Constants.Type | string;
        /** The parameters specific to chat. */
        function?: TextChatParameterFunction;
    }
    namespace TextChatParameterTools {
        namespace Constants {
            /** The tool type. */
            enum Type {
                FUNCTION = "function"
            }
        }
    }
    /** System details. */
    interface TextChatResponse {
        /** A unique identifier for the chat completion. */
        id: string;
        /** The model used for the chat completion. */
        model_id: string;
        /** The model version (using semantic versioning) if set. */
        model_version?: string;
        /** A list of chat completion choices. Can be more than one if `n` is greater than 1. */
        choices: TextChatResultChoice[];
        /** The Unix timestamp (in seconds) of when the chat completion was created. */
        created: number;
        /** The time when the response was created. */
        created_at?: string;
        /** Usage statistics for the completion request. */
        usage?: TextChatUsage;
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** The chat response format parameters. */
    interface TextChatResponseFormat {
        /** Used to enable JSON mode, which guarantees the message the model generates is valid JSON.
         *
         *  **Important:** when using JSON mode, you must also instruct the model to produce JSON yourself via a system or
         *  user message. Without this, the model may generate an unending stream of whitespace until the generation reaches
         *  the token limit, resulting in a long-running and seemingly "stuck" request. Also note that the message content
         *  may be partially cut off if `finish_reason="length"`, which indicates the generation exceeded `max_tokens` or
         *  the conversation exceeded the max context length.
         */
        type: TextChatResponseFormat.Constants.Type | string;
    }
    namespace TextChatResponseFormat {
        namespace Constants {
            /** Used to enable JSON mode, which guarantees the message the model generates is valid JSON. **Important:** when using JSON mode, you must also instruct the model to produce JSON yourself via a system or user message. Without this, the model may generate an unending stream of whitespace until the generation reaches the token limit, resulting in a long-running and seemingly "stuck" request. Also note that the message content may be partially cut off if `finish_reason="length"`, which indicates the generation exceeded `max_tokens` or the conversation exceeded the max context length. */
            enum Type {
                JSON_OBJECT = "json_object"
            }
        }
    }
    /** A tool related result. */
    interface TextChatResultChoice {
        /** The index of this result. */
        index?: number;
        /** A message result. */
        message?: TextChatResultMessage;
        /** The reason why the call stopped, can be one of:
         *  - `stop` - The model hit a natural stop point or a provided stop sequence.
         *  - `length` - The maximum number of tokens specified in the request was reached.
         *  - `tool_calls` - The model called a tool.
         *  - `time_limit`` - Time limit reached.
         *  - `cancelled`` - Request canceled by the client.
         *  - `error`` - Error encountered.
         *  - `null` - API response still in progress or incomplete.
         */
        finish_reason?: TextChatResultChoice.Constants.FinishReason | string;
    }
    namespace TextChatResultChoice {
        namespace Constants {
            /** The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point or a provided stop sequence. - `length` - The maximum number of tokens specified in the request was reached. - `tool_calls` - The model called a tool. - `time_limit`` - Time limit reached. - `cancelled`` - Request canceled by the client. - `error`` - Error encountered. - `null` - API response still in progress or incomplete. */
            enum FinishReason {
                STOP = "stop",
                LENGTH = "length",
                TOOL_CALLS = "tool_calls",
                TIME_LIMIT = "time_limit",
                CANCELLED = "cancelled",
                ERROR = "error"
            }
        }
    }
    /** A message result. */
    interface TextChatResultMessage {
        /** The role of the author of this message. */
        role: string;
        /** The contents of the message. */
        content?: string;
        /** The refusal message generated by the model. */
        refusal?: string;
        /** The tool calls generated by the model, such as function calls. */
        tool_calls?: TextChatToolCall[];
    }
    /** The tool call. */
    interface TextChatToolCall {
        /** The ID of the tool call. */
        id: string;
        /** The type of the tool. Currently, only `function` is supported. */
        type: TextChatToolCall.Constants.Type | string;
        /** The function call. */
        function: TextChatFunctionCall;
    }
    namespace TextChatToolCall {
        namespace Constants {
            /** The type of the tool. Currently, only `function` is supported. */
            enum Type {
                FUNCTION = "function"
            }
        }
    }
    /** Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}` forces the model to call that tool. Only one of `tool_choice_option` or `tool_choice` must be present. */
    interface TextChatToolChoiceTool {
        /** The tool type. */
        type: TextChatToolChoiceTool.Constants.Type | string;
        /** The named function. */
        function: TextChatToolFunction;
    }
    namespace TextChatToolChoiceTool {
        namespace Constants {
            /** The tool type. */
            enum Type {
                FUNCTION = "function"
            }
        }
    }
    /** The named function. */
    interface TextChatToolFunction {
        /** The name of the function. */
        name: string;
    }
    /** Usage statistics for the completion request. */
    interface TextChatUsage {
        /** Number of tokens in the generated completion. */
        completion_tokens?: number;
        /** Number of tokens in the prompt. */
        prompt_tokens?: number;
        /** Total number of tokens used in the request (prompt + completion). */
        total_tokens?: number;
    }
    /** TextChatUserContents. */
    interface TextChatUserContents {
    }
    /** The definition of a user image content. */
    interface TextChatUserImageURL {
        /** The url of the image. This can be the url to the image or a base64 encoded image. */
        url: string;
        /** This parameter controls how the model processes the image and generates its textual understanding. The
         *  `auto` setting which will look at the image input size and decide if it should use the `low` or `high` setting.
         */
        detail?: TextChatUserImageURL.Constants.Detail | string;
    }
    namespace TextChatUserImageURL {
        namespace Constants {
            /** This parameter controls how the model processes the image and generates its textual understanding. The `auto` setting which will look at the image input size and decide if it should use the `low` or `high` setting. */
            enum Detail {
                LOW = "low",
                HIGH = "high",
                AUTO = "auto"
            }
        }
    }
    /** It can be used to exponentially increase the likelihood of the text generation terminating once a specified number of tokens have been generated. */
    interface TextGenLengthPenalty {
        /** Represents the factor of exponential decay. Larger values correspond to more aggressive decay. */
        decay_factor?: number;
        /** A number of generated tokens after which this should take effect. */
        start_index?: number;
    }
    /** Properties that control the model and response. */
    interface TextGenParameters {
        /** Represents the strategy used for picking the tokens during generation of the output text.
         *
         *  During text generation when parameter value is set to greedy, each successive token corresponds to the highest
         *  probability token given the text that has already been generated. This strategy can lead to repetitive results
         *  especially for longer output sequences. The alternative sample strategy generates text by picking subsequent
         *  tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the
         *  already-generated text and the top_k and top_p parameters described below. See this
         *  [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation.
         */
        decoding_method?: TextGenParameters.Constants.DecodingMethod | string;
        /** It can be used to exponentially increase the likelihood of the text generation terminating once a specified
         *  number of tokens have been generated.
         */
        length_penalty?: TextGenLengthPenalty;
        /** The maximum number of new tokens to be generated. The maximum supported value for this field depends on the
         *  model being used.
         *
         *  How the "token" is defined depends on the tokenizer and vocabulary size, which in turn depends on the model.
         *  Often the tokens are a mix of full words and sub-words. To learn more about tokenization, [see
         *  here](https://huggingface.co/course/chapter2/4).
         *
         *  Depending on the users plan, and on the model being used, there may be an enforced maximum number of new tokens.
         */
        max_new_tokens?: number;
        /** If stop sequences are given, they are ignored until minimum tokens are generated. */
        min_new_tokens?: number;
        /** Random number generator seed to use in sampling mode for experimental repeatability. */
        random_seed?: number;
        /** Stop sequences are one or more strings which will cause the text generation to stop if/when they are
         *  produced as part of the output. Stop sequences encountered prior to the minimum number of tokens being generated
         *  will be ignored.
         */
        stop_sequences?: string[];
        /** A value used to modify the next-token probabilities in sampling mode. Values less than 1.0 sharpen the
         *  probability distribution, resulting in "less random" output. Values greater than 1.0 flatten the probability
         *  distribution, resulting in "more random" output. A value of 1.0 has no effect.
         */
        temperature?: number;
        /** Time limit in milliseconds - if not completed within this time, generation will stop. The text generated so
         *  far will be returned along with the TIME_LIMIT stop reason.
         *
         *  Depending on the users plan, and on the model being used, there may be an enforced maximum time limit.
         */
        time_limit?: number;
        /** The number of highest probability vocabulary tokens to keep for top-k-filtering. Only applies for sampling
         *  mode. When decoding_strategy is set to sample, only the top_k most likely tokens are considered as candidates
         *  for the next generated token.
         */
        top_k?: number;
        /** Similar to top_k except the candidates to generate the next token are the most likely tokens with
         *  probabilities that add up to at least top_p. Also known as nucleus sampling. A value of 1.0 is equivalent to
         *  disabled.
         */
        top_p?: number;
        /** Represents the penalty for penalizing tokens that have already been generated or belong to the context. The
         *  value 1.0 means that there is no penalty.
         */
        repetition_penalty?: number;
        /** Represents the maximum number of input tokens accepted. This can be used to avoid requests failing due to
         *  input being longer than configured limits. If the text is truncated, then it truncates the start of the input
         *  (on the left), so the end of the input will remain the same. If this value exceeds the `maximum sequence length`
         *  (refer to the documentation to find this value for the model) then the call will fail if the total number of
         *  tokens exceeds the `maximum sequence length`.
         */
        truncate_input_tokens?: number;
        /** Properties that control what is returned. */
        return_options?: ReturnOptionProperties;
        /** Pass `false` to omit matched stop sequences from the end of the output text. The default is `true`, meaning
         *  that the output will end with the stop sequence text when matched.
         */
        include_stop_sequence?: boolean;
    }
    namespace TextGenParameters {
        namespace Constants {
            /** Represents the strategy used for picking the tokens during generation of the output text. During text generation when parameter value is set to greedy, each successive token corresponds to the highest probability token given the text that has already been generated. This strategy can lead to repetitive results especially for longer output sequences. The alternative sample strategy generates text by picking subsequent tokens based on the probability distribution of possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k and top_p parameters described below. See this [url](https://huggingface.co/blog/how-to-generate) for an informative article about text generation. */
            enum DecodingMethod {
                SAMPLE = "sample",
                GREEDY = "greedy"
            }
        }
    }
    /** System details. */
    interface TextGenResponse {
        /** The `id` of the model for inference. */
        model_id: string;
        /** The model version (using semantic versioning) if set. */
        model_version?: string;
        /** The time when the response was created. */
        created_at: string;
        /** The generated tokens. */
        results: TextGenResponseFieldsResultsItem[];
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: SystemDetails;
    }
    /** TextGenResponseFieldsResultsItem. */
    interface TextGenResponseFieldsResultsItem {
        /** The text that was generated by the model. */
        generated_text: string;
        /** The reason why the call stopped, can be one of:
         *  - not_finished - Possibly more tokens to be streamed.
         *  - max_tokens - Maximum requested tokens reached.
         *  - eos_token - End of sequence token encountered.
         *  - cancelled - Request canceled by the client.
         *  - time_limit - Time limit reached.
         *  - stop_sequence - Stop sequence encountered.
         *  - token_limit - Token limit reached.
         *  - error - Error encountered.
         *
         *  Note that these values will be lower-cased so test for values case insensitive.
         */
        stop_reason: TextGenResponseFieldsResultsItem.Constants.StopReason | string;
        /** The number of generated tokens. */
        generated_token_count?: number;
        /** The number of input tokens consumed. */
        input_token_count?: number;
        /** The seed used, if it exists. */
        seed?: number;
        /** The list of individual generated tokens. Extra token information is included based on the other flags in the
         *  `return_options` of the request.
         */
        generated_tokens?: TextGenTokenInfo[];
        /** The list of input tokens. Extra token information is included based on the other flags in the
         *  `return_options` of the request, but for decoder-only models.
         */
        input_tokens?: TextGenTokenInfo[];
        /** The result of any detected moderations. */
        moderations?: ModerationResults;
    }
    namespace TextGenResponseFieldsResultsItem {
        namespace Constants {
            /** The reason why the call stopped, can be one of: - not_finished - Possibly more tokens to be streamed. - max_tokens - Maximum requested tokens reached. - eos_token - End of sequence token encountered. - cancelled - Request canceled by the client. - time_limit - Time limit reached. - stop_sequence - Stop sequence encountered. - token_limit - Token limit reached. - error - Error encountered. Note that these values will be lower-cased so test for values case insensitive. */
            enum StopReason {
                NOT_FINISHED = "not_finished",
                MAX_TOKENS = "max_tokens",
                EOS_TOKEN = "eos_token",
                CANCELLED = "cancelled",
                TIME_LIMIT = "time_limit",
                STOP_SEQUENCE = "stop_sequence",
                TOKEN_LIMIT = "token_limit",
                ERROR = "error"
            }
        }
    }
    /** The generated token. */
    interface TextGenTokenInfo {
        /** The token text. */
        text?: string;
        /** The natural log of probability for the token. */
        logprob?: number;
        /** The rank of the token relative to the other tokens. */
        rank?: number;
        /** The top tokens. */
        top_tokens?: TextGenTopTokenInfo[];
    }
    /** The top tokens. */
    interface TextGenTopTokenInfo {
        /** The token text. */
        text?: string;
        /** The natural log of probability for the token. */
        logprob?: number;
    }
    /** Properties that control the moderation on the text. */
    interface TextModeration {
        /** Should this moderation be enabled on the text.
         *
         *
         *  The default value is `true` which means that if the parent object exists but the `enabled` field does not exist
         *  then this is considered to be enabled.
         */
        enabled?: boolean;
        /** The threshold probability that this is a real match. */
        threshold?: number;
        /** TextModeration accepts additional properties. */
        [propName: string]: any;
    }
    /** Properties that control the moderation on the text. */
    interface TextModerationWithoutThreshold {
        /** Should this moderation be enabled on the text.
         *
         *
         *  The default value is `true` which means that if the parent object exists but the `enabled` field does not exist
         *  then this is considered to be enabled.
         */
        enabled?: boolean;
        /** TextModerationWithoutThreshold accepts additional properties. */
        [propName: string]: any;
    }
    /** The parameters for text tokenization. */
    interface TextTokenizeParameters {
        /** If this is `true` then the actual tokens will also be returned in the response. */
        return_tokens?: boolean;
    }
    /** The tokenization result. */
    interface TextTokenizeResponse {
        /** The `id` of the model to be used for this request. Please refer to the [list of
         *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
         */
        model_id: string;
        /** The result of tokenizing the input string. */
        result: TextTokenizeResult;
    }
    /** The result of tokenizing the input string. */
    interface TextTokenizeResult {
        /** The number of tokens in the input string. */
        token_count: number;
        /** The input string broken up into the tokens, if requested. */
        tokens?: string[];
    }
    /** Number of steps to be used for gradient accumulation. Gradient accumulation refers to a method of collecting gradient for configured number of steps instead of updating the model variables at every step and then applying the update to model variables. This can be used as a tool to overcome smaller batch size limitation. Often also referred in conjunction with "effective batch size". */
    interface TrainingAccumulatedSteps {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** The batch size is a number of samples processed before the model is updated. */
    interface TrainingBatchSize {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** Initialization methods for a training. */
    interface TrainingInitMethod {
        /** The supported initialization methods. */
        supported?: string[];
        /** The default value, which will be one of the values from the `supported` field. */
        default?: string;
    }
    /** Initialization text to be used if init_method is set to `text`, otherwise this will be ignored. */
    interface TrainingInitText {
        /** Initialization text. */
        default?: string;
    }
    /** Learning rate to be used for training. */
    interface TrainingLearningRate {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** Maximum length of input tokens being considered. */
    interface TrainingMaxInputTokens {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** Maximum length of output tokens being predicted. */
    interface TrainingMaxOutputTokens {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** A metric. */
    interface TrainingMetric {
        /** A timestamp for the metrics. */
        timestamp?: string;
        /** The iteration number. */
        iteration?: number;
        /** The metrics. */
        ml_metrics?: JsonObject;
        /** Provides extra information for this training stage in the context of auto-ml. */
        context?: MetricsContext;
    }
    /** The number of epochs is the number of complete passes through the training dataset. The quality depends on the number of epochs. */
    interface TrainingNumEpochs {
        /** The default value. */
        default?: number;
        /** The minimum value. */
        min?: number;
        /** The maximum value. */
        max?: number;
    }
    /** Number of virtual tokens to be used for training. In prompt tuning we are essentially learning the embedded representations for soft prompts, which are known as virtual tokens, via back propagation for a specific task(s) while keeping the rest of the model fixed. `num_virtual_tokens` is the number of dimensions for these virtual tokens. */
    interface TrainingNumVirtualTokens {
        /** The possible values for the number of virtual tokens. */
        supported?: number[];
        /** The default number of virtual tokens. */
        default?: number;
    }
    /** Training parameters for a given model. */
    interface TrainingParameters {
        /** Initialization methods for a training. */
        init_method?: TrainingInitMethod;
        /** Initialization text to be used if init_method is set to `text`, otherwise this will be ignored. */
        init_text?: TrainingInitText;
        /** Number of virtual tokens to be used for training.
         *  In prompt tuning we are essentially learning the embedded representations for soft prompts,
         *  which are known as virtual tokens, via back propagation for a specific task(s) while keeping
         *  the rest of the model fixed. `num_virtual_tokens` is the number of dimensions for these virtual tokens.
         */
        num_virtual_tokens?: TrainingNumVirtualTokens;
        /** The number of epochs is the number of complete passes through the training dataset.
         *  The quality depends on the number of epochs.
         */
        num_epochs?: TrainingNumEpochs;
        /** Verbalizer template to be used for formatting data at train and inference time.
         *  This template may use brackets to indicate where fields from the data model
         *  TrainGenerationRecord must be rendered.
         */
        verbalizer?: TrainingVerbalizer;
        /** The batch size is a number of samples processed before the model is updated. */
        batch_size?: TrainingBatchSize;
        /** Maximum length of input tokens being considered. */
        max_input_tokens?: TrainingMaxInputTokens;
        /** Maximum length of output tokens being predicted. */
        max_output_tokens?: TrainingMaxOutputTokens;
        /** Datatype to use for training of the underlying text generation model.
         *  If no value is provided, we pull from torch_dtype in config.
         *  If an in memory resource is provided which does not match the specified data type,
         *  the model underpinning the resource will be converted in place to the correct torch dtype.
         */
        torch_dtype?: TrainingTorchDtype;
        /** Number of steps to be used for gradient accumulation.
         *  Gradient accumulation refers to a method of collecting gradient for configured number of steps
         *  instead of updating the model variables at every step and then applying the update to model variables.
         *  This can be used as a tool to overcome smaller batch size limitation.
         *  Often also referred in conjunction with "effective batch size".
         */
        accumulate_steps?: TrainingAccumulatedSteps;
        /** Learning rate to be used for training. */
        learning_rate?: TrainingLearningRate;
    }
    /** Training resource. */
    interface TrainingResource {
        /** Common metadata for a resource where `project_id` or `space_id` must be present. */
        metadata?: ResourceMeta;
        /** Status of the training job. */
        entity?: TrainingResourceEntity;
    }
    /** Information for paging when querying resources. */
    interface TrainingResourceCollection {
        /** The total number of resources. Computed explicitly only when 'total_count=true' query parameter is present.
         *  This is in order to avoid performance penalties.
         */
        total_count?: number;
        /** The number of items to return in each page. */
        limit: number;
        /** The reference to the first item in the current page. */
        first: PaginationFirst;
        /** A reference to the first item of the next page, if any. */
        next?: PaginationNext;
        /** The training resources. */
        resources?: TrainingResource[];
        /** Optional details coming from the service and related to the API call or the associated resource. */
        system?: TrainingResourceCollectionSystem;
    }
    /** Optional details coming from the service and related to the API call or the associated resource. */
    interface TrainingResourceCollectionSystem {
        /** Any warnings coming from the system. */
        warnings?: Warning[];
    }
    /** Status of the training job. */
    interface TrainingResourceEntity {
        /** Properties to control the prompt tuning. */
        prompt_tuning?: PromptTuning;
        /** Training datasets. */
        training_data_references?: DataConnectionReference[];
        /** User defined properties specified as key-value pairs. */
        custom?: JsonObject;
        /** If set to `true` then the result of the training, if successful, will be uploaded to the repository as a
         *  model.
         */
        auto_update_model?: boolean;
        /** The training results. Normally this is specified as `type=container` which means that it is stored in the
         *  space or project. Note that the training will add some fields that point to the training status, the model
         *  request and the assets.
         *
         *  The `model_request_path` is the request body that should be used when creating the trained model in the API, if
         *  this model is to be deployed. If `auto_update_model` was set to `true` then this file is not needed.
         */
        results_reference: ObjectLocation;
        /** Status of the training job. */
        status: TrainingStatus;
    }
    /** Status of the training job. */
    interface TrainingStatus {
        /** Date and Time in which current training state has started. */
        running_at?: string;
        /** Date and Time in which training had completed. */
        completed_at?: string;
        /** Current state of training. */
        state: TrainingStatus.Constants.State | string;
        /** Optional messages related to the deployment. */
        message?: Message;
        /** Metrics that can be returned by an operation. */
        metrics?: TrainingMetric[];
        /** The data returned when an error is encountered. */
        failure?: ApiErrorResponse;
    }
    namespace TrainingStatus {
        namespace Constants {
            /** Current state of training. */
            enum State {
                QUEUED = "queued",
                PENDING = "pending",
                RUNNING = "running",
                STORING = "storing",
                COMPLETED = "completed",
                FAILED = "failed",
                CANCELED = "canceled"
            }
        }
    }
    /** Datatype to use for training of the underlying text generation model. If no value is provided, we pull from torch_dtype in config. If an in memory resource is provided which does not match the specified data type, the model underpinning the resource will be converted in place to the correct torch dtype. */
    interface TrainingTorchDtype {
        /** The datatype. */
        default?: string;
    }
    /** Verbalizer template to be used for formatting data at train and inference time. This template may use brackets to indicate where fields from the data model TrainGenerationRecord must be rendered. */
    interface TrainingVerbalizer {
        /** The default verbalizer. */
        default?: string;
    }
    /** A warning message. */
    interface Warning {
        /** The message. */
        message: string;
        /** An `id` associated with the message. */
        id?: string;
        /** A reference to a more detailed explanation when available. */
        more_info?: string;
        /** Additional key-value pairs that depend on the specific warning. */
        additional_properties?: JsonObject;
    }
    /** WxPromptPatchModelVersion. */
    interface WxPromptPatchModelVersion {
        /** User provided semantic version for tracking in IBM AI Factsheets. */
        number?: string;
        /** User provived tag. */
        tag?: string;
        /** Description of the version. */
        description?: string;
    }
    /** WxPromptPostModelVersion. */
    interface WxPromptPostModelVersion {
        /** User provided semantic version for tracking in IBM AI Factsheets. */
        number?: string;
        /** User provived tag. */
        tag?: string;
        /** Description of the version. */
        description?: string;
    }
    /** WxPromptResponseModelVersion. */
    interface WxPromptResponseModelVersion {
        /** User provided semantic version for tracking in IBM AI Factsheets. */
        number?: string;
        /** User provived tag. */
        tag?: string;
        /** Description of the version. */
        description?: string;
    }
    /** WxPromptSessionEntryListResultsItem. */
    interface WxPromptSessionEntryListResultsItem {
        /** The prompt entry's ID. */
        id?: string;
        /** The prompt entry's name. */
        name?: string;
        /** The prompt entry's description. */
        description?: string;
        /** The prompt entry's create time in millis. */
        created_at?: number;
    }
    /** ChatItem. */
    interface ChatItem {
        type?: ChatItem.Constants.Type | string;
        content?: string;
        status?: ChatItem.Constants.Status | string;
        timestamp?: number;
    }
    namespace ChatItem {
        namespace Constants {
            /** Type */
            enum Type {
                QUESTION = "question",
                ANSWER = "answer"
            }
            /** Status */
            enum Status {
                READY = "ready",
                ERROR = "error"
            }
        }
    }
    /** ExternalInformation. */
    interface ExternalInformation {
        external_prompt_id: string;
        external_model_id: string;
        external_model_provider: string;
        external_prompt?: ExternalInformationExternalPrompt;
        external_model?: ExternalInformationExternalModel;
    }
    /** Prompt. */
    interface Prompt {
        input?: string[][];
        model_id: string;
        model_parameters?: PromptModelParameters;
        data: PromptData;
        system_prompt?: string;
        chat_items?: ChatItem[];
    }
    /** PromptData. */
    interface PromptData {
        instruction?: string;
        input_prefix?: string;
        output_prefix?: string;
        examples?: string[][];
    }
    /** PromptLock. */
    interface PromptLock {
        /** True if the prompt is currently locked. */
        locked: boolean;
        /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock
         *  requests.
         */
        lock_type?: PromptLock.Constants.LockType | string;
        /** Locked by is computed by the server and shouldn't be passed. */
        locked_by?: string;
    }
    namespace PromptLock {
        namespace Constants {
            /** Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT /lock requests. */
            enum LockType {
                EDIT = "edit",
                GOVERNANCE = "governance"
            }
        }
    }
    /** PromptWithExternal. */
    interface PromptWithExternal {
        input?: string[][];
        model_id: string;
        model_parameters?: PromptWithExternalModelParameters;
        data: PromptData;
        system_prompt?: string;
        chat_items?: ChatItem[];
        external_information?: ExternalInformation;
    }
    /** WxPromptResponse. */
    interface WxPromptResponse {
        /** The prompt's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** Name used to display the prompt. */
        name: string;
        /** An optional description for the prompt. */
        description?: string;
        /** Time the prompt was created. */
        created_at?: number;
        /** The ID of the original prompt creator. */
        created_by?: string;
        /** Time the prompt was updated. */
        last_updated_at?: number;
        /** The ID of the last user that modifed the prompt. */
        last_updated_by?: string;
        task_ids?: string[];
        governance_tracked?: boolean;
        lock?: PromptLock;
        /** Input mode in use for the prompt. */
        input_mode?: WxPromptResponse.Constants.InputMode | string;
        model_version?: WxPromptResponseModelVersion;
        prompt_variables?: JsonObject;
        is_template?: boolean;
        resource_key?: string;
        prompt: PromptWithExternal;
    }
    namespace WxPromptResponse {
        namespace Constants {
            /** Input mode in use for the prompt. */
            enum InputMode {
                STRUCTURED = "structured",
                FREEFORM = "freeform",
                CHAT = "chat",
                DETACHED = "detached"
            }
        }
    }
    /** WxPromptSession. */
    interface WxPromptSession {
        /** The prompt session's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** Name used to display the prompt session. */
        name: string;
        /** An optional description for the prompt session. */
        description?: string;
        /** Time the session was created. */
        created_at?: number;
        /** The ID of the original session creator. */
        created_by?: string;
        /** Time the session was updated. */
        last_updated_at?: number;
        /** The ID of the last user that modifed the session. */
        last_updated_by?: string;
        lock?: PromptLock;
        prompts?: WxPromptSessionEntry[];
    }
    /** WxPromptSessionEntry. */
    interface WxPromptSessionEntry {
        /** The prompt's id. This value cannot be set. It is returned in responses only. */
        id?: string;
        /** Name used to display the prompt. */
        name: string;
        /** An optional description for the prompt. */
        description?: string;
        prompt_variables?: JsonObject;
        is_template?: boolean;
        /** Time the prompt was created. */
        created_at: number;
        /** Input mode in use for the prompt. */
        input_mode?: WxPromptSessionEntry.Constants.InputMode | string;
        prompt: Prompt;
    }
    namespace WxPromptSessionEntry {
        namespace Constants {
            /** Input mode in use for the prompt. */
            enum InputMode {
                STRUCTURED = "structured",
                FREEFORM = "freeform",
                CHAT = "chat"
            }
        }
    }
    /** WxPromptSessionEntryList. */
    interface WxPromptSessionEntryList {
        results?: WxPromptSessionEntryListResultsItem[];
        bookmark?: string;
    }
    /** The definition of an assistant message. */
    interface TextChatMessagesTextChatMessageAssistant extends TextChatMessages {
        /** The role of the messages author. */
        role: TextChatMessagesTextChatMessageAssistant.Constants.Role | string;
        /** The contents of the assistant message. Required unless `tool_calls` is specified. */
        content?: string;
        /** An optional name for the participant. Provides the model information to differentiate between participants
         *  of the same role.
         */
        name?: string;
        /** The refusal message by the assistant. */
        refusal?: string;
        /** The tool calls generated by the model, such as function calls. */
        tool_calls?: TextChatToolCall[];
    }
    namespace TextChatMessagesTextChatMessageAssistant {
        namespace Constants {
            /** The role of the messages author. */
            enum Role {
                ASSISTANT = "assistant",
                SYSTEM = "system",
                TOOL = "tool",
                USER = "system"
            }
        }
    }
    /** The definition of a system message. */
    interface TextChatMessagesTextChatMessageSystem extends TextChatMessages {
        /** The role of the messages author. */
        role: TextChatMessagesTextChatMessageSystem.Constants.Role | string;
        /** The contents of the system message. */
        content: string;
        /** An optional name for the participant. Provides the model information to differentiate between participants
         *  of the same role.
         */
        name?: string;
    }
    namespace TextChatMessagesTextChatMessageSystem {
        namespace Constants {
            /** The role of the messages author. */
            enum Role {
                ASSISTANT = "assistant",
                SYSTEM = "system",
                TOOL = "tool",
                USER = "user"
            }
        }
    }
    /** The definition of a tool message. */
    interface TextChatMessagesTextChatMessageTool extends TextChatMessages {
        /** The role of the messages author. */
        role: TextChatMessagesTextChatMessageTool.Constants.Role | string;
        /** The contents of the tool message. */
        content: string;
        /** Tool call that this message is responding to. */
        tool_call_id: string;
    }
    namespace TextChatMessagesTextChatMessageTool {
        namespace Constants {
            /** The role of the messages author. */
            enum Role {
                ASSISTANT = "assistant",
                SYSTEM = "system",
                TOOL = "tool",
                USER = "user"
            }
        }
    }
    /** The definition of a user message. */
    interface TextChatMessagesTextChatMessageUser extends TextChatMessages {
        /** The role of the messages author. */
        role: TextChatMessagesTextChatMessageUser.Constants.Role | string;
        content: TextChatUserContents[];
        /** An optional name for the participant. Provides the model information to differentiate between participants
         *  of the same role.
         */
        name?: string;
    }
    namespace TextChatMessagesTextChatMessageUser {
        namespace Constants {
            /** The role of the messages author. */
            enum Role {
                ASSISTANT = "assistant",
                SYSTEM = "system",
                TOOL = "tool",
                USER = "user"
            }
        }
    }
    /** The definition of a user image content. */
    interface TextChatUserContentsTextChatUserImageURLContent extends TextChatUserContents {
        /** The type of the user content. */
        type: TextChatUserContentsTextChatUserImageURLContent.Constants.Type | string;
        /** The definition of a user image content. */
        image_url: TextChatUserImageURL;
    }
    namespace TextChatUserContentsTextChatUserImageURLContent {
        namespace Constants {
            /** The type of the user content. */
            enum Type {
                TEXT = "text",
                IMAGE_URL = "image_url"
            }
        }
    }
    /** The definition of a user text content. */
    interface TextChatUserContentsTextChatUserTextContent extends TextChatUserContents {
        /** The type of the user content. */
        type: TextChatUserContentsTextChatUserTextContent.Constants.Type | string;
        /** The text content. */
        text: string;
    }
    namespace TextChatUserContentsTextChatUserTextContent {
        namespace Constants {
            /** The type of the user content. */
            enum Type {
                TEXT = "text",
                IMAGE_URL = "image_url"
            }
        }
    }
    /*************************
     * pager classes
     ************************/
    /**
     * FoundationModelSpecsPager can be used to simplify the use of listFoundationModelSpecs().
     */
    class FoundationModelSpecsPager {
        protected _hasNext: boolean;
        protected pageContext: any;
        protected client: WatsonxAiMlVml_v1;
        protected params: WatsonxAiMlVml_v1.ListFoundationModelSpecsParams;
        /**
         * Construct a FoundationModelSpecsPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listFoundationModelSpecs()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelSpecs()
         * @constructor
         * @returns {FoundationModelSpecsPager}
         */
        constructor(client: WatsonxAiMlVml_v1, params?: WatsonxAiMlVml_v1.ListFoundationModelSpecsParams);
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext(): boolean;
        /**
         * Returns the next page of results by invoking listFoundationModelSpecs().
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModel[]>}
         */
        getNext(): Promise<WatsonxAiMlVml_v1.FoundationModel[]>;
        /**
         * Returns all results by invoking listFoundationModelSpecs() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModel[]>}
         */
        getAll(): Promise<WatsonxAiMlVml_v1.FoundationModel[]>;
    }
    /**
     * FoundationModelTasksPager can be used to simplify the use of listFoundationModelTasks().
     */
    class FoundationModelTasksPager {
        protected _hasNext: boolean;
        protected pageContext: any;
        protected client: WatsonxAiMlVml_v1;
        protected params: WatsonxAiMlVml_v1.ListFoundationModelTasksParams;
        /**
         * Construct a FoundationModelTasksPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listFoundationModelTasks()
         * @param {Object} [params] - The parameters to be passed to listFoundationModelTasks()
         * @constructor
         * @returns {FoundationModelTasksPager}
         */
        constructor(client: WatsonxAiMlVml_v1, params?: WatsonxAiMlVml_v1.ListFoundationModelTasksParams);
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext(): boolean;
        /**
         * Returns the next page of results by invoking listFoundationModelTasks().
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>}
         */
        getNext(): Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>;
        /**
         * Returns all results by invoking listFoundationModelTasks() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>}
         */
        getAll(): Promise<WatsonxAiMlVml_v1.FoundationModelTask[]>;
    }
    /**
     * TrainingsListPager can be used to simplify the use of listTrainings().
     */
    class TrainingsListPager {
        protected _hasNext: boolean;
        protected pageContext: any;
        protected client: WatsonxAiMlVml_v1;
        protected params: WatsonxAiMlVml_v1.TrainingsListParams;
        /**
         * Construct a TrainingsListPager object.
         *
         * @param {WatsonxAiMlVml_v1}  client - The service client instance used to invoke listTrainings()
         * @param {Object} [params] - The parameters to be passed to listTrainings()
         * @constructor
         * @returns {TrainingsListPager}
         */
        constructor(client: WatsonxAiMlVml_v1, params?: WatsonxAiMlVml_v1.TrainingsListParams);
        /**
         * Returns true if there are potentially more results to be retrieved by invoking getNext().
         * @returns {boolean}
         */
        hasNext(): boolean;
        /**
         * Returns the next page of results by invoking listTrainings().
         * @returns {Promise<WatsonxAiMlVml_v1.TrainingResource[]>}
         */
        getNext(): Promise<WatsonxAiMlVml_v1.TrainingResource[]>;
        /**
         * Returns all results by invoking listTrainings() repeatedly until all pages of results have been retrieved.
         * @returns {Promise<WatsonxAiMlVml_v1.TrainingResource[]>}
         */
        getAll(): Promise<WatsonxAiMlVml_v1.TrainingResource[]>;
    }
}
export = WatsonxAiMlVml_v1;
