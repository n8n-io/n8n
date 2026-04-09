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
import type { DefaultParams, DataReference } from "../../../types/common.js";
/** Configuration details for a WatsonX.ai provider. */
export interface WatsonxaiConfig {
    /** Overrides the WatsonX.ai API version to use. */
    api_version?: string;
    /** The required authentication key for accessing WatsonX.ai services. */
    apikey: string;
    /** Overrides the URL to use for IBM Cloud IAM authentication. */
    auth_url?: string;
    /** Overrides the URL to use to access the IBM WatsonX.ai services. */
    base_url: string;
    /** The IBM WatsonX.ai project ID (required if `space_id` is not provided). */
    project_id?: string;
    /** The IBM WatsonX.ai space ID (required if `project_id` is not provided). */
    space_id?: string;
}
/** Configuration details for an Anthropic provider. */
export interface AnthropicConfig {
    /** The required authentication key for accessing the Anthropic API. */
    apikey: string;
}
/** Configuration details for an AWS Bedrock provider. */
export interface AWSBedrockConfig {
    /** The AWS access key ID required to authenticate with the Bedrock API. */
    access_key_id: string;
    /** Overrides the default AWS Bedrock Runtime API endpoint with the provided URL. */
    base_url?: string;
    /** The AWS region where the Bedrock API is hosted. */
    region: string;
    /** The AWS secret access key required to authenticate with the Bedrock API. */
    secret_access_key: string;
}
/** Configuration details for an Azure OpenAI provider. */
export interface AzureOpenAIConfig {
    /** The Azure account name; required to use `/v1/provider/{provider_id}/models`. */
    account_name?: string;
    /** Version of the Azure OpenAI API to use (default: `"2024-10-21"`). */
    api_version: string;
    /** The required authentication key for accessing Azure OpenAI services. */
    apikey: string;
    /** The Azure resource group name; required to use `/v1/provider/{provider_id}/models`. */
    resource_group_name?: string;
    /** The Azure OpenAI resource to connect to. */
    resource_name: string;
    /** The Azure subscription ID; required to use `/v1/provider/{provider_id}/models`. */
    subscription_id?: string;
}
/** Configuration details for a Cerebras provider. */
export interface CerebrasConfig {
    /** The required authentication key for accessing the Cerebras API. */
    apikey: string;
}
/** Configuration details for an Nvidia NIM provider. */
export interface NvidiaNIMConfig {
    /** The required authentication key for accessing the Nvidia NIM API. */
    apikey: string;
}
/** Configuration details for an OpenAI provider. */
export interface OpenAIConfig {
    /** The required authentication key for accessing the OpenAI API. */
    apikey: string;
    /**
     * Override the URL used to access the OpenAI provider services. This URL can point to any
     * OpenAI-compatible model provider service.
     */
    base_url?: string;
}
/** Parameters for the `listProviders` operation. */
export interface ListProvidersParams extends DefaultParams {
    /** Provider ID. */
    providerId?: string;
}
/** Parameters for the `createAnthropicProvider` operation. */
export interface CreateAnthropicProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: AnthropicConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'anthropic';
}
/** Parameters for the `createAzureOpenAIProvider` operation. */
export interface CreateAzureOpenAIProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: AzureOpenAIConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'azure-openai';
}
/** Parameters for the `createBedrockProvider` operation. */
export interface CreateBedrockProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: AWSBedrockConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'bedrock';
}
/** Parameters for the `createCerebrasProvider` operation. */
export interface CreateCerebrasProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: CerebrasConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'cerebas';
}
/** Parameters for the `createNIMProvider` operation. */
export interface CreateNIMProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: NvidiaNIMConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'nim';
}
/** Parameters for the `createOpenAIProvider` operation. */
export interface CreateOpenAIProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: OpenAIConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'openai';
}
/** Parameters for the `createWatsonxaiProvider` operation. */
export interface CreateWatsonxaiProviderParams extends DefaultParams {
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /** Contains the credential details for configuring the provider instance. */
    data?: WatsonxaiConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for creation */
    providerName: 'watsonxai';
}
export type CreateProviderParams = CreateAnthropicProviderParams | CreateAzureOpenAIProviderParams | CreateBedrockProviderParams | CreateCerebrasProviderParams | CreateNIMProviderParams | CreateOpenAIProviderParams | CreateWatsonxaiProviderParams;
/** Parameters for the `findProviders` operation. */
export interface FindProvidersParams extends DefaultParams {
    /** Provider name to search for. */
    name?: string;
}
/** Parameters for the `getProvider` operation. */
export interface GetProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
}
/** Parameters for the `deleteProvider` operation. */
export interface DeleteProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
}
/** Parameters for the `replaceNIMProvider` operation. */
export interface ReplaceNIMProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: NvidiaNIMConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'nim';
}
/** Parameters for the `replaceOpenAIProvider` operation. */
export interface ReplaceOpenAIProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: OpenAIConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'openai';
}
/** Parameters for the `replaceWatsonxaiProvider` operation. */
export interface ReplaceWatsonxaiProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: WatsonxaiConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'watsonxai';
}
/** Parameters for the `replaceAnthropicProvider` operation. */
export interface ReplaceAnthropicProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: AnthropicConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'anthropic';
}
/** Parameters for the `replaceAzureOpenAIProvider` operation. */
export interface ReplaceAzureOpenAIProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: AzureOpenAIConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'azure-openai';
}
/** Parameters for the `replaceBedrockProvider` operation. */
export interface ReplaceBedrockProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: AWSBedrockConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'bedrock';
}
/** Parameters for the `replaceCerebrasProvider` operation. */
export interface ReplaceCerebrasProviderParams extends DefaultParams {
    /** Provider ID. */
    providerId: string;
    /**
     * Data Reference is a reference to a remote credential store. For example, an IBM Cloud Secrets
     * Manager secret. The Value in the remote store is expected to be a JSON representation of the
     * Data field.
     */
    dataReference?: DataReference;
    /**
     * Contains the credential details for configuring the provider instance. Available only on IBM
     * watsonx.ai software.
     */
    data?: CerebrasConfig;
    /**
     * Name can only contain alphanumeric characters, single spaces (no consecutive spaces), hyphens
     * (-), parentheses (), and square brackets []. No leading or trailing spaces are allowed.
     */
    name: string;
    /** Name of provider choosen for updating */
    providerName: 'cerebras';
}
/** Combined type of all providers params for updating */
export type UpdateProviderParams = ReplaceAnthropicProviderParams | ReplaceAzureOpenAIProviderParams | ReplaceBedrockProviderParams | ReplaceCerebrasProviderParams | ReplaceNIMProviderParams | ReplaceOpenAIProviderParams | ReplaceWatsonxaiProviderParams;
export type ProviderConfig = WatsonxaiConfig | AnthropicConfig | NvidiaNIMConfig | OpenAIConfig | AWSBedrockConfig | AzureOpenAIConfig | CerebrasConfig;
//# sourceMappingURL=request.d.ts.map