"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
     * Create a `ModuleConfig<'generative-anthropic', GenerativeAnthropicConfig | undefined>` object for use when performing AI generation using the `generative-anthropic` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/anthropic/generative) for detailed usage.
     *
     * @param {GenerativeAnthropicConfigCreate} [config] The configuration for the `generative-anthropic` module.
     * @returns {ModuleConfig<'generative-anthropic', GenerativeAnthropicConfig | undefined>} The configuration object.
     */
    anthropic(config) {
        return {
            name: 'generative-anthropic',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-anyscale', GenerativeAnyscaleConfig | undefined>` object for use when performing AI generation using the `generative-anyscale` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/anyscale/generative) for detailed usage.
     *
     * @param {GenerativeAnyscaleConfigCreate} [config] The configuration for the `generative-aws` module.
     * @returns {ModuleConfig<'generative-anyscale', GenerativeAnyscaleConfig | undefined>} The configuration object.
     */
    anyscale(config) {
        return {
            name: 'generative-anyscale',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-aws', GenerativeAWSConfig>` object for use when performing AI generation using the `generative-aws` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/aws/generative) for detailed usage.
     *
     * @param {GenerativeAWSConfigCreate} config The configuration for the `generative-aws` module.
     * @returns {ModuleConfig<'generative-aws', GenerativeAWSConfig>} The configuration object.
     */
    aws(config) {
        return {
            name: 'generative-aws',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-openai', GenerativeAzureOpenAIConfig>` object for use when performing AI generation using the `generative-openai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/generative) for detailed usage.
     *
     * @param {GenerativeAzureOpenAIConfigCreate} config The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-openai', GenerativeAzureOpenAIConfig>} The configuration object.
     */
    azureOpenAI: (config) => {
        return {
            name: 'generative-openai',
            config: {
                deploymentId: config.deploymentId,
                resourceName: config.resourceName,
                baseURL: config.baseURL,
                frequencyPenaltyProperty: config.frequencyPenalty,
                maxTokensProperty: config.maxTokens,
                presencePenaltyProperty: config.presencePenalty,
                temperatureProperty: config.temperature,
                topPProperty: config.topP,
            },
        };
    },
    /**
     * Create a `ModuleConfig<'generative-cohere', GenerativeCohereConfig>` object for use when performing AI generation using the `generative-cohere` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/generative) for detailed usage.
     *
     * @param {GenerativeCohereConfigCreate} [config] The configuration for the `generative-cohere` module.
     * @returns {ModuleConfig<'generative-cohere', GenerativeCohereConfig | undefined>} The configuration object.
     */
    cohere: (config) => {
        return {
            name: 'generative-cohere',
            config: config
                ? {
                    kProperty: config.k,
                    maxTokensProperty: config.maxTokens,
                    model: config.model,
                    returnLikelihoodsProperty: config.returnLikelihoods,
                    stopSequencesProperty: config.stopSequences,
                    temperatureProperty: config.temperature,
                }
                : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-databricks', GenerativeDatabricksConfig>` object for use when performing AI generation using the `generative-databricks` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/databricks/generative) for detailed usage.
     *
     * @param {GenerativeDatabricksConfigCreate} config The configuration for the `generative-databricks` module.
     * @returns {ModuleConfig<'generative-databricks', GenerativeDatabricksConfig>} The configuration object.
     */
    databricks: (config) => {
        return {
            name: 'generative-databricks',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-friendliai', GenerativeFriendliAIConfig | undefined>` object for use when performing AI generation using the `generative-friendliai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/friendliai/generative) for detailed usage.
     */
    friendliai(config) {
        return {
            name: 'generative-friendliai',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-mistral', GenerativeMistralConfig | undefined>` object for use when performing AI generation using the `generative-mistral` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/mistral/generative) for detailed usage.
     *
     * @param {GenerativeMistralConfigCreate} [config] The configuration for the `generative-mistral` module.
     * @returns {ModuleConfig<'generative-mistral', GenerativeMistralConfig | undefined>} The configuration object.
     */
    mistral(config) {
        return {
            name: 'generative-mistral',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-nvidia', GenerativeNvidiaConfig | undefined>` object for use when performing AI generation using the `generative-mistral` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/generative) for detailed usage.
     *
     * @param {GenerativeNvidiaConfigCreate} [config] The configuration for the `generative-nvidia` module.
     * @returns {ModuleConfig<'generative-nvidia', GenerativeNvidiaConfig | undefined>} The configuration object.
     */
    nvidia(config) {
        return {
            name: 'generative-nvidia',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-ollama', GenerativeOllamaConfig | undefined>` object for use when performing AI generation using the `generative-ollama` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/ollama/generative) for detailed usage.
     *
     * @param {GenerativeOllamaConfigCreate} [config] The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-ollama', GenerativeOllamaConfig | undefined>} The configuration object.
     */
    ollama(config) {
        return {
            name: 'generative-ollama',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-openai', GenerativeOpenAIConfig | undefined>` object for use when performing AI generation using the `generative-openai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/generative) for detailed usage.
     *
     * @param {GenerativeOpenAIConfigCreate} [config] The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-openai', GenerativeOpenAIConfig | undefined>} The configuration object.
     */
    openAI: (config) => {
        return {
            name: 'generative-openai',
            config: config
                ? {
                    baseURL: config.baseURL,
                    frequencyPenaltyProperty: config.frequencyPenalty,
                    maxTokensProperty: config.maxTokens,
                    model: config.model,
                    presencePenaltyProperty: config.presencePenalty,
                    temperatureProperty: config.temperature,
                    topPProperty: config.topP,
                }
                : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-palm', GenerativePaLMConfig>` object for use when performing AI generation using the `generative-palm` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/generative) for detailed usage.
     *
     * @param {GenerativePaLMConfigCreate} [config] The configuration for the `generative-palm` module.
     * @returns {ModuleConfig<'generative-palm', GenerativePaLMConfig>} The configuration object.
     * @deprecated Use `google` instead.
     */
    palm: (config) => {
        var _a;
        console.warn('The `generative-palm` module is deprecated. Use `generative-google` instead.');
        return {
            name: 'generative-palm',
            // Do not populate config key if config === undefined.
            config: config
                ? Object.assign(Object.assign({}, config), ((config === null || config === void 0 ? void 0 : config.modelId) || (config === null || config === void 0 ? void 0 : config.model) ? { modelId: (_a = config === null || config === void 0 ? void 0 : config.model) !== null && _a !== void 0 ? _a : config === null || config === void 0 ? void 0 : config.model } : undefined)) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-google', GenerativeGoogleConfig>` object for use when performing AI generation using the `generative-google` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/generative) for detailed usage.
     *
     * @param {GenerativePaLMConfigCreate} [config] The configuration for the `generative-palm` module.
     * @returns {ModuleConfig<'generative-palm', GenerativePaLMConfig>} The configuration object.
     */
    google: (config) => {
        var _a;
        return {
            name: 'generative-google',
            // Do not populate config key if config === undefined.
            config: config
                ? Object.assign(Object.assign({}, config), ((config === null || config === void 0 ? void 0 : config.modelId) || (config === null || config === void 0 ? void 0 : config.model) ? { modelId: (_a = config === null || config === void 0 ? void 0 : config.model) !== null && _a !== void 0 ? _a : config === null || config === void 0 ? void 0 : config.model } : undefined)) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-xai', GenerativeXAIConfig | undefined>` object for use when performing AI generation using the `generative-xai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/xai/generative) for detailed usage.
     *
     * @param {GenerativeXAIConfigCreate} [config] The configuration for the `generative-xai` module.
     * @returns {ModuleConfig<'generative-xai', GenerativeXAIConfig | undefined>} The configuration object.
     */
    xai: (config) => {
        return {
            name: 'generative-xai',
            config,
        };
    },
};
