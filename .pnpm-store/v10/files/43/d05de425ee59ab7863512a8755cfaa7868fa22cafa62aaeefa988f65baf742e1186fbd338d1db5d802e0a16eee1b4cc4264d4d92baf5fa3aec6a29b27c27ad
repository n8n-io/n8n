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
/// <reference types="node" />
import type { UserOptions } from 'ibm-cloud-sdk-core';
import type { BaseServiceOptions } from 'ibm-cloud-sdk-core/es/lib/base-service.js';
import type * as Messages from "./messages.js";
import type { TextChatMessages, TextChatMessageSystem, TextChatMessageTool, TextChatMessageUser, TextChatToolCall, TextChatUserImageURLContent, TextChatUserTextContent } from "./messages.js";
import type { EncryptionParams } from "./encryption.js";
import type { JsonObject, DefaultParams } from "./common.js";
import type { ReadStream } from 'fs';
/** Options for the `WatsonXAI` constructor. */
export interface Options extends UserOptions {
    /** The version date for the API of the form `YYYY-MM-DD`. */
    version: string;
}
/** Request interfaces */
/** Parameters for the `createDeployment` operation. */
export interface CreateDeploymentParams extends DefaultParams {
    /** The name of the resource. */
    name: string;
    /**
     * Indicates that this is an online deployment. An object has to be specified but can be empty.
     * The `serving_name` can be provided in the `online.parameters`.
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
    /**
     * The base model that is required for this deployment if this is for a prompt template or a
     * prompt tune for an IBM foundation model.
     */
    baseModelId?: string;
    /**
     * The base deployment when this is a custom foundation model with a prompt template. The id must
     * be the id of the custom foundation model deployment.
     */
    baseDeploymentId?: string;
}
/** Parameters for the `listDeployments` operation. */
export interface ListDeploymentsParams extends DefaultParams {
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
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
    /**
     * Retrieves the resources filtered with the given type. There are the deployment types as well as
     * an additional `prompt_template` if the deployment type includes a prompt template.
     *
     * The supported deployment types are (see the description for `deployed_asset_type` in the
     * deployment entity):
     *
     * 1. `prompt_tune` - when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt
     *    template is used on a pre-deployed IBM provided model. 3. `custom_foundation_model`
     *
     *    - When a custom foundation model is deployed.
     *
     * These can be combined with the flag `prompt_template` like this:
     *
     * 1. `type=prompt_tune` - return all prompt tuned model deployments. 2. `type=prompt_tune and
     *    prompt_template` - return all prompt tuned model deployments with a prompt template. 3.
     *    `type=foundation_model` - return all prompt template deployments. 4. `type=foundation_model
     *    and prompt_template` - return all prompt template deployments
     *
     *    - This is the same as the previous query because a `foundation_model` can only exist with a
     *         prompt template.
     *
     *    5. `type=prompt_template` - return all deployments with a prompt template.
     */
    type?: string;
    /**
     * Retrieves the resources filtered by state. Allowed values are `initializing`, `updating`,
     * `ready` and `failed`.
     */
    state?: string;
    /**
     * Returns whether `serving_name` is available for use or not. This query parameter cannot be
     * combined with any other parameter except for `serving_name`.
     */
    conflict?: boolean;
}
/** Parameters for the `deploymentsGet` operation. */
export interface DeploymentsGetParams extends DefaultParams {
    /** The deployment id. */
    deploymentId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `deploymentsUpdate` operation. */
export interface DeploymentsUpdateParams extends DefaultParams {
    /** The deployment id. */
    deploymentId: string;
    /** The json patch. */
    jsonPatch: JsonPatchOperation[];
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `deploymentsDelete` operation. */
export interface DeploymentsDeleteParams extends DefaultParams {
    /** The deployment id. */
    deploymentId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `deploymentsTextGeneration` operation. */
export interface DeploymentsTextGenerationParams extends DefaultParams {
    /**
     * The `id_or_name` can be either the `deployment_id` that identifies the deployment or a
     * `serving_name` that allows a predefined URL to be used to post a prediction.
     *
     * The `project` or `space` for the deployment must have a WML instance that will be used for
     * limits and billing (if a paid plan).
     */
    idOrName: string;
    /**
     * The prompt to generate completions. Note: The method tokenizes the input internally. It is
     * recommended not to leave any trailing spaces.
     *
     * This field is ignored if there is a prompt template.
     */
    input?: string;
    /** The template properties if this request refers to a prompt template. */
    parameters?: DeploymentTextGenProperties;
    /**
     * Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and
     * `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     */
    moderations?: Moderations;
}
/** Parameters for the `deploymentsTextGenerationStream` operation. */
export interface DeploymentsTextGenerationStreamParams extends DefaultParams {
    /**
     * The `id_or_name` can be either the `deployment_id` that identifies the deployment or a
     * `serving_name` that allows a predefined URL to be used to post a prediction.
     *
     * The `project` or `space` for the deployment must have a WML instance that will be used for
     * limits and billing (if a paid plan).
     */
    idOrName: string;
    /**
     * The prompt to generate completions. Note: The method tokenizes the input internally. It is
     * recommended not to leave any trailing spaces.
     *
     * This field is ignored if there is a prompt template.
     */
    input?: string;
    /** The template properties if this request refers to a prompt template. */
    parameters?: DeploymentTextGenProperties;
    /**
     * Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and
     * `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     */
    moderations?: Moderations;
    returnObject?: boolean;
}
/** Parameters for the `deploymentsTextChat` operation. */
export interface DeploymentsTextChatParams extends TextChatParameters, DefaultParams {
    /**
     * The `id_or_name` can be either the `deployment_id` that identifies the deployment or a
     * `serving_name` that allows a predefined URL to be used to post a prediction. The deployment
     * must reference a prompt template with `input_mode` `chat`.
     *
     * The WML instance that is associated with the deployment will be used for limits and billing (if
     * a paid plan).
     */
    idOrName: string;
    /**
     * The messages for this chat session. You cannot specify `system` `role` in the messages.
     * Depending on the model, the `content` of `system` `role` may be from `system_prompt` of the
     * prompt template, and will be automatically inserted into `messages`.
     *
     * As an example, depending on the model, if `system_prompt` of a prompt template is "You are
     * Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You
     * carefully follow instructions. You are helpful and harmless and you follow ethical guidelines
     * and promote positive behavior.", a message with `system` `role` having `content` the same as
     * `system_prompt` is inserted.
     */
    messages: DeploymentTextChatMessages[];
    /**
     * If specified, `context` will be inserted into `messages`. Depending on the model, `context` may
     * be inserted into the `content` with `system` `role`; or into the `content` of the last message
     * of `user` `role`.
     *
     * In the example, `context` "Today is Wednesday" is inserted as such `content` of `user` becomes
     * "Today is Wednesday. Who are you and which day is tomorrow?".
     */
    context?: string;
}
/** Parameters for the `deploymentsTextChatStream` operation. */
export interface DeploymentsTextChatStreamParams extends DeploymentsTextChatParams {
    returnObject?: boolean;
}
/** Parameters for the `deploymentsTimeSeriesForecast` operation. */
export interface DeploymentsTimeSeriesForecastParams extends DefaultParams {
    /**
     * The `id_or_name` can be either the `deployment_id` that identifies the deployment or a
     * `serving_name` that allows a predefined URL to be used to post a prediction.
     *
     * The WML instance that is associated with the deployment will be used for limits and billing (if
     * a paid plan).
     */
    idOrName: string;
    /**
     * A payload of data matching `schema`. We assume the following about your data:
     *
     * - All timeseries are of equal length and are uniform in nature (the time difference between two
     *   successive rows is constant). This implies that there are no missing rows of data;
     * - The data meet the minimum model-dependent historical context length which can be any number of
     *   rows per timeseries;
     *
     * Note that the example payloads shown are for illustration purposes only. An actual payload
     * would necessary be much larger to meet minimum model-specific context lengths.
     */
    data: JsonObject;
    /** Contains metadata about your timeseries data input. */
    schema: TSForecastInputSchema;
    /** The parameters for the forecast request. */
    parameters?: DeploymentTSForecastParameters;
    /**
     * Exogenous or supporting features that extend into the forecasting horizon (e.g., a weather
     * forecast or calendar of special promotions) which are known in advance. `future_data` would be
     * in the same format as `data` except that all timestamps would be in the forecast horizon and it
     * would not include previously specified `target_columns`.
     */
    futureData?: JsonObject;
}
/** Parameters for the `listFoundationModelSpecs` operation. */
export interface ListFoundationModelSpecsParams extends DefaultParams {
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
    limit?: number;
    /**
     * A set of filters to specify the list of models, filters are described as the `pattern` shown
     * below.
     *
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
     * ```
     */
    filters?: string;
    /** See all the `Tech Preview` models if entitled. */
    techPreview?: boolean;
}
/** Parameters for the `listFoundationModelTasks` operation. */
export interface ListFoundationModelTasksParams extends DefaultParams {
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
    limit?: number;
}
/** Parameters for the `postPrompt` operation. */
export interface PostPromptParams extends DefaultParams {
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
}
/** Constants for the `postPrompt` operation. */
export declare namespace PostPromptConstants {
    /** Input mode in use for the prompt. */
    enum InputMode {
        STRUCTURED = "structured",
        FREEFORM = "freeform",
        CHAT = "chat",
        DETACHED = "detached"
    }
}
/** Parameters for the `getPrompt` operation. */
export interface GetPromptParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
    /** Only return a set of model parameters compatiable with inferencing. */
    restrictModelParameters?: string;
}
export interface CatalogSearch {
    /**
     * The limit request body field can be specified to limit the number of assets in the search
     * results. The default limit is 200. The maximum limit value is 200, and any greater value is
     * ignored.
     */
    limit?: number;
    /** Returns the number of query results for each unique value of each named field. */
    counts?: string[];
    /**
     * Restrict results to documents with a dimension equal to the specified label. Note that,
     * multiple values for a single key in a drilldown means an OR relation between them and there is
     * an AND relation between multiple keys.
     */
    drilldown?: Record<string, any>;
    /** Bookmark of the query result */
    bookmark?: string;
    /** Sort order for the query */
    sort?: string;
    /** Entity */
    include?: string;
}
export interface PromptListParams extends DefaultParams, CatalogSearch {
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
}
/** Parameters for the `patchPrompt` operation. */
export interface PatchPromptParams extends DefaultParams {
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
}
/** Constants for the `patchPrompt` operation. */
export declare namespace PatchPromptConstants {
    /** Input mode in use for the prompt. */
    enum InputMode {
        STRUCTURED = "structured",
        FREEFORM = "freeform"
    }
}
/** Parameters for the `deletePrompt` operation. */
export interface DeletePromptParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
}
/** Parameters for the `putPromptLock` operation. */
export interface PutPromptLockParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    /** True if the prompt is currently locked. */
    locked: boolean;
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
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
}
/** Constants for the `putPromptLock` operation. */
export declare namespace PutPromptLockConstants {
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    enum LockType {
        EDIT = "edit",
        GOVERNANCE = "governance"
    }
}
/** Parameters for the `getPromptLock` operation. */
export interface GetPromptLockParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `getPromptInput` operation. */
export interface GetPromptInputParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    /**
     * Override input string that will be used to generate the response. The string can contain
     * template parameters.
     */
    input?: string;
    /**
     * Supply only to replace placeholders. Object content must be key:value pairs where the 'key' is
     * the parameter to replace and 'value' is the value to use.
     */
    promptVariables?: JsonObject;
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `postPromptChatItem` operation. */
export interface PostPromptChatItemParams extends DefaultParams {
    /** Prompt ID. */
    promptId: string;
    chatItem: ChatItem[];
    /** [REQUIRED] Specifies the space ID as the target. One target must be supplied per request. */
    spaceId?: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `postPromptSession` operation. */
export interface PostPromptSessionParams extends DefaultParams {
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
}
/** Parameters for the `getPromptSession` operation. */
export interface GetPromptSessionParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** Include the most recent entry. */
    prefetch?: boolean;
}
/** Parameters for the `patchPromptSession` operation. */
export interface PatchPromptSessionParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    name?: string;
    /** An optional description for the prompt. */
    description?: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `deletePromptSession` operation. */
export interface DeletePromptSessionParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `postPromptSessionEntry` operation. */
export interface PostPromptSessionEntryParams extends DefaultParams {
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
}
/** Constants for the `postPromptSessionEntry` operation. */
export declare namespace PostPromptSessionEntryConstants {
    /** Input mode in use for the prompt. */
    enum InputMode {
        STRUCTURED = "structured",
        FREEFORM = "freeform",
        CHAT = "chat"
    }
}
/** Parameters for the `getPromptSessionEntries` operation. */
export interface GetPromptSessionEntriesParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** Bookmark from a previously limited get request. */
    bookmark?: string;
    /** Limit for results to retrieve, default 20. */
    limit?: string;
}
/** Parameters for the `postPromptSessionEntryChatItem` operation. */
export interface PostPromptSessionEntryChatItemParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** Prompt Session Entry ID. */
    entryId: string;
    chatItem: ChatItem[];
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `putPromptSessionLock` operation. */
export interface PutPromptSessionLockParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** True if the prompt is currently locked. */
    locked: boolean;
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    lockType?: PutPromptSessionLockConstants.LockType | string;
    /** Locked by is computed by the server and shouldn't be passed. */
    lockedBy?: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
    /** Override a lock if it is currently taken. */
    force?: boolean;
}
/** Constants for the `putPromptSessionLock` operation. */
export declare namespace PutPromptSessionLockConstants {
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    enum LockType {
        EDIT = "edit",
        GOVERNANCE = "governance"
    }
}
/** Parameters for the `getPromptSessionLock` operation. */
export interface GetPromptSessionLockParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `getPromptSessionEntry` operation. */
export interface GetPromptSessionEntryParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** Prompt Session Entry ID. */
    entryId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Parameters for the `deletePromptSessionEntry` operation. */
export interface DeletePromptSessionEntryParams extends DefaultParams {
    /** Prompt Session ID. */
    sessionId: string;
    /** Prompt Session Entry ID. */
    entryId: string;
    /** [REQUIRED] Specifies the project ID as the target. One target must be supplied per request. */
    projectId?: string;
}
/** Constants for the `textChat` operation. */
export declare namespace TextChatConstants {
    /**
     * Using `none` means the model will not call any tool and instead generates a message. **The
     * following options (`auto` and `required`) are not yet supported.** Using `auto` means the model
     * can pick between generating a message or calling one or more tools. Using `required` means the
     * model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be
     * present.
     */
    enum ToolChoiceOption {
        NONE = "none",
        AUTO = "auto",
        REQUIRED = "required"
    }
}
interface TextChatParameters {
    tools?: TextChatParameterTools[];
    /**
     * Using `none` means the model will not call any tool and instead generates a message.
     *
     * **The following options (`auto` and `required`) are not yet supported.**
     *
     * Using `auto` means the model can pick between generating a message or calling one or more
     * tools. Using `required` means the model must call one or more tools.
     *
     * Only one of `tool_choice_option` or `tool_choice` must be present.
     */
    toolChoiceOption?: TextChatConstants.ToolChoiceOption | string;
    /**
     * Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}`
     * forces the model to call that tool.
     *
     * Only one of `tool_choice_option` or `tool_choice` must be present.
     */
    toolChoice?: TextChatToolChoiceTool;
    /**
     * Positive values penalize new tokens based on their existing frequency in the text so far,
     * decreasing the model's likelihood to repeat the same line verbatim.
     */
    frequencyPenalty?: number;
    /**
     * Increasing or decreasing probability of tokens being selected during generation; a positive
     * bias makes a token more likely to appear, while a negative bias makes it less likely.
     */
    logitBias?: JsonObject;
    /**
     * Whether to return log probabilities of the output tokens or not. If true, returns the log
     * probabilities of each output token returned in the content of message.
     */
    logprobs?: boolean;
    /**
     * An integer specifying the number of most likely tokens to return at each token position, each
     * with an associated log probability. The option `logprobs` must be set to `true` if this
     * parameter is used.
     */
    topLogprobs?: number;
    /**
     * The maximum number of tokens that can be generated in the chat completion. The total length of
     * input tokens and generated tokens is limited by the model's context length. Set to 0 for the
     * model's configured max generated tokens. This value is now deprecated in favor of
     * maxCompletionTokens. If specified together with maxCompletionTokens, maxTokens will be
     * ignored.
     */
    maxTokens?: number;
    /**
     * The maximum number of tokens that can be generated in the chat completion. The total length of
     * input tokens and generated tokens is limited by the model's context length. Set to 0 for the
     * model's configured max generated tokens.
     */
    maxCompletionTokens?: number;
    /**
     * How many chat completion choices to generate for each input message. Note that you will be
     * charged based on the number of generated tokens across all of the choices. Keep n as 1 to
     * minimize costs.
     */
    n?: number;
    /**
     * Positive values penalize new tokens based on whether they appear in the text so far, increasing
     * the model's likelihood to talk about new topics.
     */
    presencePenalty?: number;
    /** The chat response format parameters. */
    responseFormat?: TextChatResponseFormat;
    /** Random number generator seed to use in sampling mode for experimental repeatability. */
    seed?: number;
    /**
     * Stop sequences are one or more strings which will cause the text generation to stop if/when
     * they are produced as part of the output. Stop sequences encountered prior to the minimum number
     * of tokens being generated will be ignored.
     */
    stop?: string[];
    /**
     * What sampling temperature to use,. Higher values like 0.8 will make the output more random,
     * while lower values like 0.2 will make it more focused and deterministic.
     *
     * We generally recommend altering this or `top_p` but not both.
     */
    temperature?: number;
    /**
     * An alternative to sampling with temperature, called nucleus sampling, where the model considers
     * the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising
     * the top 10% probability mass are considered.
     *
     * We generally recommend altering this or `temperature` but not both.
     */
    topP?: number;
    /**
     * Time limit in milliseconds - if not completed within this time, generation will stop. The text
     * generated so far will be returned along with the `TIME_LIMIT`` stop reason. Depending on the
     * users plan, and on the model being used, there may be an enforced maximum time limit.
     */
    timeLimit?: number;
    /**
     * Represents the penalty for penalizing tokens that have already been generated or belong to the
     * context.
     */
    repetitionPenalty?: number;
    /**
     * Exponential penalty to the length that is used with beam-based generation. It is applied as an
     * exponent to the sequence length, which in turn is used to divide the score of the sequence.
     * Since the score is the log likelihood of the sequence (i.e. negative), `lengthPenalty` > 0.0
     * promotes longer sequences, while `lengthPenalty` < 0.0 encourages shorter sequences.
     */
    lengthPenalty?: number;
    /** Whether to include reasoning_content in the response. Default is true. */
    includeReasoning?: boolean;
    /**
     * A lower reasoning effort can result in faster responses, fewer tokens used, and shorter
     * reasoning_content in the responses. Supported values are low, medium, and high.
     */
    reasoningEffort?: 'low' | 'medium' | 'high';
}
/** Parameters for the `textChat` operation. */
export interface TextChatParams extends TextChatParameters, DefaultParams, EncryptionParams {
    /**
     * The model to use for the chat completion.
     *
     * Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     */
    modelId: string;
    /** The messages for this chat session. */
    messages: TextChatMessages[];
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** If specified, the output will be exactly one of the choices. */
    guidedChoice?: string[];
    /** If specified, the output will follow the regex pattern. */
    guidedRegex?: string;
    /** If specified, the output will follow the context free grammar. */
    guidedGrammar?: string;
    /**
     * If specified, the output will follow the JSON schema. See the JSON Schema reference for
     * documentation about the format.
     */
    guidedJSON?: string;
}
/** Parameters for the `textChatStream` operation. */
export interface TextChatStreamParams extends TextChatParams {
    returnObject?: boolean;
    crypto?: undefined;
}
/** Constants for the `textChatStream` operation. */
export declare namespace TextChatStreamConstants {
    /**
     * Using `none` means the model will not call any tool and instead generates a message. **The
     * following options (`auto` and `required`) are not yet supported.** Using `auto` means the model
     * can pick between generating a message or calling one or more tools. Using `required` means the
     * model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be
     * present.
     */
    enum ToolChoiceOption {
        NONE = "none",
        AUTO = "auto",
        REQUIRED = "required"
    }
}
/** Parameters for the `textEmbeddings` operation. */
export interface TextEmbeddingsParams extends DefaultParams, EncryptionParams {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
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
}
/** Parameters for the `textExtraction` operation. */
export interface TextExtractionParams extends DefaultParams {
    /** A reference to data. */
    documentReference: TextExtractionDataReference;
    /** A reference to data. */
    resultsReference: TextExtractionDataReference;
    /** The steps for the text extraction pipeline. */
    steps?: TextExtractionSteps;
    /**
     * Set this as an empty object to specify `json` output.
     *
     * Note that this is not strictly required because if an `assembly_md` object is not found then
     * the default will be `json`.
     */
    assemblyJson?: JsonObject;
    /** Set this as an empty object to specify `markdown` output. */
    assemblyMd?: JsonObject;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
}
/** Parameters for the `listTextExtractions` operation. */
export interface ListTextExtractionsParams extends DefaultParams {
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
    limit?: number;
}
/** Parameters for the `textExtractionGet` operation. */
export interface TextExtractionGetParams extends DefaultParams {
    /** The identifier of the extraction request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `textExtractionDelete` operation. */
export interface TextExtractionDeleteParams extends DefaultParams {
    /** The identifier of the extraction request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** Set to true in order to also delete the job or request metadata. */
    hardDelete?: boolean;
}
/** Parameters for the `textGeneration` operation. */
export interface TextGenerationParams extends DefaultParams, EncryptionParams {
    /**
     * The prompt to generate completions. Note: The method tokenizes the input internally. It is
     * recommended not to leave any trailing spaces.
     */
    input: string;
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     */
    modelId: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** Properties that control the model and response. */
    parameters?: TextGenParameters;
    /**
     * Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and
     * `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     */
    moderations?: Moderations;
}
/** Parameters for the `textGenerationStream` operation. */
export interface TextGenerationStreamParams extends DefaultParams {
    /**
     * The prompt to generate completions. Note: The method tokenizes the input internally. It is
     * recommended not to leave any trailing spaces.
     */
    input: string;
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     */
    modelId: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** Properties that control the model and response. */
    parameters?: TextGenParameters;
    /**
     * Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and
     * `Personal identifiable information` (PII) filtering. This list can be extended with new types
     * of moderations.
     */
    moderations?: Moderations;
    returnObject?: boolean;
}
/** Parameters for the `textTokenization` operation. */
export interface TextTokenizationParams extends DefaultParams, EncryptionParams {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
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
}
/** Parameters for the `trainingsCreate` operation. */
export interface TrainingsCreateParams extends DefaultParams {
    /** The name of the training. */
    name: string;
    /**
     * The training results. Normally this is specified as `type=container` which means that it is
     * stored in the space or project.
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
    /**
     * If set to `true` then the result of the training, if successful, will be uploaded to the
     * repository as a model.
     */
    autoUpdateModel?: boolean;
}
/** Parameters for the `trainingsList` operation. */
export interface TrainingsListParams extends DefaultParams {
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
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
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Constants for the `trainingsList` operation. */
export declare namespace TrainingsListConstants {
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
export interface TrainingsGetParams extends DefaultParams {
    /** The training identifier. */
    trainingId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `trainingsDelete` operation. */
export interface TrainingsDeleteParams extends DefaultParams {
    /** The training identifier. */
    trainingId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** Set to true in order to also delete the job or request metadata. */
    hardDelete?: boolean;
}
/** Parameters for the `textRerank` operation. */
export interface TextRerankParams extends DefaultParams, EncryptionParams {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
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
}
/** Parameters for the `timeSeriesForecast` operation. */
export interface TimeSeriesForecastParams extends DefaultParams {
    /** The model to be used for generating a forecast. */
    modelId: string;
    /**
     * A payload of data matching `schema`. We assume the following about your data:
     *
     * - All timeseries are of equal length and are uniform in nature (the time difference between two
     *   successive rows is constant). This implies that there are no missing rows of data;
     * - The data meet the minimum model-dependent historical context length which can be 512 or more
     *   rows per timeseries;
     *
     * Note that the example payloads shown are for illustration purposes only. An actual payload
     * would necessary be much larger to meet minimum model-specific context lengths.
     */
    data: JsonObject;
    /** Contains metadata about your timeseries data input. */
    schema: TSForecastInputSchema;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The parameters for the forecast request. */
    parameters?: TSForecastParameters;
}
/** Parameters for the `createFineTuning` operation. */
export interface CreateFineTuningParams extends DefaultParams {
    /** The name of the job. */
    name: string;
    /** The training datasets. */
    trainingDataReferences: ObjectLocation[];
    /**
     * The training results. Normally this is specified as `type=container` which means that it is
     * stored in the space or project.
     */
    resultsReference: ObjectLocation;
    /** The description of the job. */
    description?: string;
    /** A list of tags for this resource. */
    tags?: string[];
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * If set to `true` then the result of the training, if successful, will be uploaded to the
     * repository as a model.
     */
    autoUpdateModel?: boolean;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The parameters for the job. Note that if `verbalizer` is provided then `response_template` must
     * also be provided (and vice versa).
     */
    parameters?: FineTuningParameters;
    /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
    type?: CreateFineTuningConstants.Type | string;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The holdout/test datasets.
     */
    testDataReferences?: ObjectLocation[];
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
}
/** Constants for the `createFineTuning` operation. */
export declare namespace CreateFineTuningConstants {
    /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
    enum Type {
        ILAB = "ilab"
    }
}
/** Parameters for the `fineTuningList` operation. */
export interface FineTuningListParams extends DefaultParams {
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. */
    limit?: number;
    /** Compute the total count. May have performance impact. */
    totalCount?: boolean;
    /** Return only the resources with the given tag value. */
    tagValue?: string;
    /** Filter based on on the job state: queued, running, completed, failed etc. */
    state?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** The type of Fine Tuning training. The type is set to ilab for InstructLab training. */
    type?: string;
}
/** Parameters for the `getFineTuning` operation. */
export interface GetFineTuningParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `deleteFineTuning` operation. */
export interface DeleteFineTuningParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** Set to true in order to also delete the job or request metadata. */
    hardDelete?: boolean;
}
/** Parameters for the `createDocumentExtraction` operation. */
export interface CreateDocumentExtractionParams extends DefaultParams {
    /** The name of the document. */
    name: string;
    /** The documents for text extraction. */
    documentReferences: DocumentExtractionObjectLocation[];
    /** A reference to data. */
    resultsReference: ObjectLocationGithub;
    /** A list of tags for this resource. */
    tags?: string[];
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
}
/** Parameters for the `listDocumentExtractions` operation. */
export interface ListDocumentExtractionsParams extends DefaultParams {
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `getDocumentExtraction` operation. */
export interface GetDocumentExtractionParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `cancelDocumentExtractions` operation. */
export interface CancelDocumentExtractionsParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /** Set to true in order to also delete the job metadata information. */
    hardDelete?: boolean;
}
/** Parameters for the `createSyntheticDataGeneration` operation. */
export interface CreateSyntheticDataGenerationParams extends DefaultParams {
    /** The name of the data. */
    name: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** A reference to data. */
    dataReference?: SyntheticDataGenerationDataReference;
    /** A reference to data. */
    resultsReference?: ObjectLocation;
}
/** Parameters for the `listSyntheticDataGenerations` operation. */
export interface ListSyntheticDataGenerationsParams extends DefaultParams {
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `getSyntheticDataGeneration` operation. */
export interface GetSyntheticDataGenerationParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `cancelSyntheticDataGeneration` operation. */
export interface CancelSyntheticDataGenerationParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /** Set to true in order to also delete the job metadata information. */
    hardDelete?: boolean;
}
/** Parameters for the `createTaxonomy` operation. */
export interface CreateTaxonomyParams extends DefaultParams {
    /** The name of the document. */
    name: string;
    /** The description of the Taxonomy job. */
    description?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** A reference to data. */
    dataReference?: ObjectLocation;
    /**
     * The training results. Normally this is specified as `type=container` which means that it is
     * stored in the space or project.
     */
    resultsReference: ObjectLocation;
}
/** Parameters for the `listTaxonomies` operation. */
export interface ListTaxonomiesParams extends DefaultParams {
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `getTaxonomy` operation. */
export interface GetTaxonomyParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
}
/** Parameters for the `deleteTaxonomy` operation. */
export interface DeleteTaxonomyParams extends DefaultParams {
    /** The `id` is the identifier that was returned in the `metadata.id` field of the request. */
    id: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /** Set to `true` in order to also delete the job metadata information. */
    hardDelete?: boolean;
}
export interface ModelsCreateParams extends DefaultParams {
    /** The name of the resource. */
    name: string;
    /**
     * The model type. The supported model types can be found in the documentation
     * [here](https://dataplatform.cloud.ibm.com/docs/content/wsj/wmls/wmls-deploy-python-types.html?context=analytics).
     */
    type: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
    /** A description of the resource. */
    description?: string;
    /** A list of tags for this resource. */
    tags?: string[];
    /** A software specification. */
    softwareSpec?: SoftwareSpecRel;
    /** A reference to a resource. */
    pipeline?: Rel;
    /** The model definition. */
    modelDefinition?: ModelDefinitionId;
    /** Hyper parameters used for training this model. */
    hyperParameters?: JsonObject;
    /**
     * User provided domain name for this model. For example: sentiment, entity, visual-recognition,
     * finance, retail, real estate etc.
     */
    domain?: string;
    /** The training data that was used to create this model. */
    trainingDataReferences?: DataConnectionReference[];
    /** The holdout/test datasets. */
    testDataReferences?: DataConnectionReference[];
    /**
     * If the prediction schemas are provided here then they take precedent over any schemas provided
     * in the data references. Note that data references contain the schema for the associated data
     * and this object contains the schema(s) for the associated prediction, if any. In the case that
     * the prediction input data matches exactly the schema of the training data references then the
     * prediction schema can be omitted. However it is highly recommended to always specify the
     * prediction schemas using this field.
     */
    schemas?: ModelEntitySchemas;
    /** The name of the label column. */
    labelColumn?: string;
    /**
     * The name of the label column seen by the estimator, which may have been transformed by the
     * previous transformers in the pipeline. This is not necessarily the same column as the
     * `label_column` in the initial data set.
     */
    transformedLabelColumn?: string;
    /** This will be used by scoring to record the size of the model. */
    size?: ModelEntitySize;
    /** Metrics that can be returned by an operation. */
    metrics?: Metric[];
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /**
     * User defined objects referenced by the model. For any user defined class or function used in
     * the model, its name, as referenced in the model, must be specified as the `key` and its fully
     * qualified class or function name must be specified as the `value`. This is applicable for
     * `Tensorflow 2.X` models serialized in `H5` format using the `tf.keras` API.
     */
    userDefinedObjects?: JsonObject;
    /**
     * The list of the software specifications that are used by the pipeline that generated this
     * model, if the model was generated by a pipeline.
     */
    hybridPipelineSoftwareSpecs?: SoftwareSpecRel[];
    /**
     * Optional metadata that can be used to provide information about this model that can be tracked
     * with IBM AI Factsheets. See [Using AI
     * Factsheets](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/factsheets-model-inventory.html)
     * for more details.
     */
    modelVersion?: ModelEntityModelVersion;
    /**
     * Deprecated: this is replaced by `training.id`. This field can be used to store the `id` of the
     * training job that was used to produce this model.
     */
    trainingId?: string;
    /**
     * An optional array which contains the data preprocessing transformations that were executed by
     * the training job that created this model.
     */
    dataPreprocessing?: DataPreprocessingTransformation[];
    /** Information about the training job that created this model. */
    training?: TrainingDetails;
    /** Details about the attachments that should be uploaded with this model. */
    contentLocation?: ContentLocation;
    /** The model id of the base model for this job. */
    foundationModel?: BaseModel;
}
/** Parameters for the `modelsList` operation. */
export interface ModelsListParams extends DefaultParams {
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
    limit?: number;
    /**
     * Return only the resources with the given tag values, separated by `or` or `and` to support
     * multiple tags.
     */
    tagValue?: string;
    /**
     * Returns only resources that match this search string. The path to the field must be the
     * complete path to the field, and this field must be one of the indexed fields for this resource
     * type. Note that the search string must be URL encoded.
     */
    search?: string;
}
/** Parameters for the `modelsGet` operation. */
export interface ModelsGetParams extends DefaultParams {
    /** Model identifier. */
    modelId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** The revision number of the resource. */
    rev?: string;
}
/** Parameters for the `modelsUpdate` operation. */
export interface ModelsUpdateParams extends DefaultParams {
    /** Model identifier. */
    modelId: string;
    /**
     * Input For Patch. This is the patch body which corresponds to the JavaScript Object Notation
     * (JSON) Patch standard (RFC 6902).
     */
    jsonPatch: JsonPatchOperation[];
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `modelsDelete` operation. */
export interface ModelsDeleteParams extends DefaultParams {
    /** Model identifier. */
    modelId: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `listUtilityAgentTools` operation. */
export interface GetUtilityAgentToolsParams extends DefaultParams {
}
/** Parameters for the `getUtilityAgentTool` operation. */
export interface GetUtilityAgentToolParams extends DefaultParams {
    /** Tool name. */
    toolId: string;
}
/** Parameters for the `runUtilityAgentTool` operation. */
export interface PostUtilityAgentToolsRunParams extends DefaultParams {
    wxUtilityAgentToolsRunRequest: WxUtilityAgentToolsRunRequest;
}
/** Parameters for the `runUtilityAgentToolByName` operation. */
export interface PostUtilityAgentToolsRunByNameParams extends DefaultParams {
    /** Tool name. */
    toolId: string;
    wxUtilityAgentToolsRunRequest: WxUtilityAgentToolsRunRequest;
}
export interface ListSpacesParams extends DefaultParams {
    start?: string;
    limit?: number;
    totalCount?: boolean;
    id?: string;
    tags?: string;
    include?: string;
    member?: string;
    roles?: string;
    bssAccountId?: string;
    name?: string;
    subName?: string;
    computeCrn?: string;
    type?: string;
}
export interface CreateSpaceParams extends DefaultParams {
    name: string;
    description?: string;
    storage?: SpaceStorage;
    compute?: SpaceCompute[];
    tags?: string[];
    generator?: string;
    stage?: SpaceStage;
    type?: string;
    settings?: SpaceSettings;
}
export interface SpaceStorage {
    resource_crn: string;
    delegated?: boolean;
    plan_id?: string;
}
export interface SpaceCompute {
    name: string;
    crn: string;
}
export interface SpaceStage {
    production?: boolean;
    name?: string;
}
export interface SpaceSettings {
    folders?: {
        enabled?: boolean;
    };
    access_restrictions?: {
        reporting?: {
            authorized?: boolean;
        };
    };
}
export interface SpaceMember {
    role: string;
    id: string;
    state: string;
    type: string;
}
export interface GetSpaceParams extends DefaultParams {
    spaceId: string;
    include?: string;
}
export interface DeleteSpaceParams extends DefaultParams {
    spaceId: string;
}
export type SpacePatchOperation = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
export interface SpacePatchParams extends DefaultParams {
    spaceId: string;
    jsonPatch: JsonPatchOperation[];
}
/** Parameters for `transcribeAudio` method */
export interface TranscribeAudioParams extends DefaultParams {
    /** The model to use for audio transcriptions. */
    model: string;
    /** The path to a mp3 or wav audio file to transcribe. */
    file: string | ReadStream;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * Optional target language to which to transcribe; for example, fr for French. Default is
     * English.
     */
    language?: string;
}
/** Parameters for the `textClassification` operation. */
export interface TextClassificationParams extends DefaultParams {
    /** A reference to data. */
    documentReference: TextClassificationDataReference;
    /** The parameters for the text extraction. */
    parameters: TextClassificationParameters;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    projectId?: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    spaceId?: string;
}
/** Parameters for the `listTextClassifications` operation. */
export interface ListTextClassificationsParams extends DefaultParams {
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /**
     * Token required for token-based pagination. This token cannot be determined by end user. It is
     * generated by the service and it is set in the href available in the `next` field.
     */
    start?: string;
    /** How many resources should be returned. By default limit is 100. Max limit allowed is 200. */
    limit?: number;
}
/** Parameters for the `textClassificationGet` operation. */
export interface TextClassificationGetParams extends DefaultParams {
    /** The identifier of the classification request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
}
/** Parameters for the `textClassificationDelete` operation. */
export interface TextClassificationDeleteParams extends DefaultParams {
    /** The identifier of the classification request. */
    id: string;
    /**
     * The space that contains the resource. Either `space_id` or `project_id` query parameter has to
     * be given.
     */
    spaceId?: string;
    /**
     * The project that contains the resource. Either `space_id` or `project_id` query parameter has
     * to be given.
     */
    projectId?: string;
    /** Set to true in order to also delete the job or request metadata. */
    hardDelete?: boolean;
}
/** Model interfaces */
/** An error message. */
export interface ApiError {
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
export interface ApiErrorResponse {
    /** An identifier that can be used to trace the request. */
    trace: string;
    /** The list of errors. */
    errors: ApiError[];
}
/** The target of the error. */
export interface ApiErrorTarget {
    /** The type of the problematic field. */
    type: ApiErrorTarget.Constants.Type | string;
    /** The name of the problematic field. */
    name: string;
}
export declare namespace ApiErrorTarget {
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
export interface BaseModel {
    /** The model id of the base model. */
    model_id?: string;
}
/** The limits that may be set per request. */
export interface ConsumptionsLimit {
    /** The hard limit on the call time for a request, if set. */
    call_time?: string;
    /**
     * The hard limit on the number of input tokens for a request, if set. A value of zero will
     * disable this feature.
     */
    max_input_tokens?: number;
    /**
     * The hard limit on the number of output tokens for a request, if set. A value of zero will
     * disable this feature.
     */
    max_output_tokens?: number;
}
/**
 * Contains a set of fields specific to each connection. See here for [details about specifying
 * connections](#datareferences).
 */
export interface DataConnection {
    /** DataConnection accepts additional properties. */
    [propName: string]: any;
}
/** Contains a set of location fields specific to each data source. */
export interface CosDataConnection {
    /** The id of the connection asset that contains the credentials required to access the data. */
    id: string;
}
/** Contains a set of fields specific to each connection. */
export interface CosDataLocation {
    /** The name of the file. */
    file_name: string;
    /** Can be used to overide the bucket name from the connection asset. */
    bucket?: string;
}
/**
 * A reference to data with an optional data schema. If necessary, it is possible to provide a data
 * connection that contains just the data schema.
 */
export interface DataConnectionReference {
    /** Optional item identification inside a collection. */
    id?: string;
    /**
     * The data source type like `connection_asset` or `data_asset`. If the data connection contains
     * just a schema then this field is not required.
     */
    type: DataConnectionReference.Constants.Type | string;
    /**
     * Contains a set of fields specific to each connection. See here for [details about specifying
     * connections](#datareferences).
     */
    connection?: DataConnection;
    /**
     * Contains a set of fields that describe the location of the data with respect to the
     * `connection`.
     */
    location?: JsonObject;
    /**
     * The schema of the expected data, see
     * [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json)
     * for the schema definition.
     */
    schema?: DataSchema;
}
export declare namespace DataConnectionReference {
    namespace Constants {
        /**
         * The data source type like `connection_asset` or `data_asset`. If the data connection contains
         * just a schema then this field is not required.
         */
        enum Type {
            CONNECTION_ASSET = "connection_asset",
            DATA_ASSET = "data_asset",
            CONTAINER = "container",
            URL = "url"
        }
    }
}
/**
 * The schema of the expected data, see
 * [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json)
 * for the schema definition.
 */
export interface DataSchema {
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
export interface DeploymentEntity {
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** A reference to a resource. */
    prompt_template?: SimpleRel;
    /**
     * Indicates that this is an online deployment. An object has to be specified but can be empty.
     * The `serving_name` can be provided in the `online.parameters`.
     */
    online: OnlineDeployment;
    /** A hardware specification. */
    hardware_spec?: HardwareSpec;
    /** The requested hardware for deployment. */
    hardware_request?: HardwareRequest;
    /** A reference to a resource. */
    asset?: ModelRel;
    /**
     * The base model that is required for this deployment if this is for a prompt template or a
     * prompt tune for an IBM foundation model.
     */
    base_model_id?: string;
    /**
     * The type of the deployed model. The possible values are the following:
     *
     * 1. `prompt_tune` - when a prompt tuned model is deployed.
     * 2. `foundation_model` - when a prompt template is used on a pre-deployed IBM provided model.
     * 3. `custom_foundation_model` - when a custom foundation model is deployed.
     */
    deployed_asset_type?: DeploymentEntity.Constants.DeployedAssetType | string;
    /**
     * The verbalizer that was used to train this model if the deployment has `deployed_asset_type` of
     * `prompt_tune`.
     */
    verbalizer?: string;
    /**
     * Specifies the current status, additional information about the deployment and any failure
     * messages in case of deployment failures.
     */
    status?: DeploymentStatus;
}
export declare namespace DeploymentEntity {
    namespace Constants {
        /**
         * The type of the deployed model. The possible values are the following: 1. `prompt_tune` -
         * when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used
         * on a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation
         * model is deployed.
         */
        enum DeployedAssetType {
            PROMPT_TUNE = "prompt_tune",
            FOUNDATION_MODEL = "foundation_model",
            CUSTOM_FOUNDATION_MODEL = "custom_foundation_model"
        }
    }
}
/** A deployment resource. */
export interface DeploymentResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** The definition of the deployment. */
    entity?: DeploymentEntity;
}
/** The deployment resources. */
export interface DeploymentResourceCollection {
    /**
     * The total number of resources. Computed explicitly only when 'total_count=true' query parameter
     * is present. This is in order to avoid performance penalties.
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
export interface DeploymentResourcePatch {
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
/**
 * Specifies the current status, additional information about the deployment and any failure
 * messages in case of deployment failures.
 */
export interface DeploymentStatus {
    /** Specifies the current state of the deployment. */
    state?: DeploymentStatus.Constants.State | string;
    /** Optional messages related to the deployment. */
    message?: Message;
    /** The data returned when an error is encountered. */
    failure?: ApiErrorResponse;
    /**
     * The URLs that can be used to submit inference API requests. These URLs will contain the
     * `deployment_id` and the `serving_name`, if the `serving_name` was set.
     */
    inference?: Inference[];
}
export declare namespace DeploymentStatus {
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
export interface DeploymentSystem {
    /**
     * Optional details provided by the service about statistics of the number of deployments created.
     * The deployments that are counted will depend on the request parameters.
     */
    system?: DeploymentSystemDetails;
}
/**
 * Optional details provided by the service about statistics of the number of deployments created.
 * The deployments that are counted will depend on the request parameters.
 */
export interface DeploymentSystemDetails {
    /** Any warnings coming from the system. */
    warnings?: Warning[];
    /** The stats about deployments. */
    stats?: Stats[];
}
/** DeploymentTextChatMessages. */
export interface DeploymentTextChatMessages {
}
/** The template properties if this request refers to a prompt template. */
export interface DeploymentTextGenProperties {
    /**
     * Represents the strategy used for picking the tokens during generation of the output text.
     *
     * During text generation when parameter value is set to greedy, each successive token corresponds
     * to the highest probability token given the text that has already been generated. This strategy
     * can lead to repetitive results especially for longer output sequences. The alternative sample
     * strategy generates text by picking subsequent tokens based on the probability distribution of
     * possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k
     * and top_p parameters described below. See this
     * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
     * generation.
     */
    decoding_method?: DeploymentTextGenProperties.Constants.DecodingMethod | string;
    /**
     * It can be used to exponentially increase the likelihood of the text generation terminating once
     * a specified number of tokens have been generated.
     */
    length_penalty?: TextGenLengthPenalty;
    /**
     * The maximum number of new tokens to be generated. The maximum supported value for this field
     * depends on the model being used.
     *
     * How the "token" is defined depends on the tokenizer and vocabulary size, which in turn depends
     * on the model. Often the tokens are a mix of full words and sub-words. To learn more about
     * tokenization, [see here](https://huggingface.co/course/chapter2/4).
     *
     * Depending on the users plan, and on the model being used, there may be an enforced maximum
     * number of new tokens.
     */
    max_new_tokens?: number;
    /** If stop sequences are given, they are ignored until minimum tokens are generated. */
    min_new_tokens?: number;
    /** Random number generator seed to use in sampling mode for experimental repeatability. */
    random_seed?: number;
    /**
     * Stop sequences are one or more strings which will cause the text generation to stop if/when
     * they are produced as part of the output. Stop sequences encountered prior to the minimum number
     * of tokens being generated will be ignored.
     */
    stop_sequences?: string[];
    /**
     * A value used to modify the next-token probabilities in sampling mode. Values less than 1.0
     * sharpen the probability distribution, resulting in "less random" output. Values greater than
     * 1.0 flatten the probability distribution, resulting in "more random" output. A value of 1.0 has
     * no effect.
     */
    temperature?: number;
    /**
     * Time limit in milliseconds - if not completed within this time, generation will stop. The text
     * generated so far will be returned along with the TIME_LIMIT stop reason.
     *
     * Depending on the users plan, and on the model being used, there may be an enforced maximum time
     * limit.
     */
    time_limit?: number;
    /**
     * The number of highest probability vocabulary tokens to keep for top-k-filtering. Only applies
     * for sampling mode. When decoding_strategy is set to sample, only the top_k most likely tokens
     * are considered as candidates for the next generated token.
     */
    top_k?: number;
    /**
     * Similar to top_k except the candidates to generate the next token are the most likely tokens
     * with probabilities that add up to at least top_p. Also known as nucleus sampling. A value of
     * 1.0 is equivalent to disabled.
     */
    top_p?: number;
    /**
     * Represents the penalty for penalizing tokens that have already been generated or belong to the
     * context. The value 1.0 means that there is no penalty.
     */
    repetition_penalty?: number;
    /**
     * Represents the maximum number of input tokens accepted. This can be used to avoid requests
     * failing due to input being longer than configured limits. If the text is truncated, then it
     * truncates the start of the input (on the left), so the end of the input will remain the same.
     * If this value exceeds the `maximum sequence length` (refer to the documentation to find this
     * value for the model) then the call will fail if the total number of tokens exceeds the `maximum
     * sequence length`.
     */
    truncate_input_tokens?: number;
    /** Properties that control what is returned. */
    return_options?: ReturnOptionProperties;
    /**
     * Pass `false` to omit matched stop sequences from the end of the output text. The default is
     * `true`, meaning that the output will end with the stop sequence text when matched.
     */
    include_stop_sequence?: boolean;
    /**
     * Local typicality measures how similar the conditional probability of predicting a target token
     * next is to the expected conditional probability of predicting a random token next, given the
     * partial text already generated. If less than 1, the smallest set of the most locally typical
     * tokens with probabilities that add up to typical_p or higher are kept for generation.
     */
    typical_p?: number;
    /** The prompt variables. */
    prompt_variables?: JsonObject;
}
export declare namespace DeploymentTextGenProperties {
    namespace Constants {
        /**
         * Represents the strategy used for picking the tokens during generation of the output text.
         * During text generation when parameter value is set to greedy, each successive token
         * corresponds to the highest probability token given the text that has already been generated.
         * This strategy can lead to repetitive results especially for longer output sequences. The
         * alternative sample strategy generates text by picking subsequent tokens based on the
         * probability distribution of possible next tokens defined by (i.e., conditioned on) the
         * already-generated text and the top_k and top_p parameters described below. See this
         * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
         * generation.
         */
        enum DecodingMethod {
            SAMPLE = "sample",
            GREEDY = "greedy"
        }
    }
}
/** The parameters for the forecast request. */
export interface DeploymentTSForecastParameters {
    /**
     * The prediction length for the forecast. The service will return this many periods beyond the
     * last timestamp in the inference data payload. If specified, `prediction_length` must be an
     * integer >=1 and no more than the model default prediction length. When omitted the model
     * default prediction_length will be used.
     */
    prediction_length?: number;
    /**
     * The batch size used during inference. When multiple time series are present, the inference will
     * be conducted in batches. If not specified, the model default batch size will be used.
     */
    inference_batch_size?: number;
}
/**
 * The embedding values for a text string. The `input` field is only set if the corresponding
 * `return_option` is set.
 */
export interface Embedding {
    /** The text input to the model. */
    input?: string;
    /** The embedding values. */
    embedding: number[];
}
/** Parameters for text embedding requests. */
export interface EmbeddingParameters {
    /**
     * Represents the maximum number of input tokens accepted. This can be used to avoid requests
     * failing due to input being longer than configured limits. If the text is truncated, then it
     * truncates the end of the input (on the right), so the start of the input will remain the same.
     * If this value exceeds the `maximum sequence length` (refer to the documentation to find this
     * value for the model) then the call will fail if the total number of tokens exceeds the `maximum
     * sequence length`.
     */
    truncate_input_tokens?: number;
    /** The return options for text embeddings. */
    return_options?: EmbeddingReturnOptions;
}
/** The return options for text embeddings. */
export interface EmbeddingReturnOptions {
    /** Include the `input` text in each of the `results` documents. */
    input_text?: boolean;
}
/** System details. */
export interface EmbeddingsResponse {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
     */
    model_id: string;
    /** The embedding values for a given text. */
    results: Embedding[];
    /** The time when the response was created. */
    created_at: string;
    /** The number of input tokens that were consumed. */
    input_token_count: number;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** ExternalInformationExternalModel. */
export interface ExternalInformationExternalModel {
    name: string;
    url: string;
}
/** ExternalInformationExternalPrompt. */
export interface ExternalInformationExternalPrompt {
    url: string;
    additional_information?: ExternalPromptAdditionalInformationItem[][];
}
/** ExternalPromptAdditionalInformationItem. */
export interface ExternalPromptAdditionalInformationItem {
    key?: string;
}
/** A supported foundation model. */
export interface FoundationModel {
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
    /**
     * The tier of the model, depending on the `tier` the billing will be different, refer to the plan
     * for the details. Note that input tokens and output tokens may be charged differently.
     */
    input_tier: FoundationModel.Constants.InputTier | string;
    /**
     * The tier of the model, depending on the `tier` the billing will be different, refer to the plan
     * for the details. Note that input tokens and output tokens may be charged differently.
     */
    output_tier: FoundationModel.Constants.OutputTier | string;
    /** Specifies the provider of this model. */
    source: string;
    /** The minimum number of examples required for the model. */
    min_shot_size?: number;
    /**
     * The number of parameters used for the model, it will accept `m` for million, `b` for billion
     * and `t` for trillion.
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
export declare namespace FoundationModel {
    namespace Constants {
        /**
         * The tier of the model, depending on the `tier` the billing will be different, refer to the
         * plan for the details. Note that input tokens and output tokens may be charged differently.
         */
        enum InputTier {
            CLASS_1 = "class_1",
            CLASS_2 = "class_2",
            CLASS_3 = "class_3",
            CLASS_C1 = "class_c1"
        }
        /**
         * The tier of the model, depending on the `tier` the billing will be different, refer to the
         * plan for the details. Note that input tokens and output tokens may be charged differently.
         */
        enum OutputTier {
            CLASS_1 = "class_1",
            CLASS_2 = "class_2",
            CLASS_3 = "class_3",
            CLASS_C1 = "class_c1"
        }
    }
}
/** Limits per plan that may be set per request. */
export interface FoundationModelLimits {
    /** The limits that may be set per request. */
    lite?: ConsumptionsLimit;
}
/** A task that is covered by some of the foundation models that are supported in the service. */
export interface FoundationModelTask {
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
export interface FoundationModelTasks {
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
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** A minor or patch version for the model. */
export interface FoundationModelVersion {
    /** The version of the model. This must follow semantic versioning semantics. */
    version?: string;
    /** The date (ISO 8601 format YYYY-MM-DD) when this version first became available. */
    available_date?: string;
}
/** System details. */
export interface FoundationModels {
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
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** GetPromptInputResponse. */
export interface GetPromptInputResponse {
    /** The prompt's input string used for inferences. */
    input?: string;
}
/** The requested hardware for deployment. */
export interface HardwareRequest {
    /** The size of GPU requested for the deployment. */
    size?: HardwareRequest.Constants.Size | string;
    /** The number of nodes for the GPU requested for deployment. */
    num_nodes?: number;
}
export declare namespace HardwareRequest {
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
export interface HardwareSpec {
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
export interface Inference {
    /** The inference URL. */
    url: string;
    /** This is `true` if the inference API supports SSE streaming. */
    sse?: boolean;
    /**
     * This is `true` if the inference API uses the `serving_name` that was defined in this
     * deployment.
     */
    uses_serving_name?: boolean;
}
/**
 * This model represents an individual patch operation to be performed on a JSON document, as
 * defined by RFC 6902.
 */
export interface JsonPatchOperation {
    /** The operation to be performed. */
    op: JsonPatchOperation.Constants.Op | string;
    /** The JSON Pointer that identifies the field that is the target of the operation. */
    path: string;
    /** The JSON Pointer that identifies the field that is the source of the operation. */
    from?: string;
    /** The value to be used within the operation. */
    value?: any;
}
export declare namespace JsonPatchOperation {
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
export interface LifeCycleState {
    /**
     * The possible lifecycle stages, in order, are described below:
     *
     * - `available`: this means that the model is available for use.
     * - `deprecated`: this means that the model is still available but the model will be removed soon,
     *   so an alternative model should be used.
     * - `constricted`: this means that the model is still available for inferencing but cannot be used
     *   for training or in a deployment. The model will be removed soon so an alternative model
     *   should be used.
     * - `withdrawn`: this means that the model is no longer available, check the
     *   `alternative_model_ids` to see what it can be replaced by.
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
export declare namespace LifeCycleState {
    namespace Constants {
        /**
         * The possible lifecycle stages, in order, are described below:
         *
         * - `available`: this means that the model is available for use.
         * - `deprecated`: this means that the model is still available but the model will be removed
         *   soon, so an alternative model should be used. - `constricted`: this means that the model is
         *   still available for inferencing but cannot be used for training or in a deployment. The
         *   model will be removed soon so an alternative model should be used.
         * - `withdrawn`: this means that the model is no longer available, check the
         *   `alternative_model_ids` to see what it can be replaced by.
         */
        enum Id {
            AVAILABLE = "available",
            DEPRECATED = "deprecated",
            CONSTRICTED = "constricted",
            WITHDRAWN = "withdrawn"
        }
    }
}
/**
 * The properties specific to masking. If this object exists, even if it is empty, then masking will
 * be applied.
 */
export interface MaskProperties {
    /**
     * If this field is `true` then the entity value, that contains the text that was masked, will
     * also be removed from the output.
     */
    remove_entity_value?: boolean;
}
/** Optional messages related to the resource. */
export interface Message {
    /** The level of the message, normally one of `debug`, `info` or `warning`. */
    level?: string;
    /** The message. */
    text?: string;
}
/** Provides extra information for this training stage in the context of auto-ml. */
export interface MetricsContext {
    /** The deployment that created the metrics. */
    deployment_id?: string;
    /** The context for prompt tuning metrics. */
    prompt_tuning?: PromptTuningMetricsContext;
}
/** The limits that are applied for the model, for all the plans. */
export interface ModelLimits {
    /**
     * This is the maximum allowed value for the number of tokens in the input prompt plus the number
     * of tokens in the output generated by the model.
     */
    max_sequence_length?: number;
    /** This is the maximum number of records that can be accepted when training this model. */
    training_data_max_records?: number;
}
/** A reference to a resource. */
export interface ModelRel {
    /** The id of the referenced resource. */
    id: string;
    /** The revision of the referenced resource. */
    rev?: string;
    /** The resource key for this asset if it exists. */
    resource_key?: string;
}
/** The properties specific to HAP. */
export interface ModerationHapProperties {
    /** Properties that control the moderation on the text. */
    input?: TextModeration;
    /** Properties that control the moderation on the text. */
    output?: TextModeration;
    /**
     * The properties specific to masking. If this object exists, even if it is empty, then masking
     * will be applied.
     */
    mask?: MaskProperties;
    /** ModerationHapProperties accepts additional properties. */
    [propName: string]: any;
}
/** The properties specific to PII. */
export interface ModerationPiiProperties {
    /** Properties that control the moderation on the text. */
    input?: TextModerationWithoutThreshold;
    /** Properties that control the moderation on the text. */
    output?: TextModerationWithoutThreshold;
    /**
     * The properties specific to masking. If this object exists, even if it is empty, then masking
     * will be applied.
     */
    mask?: MaskProperties;
    /** ModerationPiiProperties accepts additional properties. */
    [propName: string]: any;
}
/**
 * The properties for the moderation. Each type of moderation may have additional properties that
 * are specific to that moderation.
 */
export interface ModerationProperties {
    /** Properties that control the moderation on the text. */
    input?: TextModeration;
    /** Properties that control the moderation on the text. */
    output?: TextModeration;
    /** ModerationProperties accepts additional properties. */
    [propName: string]: any;
}
/** A specific moderation result. */
export interface ModerationResult {
    /** The probability that this is a real match. */
    score: number;
    /** This defines if this was found in the input (`true`) or the output (`false`). */
    input: boolean;
    /** A range of text. */
    position: ModerationTextRange;
    /** The entity that was identified by the moderation. */
    entity: string;
    /**
     * The text that was identified for this entity.
     *
     * This field may be removed if requested in the moderation request body.
     */
    word?: string;
}
/** The result of any detected moderations. */
export interface ModerationResults {
    /** The HAP results. */
    hap?: ModerationResult[];
    /** The PII results. */
    pii?: ModerationResult[];
    /** ModerationResults accepts additional properties. */
    [propName: string]: any;
}
/** A range of text. */
export interface ModerationTextRange {
    /** The start index of the range. */
    start: number;
    /**
     * The end index of the range. The end index is exclusive meaning that the character at this index
     * will not be included in the range.
     */
    end: number;
}
/**
 * Properties that control the moderations, for usages such as `Hate and profanity` (HAP) and
 * `Personal identifiable information` (PII) filtering. This list can be extended with new types of
 * moderations.
 */
export interface Moderations {
    /** The properties specific to HAP. */
    hap?: ModerationHapProperties;
    /** The properties specific to PII. */
    pii?: ModerationPiiProperties;
    /**
     * If set, then only these ranges will be applied to the moderations. This is useful in the case
     * that certain parts of the input text have already been checked.
     */
    input_ranges?: ModerationTextRange[];
    /** Moderations accepts additional properties. */
    [propName: string]: any;
}
/** A reference to data. */
export interface ObjectLocation {
    /** Item identification inside a collection. */
    id?: string;
    /** The data source type like `connection_asset` or `data_asset`. */
    type: ObjectLocation.Constants.Type | string;
    /**
     * Contains a set of fields specific to each connection. See here for [details about specifying
     * connections](#datareferences).
     */
    connection?: DataConnection;
    /**
     * Contains a set of fields that describe the location of the data with respect to the
     * `connection`.
     */
    location: JsonObject;
}
export declare namespace ObjectLocation {
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
/**
 * Indicates that this is an online deployment. An object has to be specified but can be empty. The
 * `serving_name` can be provided in the `online.parameters`.
 */
export interface OnlineDeployment {
    /** A set of key-value pairs that are used to configure the deployment. */
    parameters?: OnlineDeploymentParameters;
}
/** A set of key-value pairs that are used to configure the deployment. */
export interface OnlineDeploymentParameters {
    /** The `serving_name` can be used in the inference URL in place of the `deployment_id`. */
    serving_name?: string;
    /** OnlineDeploymentParameters accepts additional properties. */
    [propName: string]: any;
}
/** The reference to the first item in the current page. */
export interface PaginationFirst {
    /** The uri of the first resource returned. */
    href: string;
}
/** A reference to the first item of the next page, if any. */
export interface PaginationNext {
    /** The uri of the next set of resources. */
    href: string;
}
/** PromptModelParameters. */
export interface PromptModelParameters {
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
export interface PromptTuning {
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
    /**
     * Number of steps to be used for gradient accumulation. Gradient accumulation refers to a method
     * of collecting gradient for configured number of steps instead of updating the model variables
     * at every step and then applying the update to model variables. This can be used as a tool to
     * overcome smaller batch size limitation. Often also referred in conjunction with "effective
     * batch size".
     */
    accumulate_steps?: number;
    /**
     * Verbalizer template to be used for formatting data at train and inference time. This template
     * may use brackets to indicate where fields from the data model must be rendered.
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
    /**
     * Initialization text to be used if `init_method` is set to `text` otherwise this will be
     * ignored.
     */
    init_text?: string;
}
export declare namespace PromptTuning {
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
export interface PromptTuningMetricsContext {
    /** The location where the prompt tuning metrics are stored. */
    metrics_location?: string;
}
/** PromptWithExternalModelParameters. */
export interface PromptWithExternalModelParameters {
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
export interface Rel {
    /** The id of the referenced resource. */
    id: string;
    /** The revision of the referenced resource. */
    rev?: string;
}
/** A text to rank. */
export interface RerankInput {
    /** The text to rank. */
    text: string;
}
/** The properties used for reranking. */
export interface RerankParameters {
    /**
     * Represents the maximum number of input tokens accepted. This can be used to avoid requests
     * failing due to input being longer than configured limits. If the text is truncated, then it
     * truncates the end of the input (on the right), so the start of the input will remain the same.
     * If this value exceeds the `maximum sequence length` (refer to the documentation to find this
     * value for the model) then the call will fail if the total number of tokens exceeds the `maximum
     * sequence length`.
     */
    truncate_input_tokens?: number;
    /** The return options for text reranking. */
    return_options?: RerankReturnOptions;
}
/** System details. */
export interface RerankResponse {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
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
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The return options for text reranking. */
export interface RerankReturnOptions {
    /** Just show the top `n` results if set. */
    top_n?: number;
    /** If `true` then the inputs will be returned in the response. */
    inputs?: boolean;
    /** If `true` then the queries will be returned in the response. */
    query?: boolean;
}
/** The ranking score for the input. */
export interface RerankedResults {
    /** The index of the text from the input in the original request `inputs` array. */
    index: number;
    /** The score of the input. */
    score: number;
    /** The text that was ranked, if requested. */
    input?: {
        text: string;
    };
}
/** Information related to the revision. */
export interface ResourceCommitInfo {
    /** The time when the revision was committed. */
    committed_at: string;
    /** The message that was provided when the revision was created. */
    commit_message?: string;
}
/** Common metadata for a resource where `project_id` or `space_id` must be present. */
export interface ResourceMeta {
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
export interface ReturnOptionProperties {
    /** Include input text in the `generated_text` field. */
    input_text?: boolean;
    /**
     * Include the list of individual generated tokens. Extra token information is included based on
     * the other flags below.
     */
    generated_tokens?: boolean;
    /**
     * Include the list of input tokens. Extra token information is included based on the other flags
     * here, but only for decoder-only models.
     */
    input_tokens?: boolean;
    /**
     * Include logprob (natural log of probability) for each returned token. Applicable only if
     * generated_tokens == true and/or input_tokens == true.
     */
    token_logprobs?: boolean;
    /**
     * Include rank of each returned token. Applicable only if generated_tokens == true and/or
     * input_tokens == true.
     */
    token_ranks?: boolean;
    /**
     * Include top n candidate tokens at the position of each returned token. The maximum value
     * permitted is 5, but more may be returned if there is a tie for nth place. Applicable only if
     * generated_tokens == true and/or input_tokens == true.
     */
    top_n_tokens?: number;
}
/** A reference to a resource. */
export interface SimpleRel {
    /** The id of the referenced resource. */
    id: string;
}
/** The stats about deployments for a space. */
export interface Stats {
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
export interface SystemDetails {
    /** Any warnings coming from the system. */
    warnings?: Warning[];
}
/** The benchmarking result for this task for this model. */
export interface TaskBenchmark {
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
export interface TaskBenchmarkDataset {
    /** The benchmarking dataset name. */
    name?: string;
}
/** The metric for a given property. */
export interface TaskBenchmarkMetric {
    /** The name of the metric. */
    name?: string;
    /** The mean value calculated over all records in the dataset. */
    value?: number;
}
/** The benchmarking prompt properties. */
export interface TaskBenchmarkPrompt {
    number_of_shots?: number;
}
/** The attributes of the task for this model. */
export interface TaskDescription {
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
export interface TaskRating {
    /**
     * A metric that indicates the cost expected to be incurred by the model's support of an inference
     * task, in terms of resource consumption and processing time, on a scale of 1 to 5, where 5 is
     * the least cost and 1 is the most cost. A missing value means that the cost is not known.
     */
    cost?: number;
    /**
     * A metric that indicates the quality of the model's support of an inference task, on a scale of
     * 1 to 5, where 5 is the best support and 1 is poor support. A missing value means that the
     * quality is not known.
     */
    quality?: number;
}
/** The parameters specific to chat. */
export interface TextChatParameterFunction {
    /** The name of the function. */
    name: string;
    /**
     * A description of what the function does, used by the model to choose when and how to call the
     * function.
     */
    description?: string;
    /**
     * The parameters the functions accepts, described as a JSON Schema object. See the [JSON Schema
     * reference](https://json-schema.org/learn/getting-started-step-by-step) for documentation about
     * the format.
     *
     * Omitting parameters defines a function with an empty parameter list.
     */
    parameters?: JsonObject;
}
/** The chat tool parameters. */
export interface TextChatParameterTools {
    /** The tool type. */
    type: TextChatParameterTools.Constants.Type | string;
    /** The parameters specific to chat. */
    function?: TextChatParameterFunction;
}
export declare namespace TextChatParameterTools {
    namespace Constants {
        /** The tool type. */
        enum Type {
            FUNCTION = "function"
        }
    }
}
/** System details. */
export interface TextChatResponse {
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
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** System details. */
export interface TextChatStreamResponse {
    /** A unique identifier for the chat completion. */
    id: string;
    /** The model used for the chat completion. */
    model_id: string;
    /** The model version (using semantic versioning) if set. */
    model_version?: string;
    /** A list of chat completion choices. Can be more than one if `n` is greater than 1. */
    choices: TextChatStreamResultChoice[];
    /** The Unix timestamp (in seconds) of when the chat completion was created. */
    created: number;
    /** The time when the response was created. */
    created_at?: string;
    /** Usage statistics for the completion request. */
    usage?: TextChatUsage;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The chat response format parameters. */
export interface TextChatResponseFormat {
    /**
     * Used to enable JSON mode, which guarantees the message the model generates is valid JSON.
     *
     * **Important:** when using JSON mode, you must also instruct the model to produce JSON yourself
     * via a system or user message. Without this, the model may generate an unending stream of
     * whitespace until the generation reaches the token limit, resulting in a long-running and
     * seemingly "stuck" request. Also note that the message content may be partially cut off if
     * `finish_reason="length"`, which indicates the generation exceeded `max_tokens` or the
     * conversation exceeded the max context length.
     */
    type: TextChatResponseFormat.Constants.Type | string;
}
export declare namespace TextChatResponseFormat {
    namespace Constants {
        /**
         * Used to enable JSON mode, which guarantees the message the model generates is valid JSON.
         * **Important:** when using JSON mode, you must also instruct the model to produce JSON
         * yourself via a system or user message. Without this, the model may generate an unending
         * stream of whitespace until the generation reaches the token limit, resulting in a
         * long-running and seemingly "stuck" request. Also note that the message content may be
         * partially cut off if `finish_reason="length"`, which indicates the generation exceeded
         * `max_tokens` or the conversation exceeded the max context length.
         */
        enum Type {
            JSON_OBJECT = "json_object"
        }
    }
}
/** A tool related result. */
export interface TextChatResultChoice {
    /** The index of this result. */
    index?: number;
    /** A message result. */
    message?: TextChatResultMessage;
    /**
     * The reason why the call stopped, can be one of:
     *
     * - `stop` - The model hit a natural stop point or a provided stop sequence.
     * - `length` - The maximum number of tokens specified in the request was reached.
     * - `tool_calls` - The model called a tool.
     * - `time_limit`` - Time limit reached.
     * - `cancelled`` - Request canceled by the client.
     * - `error`` - Error encountered.
     * - `null` - API response still in progress or incomplete.
     */
    finish_reason?: TextChatResultChoice.Constants.FinishReason | string;
}
export interface TextChatStreamResultChoice {
    /** The index of this result. */
    index?: number;
    /** A message chunk result. */
    delta?: TextChatResultMessage;
    /**
     * The reason why the call stopped, can be one of:
     *
     * - `stop` - The model hit a natural stop point or a provided stop sequence.
     * - `length` - The maximum number of tokens specified in the request was reached.
     * - `tool_calls` - The model called a tool.
     * - `time_limit`` - Time limit reached.
     * - `cancelled`` - Request canceled by the client.
     * - `error`` - Error encountered.
     * - `null` - API response still in progress or incomplete.
     */
    finish_reason?: TextChatResultChoice.Constants.FinishReason | string;
}
export declare namespace TextChatResultChoice {
    namespace Constants {
        /**
         * The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point
         * or a provided stop sequence. - `length` - The maximum number of tokens specified in the
         * request was reached. - `tool_calls` - The model called a tool.
         *
         * - `time_limit`` - Time limit reached. - `cancelled`- Request canceled by the client. -`error`-
         *   Error encountered. -`null`
         * - API response still in progress or incomplete.
         */
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
export interface TextChatResultMessage {
    /** The role of the author of this message. */
    role: string;
    /** The contents of the message. */
    content?: string;
    /** The refusal message generated by the model. */
    refusal?: string;
    /** The tool calls generated by the model, such as function calls. */
    tool_calls?: TextChatToolCall[];
    /** The contents of model's reasoning */
    reasoning_content?: string;
}
/** A message result. */
export interface TextChatResultDelta {
    /** The role of the author of this message. */
    role: string;
    /** The contents of the message. */
    content?: string;
    /** The refusal message generated by the model. */
    refusal?: string;
    /** The tool calls generated by the model, such as function calls. */
    tool_calls?: TextChatToolCall[];
}
/** A tool related result. */
export interface TextChatResultChoiceStream {
    /** The index of this result. */
    index?: number;
    /** A message result. */
    delta?: TextChatResultDelta;
    /**
     * The reason why the call stopped, can be one of:
     *
     * - `stop` - The model hit a natural stop point or a provided stop sequence.
     * - `length` - The maximum number of tokens specified in the request was reached.
     * - `tool_calls` - The model called a tool.
     * - `time_limit`` - Time limit reached.
     * - `cancelled`` - Request canceled by the client.
     * - `error`` - Error encountered.
     * - `null` - API response still in progress or incomplete.
     */
    finish_reason?: TextChatResultChoiceStream.Constants.FinishReason | string;
}
export declare namespace TextChatResultChoiceStream {
    namespace Constants {
        /**
         * The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point
         * or a provided stop sequence. - `length` - The maximum number of tokens specified in the
         * request was reached. - `tool_calls` - The model called a tool.
         *
         * - `time_limit`` - Time limit reached. - `cancelled`- Request canceled by the client. -`error`-
         *   Error encountered. -`null`
         * - API response still in progress or incomplete.
         */
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
/** System details. */
export interface TextChatStreamItem {
    /** A unique identifier for the chat completion. */
    id: string;
    /** The model used for the chat completion. */
    model_id: string;
    /**
     * This field is a duplicate of `model_id` and is provided in order to provide better
     * compatibility with other APIs.
     */
    model?: string;
    /** The model version (using semantic versioning) if set. */
    model_version?: string;
    /** The Unix timestamp (in seconds) of when the chat completion was created. */
    created: number;
    /** The time when the response was created in ISO 8601 format. */
    created_at?: string;
    /** Usage statistics for the completion request. */
    usage?: TextChatUsage;
    /** A list of chat completion choices. Can be more than one if `n` is greater than 1. */
    choices: TextChatResultChoiceStream[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/**
 * Specifying a particular tool via `{"type": "function", "function": {"name": "my_function"}}`
 * forces the model to call that tool. Only one of `tool_choice_option` or `tool_choice` must be
 * present.
 */
export interface TextChatToolChoiceTool {
    /** The tool type. */
    type: TextChatToolChoiceTool.Constants.Type | string;
    /** The named function. */
    function: TextChatToolFunction;
}
export declare namespace TextChatToolChoiceTool {
    namespace Constants {
        /** The tool type. */
        enum Type {
            FUNCTION = "function"
        }
    }
}
/** The named function. */
export interface TextChatToolFunction {
    /** The name of the function. */
    name: string;
}
/** Usage statistics for the completion request. */
export interface TextChatUsage {
    /** Number of tokens in the generated completion. */
    completion_tokens?: number;
    /** Number of tokens in the prompt. */
    prompt_tokens?: number;
    /** Total number of tokens used in the request (prompt + completion). */
    total_tokens?: number;
}
/** A reference to data. */
export interface TextExtractionDataReference {
    /** The data source type. */
    type: TextExtractionDataReference.Constants.Type | string;
    /** Contains a set of location fields specific to each data source. */
    connection?: CosDataConnection;
    /** Contains a set of fields specific to each connection. */
    location?: CosDataLocation;
}
export declare namespace TextExtractionDataReference {
    namespace Constants {
        /** The data source type. */
        enum Type {
            CONNECTION_ASSET = "connection_asset"
        }
    }
}
/** Common metadata for a resource where `project_id` or `space_id` must be present. */
export interface TextExtractionMetadata {
    /** The id of the resource. */
    id: string;
    /** The time when the resource was created. */
    created_at: string;
    /** The space that contains the resource. Either `space_id` or `project_id` has to be given. */
    space_id?: string;
    /** The project that contains the resource. Either `space_id` or `project_id` has to be given. */
    project_id?: string;
}
/** The text extraction resource. */
export interface TextExtractionResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: TextExtractionMetadata;
    /** The document details for the text extraction. */
    entity?: TextExtractionResourceEntity;
}
/** The document details for the text extraction. */
export interface TextExtractionResourceEntity {
    /** A reference to data. */
    document_reference: TextExtractionDataReference;
    /** A reference to data. */
    results_reference: TextExtractionDataReference;
    /** The steps for the text extraction pipeline. */
    steps?: TextExtractionSteps;
    /**
     * Set this as an empty object to specify `json` output.
     *
     * Note that this is not strictly required because if an `assembly_md` object is not found then
     * the default will be `json`.
     */
    assembly_json?: JsonObject;
    /** Set this as an empty object to specify `markdown` output. */
    assembly_md?: JsonObject;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** The current status of the text extraction. */
    results: TextExtractionResults;
}
/** A paginated list of resources. */
export interface TextExtractionResources {
    /**
     * The total number of resources. Computed explicitly only when 'total_count=true' query parameter
     * is present. This is in order to avoid performance penalties.
     */
    total_count?: number;
    /** The number of items to return in each page. */
    limit: number;
    /** The reference to the first item in the current page. */
    first: PaginationFirst;
    /** A reference to the first item of the next page, if any. */
    next?: PaginationNext;
    /** A list of resources. */
    resources?: TextExtractionResource[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The text extraction response. */
export interface TextExtractionResponse {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: TextExtractionMetadata;
    /** The document details for the text extraction. */
    entity?: TextExtractionResourceEntity;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The current status of the text extraction. */
export interface TextExtractionResults {
    /** The status of the request. */
    status: TextExtractionResults.Constants.Status | string;
    /** The time when the request is successfully running on the processor. */
    running_at?: string;
    /** The time when the request completed or failed. */
    completed_at?: string;
    /**
     * The number of pages that have been processed in the document. If the status is `completed` then
     * this is the number of pages that will be billed.
     */
    number_pages_processed: number;
    /** The total number of pages to be processed. */
    total_pages?: number;
    /** A service error message. */
    error?: ServiceError;
}
/** A service error message. */
export interface ServiceError {
    /** A simple code that should convey the general sense of the error. */
    code: string;
    /** The message that describes the error. */
    message: string;
    /** A URL to a more detailed explanation when available. */
    more_info?: string;
}
export declare namespace TextExtractionResults {
    namespace Constants {
        /** The status of the request. */
        enum Status {
            SUBMITTED = "submitted",
            UPLOADING = "uploading",
            RUNNING = "running",
            DOWNLOADING = "downloading",
            DOWNLOADED = "downloaded",
            COMPLETED = "completed",
            FAILED = "failed"
        }
    }
}
/** The OCR text extraction step. */
export interface TextExtractionStepOcr {
    /**
     * Set of languages to be expected in the document. The language codes follow `ISO 639`. See the
     * documentation for the currently supported languages.
     */
    languages_list?: string[];
}
/** The tables processing text extraction step. */
export interface TextExtractionStepTablesProcessing {
    /** Should tables be processed for text extraction. */
    enabled?: boolean;
}
/** The steps for the text extraction pipeline. */
export interface TextExtractionSteps {
    /** The OCR text extraction step. */
    ocr?: TextExtractionStepOcr;
    /** The tables processing text extraction step. */
    tables_processing?: TextExtractionStepTablesProcessing;
}
/**
 * It can be used to exponentially increase the likelihood of the text generation terminating once a
 * specified number of tokens have been generated.
 */
export interface TextGenLengthPenalty {
    /** Represents the factor of exponential decay. Larger values correspond to more aggressive decay. */
    decay_factor?: number;
    /** A number of generated tokens after which this should take effect. */
    start_index?: number;
}
/** Properties that control the model and response. */
export interface TextGenParameters {
    /**
     * Represents the strategy used for picking the tokens during generation of the output text.
     *
     * During text generation when parameter value is set to greedy, each successive token corresponds
     * to the highest probability token given the text that has already been generated. This strategy
     * can lead to repetitive results especially for longer output sequences. The alternative sample
     * strategy generates text by picking subsequent tokens based on the probability distribution of
     * possible next tokens defined by (i.e., conditioned on) the already-generated text and the top_k
     * and top_p parameters described below. See this
     * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
     * generation.
     */
    decoding_method?: TextGenParameters.Constants.DecodingMethod | string;
    /**
     * It can be used to exponentially increase the likelihood of the text generation terminating once
     * a specified number of tokens have been generated.
     */
    length_penalty?: TextGenLengthPenalty;
    /**
     * The maximum number of new tokens to be generated. The maximum supported value for this field
     * depends on the model being used.
     *
     * How the "token" is defined depends on the tokenizer and vocabulary size, which in turn depends
     * on the model. Often the tokens are a mix of full words and sub-words. To learn more about
     * tokenization, [see here](https://huggingface.co/course/chapter2/4).
     *
     * Depending on the users plan, and on the model being used, there may be an enforced maximum
     * number of new tokens.
     */
    max_new_tokens?: number;
    /** If stop sequences are given, they are ignored until minimum tokens are generated. */
    min_new_tokens?: number;
    /** Random number generator seed to use in sampling mode for experimental repeatability. */
    random_seed?: number;
    /**
     * Stop sequences are one or more strings which will cause the text generation to stop if/when
     * they are produced as part of the output. Stop sequences encountered prior to the minimum number
     * of tokens being generated will be ignored.
     */
    stop_sequences?: string[];
    /**
     * A value used to modify the next-token probabilities in sampling mode. Values less than 1.0
     * sharpen the probability distribution, resulting in "less random" output. Values greater than
     * 1.0 flatten the probability distribution, resulting in "more random" output. A value of 1.0 has
     * no effect.
     */
    temperature?: number;
    /**
     * Time limit in milliseconds - if not completed within this time, generation will stop. The text
     * generated so far will be returned along with the TIME_LIMIT stop reason.
     *
     * Depending on the users plan, and on the model being used, there may be an enforced maximum time
     * limit.
     */
    time_limit?: number;
    /**
     * The number of highest probability vocabulary tokens to keep for top-k-filtering. Only applies
     * for sampling mode. When decoding_strategy is set to sample, only the top_k most likely tokens
     * are considered as candidates for the next generated token.
     */
    top_k?: number;
    /**
     * Similar to top_k except the candidates to generate the next token are the most likely tokens
     * with probabilities that add up to at least top_p. Also known as nucleus sampling. A value of
     * 1.0 is equivalent to disabled.
     */
    top_p?: number;
    /**
     * Represents the penalty for penalizing tokens that have already been generated or belong to the
     * context. The value 1.0 means that there is no penalty.
     */
    repetition_penalty?: number;
    /**
     * Represents the maximum number of input tokens accepted. This can be used to avoid requests
     * failing due to input being longer than configured limits. If the text is truncated, then it
     * truncates the start of the input (on the left), so the end of the input will remain the same.
     * If this value exceeds the `maximum sequence length` (refer to the documentation to find this
     * value for the model) then the call will fail if the total number of tokens exceeds the `maximum
     * sequence length`.
     */
    truncate_input_tokens?: number;
    /** Properties that control what is returned. */
    return_options?: ReturnOptionProperties;
    /**
     * Pass `false` to omit matched stop sequences from the end of the output text. The default is
     * `true`, meaning that the output will end with the stop sequence text when matched.
     */
    include_stop_sequence?: boolean;
}
export declare namespace TextGenParameters {
    namespace Constants {
        /**
         * Represents the strategy used for picking the tokens during generation of the output text.
         * During text generation when parameter value is set to greedy, each successive token
         * corresponds to the highest probability token given the text that has already been generated.
         * This strategy can lead to repetitive results especially for longer output sequences. The
         * alternative sample strategy generates text by picking subsequent tokens based on the
         * probability distribution of possible next tokens defined by (i.e., conditioned on) the
         * already-generated text and the top_k and top_p parameters described below. See this
         * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
         * generation.
         */
        enum DecodingMethod {
            SAMPLE = "sample",
            GREEDY = "greedy"
        }
    }
}
/** System details. */
export interface TextGenResponse {
    /** The `id` of the model for inference. */
    model_id: string;
    /** The model version (using semantic versioning) if set. */
    model_version?: string;
    /** The time when the response was created. */
    created_at: string;
    /** The generated tokens. */
    results: TextGenResponseFieldsResultsItem[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** TextGenResponseFieldsResultsItem. */
export interface TextGenResponseFieldsResultsItem {
    /** The text that was generated by the model. */
    generated_text: string;
    /**
     * The reason why the call stopped, can be one of:
     *
     * - Not_finished - Possibly more tokens to be streamed.
     * - Max_tokens - Maximum requested tokens reached.
     * - Eos_token - End of sequence token encountered.
     * - Cancelled - Request canceled by the client.
     * - Time_limit - Time limit reached.
     * - Stop_sequence - Stop sequence encountered.
     * - Token_limit - Token limit reached.
     * - Error - Error encountered.
     *
     * Note that these values will be lower-cased so test for values case insensitive.
     */
    stop_reason: TextGenResponseFieldsResultsItem.Constants.StopReason | string;
    /** The number of generated tokens. */
    generated_token_count?: number;
    /** The number of input tokens consumed. */
    input_token_count?: number;
    /** The seed used, if it exists. */
    seed?: number;
    /**
     * The list of individual generated tokens. Extra token information is included based on the other
     * flags in the `return_options` of the request.
     */
    generated_tokens?: TextGenTokenInfo[];
    /**
     * The list of input tokens. Extra token information is included based on the other flags in the
     * `return_options` of the request, but for decoder-only models.
     */
    input_tokens?: TextGenTokenInfo[];
    /** The result of any detected moderations. */
    moderations?: ModerationResults;
}
export declare namespace TextGenResponseFieldsResultsItem {
    namespace Constants {
        /**
         * The reason why the call stopped, can be one of: - not_finished
         *
         * - Possibly more tokens to be streamed. - max_tokens - Maximum requested tokens reached. -
         *   eos_token
         * - End of sequence token encountered. - cancelled - Request canceled by the client.
         * - Time_limit - Time limit reached. - stop_sequence - Stop sequence encountered. - token_limit -
         *   Token limit reached. - error - Error encountered. Note that these values will be
         *   lower-cased so test for values case insensitive.
         */
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
export interface TextGenTokenInfo {
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
export interface TextGenTopTokenInfo {
    /** The token text. */
    text?: string;
    /** The natural log of probability for the token. */
    logprob?: number;
}
/** Properties that control the moderation on the text. */
export interface TextModeration {
    /**
     * Should this moderation be enabled on the text.
     *
     * The default value is `true` which means that if the parent object exists but the `enabled`
     * field does not exist then this is considered to be enabled.
     */
    enabled?: boolean;
    /** The threshold probability that this is a real match. */
    threshold?: number;
    /** TextModeration accepts additional properties. */
    [propName: string]: any;
}
/** Properties that control the moderation on the text. */
export interface TextModerationWithoutThreshold {
    /**
     * Should this moderation be enabled on the text.
     *
     * The default value is `true` which means that if the parent object exists but the `enabled`
     * field does not exist then this is considered to be enabled.
     */
    enabled?: boolean;
    /** TextModerationWithoutThreshold accepts additional properties. */
    [propName: string]: any;
}
/** The parameters for text tokenization. */
export interface TextTokenizeParameters {
    /** If this is `true` then the actual tokens will also be returned in the response. */
    return_tokens?: boolean;
}
/** The tokenization result. */
export interface TextTokenizeResponse {
    /**
     * The `id` of the model to be used for this request. Please refer to the [list of
     * models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html?context=wx).
     */
    model_id: string;
    /** The result of tokenizing the input string. */
    result: TextTokenizeResult;
}
/** The result of tokenizing the input string. */
export interface TextTokenizeResult {
    /** The number of tokens in the input string. */
    token_count: number;
    /** The input string broken up into the tokens, if requested. */
    tokens?: string[];
}
/** Contains metadata about your timeseries data input. */
export interface TSForecastInputSchema {
    /**
     * A valid column in the data that should be treated as the timestamp. Although not absolutely
     * necessary, if using calendar dates (simple integer time offsets are also allowed), users should
     * consider using a format such as ISO 8601 that includes a UTC offset (e.g.,
     * '2024-10-18T01:09:21.454746+00:00'). This will avoid potential issues such as duplicate dates
     * appearing due to daylight savings change overs. There are many date formats in existence and
     * inferring the correct one can be a challenge so please do consider adhering to ISO 8601.
     */
    timestamp_column: string;
    /**
     * Columns that define a unique key for timeseries. This is similar to a compound primary key in a
     * database table.
     */
    id_columns?: string[];
    /**
     * A frequency indicator for the given timestamp_column. See
     * https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html#period-aliases for a
     * description of the allowed values. If not provided, we will attempt to infer it from the data.
     */
    freq?: string;
    /**
     * An array of column headings which constitute the target variables in the data. These are the
     * data that will be forecasted.
     */
    target_columns?: string[];
}
/** The parameters for the forecast request. */
export interface TSForecastParameters {
    /**
     * The prediction length for the forecast. The service will return this many periods beyond the
     * last timestamp in the inference data payload. If specified, `prediction_length` must be an
     * integer >=1 and no more than the model default prediction length. When omitted the model
     * default prediction_length will be used.
     */
    prediction_length?: number;
}
/** The time series forecast response. */
export interface TSForecastResponse {
    /** The model used to generate the forecast. */
    model_id?: string;
    /** The time when the response was created in ISO 8601 format. */
    created_at?: string;
    /**
     * The list of prediction results. There will be a forecast for each time series in the input
     * data. The `prediction_length` field in the request specifies the number of predictions in the
     * results. The actual number of rows in the results will be equal to the `prediction length`
     * multiplied by the number of unique ids in `id_columns`. The `timestamp_column` field in the
     * request indicates the name of the timestamp column in the results.
     */
    results?: JsonObject[];
}
/**
 * Number of steps to be used for gradient accumulation. Gradient accumulation refers to a method of
 * collecting gradient for configured number of steps instead of updating the model variables at
 * every step and then applying the update to model variables. This can be used as a tool to
 * overcome smaller batch size limitation. Often also referred in conjunction with "effective batch
 * size".
 */
export interface TrainingAccumulatedSteps {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/** The batch size is a number of samples processed before the model is updated. */
export interface TrainingBatchSize {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/** Initialization methods for a training. */
export interface TrainingInitMethod {
    /** The supported initialization methods. */
    supported?: string[];
    /** The default value, which will be one of the values from the `supported` field. */
    default?: string;
}
/** Initialization text to be used if init_method is set to `text`, otherwise this will be ignored. */
export interface TrainingInitText {
    /** Initialization text. */
    default?: string;
}
/** Learning rate to be used for training. */
export interface TrainingLearningRate {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/** Maximum length of input tokens being considered. */
export interface TrainingMaxInputTokens {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/** Maximum length of output tokens being predicted. */
export interface TrainingMaxOutputTokens {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/** A metric. */
export interface TrainingMetric {
    /** A timestamp for the metrics. */
    timestamp?: string;
    /** The iteration number. */
    iteration?: number;
    /** The metrics. */
    ml_metrics?: JsonObject;
    /** Provides extra information for this training stage in the context of auto-ml. */
    context?: MetricsContext;
}
/**
 * The number of epochs is the number of complete passes through the training dataset. The quality
 * depends on the number of epochs.
 */
export interface TrainingNumEpochs {
    /** The default value. */
    default?: number;
    /** The minimum value. */
    min?: number;
    /** The maximum value. */
    max?: number;
}
/**
 * Number of virtual tokens to be used for training. In prompt tuning we are essentially learning
 * the embedded representations for soft prompts, which are known as virtual tokens, via back
 * propagation for a specific task(s) while keeping the rest of the model fixed.
 * `num_virtual_tokens` is the number of dimensions for these virtual tokens.
 */
export interface TrainingNumVirtualTokens {
    /** The possible values for the number of virtual tokens. */
    supported?: number[];
    /** The default number of virtual tokens. */
    default?: number;
}
/** Training parameters for a given model. */
export interface TrainingParameters {
    /** Initialization methods for a training. */
    init_method?: TrainingInitMethod;
    /** Initialization text to be used if init_method is set to `text`, otherwise this will be ignored. */
    init_text?: TrainingInitText;
    /**
     * Number of virtual tokens to be used for training. In prompt tuning we are essentially learning
     * the embedded representations for soft prompts, which are known as virtual tokens, via back
     * propagation for a specific task(s) while keeping the rest of the model fixed.
     * `num_virtual_tokens` is the number of dimensions for these virtual tokens.
     */
    num_virtual_tokens?: TrainingNumVirtualTokens;
    /**
     * The number of epochs is the number of complete passes through the training dataset. The quality
     * depends on the number of epochs.
     */
    num_epochs?: TrainingNumEpochs;
    /**
     * Verbalizer template to be used for formatting data at train and inference time. This template
     * may use brackets to indicate where fields from the data model TrainGenerationRecord must be
     * rendered.
     */
    verbalizer?: TrainingVerbalizer;
    /** The batch size is a number of samples processed before the model is updated. */
    batch_size?: TrainingBatchSize;
    /** Maximum length of input tokens being considered. */
    max_input_tokens?: TrainingMaxInputTokens;
    /** Maximum length of output tokens being predicted. */
    max_output_tokens?: TrainingMaxOutputTokens;
    /**
     * Datatype to use for training of the underlying text generation model. If no value is provided,
     * we pull from torch_dtype in config. If an in memory resource is provided which does not match
     * the specified data type, the model underpinning the resource will be converted in place to the
     * correct torch dtype.
     */
    torch_dtype?: TrainingTorchDtype;
    /**
     * Number of steps to be used for gradient accumulation. Gradient accumulation refers to a method
     * of collecting gradient for configured number of steps instead of updating the model variables
     * at every step and then applying the update to model variables. This can be used as a tool to
     * overcome smaller batch size limitation. Often also referred in conjunction with "effective
     * batch size".
     */
    accumulate_steps?: TrainingAccumulatedSteps;
    /** Learning rate to be used for training. */
    learning_rate?: TrainingLearningRate;
}
/** Training resource. */
export interface TrainingResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** Status of the training job. */
    entity?: TrainingResourceEntity;
}
/** Information for paging when querying resources. */
export interface TrainingResourceCollection {
    /**
     * The total number of resources. Computed explicitly only when 'total_count=true' query parameter
     * is present. This is in order to avoid performance penalties.
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
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: TrainingResourceCollectionSystem;
}
/** Optional details coming from the service and related to the API call or the associated resource. */
export interface TrainingResourceCollectionSystem {
    /** Any warnings coming from the system. */
    warnings?: Warning[];
}
/** Status of the training job. */
export interface TrainingResourceEntity {
    /** Properties to control the prompt tuning. */
    prompt_tuning?: PromptTuning;
    /** Training datasets. */
    training_data_references?: DataConnectionReference[];
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /**
     * If set to `true` then the result of the training, if successful, will be uploaded to the
     * repository as a model.
     */
    auto_update_model?: boolean;
    /**
     * The training results. Normally this is specified as `type=container` which means that it is
     * stored in the space or project. Note that the training will add some fields that point to the
     * training status, the model request and the assets.
     *
     * The `model_request_path` is the request body that should be used when creating the trained
     * model in the API, if this model is to be deployed. If `auto_update_model` was set to `true`
     * then this file is not needed.
     */
    results_reference: ObjectLocation;
    /** Status of the training job. */
    status: TrainingStatus;
    /** Trained model id */
    model_id: string;
}
/** Status of the training job. */
export interface TrainingStatus {
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
export declare namespace TrainingStatus {
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
/**
 * Datatype to use for training of the underlying text generation model. If no value is provided, we
 * pull from torch_dtype in config. If an in memory resource is provided which does not match the
 * specified data type, the model underpinning the resource will be converted in place to the
 * correct torch dtype.
 */
export interface TrainingTorchDtype {
    /** The datatype. */
    default?: string;
}
/**
 * Verbalizer template to be used for formatting data at train and inference time. This template may
 * use brackets to indicate where fields from the data model TrainGenerationRecord must be
 * rendered.
 */
export interface TrainingVerbalizer {
    /** The default verbalizer. */
    default?: string;
}
/** A warning message. */
export interface Warning {
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
export interface WxPromptPatchModelVersion {
    /** User provided semantic version for tracking in IBM AI Factsheets. */
    number?: string;
    /** User provived tag. */
    tag?: string;
    /** Description of the version. */
    description?: string;
}
/** WxPromptPostModelVersion. */
export interface WxPromptPostModelVersion {
    /** User provided semantic version for tracking in IBM AI Factsheets. */
    number?: string;
    /** User provived tag. */
    tag?: string;
    /** Description of the version. */
    description?: string;
}
/** WxPromptResponseModelVersion. */
export interface WxPromptResponseModelVersion {
    /** User provided semantic version for tracking in IBM AI Factsheets. */
    number?: string;
    /** User provived tag. */
    tag?: string;
    /** Description of the version. */
    description?: string;
}
/** WxPromptSessionEntryListResultsItem. */
export interface WxPromptSessionEntryListResultsItem {
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
export interface ChatItem {
    type?: ChatItem.Constants.Type | string;
    content?: string;
    status?: ChatItem.Constants.Status | string;
    timestamp?: number;
}
export declare namespace ChatItem {
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
export interface ExternalInformation {
    external_prompt_id: string;
    external_model_id: string;
    external_model_provider: string;
    external_prompt?: ExternalInformationExternalPrompt;
    external_model?: ExternalInformationExternalModel;
}
/** Prompt. */
export interface Prompt {
    input?: string[][];
    model_id: string;
    model_parameters?: PromptModelParameters;
    data: PromptData;
    system_prompt?: string;
    chat_items?: ChatItem[];
}
/** PromptData. */
export interface PromptData {
    instruction?: string;
    input_prefix?: string;
    output_prefix?: string;
    examples?: string[][];
}
/** PromptLock. */
export interface PromptLock {
    /** True if the prompt is currently locked. */
    locked: boolean;
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    lock_type?: PromptLock.Constants.LockType | string;
    /** Locked by is computed by the server and shouldn't be passed. */
    locked_by?: string;
}
export declare namespace PromptLock {
    namespace Constants {
        /**
         * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in
         * PUT /lock requests.
         */
        enum LockType {
            EDIT = "edit",
            GOVERNANCE = "governance"
        }
    }
}
/** PromptWithExternal. */
export interface PromptWithExternal {
    input?: string[][];
    model_id: string;
    model_parameters?: PromptWithExternalModelParameters;
    data: PromptData;
    system_prompt?: string;
    chat_items?: ChatItem[];
    external_information?: ExternalInformation;
}
/** UtilityAgentTool. */
export interface UtilityAgentTool {
    /** Name of the tool. */
    name: string;
    /** A plain text description of what the tool is used for. */
    description: string;
    /**
     * The precise instruction to agent LLMs and should be treated as part of the system prompt. If
     * not provided, `description` can be used in it's place.
     */
    agent_description?: string;
    /** The JSON schema of the input that is provided when running the tool if applicable. */
    input_schema?: JsonObject;
    /** The JSON schema of the config that can be provided when running the tool if applicable. */
    config_schema?: JsonObject;
}
/** WxPromptResponse. */
export interface WxPromptResponse {
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
export declare namespace WxPromptResponse {
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
export interface CatalogSearchResponseAsset {
    entity: Record<string, any>;
    metadata: {
        asset_id: string;
        name: string;
        description: string;
        [key: string]: any;
    };
}
export interface ListPromptsResponse {
    /** Catalog Search Model */
    next?: CatalogSearch;
    total_rows?: number;
    results?: CatalogSearchResponseAsset[];
}
/** WxPromptSession. */
export interface WxPromptSession {
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
export interface WxPromptSessionEntry {
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
export declare namespace WxPromptSessionEntry {
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
export interface WxPromptSessionEntryList {
    results?: WxPromptSessionEntryListResultsItem[];
    bookmark?: string;
}
/** WxUtilityAgentToolsResponse. */
export interface WxUtilityAgentToolsResponse {
    resources: UtilityAgentTool[];
}
/** WxUtilityAgentToolsRunRequest. */
export interface WxUtilityAgentToolsRunRequest {
    input: string | Record<string, any>;
    tool_name: string;
    config?: Record<string, any>;
}
/** WxUtilityAgentToolsRunResponse. */
export interface WxUtilityAgentToolsRunResponse {
    /** The output from running the tool. */
    output: any;
}
/** The definition of an assistant message. */
export interface TextChatMessagesTextChatMessageAssistant extends Messages.TextChatMessageAssistant {
}
export declare namespace TextChatMessagesTextChatMessageAssistant {
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
export interface TextChatMessagesTextChatMessageSystem extends TextChatMessageSystem {
}
export declare namespace TextChatMessagesTextChatMessageSystem {
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
export interface TextChatMessagesTextChatMessageTool extends TextChatMessageTool {
}
export declare namespace TextChatMessagesTextChatMessageTool {
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
export interface TextChatMessagesTextChatMessageUser extends TextChatMessageUser {
}
export declare namespace TextChatMessagesTextChatMessageUser {
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
export interface TextChatUserContentsTextChatUserImageURLContent extends TextChatUserImageURLContent {
}
export declare namespace TextChatUserContentsTextChatUserImageURLContent {
    namespace Constants {
        /** The type of the user content. */
        enum Type {
            TEXT = "text",
            IMAGE_URL = "image_url"
        }
    }
}
/** The definition of a user text content. */
export interface TextChatUserContentsTextChatUserTextContent extends TextChatUserTextContent {
}
export declare namespace TextChatUserContentsTextChatUserTextContent {
    namespace Constants {
        /** The type of the user content. */
        enum Type {
            TEXT = "text",
            IMAGE_URL = "image_url"
        }
    }
}
/** Request parameters */
export interface RequestParameters {
    options: BaseServiceOptions;
    defaultOptions: Record<string, any> & {
        headers?: Record<string, any>;
    };
}
/** Request parameters without headers */
export interface RequestParametersWithoutHeaders {
    options: BaseServiceOptions;
    defaultOptions: Record<string, any>;
}
/** Invoke request callback */
export type InvokeRequestCallback = (request: RequestParametersWithoutHeaders) => any;
/** Receive response callback */
export type ReceiveResponseCallback<T = any> = (response: T) => any;
/** The definition of request callbacks */
export interface RequestCallbacks<T = any> {
    requestCallback?: InvokeRequestCallback;
    responseCallback?: ReceiveResponseCallback<T>;
}
/** Status of the training job. */
export interface FineTuningEntity {
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * If set to `true` then the result of the training, if successful, will be uploaded to the
     * repository as a model.
     */
    auto_update_model?: boolean;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The parameters for the job. Note that if `verbalizer` is provided then `response_template` must
     * also be provided (and vice versa).
     */
    parameters?: FineTuningParameters;
    /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
    type?: FineTuningEntity.Constants.Type | string;
    /** The training datasets. */
    training_data_references: ObjectLocation[];
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The holdout/test datasets.
     */
    test_data_references?: ObjectLocation[];
    /**
     * The training results. Normally this is specified as `type=container` which means that it is
     * stored in the space or project.
     */
    results_reference: ObjectLocation;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** Status of the training job. */
    status: TrainingStatus;
}
export declare namespace FineTuningEntity {
    namespace Constants {
        /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
        enum Type {
            ILAB = "ilab"
        }
    }
}
/**
 * This field must not be set while creating a fine tuning job with InstructLab.
 *
 * The parameters for the job. Note that if `verbalizer` is provided then `response_template` must
 * also be provided (and vice versa).
 */
export interface FineTuningParameters {
    /** The task that is targeted for this model. */
    task_id?: string;
    /**
     * Number of updates steps to accumulate the gradients for, before performing a backward/update
     * pass.
     */
    accumulate_steps?: number;
    /** The model id of the base model for this job. */
    base_model: BaseModel;
    /** Total number of training epochs to perform. */
    num_epochs?: number;
    /** The initial learning rate for AdamW optimizer. */
    learning_rate?: number;
    /** The batch size per GPU/XPU/TPU/MPS/NPU core/CPU for training. */
    batch_size?: number;
    /**
     * Maximum sequence length in terms of number of tokens. Any sequence beyond this maximum length
     * will be truncated.
     */
    max_seq_length?: number;
    /** Separator for the prediction/response in the single sequence to train on completions only. */
    response_template?: string;
    /**
     * Verbalizer template to be used for formatting data at train and inference time.
     *
     * This template may use brackets to indicate where fields from the data model must be rendered.
     */
    verbalizer?: string;
    /** The name and number of GPUs used for the Fine Tuning job. */
    gpu?: GPU;
    /** Parameters to be set when running a Fine Tuning job with LoRA/QLoRA. */
    peft_parameters?: FineTuningPeftParameters;
    /**
     * Enabling gradient checkpointing reduces GPU memory required at the cost of slowing training by
     * approx 20%.
     */
    gradient_checkpointing?: boolean;
}
/** Parameters to be set when running a Fine Tuning job with LoRA/QLoRA. */
export interface FineTuningPeftParameters {
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The type specification for a LoRA or QLoRA Fine Tuning job. If type is set to `none`, no other
     * parameters in this object need to be specified.
     */
    type?: FineTuningPeftParameters.Constants.Type | string;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The Lora attention dimension (the "rank").
     */
    rank?: number;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The names of the modules to apply the adapter to. If this is specified, only the modules with
     * the specified names will be replaced. Please specify modules as per model architecture. If the
     * value is ["all-linear"], then LORA selects all linear and Conv1D modules as per model
     * architecture, except for the output layer.
     */
    target_modules?: string[];
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The alpha parameter for Lora scaling.
     */
    lora_alpha?: number;
    /**
     * This field must not be set while creating a fine tuning job with InstructLab.
     *
     * The dropout probability for Lora layers.
     */
    lora_dropout?: number;
}
export declare namespace FineTuningPeftParameters {
    namespace Constants {
        /**
         * This field must not be set while creating a fine tuning job with InstructLab. The type
         * specification for a LoRA or QLoRA Fine Tuning job. If type is set to `none`, no other
         * parameters in this object need to be specified.
         */
        enum Type {
            LORA = "lora",
            QLORA = "qlora",
            NONE = "none"
        }
    }
}
/** The response of a fine tuning job. */
export interface FineTuningResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** Status of the training job. */
    entity?: FineTuningEntity;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** System details. */
export interface FineTuningResources {
    /**
     * The total number of resources. Computed explicitly only when 'total_count=true' query parameter
     * is present. This is in order to avoid performance penalties.
     */
    total_count?: number;
    /** The number of items to return in each page. */
    limit: number;
    /** The reference to the first item in the current page. */
    first: PaginationFirst;
    /** A reference to the first item of the next page, if any. */
    next?: PaginationNext;
    resources?: FineTuningResource[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
export interface DocumentExtractionResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** The document extraction job properties. */
    entity?: DocumentExtractionResponse;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The response of getting all document extraction jobs. */
export interface DocumentExtractionResources {
    /** The number of items to return in each page. */
    limit: number;
    resources?: DocumentExtractionResource[];
}
/** The document extraction job properties. */
export interface DocumentExtractionResponse {
    /** The name of the document. */
    name: string;
    /** The documents for text extraction. */
    document_references: DocumentExtractionObjectLocation[];
    /** A reference to data. */
    results_reference: ObjectLocationGithub;
    /** A list of tags for this resource. */
    tags?: string[];
    /** Status of the document extraction job. */
    status?: DocumentExtractionStatus;
}
/** Status of the document extraction job. */
export interface DocumentExtractionStatus {
    /** Current state of document extraction. */
    state: DocumentExtractionStatus.Constants.State | string;
    /** The hash of the git commit when the results were saved. */
    commit?: string;
    /** The time when the job completed or failed. */
    completed_at?: string;
}
export declare namespace DocumentExtractionStatus {
    namespace Constants {
        /** Current state of document extraction. */
        enum State {
            QUEUED = "queued",
            PENDING = "pending",
            RUNNING = "running",
            STORING = "storing",
            COMPLETED_AT = "completed_at",
            FAILED = "failed",
            CANCELED = "canceled"
        }
    }
}
/** The Synthetic Data Generation context. */
export interface SyntheticDataGenerationContext {
    /** The Synthetic Data Generation location metrics. */
    samples?: SyntheticDataGenerationLocations;
}
/** A reference to data. */
export interface SyntheticDataGenerationDataReference {
    /** The data source type like `connection_asset` or `data_asset`. */
    type: SyntheticDataGenerationDataReference.Constants.Type | string;
    /**
     * Contains a set of fields specific to each connection. See here for [details about specifying
     * connections](#datareferences).
     */
    connection?: DataConnection;
    /**
     * Contains a set of fields that describe the location of the data with respect to the
     * `connection`.
     */
    location: JsonObject;
}
export declare namespace SyntheticDataGenerationDataReference {
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
/** The Synthetic Data Generation location metrics. */
export interface SyntheticDataGenerationLocations {
    /** The path to the created Knowledge file. */
    knowledge?: string;
    /** The path to the created Skills file. */
    skills?: string;
    /** The path to the created Logs file. */
    logs?: string;
    /** The path to the created Artifacts file. */
    artifacts?: string;
}
/** The Synthetic Data Generation metrics. */
export interface SyntheticDataGenerationMetric {
    /** The Synthetic Data Generation sample metrics. */
    samples?: SyntheticDataGenerationSample;
}
/** All the Synthetic Data Generation metrics. */
export interface SyntheticDataGenerationMetrics {
    /** The Synthetic Data Generation metrics. */
    synthetic_data_generation_metrics?: SyntheticDataGenerationMetric;
    /** The Synthetic Data Generation context. */
    context?: SyntheticDataGenerationContext;
}
/** The response from getting a specified synthetic data generation job. */
export interface SyntheticDataGenerationResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** The synthetic data generation job properties. */
    entity?: SyntheticDataGenerationResponse;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The response of getting all synthetic data generation jobs. */
export interface SyntheticDataGenerationResources {
    /** The number of items to return in each page. */
    limit: number;
    resources?: SyntheticDataGenerationResource[];
}
/** The synthetic data generation job properties. */
export interface SyntheticDataGenerationResponse {
    /** A reference to data. */
    results_reference?: ObjectLocation;
    /** The status of a Synthetic Data Generation job. */
    status?: SyntheticDataGenerationStatus;
    /** A reference to data. */
    data_reference?: ObjectLocation;
}
/** The Synthetic Data Generation sample metrics. */
export interface SyntheticDataGenerationSample {
    /** The knowledge metric value. */
    knowledge?: number;
    /** The skills metric value. */
    skills?: number;
    /** The combined value of the metric values. */
    total?: number;
}
/** The status of a Synthetic Data Generation job. */
export interface SyntheticDataGenerationStatus {
    /** The status of the job. */
    state: SyntheticDataGenerationStatus.Constants.State | string;
    /** The computed metrics. */
    metrics?: SyntheticDataGenerationMetrics[];
}
export declare namespace SyntheticDataGenerationStatus {
    namespace Constants {
        /** The status of the job. */
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
/** The response fields from a Taxonomy request. */
export interface TaxonomyResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: ResourceMeta;
    /** The Taxonomy entity. */
    entity?: TaxonomyResponse;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The list of Taxonomy jobs in specified project or space. */
export interface TaxonomyResources {
    /** The number of items to return in each page. */
    limit: number;
    /** The Taxonomy jobs in a project or space. */
    resources?: TaxonomyResource[];
}
/** The Taxonomy entity. */
export interface TaxonomyResponse {
    /** A reference to data. */
    results_reference?: ObjectLocation;
    /** The status of a Taxonomy job. */
    status?: TaxonomyStatus;
    /** A reference to data. */
    data_reference?: ObjectLocation;
}
/** The status of a Taxonomy job. */
export interface TaxonomyStatus {
    /** The status of the job. */
    state?: TaxonomyStatus.Constants.State | string;
    /** The timestamp when the job completed. */
    completed_at?: string;
    /** Date and Time in which current training state has started. */
    running_at?: string;
}
export declare namespace TaxonomyStatus {
    namespace Constants {
        /** The status of the job. */
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
/** A software specification. */
export interface SoftwareSpecRel {
    /** The id of the software specification. */
    id?: string;
    /** The revision of the software specification. */
    rev?: string;
    /** The name of the software specification. */
    name?: string;
}
export interface TrainingDetails {
    /** The `id` of the training job that produced this model. */
    id?: string;
    /** The model id of the base model for this job. */
    base_model?: BaseModel;
    /** The task that is targeted for this model. */
    task_id?: string;
    /** The optional verbalizer that was used during the training, if appropriate. */
    verbalizer?: string;
}
/** Data shape (rows, columns) passed as input to the transformer/transformation. */
export interface DataInput {
    /** The number of rows. */
    rows?: number;
    /** The number of columns. */
    columns?: number;
}
/** Data shape after the transformation. */
export interface DataOutput {
    /** The number of rows. */
    rows?: number;
    /** The number of columns. */
    columns?: number;
}
export interface Metric {
    /** A timestamp for the metrics. */
    timestamp: string;
    /** The iteration number. */
    iteration?: number;
    /** The metrics. */
    ml_metrics?: JsonObject;
    /**
     * The metrics from the time series. For more information, please see the [Time Series
     * Implementation](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/autoai-timeseries-details.html?audience=wdp#ts-metrics)
     * documentation.
     */
    ts_metrics?: MetricTsMetrics;
    /**
     * The metrics from the time series anomaly detection. For more information, please see the
     * [Creating a Time Series Anomaly
     * Prediction](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/autoai-ts-ad.html?audience=wdp)
     * documentation.
     */
    tsad_metrics?: MetricTsadMetrics;
    /** The metrics from federated training. */
    ml_federated_metrics?: JsonObject;
    /** Provides extra information for this training stage in the context of auto-ml. */
    context?: MetricsContext;
}
export interface MetricTsMetrics {
}
/**
 * The metrics from the time series anomaly detection. For more information, please see the
 * [Creating a Time Series Anomaly
 * Prediction](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/autoai-ts-ad.html?audience=wdp)
 * documentation.
 */
export interface MetricTsadMetrics {
}
export interface DataPreprocessingTransformation {
    /** The preprocessing stage. */
    stage?: string;
    /** Data shape (rows, columns) passed as input to the transformer/transformation. */
    input?: DataInput;
    /** Data shape after the transformation. */
    output?: DataOutput;
    /** Properties of preprocessing transformation. */
    props?: JsonObject;
}
/** Information related to the upload of the model content. */
export interface ModelResourceEntity {
    /**
     * The model type. The supported model types can be found in the documentation
     * [here](https://dataplatform.cloud.ibm.com/docs/content/wsj/wmls/wmls-deploy-python-types.html?context=analytics).
     */
    type: string;
    /** A software specification. */
    software_spec?: SoftwareSpecRel;
    /** A reference to a resource. */
    pipeline?: Rel;
    /** The model definition. */
    model_definition?: ModelDefinitionId;
    /** Hyper parameters used for training this model. */
    hyper_parameters?: JsonObject;
    /**
     * User provided domain name for this model. For example: sentiment, entity, visual-recognition,
     * finance, retail, real estate etc.
     */
    domain?: string;
    /** The training data that was used to create this model. */
    training_data_references?: DataConnectionReference[];
    /** The holdout/test datasets. */
    test_data_references?: DataConnectionReference[];
    /**
     * If the prediction schemas are provided here then they take precedent over any schemas provided
     * in the data references. Note that data references contain the schema for the associated data
     * and this object contains the schema(s) for the associated prediction, if any. In the case that
     * the prediction input data matches exactly the schema of the training data references then the
     * prediction schema can be omitted. However it is highly recommended to always specify the
     * prediction schemas using this field.
     */
    schemas?: ModelEntitySchemas;
    /** The name of the label column. */
    label_column?: string;
    /**
     * The name of the label column seen by the estimator, which may have been transformed by the
     * previous transformers in the pipeline. This is not necessarily the same column as the
     * `label_column` in the initial data set.
     */
    transformed_label_column?: string;
    /** This will be used by scoring to record the size of the model. */
    size?: ModelEntitySize;
    /** Metrics that can be returned by an operation. */
    metrics?: Metric[];
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /**
     * User defined objects referenced by the model. For any user defined class or function used in
     * the model, its name, as referenced in the model, must be specified as the `key` and its fully
     * qualified class or function name must be specified as the `value`. This is applicable for
     * `Tensorflow 2.X` models serialized in `H5` format using the `tf.keras` API.
     */
    user_defined_objects?: JsonObject;
    /**
     * The list of the software specifications that are used by the pipeline that generated this
     * model, if the model was generated by a pipeline.
     */
    hybrid_pipeline_software_specs?: SoftwareSpecRel[];
    /**
     * Optional metadata that can be used to provide information about this model that can be tracked
     * with IBM AI Factsheets. See [Using AI
     * Factsheets](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/factsheets-model-inventory.html)
     * for more details.
     */
    model_version?: ModelEntityModelVersion;
    /**
     * Deprecated: this is replaced by `training.id`. This field can be used to store the `id` of the
     * training job that was used to produce this model.
     */
    training_id?: string;
    /**
     * An optional array which contains the data preprocessing transformations that were executed by
     * the training job that created this model.
     */
    data_preprocessing?: DataPreprocessingTransformation[];
    /** Information about the training job that created this model. */
    training?: TrainingDetails;
    /** The upload state. */
    content_import_state?: ModelResourceEntity.Constants.ContentImportState | string;
}
export declare namespace ModelResourceEntity {
    namespace Constants {
        /** The upload state. */
        enum ContentImportState {
            RUNNING = "running",
            FAILED = "failed",
            COMPLETED = "completed"
        }
    }
}
export interface ModelResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata: ResourceMeta;
    /** Information related to the upload of the model content. */
    entity?: ModelResourceEntity;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
export interface ModelEntityModelVersion {
    /** This is the user-provided version which should follow semantic versioning. */
    number?: string;
    /** This is the user-provided tag for the model. */
    tag?: string;
    /**
     * This is the user provided description that provides context for the change in the model
     * version.
     */
    description?: string;
}
export interface ModelEntitySchemas {
    /**
     * The schema of the expected prediction input data, see
     * [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json)
     * for the schema definition.
     */
    input?: DataSchema[];
    /**
     * The schema of the expected prediction output data, see
     * [datarecord-metadata-v2-schema](https://raw.githubusercontent.com/elyra-ai/pipeline-schemas/master/common-pipeline/datarecord-metadata/datarecord-metadata-v2-schema.json)
     * for the schema definition.
     */
    output?: DataSchema[];
}
export interface ModelEntitySize {
    /** The memory size of the model. */
    in_memory?: number;
    /** The size of the model on disk. */
    content?: number;
}
export interface ContentInfo {
    /** The content format of the attachment. This can be one of `native`, `coreML`, `pipeline-node`. */
    content_format: string;
    /** The location of the content to be uploaded. */
    location: string;
    /** The file name that will be used when downloading the content from the UI. */
    file_name: string;
    /**
     * The `pipeline_node_id` that corresponds to this content. This is required only if the
     * `content_format` is `pipeline-node` otherwise it is rejected or ignored.
     */
    pipeline_node_id?: string;
    /**
     * The `deployment_id` that corresponds to this content. This is required only if the
     * `content_format` is `coreml` otherwise it is rejected or ignored.
     */
    deployment_id?: string;
}
export interface ContentLocation {
    /** The content information to be uploaded. */
    contents: ContentInfo[];
    /** The data source type like `connection_asset` or `data_asset`. */
    type: ContentLocation.Constants.Type | string;
    /** Connection properties. */
    connection?: JsonObject;
    /** Location properties. */
    location?: JsonObject;
}
export declare namespace ContentLocation {
    namespace Constants {
        /** The data source type like `connection_asset` or `data_asset`. */
        enum Type {
            CONNECTION_ASSET = "connection_asset",
            DATA_ASSET = "data_asset",
            URL = "url"
        }
    }
}
export interface AudioTranscriptionResult {
    /** The model used for audio transcriptions. */
    model: string;
    /** The transcribed text. */
    text: string;
    /** The time when the response was created in ISO 8601 format. Example: 2020-05-02T16:27:51Z */
    created_at: string;
    /** Number of estimated tokens from returned text. */
    token_count: number;
}
/** A paginated list of models. */
export interface ModelResources {
    /**
     * The total number of resources. Computed explicitly only when 'total_count=true' query parameter
     * is present. This is in order to avoid performance penalties.
     */
    total_count?: number;
    /** The number of items to return in each page. */
    limit: number;
    /** The reference to the first item in the current page. */
    first: PaginationFirst;
    /** A reference to the first item of the next page, if any. */
    next?: PaginationNext;
    /** A list of models. */
    resources?: ModelResource[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** ModelDefinitionEntityPlatform. */
export interface ModelDefinitionEntityPlatform {
    /** The name of the platform. */
    name: string;
    /** The supported versions. */
    versions: string[];
}
/** ModelDefinitionEntityRequestPlatform. */
export interface ModelDefinitionEntityRequestPlatform {
    /** The name of the platform. */
    name: string;
    /** The supported versions. */
    versions: string[];
}
/**
 * The definition of a model. The `software_spec` is used only for training. Either space_id or
 * project_id has to be provided and is mandatory.
 */
export interface ModelDefinitionEntity {
    /** The package version. */
    version: string;
    platform: ModelDefinitionEntityPlatform;
    /** The command used to run the model. */
    command?: string;
    /** A software specification. */
    software_spec?: SoftwareSpecRel;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
}
/** The model definition. */
export interface ModelDefinitionId {
    /** The id of the model definition. */
    id?: string;
}
/**
 * A model. The `software_spec` is a reference to a software specification. The `hardware_spec` is a
 * reference to a hardware specification.
 */
export interface ModelDefinitionRel {
    /** The id of the referenced resource. */
    id: string;
    /** The revision of the referenced resource. */
    rev?: string;
    /** The underlying model type produced by the pipeline or by the model_definition. */
    model_type?: string;
    /** A hardware specification. */
    hardware_spec?: HardwareSpec;
    /** A software specification. */
    software_spec?: SoftwareSpecRel;
    /** If present, it overrides the command specified to the library resource itself. */
    command?: string;
    /** Optional key-value pairs parameters. */
    parameters?: JsonObject;
}
/** The name and number of GPUs used for the Fine Tuning job. */
export interface GPU {
    /** The number of GPUs used for the Fine Tuning job. */
    num?: number;
    /**
     * The name of the GPU(s) used for the Fine Tuning job. The GPU specified must be available on the
     * cluster.
     */
    name?: string;
}
/** A reference to data. */
export interface DocumentExtractionObjectLocation {
    /** The data source type. This field must be set to `container`. */
    type: DocumentExtractionObjectLocation.Constants.Type | string;
    /**
     * Contains a set of fields that describe the location of the data with respect to the
     * `connection`.
     */
    location: JsonObject;
}
export declare namespace DocumentExtractionObjectLocation {
    namespace Constants {
        /** The data source type. This field must be set to `container`. */
        enum Type {
            CONTAINER = "container"
        }
    }
}
/** A reference to data. */
export interface ObjectLocationGithub {
    /** The data source type, for now only `github` is supported. */
    type: ObjectLocationGithub.Constants.Type | string;
    /**
     * Contains a set of fields that describe the location of the data with respect to the
     * `connection`.
     */
    location: JsonObject;
}
export declare namespace ObjectLocationGithub {
    namespace Constants {
        /** The data source type, for now only `github` is supported. */
        enum Type {
            GITHUB = "github"
        }
    }
}
export interface ErrorResponse {
    code: string;
    message: string;
    paramteters?: string[];
    more_info?: string;
}
export interface SpaceResource {
    metadata: {
        id: string;
        url: string;
        creator_id: string;
        created_at: string;
        updated_at: string;
    };
    entity: {
        name: string;
        scope: {
            bss_account_id: string;
        };
        status: {
            state: string;
            failure?: {
                trace: string;
                errors: ErrorResponse[];
            };
        };
        stage: SpaceStage;
        type: string;
        settings: SpaceSettings;
        description?: string;
        storage?: SpaceStorage;
        compute?: SpaceCompute[];
        members?: SpaceMember[];
        tags?: string[];
        generator?: string;
    };
}
export interface SpaceResources {
    total_count?: number;
    limit: number;
    first: {
        href: string;
    };
    next?: {
        href: string;
    };
    resources: SpaceResource[];
}
export interface TextClassificationDataReference {
    /** The data source type. */
    type: TextClassificationDataReference.Constants.Type | string;
    /** Contains a set of location fields specific to each data source. */
    connection?: CosDataConnection;
    /** Contains a set of fields specific to each connection. */
    location?: CosDataLocation;
}
export declare namespace TextClassificationDataReference {
    namespace Constants {
        /** The data source type. */
        enum Type {
            CONNECTION_ASSET = "connection_asset",
            CONTAINER = "container"
        }
    }
}
/** The parameters for the text extraction. */
export interface TextClassificationParameters {
    /**
     * If OCR should be used when processing a document. An empty value allows the service to select
     * the best option for your processing mode.
     *
     * - `enabled`: OCR is run on embedded images, OCR is only run if no programmatic text could be
     *   extracted from the area.
     * - `disabled`: OCR is not run, no information is extracted from images or scanned documents.
     * - `forced`: WDU will take a picture of the page and run OCR across it, this applies to all
     *   documents even purely programmatic ones.
     */
    ocr_mode?: TextClassificationParameters.Constants.OcrMode | string;
    /**
     * The classification mode. The value `exact` gives the exact schema name the the document is
     * classified to. The option `binary`` only gives whether the document is classified to a known
     * schema or not.
     */
    classification_mode?: TextClassificationParameters.Constants.ClassificationMode | string;
    /** Should the service attempt to fix a rotated page or image. */
    auto_rotation_correction?: boolean;
    /**
     * Set of languages to be expected in the document. The language codes follow `ISO 639` where
     * possible. See the documentation for the currently supported languages.
     */
    languages?: string[];
    /** Additional configuration settings for the Semantic KVP model. */
    semantic_config?: TextClassificationSemanticConfig;
}
export declare namespace TextClassificationParameters {
    namespace Constants {
        /**
         * If OCR should be used when processing a document. An empty value allows the service to select
         * the best option for your processing mode. - `enabled`: OCR is run on embedded images, OCR is
         * only run if no programmatic text could be extracted from the area. - `disabled`: OCR is not
         * run, no information is extracted from images or scanned documents.
         *
         * - `forced`: WDU will take a picture of the page and run OCR across it, this applies to all
         *   documents even purely programmatic ones.
         */
        enum OcrMode {
            DISABLED = "disabled",
            ENABLED = "enabled",
            FORCED = "forced"
        }
        /**
         * The classification mode. The value `exact` gives the exact schema name the the document is
         * classified to. The option `binary`` only gives whether the document is classified to a known
         * schema or not.
         */
        enum ClassificationMode {
            EXACT = "exact",
            BINARY = "binary"
        }
    }
}
/** The text classification resource. */
export interface TextClassificationResource {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: TextExtractionMetadata;
    /** The document details for the text classification. */
    entity?: TextClassificationResourceEntity;
}
/** The document details for the text classification. */
export interface TextClassificationResourceEntity {
    /** A reference to data. */
    document_reference: TextClassificationDataReference;
    /** The parameters for the text extraction. */
    parameters: TextClassificationParameters;
    /** User defined properties specified as key-value pairs. */
    custom?: JsonObject;
    /** The current status of the text extraction. */
    results: TextClassificationResults;
}
/** A paginated list of resources. */
export interface TextClassificationResources {
    /**
     * The total number of resources. Computed explicitly only when `total_count=true` query parameter
     * is present. This is in order to avoid performance penalties.
     */
    total_count?: number;
    /** The number of items to return in each page. */
    limit: number;
    /** The reference to the first item in the current page. */
    first: PaginationFirst;
    /** A reference to the first item of the next page, if any. */
    next?: PaginationNext;
    /** A list of resources. */
    resources?: TextClassificationResource[];
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The text classification response. */
export interface TextClassificationResponse {
    /** Common metadata for a resource where `project_id` or `space_id` must be present. */
    metadata?: TextExtractionMetadata;
    /** The document details for the text classification. */
    entity?: TextClassificationResourceEntity;
    /**
     * Optional details coming from the service and related to the API call or the associated
     * resource.
     */
    system?: SystemDetails;
}
/** The current status of the text extraction. */
export interface TextClassificationResults {
    /** The status of the request. */
    status: TextClassificationResults.Constants.Status | string;
    /** The time when the request is successfully running on the processor. */
    running_at?: string;
    /** The time when the request completed or failed. */
    completed_at?: string;
    /** A flag to indicate if the classification was found. */
    document_classified?: boolean;
    /** The classification of the document if found. */
    document_type?: string;
    /** A service error message. */
    error?: ServiceError;
}
export declare namespace TextClassificationResults {
    namespace Constants {
        /** The status of the request. */
        enum Status {
            SUBMITTED = "submitted",
            UPLOADING = "uploading",
            RUNNING = "running",
            DOWNLOADING = "downloading",
            DOWNLOADED = "downloaded",
            COMPLETED = "completed",
            FAILED = "failed"
        }
    }
}
/** Additional configuration settings for the Semantic KVP model. */
export interface TextClassificationSemanticConfig {
    /** Sets the merge strategy of the predefined and user defined input schemas. */
    schemas_merge_strategy?: TextClassificationSemanticConfig.Constants.SchemasMergeStrategy | string;
    /**
     * Specifies custom schemas that should be used for semantic KVP extraction, outside the
     * predefined schemas.
     */
    schemas?: TextExtractionSchema[];
}
export declare namespace TextClassificationSemanticConfig {
    namespace Constants {
        /** Sets the merge strategy of the predefined and user defined input schemas. */
        enum SchemasMergeStrategy {
            MERGE = "merge",
            REPLACE = "replace"
        }
    }
}
/** A custom schemas. */
export interface TextExtractionSchema {
    /** Should be a short one or two word title like Passport or Bill Of Lading. */
    document_type: string;
    /** Should be one or two sentences to ensure the LLM gets an accurate understanding. */
    document_description: string;
    /**
     * Specifies if the input image should be downscaled. Defaults to the value defined in the
     * `semantic_config` section.
     */
    target_image_width?: number;
    /**
     * Determines whether to use text hints when extracting values for this schema and the generic
     * KVPs. Defaults to the value defined in the `semantic_config` section.
     */
    enable_text_hints?: boolean;
    /**
     * Deprecated: Indicates whether to perform generic Key-Value Pair (KVP) extraction and output the
     * generic KVPs along with the semantic KVPs extracted with this custom schema. Defaults to the
     * value defined in the `semantic_config` section.
     */
    enable_generic_kvp?: boolean;
    /**
     * A mapping of fields to identify within the schema, where each key is the short-form name of the
     * field, and the corresponding value is an object is a schema as defined below.
     */
    fields?: TextExtractionSemanticKvpField;
}
/**
 * A mapping of fields to identify within the schema, where each key is the short-form name of the
 * field, and the corresponding value is an object is a schema as defined below.
 */
export interface TextExtractionSemanticKvpField {
    /** Description of the field to identify. */
    description: string;
    /** An example value to help inform the LLM of structure and format. */
    example: string;
    /** Required for inferred fields to provide the available_options list of values to return from. */
    available_options?: string[];
}
export {};
//# sourceMappingURL=vml_v1.d.ts.map