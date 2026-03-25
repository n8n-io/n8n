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
import { WeaviateInvalidInputError } from '../../errors.js';
import { vectorIndex, } from '../index.js';
import { VectorIndexGuards } from './parsing.js';
const makeVectorIndex = (opts) => {
    var _a, _b;
    let conf = (_a = opts === null || opts === void 0 ? void 0 : opts.config) === null || _a === void 0 ? void 0 : _a.config;
    if ((opts === null || opts === void 0 ? void 0 : opts.encoding) || (opts === null || opts === void 0 ? void 0 : opts.multiVec)) {
        if (conf && !VectorIndexGuards.isHNSW(conf)) {
            throw new WeaviateInvalidInputError('Cannot set multi-vector encoding on a non-HNSW index');
        }
        conf = conf
            ? Object.assign(Object.assign({}, conf), { multiVector: conf.multiVector
                    ? Object.assign(Object.assign({}, conf.multiVector), { encoding: conf.multiVector.encoding
                            ? Object.assign(Object.assign({}, conf.multiVector.encoding), opts.encoding) : opts.encoding }) : vectorIndex.multiVector.multiVector({ encoding: opts.encoding }) }) : {
            multiVector: vectorIndex.multiVector.multiVector({ encoding: opts.encoding }),
            type: 'hnsw',
        };
    }
    if (opts === null || opts === void 0 ? void 0 : opts.quantizer) {
        if (!conf) {
            conf = vectorIndex.hnsw({ quantizer: opts.quantizer }).config;
        }
        if (VectorIndexGuards.isDynamic(conf)) {
            conf.hnsw = conf.hnsw
                ? Object.assign(Object.assign({}, conf.hnsw), { quantizer: opts.quantizer }) : vectorIndex.hnsw({ quantizer: opts.quantizer }).config;
            conf.flat = conf.flat
                ? Object.assign(Object.assign({}, conf.flat), { quantizer: opts.quantizer }) : vectorIndex.flat({ quantizer: opts.quantizer }).config;
        }
        else {
            conf.quantizer = opts.quantizer;
        }
    }
    return {
        name: ((_b = opts === null || opts === void 0 ? void 0 : opts.config) === null || _b === void 0 ? void 0 : _b.name) || 'hnsw',
        config: conf,
    };
};
const makeVectorizer = (name, options, multiVec) => {
    return {
        name: name,
        properties: options === null || options === void 0 ? void 0 : options.sourceProperties,
        vectorIndex: makeVectorIndex({
            config: options === null || options === void 0 ? void 0 : options.vectorIndexConfig,
            encoding: options === null || options === void 0 ? void 0 : options.encoding,
            quantizer: options === null || options === void 0 ? void 0 : options.quantizer,
            multiVec,
        }),
        vectorizer: (options === null || options === void 0 ? void 0 : options.vectorizerConfig)
            ? options.vectorizerConfig
            : { name: 'none', config: undefined },
    };
};
const mapMulti2VecField = (field) => {
    if (typeof field === 'string') {
        return { name: field };
    }
    return field;
};
const formatMulti2VecFields = (weights, key, fields) => {
    if (fields !== undefined && fields.length > 0) {
        weights[key] = fields.filter((f) => f.weight !== undefined).map((f) => f.weight);
        if (weights[key].length === 0) {
            delete weights[key];
        }
    }
    return weights;
};
/** Previously all text-based vectorizers accepted `vectorizeCollectionName` parameter, which was meaningless for some modules and caused others to produce confusing results (see details below). Moving forward, we want to deprecate the usage of this parameter.
 *
 * Collections with `vectorizeCollectionName: true` generate embeddings even if they have no vectorizeable properties. This means all generated embeddings would embed the collection name itself, which makes them rather meaningless.
 */
const legacyVectors = {
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     *
     * @deprecated Use `selfProvided` instead.
     */
    none: (opts) => {
        const { name, quantizer, vectorIndexConfig } = opts || {};
        return makeVectorizer(name, { quantizer, vectorIndexConfig });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'none'>} The configuration object.
     */
    selfProvided: (opts) => legacyVectors.none(opts),
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'img2vec-neural'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/img2vec-neural) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'img2vec-neural'>} [opts] The configuration options for the `img2vec-neural` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'img2vec-neural'>} The configuration object.
     */
    img2VecNeural: (opts) => {
        const { name, quantizer, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'img2vec-neural',
                config: config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-bind'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/imagebind/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-bind'>} [opts] The configuration options for the `multi2vec-bind` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-bind'>} The configuration object.
     */
    multi2VecBind: (opts) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const _h = opts || {}, { name, quantizer, vectorIndexConfig } = _h, config = __rest(_h, ["name", "quantizer", "vectorIndexConfig"]);
        const audioFields = (_a = config.audioFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const depthFields = (_b = config.depthFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        const imageFields = (_c = config.imageFields) === null || _c === void 0 ? void 0 : _c.map(mapMulti2VecField);
        const IMUFields = (_d = config.IMUFields) === null || _d === void 0 ? void 0 : _d.map(mapMulti2VecField);
        const textFields = (_e = config.textFields) === null || _e === void 0 ? void 0 : _e.map(mapMulti2VecField);
        const thermalFields = (_f = config.thermalFields) === null || _f === void 0 ? void 0 : _f.map(mapMulti2VecField);
        const videoFields = (_g = config.videoFields) === null || _g === void 0 ? void 0 : _g.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'audioFields', audioFields);
        weights = formatMulti2VecFields(weights, 'depthFields', depthFields);
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'IMUFields', IMUFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        weights = formatMulti2VecFields(weights, 'thermalFields', thermalFields);
        weights = formatMulti2VecFields(weights, 'videoFields', videoFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-bind',
                config: Object.keys(config).length === 0
                    ? undefined
                    : Object.assign(Object.assign({}, config), { audioFields: audioFields === null || audioFields === void 0 ? void 0 : audioFields.map((f) => f.name), depthFields: depthFields === null || depthFields === void 0 ? void 0 : depthFields.map((f) => f.name), imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), IMUFields: IMUFields === null || IMUFields === void 0 ? void 0 : IMUFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), thermalFields: thermalFields === null || thermalFields === void 0 ? void 0 : thermalFields.map((f) => f.name), videoFields: videoFields === null || videoFields === void 0 ? void 0 : videoFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-cohere'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-cohere'>} [opts] The configuration options for the `multi2vec-cohere` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-cohere'>} The configuration object.
     */
    multi2VecCohere: (opts) => {
        var _a, _b;
        const _c = opts || {}, { name, quantizer, vectorIndexConfig } = _c, config = __rest(_c, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-cohere',
                config: Object.keys(config).length === 0
                    ? undefined
                    : Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-clip'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-clip'>} [opts] The configuration options for the `multi2vec-clip` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-clip'>} The configuration object.
     */
    multi2VecClip: (opts) => {
        var _a, _b;
        const _c = opts || {}, { name, quantizer, vectorIndexConfig } = _c, config = __rest(_c, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-clip',
                config: Object.keys(config).length === 0
                    ? undefined
                    : Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-jinaai'>} [opts] The configuration options for the `multi2vec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-jinaai'>} The configuration object.
     */
    multi2VecJinaAI: (opts) => {
        var _a, _b;
        const _c = opts || {}, { name, quantizer, vectorIndexConfig } = _c, config = __rest(_c, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-jinaai',
                config: Object.keys(config).length === 0
                    ? undefined
                    : Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-palm'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-palm'>} opts The configuration options for the `multi2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-palm'>} The configuration object.
     * @deprecated Use `multi2VecGoogle` instead.
     */
    multi2VecPalm: (opts) => {
        var _a, _b, _c;
        console.warn('The `multi2vec-palm` vectorizer is deprecated. Use `multi2vec-google` instead.');
        const { name, quantizer, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        const videoFields = (_c = config.videoFields) === null || _c === void 0 ? void 0 : _c.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        weights = formatMulti2VecFields(weights, 'videoFields', videoFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-palm',
                config: Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), videoFields: videoFields === null || videoFields === void 0 ? void 0 : videoFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-google'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-google'>} opts The configuration options for the `multi2vec-google` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-google'>} The configuration object.
     */
    multi2VecGoogle: (opts) => {
        var _a, _b, _c;
        const { name, quantizer, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        const videoFields = (_c = config.videoFields) === null || _c === void 0 ? void 0 : _c.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        weights = formatMulti2VecFields(weights, 'videoFields', videoFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-google',
                config: Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), videoFields: videoFields === null || videoFields === void 0 ? void 0 : videoFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-clip'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-voyageai'>} [opts] The configuration options for the `multi2vec-voyageai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-voyageai'>} The configuration object.
     */
    multi2VecVoyageAI: (opts) => {
        var _a, _b;
        const _c = opts || {}, { name, quantizer, vectorIndexConfig } = _c, config = __rest(_c, ["name", "quantizer", "vectorIndexConfig"]);
        const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
        const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
        let weights = {};
        weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
        weights = formatMulti2VecFields(weights, 'textFields', textFields);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2vec-voyageai',
                config: Object.keys(config).length === 0
                    ? undefined
                    : Object.assign(Object.assign({}, config), { imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'ref2vec-centroid'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/ref2vec-centroid) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'ref2vec-centroid'>} opts The configuration options for the `ref2vec-centroid` vectorizer.
     * @returns {VectorConfigCreate<never, N, I, 'ref2vec-centroid'>} The configuration object.
     */
    ref2VecCentroid: (opts) => {
        const { name, quantizer, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'ref2vec-centroid',
                config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-aws'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/aws/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<N, T, I, 'text2vec-aws'>} opts The configuration options for the `text2vec-aws` vectorizer.
     * @returns { VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-aws'>} The configuration object.
     */
    text2VecAWS: (opts) => {
        const { name, quantizer, sourceProperties, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-aws',
                config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-azure-openai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-azure-openai'>} opts The configuration options for the `text2vec-azure-openai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-azure-openai'>} The configuration object.
     */
    text2VecAzureOpenAI: (opts) => {
        const { name, quantizer, sourceProperties, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-azure-openai',
                config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-cohere'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/cohere/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-cohere'>} [opts] The configuration options for the `text2vec-cohere` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-cohere'>} The configuration object.
     */
    text2VecCohere: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-cohere',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-contextionary'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/modules/text2vec-contextionary) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-contextionary'>} [opts] The configuration for the `text2vec-contextionary` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-contextionary'>} The configuration object.
     * @deprecated The contextionary model is old and not recommended for use. If you are looking for a local, lightweight model try the new text2vec-model2vec module instead.
     */
    text2VecContextionary: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-contextionary',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-databricks'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/databricks/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-databricks'>} opts The configuration for the `text2vec-databricks` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-databricks'>} The configuration object.
     */
    text2VecDatabricks: (opts) => {
        const { name, quantizer, sourceProperties, vectorIndexConfig } = opts, config = __rest(opts, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-databricks',
                config: config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-gpt4all'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/gpt4all/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-gpt4all'>} [opts] The configuration for the `text2vec-gpt4all` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-gpt4all'>} The configuration object.
     */
    text2VecGPT4All: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-gpt4all',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-huggingface'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/huggingface/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-huggingface'>} [opts] The configuration for the `text2vec-huggingface` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-huggingface'>} The configuration object.
     */
    text2VecHuggingFace: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-huggingface',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-jinaai'>} [opts] The configuration for the `text2vec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-jinaai'>} The configuration object.
     */
    text2VecJinaAI: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-jinaai',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    text2VecNvidia: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-nvidia',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-mistral'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/mistral/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-mistral'>} [opts] The configuration for the `text2vec-mistral` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-mistral'>} The configuration object.
     */
    text2VecMistral: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-mistral',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-openai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/openai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-openai'>} [opts] The configuration for the `text2vec-openai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-openai'>} The configuration object.
     */
    text2VecOpenAI: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-openai',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-ollama'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/ollama/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-ollama'>} [opts] The configuration for the `text2vec-ollama` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-ollama'>} The configuration object.
     */
    text2VecOllama: (opts) => {
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-ollama',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-palm'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-palm'>} opts The configuration for the `text2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-palm'>} The configuration object.
     * @deprecated Use `text2VecGoogle` instead.
     */
    text2VecPalm: (opts) => {
        console.warn('The `text2VecPalm` vectorizer is deprecated. Use `text2VecGoogle` instead.');
        const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-palm',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-google'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-google'>} opts The configuration for the `text2vec-palm` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-google'>} The configuration object.
     */
    text2VecGoogle: (opts) => {
        const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-google',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-transformers'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/transformers/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-transformers'>} [opts] The configuration for the `text2vec-transformers` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-transformers'>} The configuration object.
     */
    text2VecTransformers: (opts) => {
        const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-transformers',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-voyageai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/voyageai/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-voyageai'>} [opts] The configuration for the `text2vec-voyageai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-voyageai'>} The configuration object.
     */
    text2VecVoyageAI: (opts) => {
        const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2vec-voyageai',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-weaviate'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/weaviate/embeddings) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-weaviate'>} [opts] The configuration for the `text2vec-weaviate` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-weaviate'>} The configuration object.
     */
    text2VecWeaviate: (opts) => {
        const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            sourceProperties,
            vectorIndexConfig,
            quantizer,
            vectorizerConfig: {
                name: 'text2vec-weaviate',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-model2vec'`.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-model2vec'>} [opts] The configuration for the `text2vec-model2vec` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-model2vec'>} The configuration object.
     */
    text2VecModel2Vec: (opts) => {
        const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            sourceProperties,
            vectorIndexConfig,
            quantizer,
            vectorizerConfig: {
                name: 'text2vec-model2vec',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        });
    },
};
/** __vectors_shaded modifies some parameters in legacy vectorizer configuration.
 *
 * - Hide `vectorizeCollectionName` parameter from all constructors in `legacyVectors` where it was previously accepted.
 * - Rename `modelId` to `model` for `text2vec-google` and `multi2vec-google` vectorizers.
 * */
// eslint-disable-next-line @typescript-eslint/naming-convention
const __vectors_shaded = {
    text2VecWeaviate: (opts) => legacyVectors.text2VecWeaviate(opts),
    /** @deprecated The contextionary model is old and not recommended for use. If you are looking for a local, lightweight model try the new text2vec-model2vec module instead. */
    text2VecContextionary: (opts) => legacyVectors.text2VecContextionary(opts),
    text2VecNvidia: (opts) => legacyVectors.text2VecNvidia(opts),
    text2VecTransformers: (opts) => legacyVectors.text2VecTransformers(opts),
    text2VecVoyageAI: (opts) => legacyVectors.text2VecVoyageAI(opts),
    text2VecGoogle: (opts) => legacyVectors.text2VecGoogle(opts
        ? Object.assign(Object.assign({}, opts), ((opts === null || opts === void 0 ? void 0 : opts.modelId) || (opts === null || opts === void 0 ? void 0 : opts.model) ? { modelId: (opts === null || opts === void 0 ? void 0 : opts.modelId) || (opts === null || opts === void 0 ? void 0 : opts.model) } : undefined)) : undefined),
    text2VecOpenAI: (opts) => legacyVectors.text2VecOpenAI(opts),
    text2VecOllama: (opts) => legacyVectors.text2VecOllama(opts),
    text2VecMistral: (opts) => legacyVectors.text2VecMistral(opts),
    text2VecJinaAI: (opts) => legacyVectors.text2VecJinaAI(opts),
    text2VecHuggingFace: (opts) => legacyVectors.text2VecHuggingFace(opts),
    /** @deprecated The `text2vec-gpt4all` vectorizer is deprecated and will be removed in a future release. See the docs (https://docs.weaviate.io/weaviate/model-providers) for alternatives. */
    text2VecGPT4All: (opts) => legacyVectors.text2VecGPT4All(opts),
    text2VecDatabricks: (opts) => legacyVectors.text2VecDatabricks(opts),
    text2VecCohere: (opts) => legacyVectors.text2VecCohere(opts),
    text2VecAzureOpenAI: (opts) => legacyVectors.text2VecAzureOpenAI(opts),
    text2VecAWS: (opts) => legacyVectors.text2VecAWS(opts),
    multi2VecClip: (opts) => legacyVectors.multi2VecClip(opts),
    multi2VecCohere: (opts) => legacyVectors.multi2VecCohere(opts),
    multi2VecBind: (opts) => legacyVectors.multi2VecBind(opts),
    multi2VecJinaAI: (opts) => legacyVectors.multi2VecJinaAI(opts),
    multi2VecGoogle: (opts) => legacyVectors.multi2VecGoogle(Object.assign(Object.assign({}, opts), { modelId: opts.modelId || opts.model })),
    multi2VecVoyageAI: (opts) => legacyVectors.multi2VecVoyageAI(opts),
};
/** Legacy export, maintained for backwards compatibility.
 * See the comment for `legacyVectors`.
 * @deprecated Use `vectors` instead. */
export const vectorizer = legacyVectors;
// Remove deprecated vectorizers and module configuration parameters:
// - PaLM vectorizers are called -Google now.
// - __vectors_shaded hide/rename some parameters
export const vectors = ((_a) => {
    var { text2VecPalm, multi2VecPalm } = _a, rest = __rest(_a, ["text2VecPalm", "multi2VecPalm"]);
    return (Object.assign(Object.assign(Object.assign({}, rest), __vectors_shaded), { 
        /**
         * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2vec-nvidia'`.
         *
         * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/nvidia/embeddings-multimodal) for detailed usage.
         *
         * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2vec-nvidia'>} [opts] The configuration options for the `multi2vec-nvidia` vectorizer.
         * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2vec-nvidia'>} The configuration object.
         */
        multi2VecNvidia: (opts) => {
            var _a, _b;
            const _c = opts || {}, { name, quantizer, vectorIndexConfig, outputEncoding } = _c, config = __rest(_c, ["name", "quantizer", "vectorIndexConfig", "outputEncoding"]);
            const imageFields = (_a = config.imageFields) === null || _a === void 0 ? void 0 : _a.map(mapMulti2VecField);
            const textFields = (_b = config.textFields) === null || _b === void 0 ? void 0 : _b.map(mapMulti2VecField);
            let weights = {};
            weights = formatMulti2VecFields(weights, 'imageFields', imageFields);
            weights = formatMulti2VecFields(weights, 'textFields', textFields);
            return makeVectorizer(name, {
                quantizer,
                vectorIndexConfig,
                vectorizerConfig: {
                    name: 'multi2vec-nvidia',
                    config: Object.assign(Object.assign({}, config), { output_encoding: outputEncoding, imageFields: imageFields === null || imageFields === void 0 ? void 0 : imageFields.map((f) => f.name), textFields: textFields === null || textFields === void 0 ? void 0 : textFields.map((f) => f.name), weights: Object.keys(weights).length === 0 ? undefined : weights }),
                },
            });
        }, 
        /**
         * Create a `VectorConfigCreate` object with the vectorizer set to `'text2vec-google'` with specific options for AI studio deployments.
         *
         * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/google/embeddings) for detailed usage.
         *
         * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2vec-google-ai-studio'>} [opts] The configuration for the `text2vec-google` vectorizer.
         * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2vec-google'>} The configuration object.
         */
        text2VecGoogleAiStudio: (opts) => {
            const _a = opts || {}, { name, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "sourceProperties", "quantizer", "vectorIndexConfig"]);
            return makeVectorizer(name, {
                quantizer,
                sourceProperties,
                vectorIndexConfig,
                vectorizerConfig: {
                    name: 'text2vec-google',
                    config: Object.assign({ apiEndpoint: 'generativelanguage.googleapis.com' }, config),
                },
            });
        }, text2VecMorph: (opts) => {
            const _a = opts || {}, { name, quantizer, sourceProperties, vectorIndexConfig } = _a, config = __rest(_a, ["name", "quantizer", "sourceProperties", "vectorIndexConfig"]);
            return makeVectorizer(name, {
                quantizer,
                sourceProperties,
                vectorIndexConfig,
                vectorizerConfig: {
                    name: 'text2vec-morph',
                    config: Object.keys(config).length === 0 ? undefined : config,
                },
            });
        } }));
})(legacyVectors);
export const multiVectors = {
    /**
     * Create a multi-vector `VectorConfigCreate` object with the vectorizer set to `'none'`.
     *
     * @param {ConfigureNonTextMultiVectorizerOptions<N, I, 'none'>} [opts] The configuration options for the `none` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'none'>} The configuration object.
     */
    selfProvided: (opts) => {
        const _a = opts || {}, { name, encoding, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "encoding", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            encoding,
            quantizer,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'none',
                config: Object.keys(config).length === 0 ? {} : config,
            },
        }, true);
    },
    /**
     * Create a multi-vector `VectorConfigCreate` object with the vectorizer set to `'text2multivec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-colbert) for detailed usage.
     *
     * @param {ConfigureTextVectorizerOptions<T, N, I, 'text2multivec-jinaai'>} [opts] The configuration options for the `text2multivec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>, N, I, 'text2multivec-jinaai'>} The configuration object.
     */
    text2VecJinaAI: (opts) => {
        const _a = opts || {}, { name, encoding, sourceProperties, quantizer, vectorIndexConfig } = _a, config = __rest(_a, ["name", "encoding", "sourceProperties", "quantizer", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            encoding,
            quantizer,
            sourceProperties,
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'text2multivec-jinaai',
                config: Object.keys(config).length === 0 ? undefined : config,
            },
        }, true);
    },
    /**
     * Create a `VectorConfigCreate` object with the vectorizer set to `'multi2multivec-jinaai'`.
     *
     * See the [documentation](https://weaviate.io/developers/weaviate/model-providers/jinaai/embeddings-multimodal) for detailed usage.
     *
     * @param {ConfigureNonTextVectorizerOptions<N, I, 'multi2multivec-jinaai'>} [opts] The configuration options for the `multi2multivec-jinaai` vectorizer.
     * @returns {VectorConfigCreate<PrimitiveKeys<T>[], N, I, 'multi2multivec-jinaai'>} The configuration object.
     */
    multi2VecJinaAI: (opts) => {
        const _a = opts || {}, { name, vectorIndexConfig } = _a, config = __rest(_a, ["name", "vectorIndexConfig"]);
        return makeVectorizer(name, {
            vectorIndexConfig,
            vectorizerConfig: {
                name: 'multi2multivec-jinaai',
                config,
            },
        });
    },
};
