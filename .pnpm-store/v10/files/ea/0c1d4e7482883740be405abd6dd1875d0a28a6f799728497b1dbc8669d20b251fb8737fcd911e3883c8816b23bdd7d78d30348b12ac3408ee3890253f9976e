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
import { TextArray } from '../../proto/v1/base.js';
export const generativeParameters = {
    /**
     * Create a `ModuleConfig<'generative-anthropic', GenerativeConfigRuntimeType<'generative-anthropic'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-anthropic` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/anthropic/generative) for detailed usage.
     *
     * @param {GenerativeAnthropicConfigCreateRuntime} [config] The configuration for the `generative-anthropic` module.
     * @returns {ModuleConfig<'generative-anthropic', GenerativeAnthropicConfigCreateRuntime | undefined>} The configuration object.
     */
    anthropic(config) {
        const _a = config || {}, { baseURL, stopSequences } = _a, rest = __rest(_a, ["baseURL", "stopSequences"]);
        return {
            name: 'generative-anthropic',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL, stopSequences: TextArray.fromPartial({ values: stopSequences }) }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-anyscale', GenerativeConfigRuntimeType<'generative-anyscale'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-anyscale` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/anyscale/generative) for detailed usage.
     *
     * @param {GenerativeAnyscaleConfigRuntime} [config] The configuration for the `generative-aws` module.
     * @returns {ModuleConfig<'generative-anyscale', GenerativeConfigRuntimeType<'generative-anyscale'> | undefined>} The configuration object.
     */
    anyscale(config) {
        const _a = config || {}, { baseURL } = _a, rest = __rest(_a, ["baseURL"]);
        return {
            name: 'generative-anyscale',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-aws', GenerativeConfigRuntimeType<'generative-aws'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-aws` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/aws/generative) for detailed usage.
     *
     * @param {GenerativeAWSConfigRuntime} [config] The configuration for the `generative-aws` module.
     * @returns {ModuleConfig<'generative-aws', GenerativeConfigRuntimeType<'generative-aws'> | undefined>} The configuration object.
     */
    aws(config) {
        return {
            name: 'generative-aws',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-openai', GenerativeConfigRuntimeType<'generative-azure-openai'>>` object for use when performing runtime-specific AI generation using the `generative-openai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/generative) for detailed usage.
     *
     * @param {GenerativeAzureOpenAIConfigRuntime} [config] The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-azure-openai', GenerativeConfigRuntimeType<'generative-azure-openai'>>} The configuration object.
     */
    azureOpenAI: (config) => {
        const _a = config || {}, { baseURL, stop } = _a, rest = __rest(_a, ["baseURL", "stop"]);
        return {
            name: 'generative-azure-openai',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL, isAzure: true, stop: TextArray.fromPartial({ values: stop }) }) : { isAzure: true },
        };
    },
    /**
     * Create a `ModuleConfig<'generative-cohere', GenerativeConfigRuntimeType<'generative-cohere'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-cohere` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/generative) for detailed usage.
     *
     * @param {GenerativeCohereConfigRuntime} [config] The configuration for the `generative-cohere` module.
     * @returns {ModuleConfig<'generative-cohere', GenerativeConfigRuntimeType<'generative-cohere'> | undefined>} The configuration object.
     */
    cohere: (config) => {
        const _a = config || {}, { baseURL, stopSequences } = _a, rest = __rest(_a, ["baseURL", "stopSequences"]);
        return {
            name: 'generative-cohere',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL, stopSequences: TextArray.fromPartial({ values: stopSequences }) }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-databricks', GenerativeConfigRuntimeType<'generative-databricks'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-databricks` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/databricks/generative) for detailed usage.
     *
     * @param {GenerativeDatabricksConfigRuntime} [config] The configuration for the `generative-databricks` module.
     * @returns {ModuleConfig<'generative-databricks', GenerativeConfigRuntimeType<'generative-databricks'> | undefined>} The configuration object.
     */
    databricks: (config) => {
        const _a = config || {}, { stop } = _a, rest = __rest(_a, ["stop"]);
        return {
            name: 'generative-databricks',
            config: config
                ? Object.assign(Object.assign({}, rest), { stop: TextArray.fromPartial({ values: stop }) }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-friendliai', GenerativeConfigRuntimeType<'generative-friendliai'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-friendliai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/friendliai/generative) for detailed usage.
     *
     * @param {GenerativeFriendliAIConfigRuntime} [config] The configuration for the `generative-friendliai` module.
     * @returns {ModuleConfig<'generative-databricks', GenerativeConfigRuntimeType<'generative-friendliai'> | undefined>} The configuration object.
     */
    friendliai(config) {
        const _a = config || {}, { baseURL } = _a, rest = __rest(_a, ["baseURL"]);
        return {
            name: 'generative-friendliai',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-mistral', GenerativeConfigRuntimeType<'generative-mistral'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-mistral` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/mistral/generative) for detailed usage.
     *
     * @param {GenerativeMistralConfigRuntime} [config] The configuration for the `generative-mistral` module.
     * @returns {ModuleConfig<'generative-mistral', GenerativeConfigRuntimeType<'generative-mistral'> | undefined>} The configuration object.
     */
    mistral(config) {
        const _a = config || {}, { baseURL } = _a, rest = __rest(_a, ["baseURL"]);
        return {
            name: 'generative-mistral',
            config: config
                ? Object.assign({ baseUrl: baseURL }, rest) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-nvidia', GenerativeConfigRuntimeType<'generative-nvidia'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-mistral` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/generative) for detailed usage.
     *
     * @param {GenerativeNvidiaConfigCreate} [config] The configuration for the `generative-nvidia` module.
     * @returns {ModuleConfig<'generative-nvidia', GenerativeConfigRuntimeType<'generative-nvidia'> | undefined>} The configuration object.
     */
    nvidia(config) {
        const _a = config || {}, { baseURL } = _a, rest = __rest(_a, ["baseURL"]);
        return {
            name: 'generative-nvidia',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-ollama', GenerativeConfigRuntimeType<'generative-ollama'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-ollama` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/ollama/generative) for detailed usage.
     *
     * @param {GenerativeOllamaConfigRuntime} [config] The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-ollama', GenerativeConfigRuntimeType<'generative-ollama'> | undefined>} The configuration object.
     */
    ollama(config) {
        return {
            name: 'generative-ollama',
            config,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-openai', GenerativeConfigRuntimeType<'generative-openai'>>` object for use when performing runtime-specific AI generation using the `generative-openai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/generative) for detailed usage.
     *
     * @param {GenerativeOpenAIConfigRuntime} [config] The configuration for the `generative-openai` module.
     * @returns {ModuleConfig<'generative-openai', GenerativeConfigRuntimeType<'generative-openai'>>} The configuration object.
     */
    openAI: (config) => {
        const _a = config || {}, { baseURL, stop } = _a, rest = __rest(_a, ["baseURL", "stop"]);
        return {
            name: 'generative-openai',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL, isAzure: false, stop: TextArray.fromPartial({ values: stop }) }) : { isAzure: false },
        };
    },
    /**
     * Create a `ModuleConfig<'generative-google', GenerativeConfigRuntimeType<'generative-openai'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-google` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/generative) for detailed usage.
     *
     * @param {GenerativeGoogleConfigRuntime} [config] The configuration for the `generative-palm` module.
     * @returns {ModuleConfig<'generative-google', GenerativeConfigRuntimeType<'generative-google'> | undefined>} The configuration object.
     */
    google: (config) => {
        const _a = config || {}, { stopSequences } = _a, rest = __rest(_a, ["stopSequences"]);
        return {
            name: 'generative-google',
            config: config
                ? Object.assign(Object.assign({}, rest), { stopSequences: TextArray.fromPartial({ values: stopSequences }) }) : undefined,
        };
    },
    /**
     * Create a `ModuleConfig<'generative-xai', GenerativeConfigRuntimeType<'generative-xai'> | undefined>` object for use when performing runtime-specific AI generation using the `generative-xai` module.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/xai/generative) for detailed usage.
     */
    xai: (config) => {
        const _a = config || {}, { baseURL } = _a, rest = __rest(_a, ["baseURL"]);
        return {
            name: 'generative-xai',
            config: config
                ? Object.assign(Object.assign({}, rest), { baseUrl: baseURL }) : undefined,
        };
    },
};
