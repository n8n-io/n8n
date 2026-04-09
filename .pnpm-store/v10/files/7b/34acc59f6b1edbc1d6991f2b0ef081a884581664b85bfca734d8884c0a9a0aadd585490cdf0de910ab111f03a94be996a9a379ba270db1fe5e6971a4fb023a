import { Template } from "@huggingface/jinja";
import { getModelInputSnippet, inferenceSnippetLanguages, } from "@huggingface/tasks";
import { getProviderHelper } from "../lib/getProviderHelper.js";
import { makeRequestOptionsFromResolvedModel } from "../lib/makeRequestOptions.js";
import { templates } from "./templates.exported.js";
import { getLogger } from "../lib/logger.js";
import { HF_ROUTER_AUTO_ENDPOINT } from "../config.js";
const PYTHON_CLIENTS = ["openai", "huggingface_hub", "fal_client", "requests"];
const JS_CLIENTS = ["openai", "huggingface.js", "fetch"];
const SH_CLIENTS = ["curl"];
const CLIENTS = {
    js: [...JS_CLIENTS],
    python: [...PYTHON_CLIENTS],
    sh: [...SH_CLIENTS],
};
// The "auto"-provider policy is only available through the HF SDKs (huggingface.js / huggingface_hub)
// except for conversational tasks for which we have https://router.huggingface.co/v1/chat/completions
const CLIENTS_NON_CONVERSATIONAL_AUTO_POLICY = {
    js: ["huggingface.js"],
    python: ["huggingface_hub"],
};
// Helpers to find + load templates
const hasTemplate = (language, client, templateName) => templates[language]?.[client]?.[templateName] !== undefined;
const loadTemplate = (language, client, templateName) => {
    const template = templates[language]?.[client]?.[templateName];
    if (!template) {
        throw new Error(`Template not found: ${language}/${client}/${templateName}`);
    }
    return (data) => new Template(template).render({ ...data });
};
const snippetImportPythonInferenceClient = loadTemplate("python", "huggingface_hub", "importInferenceClient");
const snippetImportRequests = loadTemplate("python", "requests", "importRequests");
// Needed for huggingface_hub basic snippets
const HF_PYTHON_METHODS = {
    "audio-classification": "audio_classification",
    "audio-to-audio": "audio_to_audio",
    "automatic-speech-recognition": "automatic_speech_recognition",
    "document-question-answering": "document_question_answering",
    "feature-extraction": "feature_extraction",
    "fill-mask": "fill_mask",
    "image-classification": "image_classification",
    "image-segmentation": "image_segmentation",
    "image-to-image": "image_to_image",
    "image-to-video": "image_to_video",
    "image-to-text": "image_to_text",
    "image-text-to-image": "image_text_to_image",
    "image-text-to-video": "image_text_to_video",
    "object-detection": "object_detection",
    "question-answering": "question_answering",
    "sentence-similarity": "sentence_similarity",
    summarization: "summarization",
    "table-question-answering": "table_question_answering",
    "tabular-classification": "tabular_classification",
    "tabular-regression": "tabular_regression",
    "text-classification": "text_classification",
    "text-generation": "text_generation",
    "text-to-image": "text_to_image",
    "text-to-speech": "text_to_speech",
    "text-to-video": "text_to_video",
    "token-classification": "token_classification",
    translation: "translation",
    "visual-question-answering": "visual_question_answering",
    "zero-shot-classification": "zero_shot_classification",
    "zero-shot-image-classification": "zero_shot_image_classification",
};
// Needed for huggingface.js basic snippets
const HF_JS_METHODS = {
    "automatic-speech-recognition": "automaticSpeechRecognition",
    "feature-extraction": "featureExtraction",
    "fill-mask": "fillMask",
    "image-classification": "imageClassification",
    "question-answering": "questionAnswering",
    "sentence-similarity": "sentenceSimilarity",
    summarization: "summarization",
    "table-question-answering": "tableQuestionAnswering",
    "text-classification": "textClassification",
    "text-generation": "textGeneration",
    "token-classification": "tokenClassification",
    "text-to-speech": "textToSpeech",
    translation: "translation",
};
// Placeholders to replace with env variable in snippets
// little hack to support both direct requests and routing => routed requests should start with "hf_"
const ACCESS_TOKEN_ROUTING_PLACEHOLDER = "hf_token_placeholder";
const ACCESS_TOKEN_DIRECT_REQUEST_PLACEHOLDER = "not_hf_token_placeholder";
// Snippet generators
const snippetGenerator = (templateName, inputPreparationFn) => {
    return (model, provider, inferenceProviderMapping, opts) => {
        const logger = getLogger();
        const providerModelId = inferenceProviderMapping?.providerId ?? model.id;
        /// Hacky: hard-code conversational templates here
        let task = model.pipeline_tag;
        if (model.pipeline_tag &&
            ["text-generation", "image-text-to-text"].includes(model.pipeline_tag) &&
            model.tags.includes("conversational")) {
            templateName = opts?.streaming ? "conversationalStream" : "conversational";
            inputPreparationFn = prepareConversationalInput;
            task = "conversational";
        }
        let providerHelper;
        try {
            providerHelper = getProviderHelper(provider, task);
        }
        catch (e) {
            logger.error(`Failed to get provider helper for ${provider} (${task})`, e);
            return [];
        }
        const placeholder = opts?.directRequest
            ? ACCESS_TOKEN_DIRECT_REQUEST_PLACEHOLDER
            : ACCESS_TOKEN_ROUTING_PLACEHOLDER;
        const accessTokenOrPlaceholder = opts?.accessToken ?? placeholder;
        /// Prepare inputs + make request
        const inputs = opts?.inputs
            ? { inputs: opts.inputs }
            : inputPreparationFn
                ? inputPreparationFn(model, opts)
                : { inputs: getModelInputSnippet(model) };
        const request = makeRequestOptionsFromResolvedModel(providerModelId, providerHelper, {
            accessToken: accessTokenOrPlaceholder,
            provider,
            endpointUrl: opts?.endpointUrl ?? (provider === "auto" ? HF_ROUTER_AUTO_ENDPOINT : undefined),
            ...inputs,
        }, inferenceProviderMapping, {
            task,
            billTo: opts?.billTo,
        });
        /// Parse request.info.body if not a binary.
        /// This is the body sent to the provider. Important for snippets with raw payload (e.g curl, requests, etc.)
        let providerInputs = inputs;
        const bodyAsObj = request.info.body;
        if (typeof bodyAsObj === "string") {
            try {
                providerInputs = JSON.parse(bodyAsObj);
            }
            catch (e) {
                logger.error("Failed to parse body as JSON", e);
            }
        }
        // Inputs for the "auto" route is strictly the same as "inputs", except the model includes the provider
        // If not "auto" route, use the providerInputs
        const autoInputs = !opts?.endpointUrl && !opts?.directRequest
            ? provider !== "auto"
                ? {
                    ...inputs,
                    model: `${model.id}:${provider}`,
                }
                : {
                    ...inputs,
                    model: `${model.id}`, // if no :provider => auto
                }
            : providerInputs;
        /// Prepare template injection data
        const params = {
            accessToken: accessTokenOrPlaceholder,
            authorizationHeader: request.info.headers?.Authorization,
            baseUrl: task === "conversational" && !opts?.endpointUrl && !opts?.directRequest
                ? HF_ROUTER_AUTO_ENDPOINT
                : removeSuffix(request.url, "/chat/completions"),
            fullUrl: task === "conversational" && !opts?.endpointUrl && !opts?.directRequest
                ? HF_ROUTER_AUTO_ENDPOINT + "/chat/completions"
                : request.url,
            inputs: {
                asObj: inputs,
                asCurlString: formatBody(inputs, "curl"),
                asJsonString: formatBody(inputs, "json"),
                asPythonString: formatBody(inputs, "python"),
                asTsString: formatBody(inputs, "ts"),
            },
            providerInputs: {
                asObj: providerInputs,
                asCurlString: formatBody(providerInputs, "curl"),
                asJsonString: formatBody(providerInputs, "json"),
                asPythonString: formatBody(providerInputs, "python"),
                asTsString: formatBody(providerInputs, "ts"),
            },
            autoInputs: {
                asObj: autoInputs,
                asCurlString: formatBody(autoInputs, "curl"),
                asJsonString: formatBody(autoInputs, "json"),
                asPythonString: formatBody(autoInputs, "python"),
                asTsString: formatBody(autoInputs, "ts"),
            },
            model,
            provider,
            providerModelId: task === "conversational" && !opts?.endpointUrl && !opts?.directRequest
                ? provider !== "auto"
                    ? `${model.id}:${provider}` // e.g. "moonshotai/Kimi-K2-Instruct:groq"
                    : model.id
                : (providerModelId ?? model.id),
            billTo: opts?.billTo,
            endpointUrl: opts?.endpointUrl,
            task,
            directRequest: !!opts?.directRequest,
        };
        /// Iterate over clients => check if a snippet exists => generate
        const clients = provider === "auto" && task !== "conversational" ? CLIENTS_NON_CONVERSATIONAL_AUTO_POLICY : CLIENTS;
        return inferenceSnippetLanguages
            .map((language) => {
            const langClients = clients[language] ?? [];
            return langClients
                .map((client) => {
                if (!hasTemplate(language, client, templateName)) {
                    return;
                }
                const template = loadTemplate(language, client, templateName);
                if (client === "huggingface_hub" && templateName.includes("basic")) {
                    if (!(model.pipeline_tag && model.pipeline_tag in HF_PYTHON_METHODS)) {
                        return;
                    }
                    params["methodName"] = HF_PYTHON_METHODS[model.pipeline_tag];
                }
                if (client === "huggingface.js" && templateName.includes("basic")) {
                    if (!(model.pipeline_tag && model.pipeline_tag in HF_JS_METHODS)) {
                        return;
                    }
                    params["methodName"] = HF_JS_METHODS[model.pipeline_tag];
                }
                /// Generate snippet
                let snippet = template(params).trim();
                if (!snippet) {
                    return;
                }
                /// Add import section separately
                if (client === "huggingface_hub") {
                    const importSection = snippetImportPythonInferenceClient({ ...params });
                    snippet = `${importSection}\n\n${snippet}`;
                }
                else if (client === "requests") {
                    const importSection = snippetImportRequests({
                        ...params,
                        importBase64: snippet.includes("base64"),
                        importJson: snippet.includes("json."),
                    });
                    snippet = `${importSection}\n\n${snippet}`;
                }
                /// Replace access token placeholder
                if (snippet.includes(placeholder)) {
                    snippet = replaceAccessTokenPlaceholder(opts?.directRequest, placeholder, snippet, language, provider, opts?.endpointUrl);
                }
                /// Snippet is ready!
                return { language, client: client, content: snippet };
            })
                .filter((snippet) => snippet !== undefined);
        })
            .flat();
    };
};
const prepareDocumentQuestionAnsweringInput = (model) => {
    return JSON.parse(getModelInputSnippet(model));
};
const prepareImageToImageInput = (model) => {
    const data = JSON.parse(getModelInputSnippet(model));
    return { inputs: data.image, parameters: { prompt: data.prompt } };
};
const prepareConversationalInput = (model, opts) => {
    return {
        messages: opts?.messages ?? getModelInputSnippet(model),
        ...(opts?.temperature ? { temperature: opts?.temperature } : undefined),
        ...(opts?.max_tokens ? { max_tokens: opts?.max_tokens } : undefined),
        ...(opts?.top_p ? { top_p: opts?.top_p } : undefined),
    };
};
const prepareQuestionAnsweringInput = (model) => {
    const data = JSON.parse(getModelInputSnippet(model));
    return { question: data.question, context: data.context };
};
const prepareTableQuestionAnsweringInput = (model) => {
    const data = JSON.parse(getModelInputSnippet(model));
    return { query: data.query, table: JSON.stringify(data.table) };
};
const snippets = {
    "audio-classification": snippetGenerator("basicAudio"),
    "audio-to-audio": snippetGenerator("basicAudio"),
    "automatic-speech-recognition": snippetGenerator("basicAudio"),
    "document-question-answering": snippetGenerator("documentQuestionAnswering", prepareDocumentQuestionAnsweringInput),
    "feature-extraction": snippetGenerator("basic"),
    "fill-mask": snippetGenerator("basic"),
    "image-classification": snippetGenerator("basicImage"),
    "image-segmentation": snippetGenerator("basicImage"),
    "image-text-to-image": snippetGenerator("imageToImage", prepareImageToImageInput),
    "image-text-to-text": snippetGenerator("conversational"),
    "image-text-to-video": snippetGenerator("imageToVideo", prepareImageToImageInput),
    "image-to-image": snippetGenerator("imageToImage", prepareImageToImageInput),
    "image-to-text": snippetGenerator("basicImage"),
    "image-to-video": snippetGenerator("imageToVideo", prepareImageToImageInput),
    "object-detection": snippetGenerator("basicImage"),
    "question-answering": snippetGenerator("questionAnswering", prepareQuestionAnsweringInput),
    "sentence-similarity": snippetGenerator("basic"),
    summarization: snippetGenerator("basic"),
    "tabular-classification": snippetGenerator("tabular"),
    "tabular-regression": snippetGenerator("tabular"),
    "table-question-answering": snippetGenerator("tableQuestionAnswering", prepareTableQuestionAnsweringInput),
    "text-classification": snippetGenerator("basic"),
    "text-generation": snippetGenerator("basic"),
    "text-to-audio": snippetGenerator("textToAudio"),
    "text-to-image": snippetGenerator("textToImage"),
    "text-to-speech": snippetGenerator("textToSpeech"),
    "text-to-video": snippetGenerator("textToVideo"),
    "token-classification": snippetGenerator("basic"),
    translation: snippetGenerator("basic"),
    "zero-shot-classification": snippetGenerator("zeroShotClassification"),
    "zero-shot-image-classification": snippetGenerator("zeroShotImageClassification"),
};
export function getInferenceSnippets(model, provider, inferenceProviderMapping, opts) {
    return model.pipeline_tag && model.pipeline_tag in snippets
        ? (snippets[model.pipeline_tag]?.(model, provider, inferenceProviderMapping, opts) ?? [])
        : [];
}
// String manipulation helpers
function formatBody(obj, format) {
    switch (format) {
        case "curl":
            return indentString(formatBody(obj, "json"));
        case "json":
            /// Hacky: remove outer brackets to make is extendable in templates
            return JSON.stringify(obj, null, 4).split("\n").slice(1, -1).join("\n");
        case "python":
            return indentString(Object.entries(obj)
                .map(([key, value]) => {
                const formattedValue = JSON.stringify(value, null, 4).replace(/"/g, '"');
                return `${key}=${formattedValue},`;
            })
                .join("\n"));
        case "ts":
            /// Hacky: remove outer brackets to make is extendable in templates
            return formatTsObject(obj).split("\n").slice(1, -1).join("\n");
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}
function formatTsObject(obj, depth) {
    depth = depth ?? 0;
    /// Case int, boolean, string, etc.
    if (typeof obj !== "object" || obj === null) {
        return JSON.stringify(obj);
    }
    /// Case array
    if (Array.isArray(obj)) {
        const items = obj
            .map((item) => {
            const formatted = formatTsObject(item, depth + 1);
            return `${" ".repeat(4 * (depth + 1))}${formatted},`;
        })
            .join("\n");
        return `[\n${items}\n${" ".repeat(4 * depth)}]`;
    }
    /// Case mapping
    const entries = Object.entries(obj);
    const lines = entries
        .map(([key, value]) => {
        const formattedValue = formatTsObject(value, depth + 1);
        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        return `${" ".repeat(4 * (depth + 1))}${keyStr}: ${formattedValue},`;
    })
        .join("\n");
    return `{\n${lines}\n${" ".repeat(4 * depth)}}`;
}
function indentString(str) {
    return str
        .split("\n")
        .map((line) => " ".repeat(4) + line)
        .join("\n");
}
function removeSuffix(str, suffix) {
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}
function replaceAccessTokenPlaceholder(directRequest, placeholder, snippet, language, provider, endpointUrl) {
    // If "opts.accessToken" is not set, the snippets are generated with a placeholder.
    // Once snippets are rendered, we replace the placeholder with code to fetch the access token from an environment variable.
    // Determine if HF_TOKEN or specific provider token should be used
    const useHfToken = !endpointUrl && // custom endpointUrl => use a generic API_TOKEN
        (provider == "hf-inference" || // hf-inference provider => use $HF_TOKEN
            (!directRequest && // if explicit directRequest => use provider-specific token
                (snippet.includes("InferenceClient") || // using a client => use $HF_TOKEN
                    snippet.includes("https://router.huggingface.co")))); // explicit routed request => use $HF_TOKEN
    const accessTokenEnvVar = useHfToken
        ? "HF_TOKEN" // e.g. routed request or hf-inference
        : endpointUrl
            ? "API_TOKEN"
            : provider.toUpperCase().replace("-", "_") + "_API_KEY"; // e.g. "REPLICATE_API_KEY"
    // Replace the placeholder with the env variable
    if (language === "sh") {
        snippet = snippet.replace(`'Authorization: Bearer ${placeholder}'`, `"Authorization: Bearer $${accessTokenEnvVar}"`);
    }
    else if (language === "python") {
        snippet = "import os\n" + snippet;
        snippet = snippet.replace(`"${placeholder}"`, `os.environ["${accessTokenEnvVar}"]`);
        snippet = snippet.replace(`"Bearer ${placeholder}"`, `f"Bearer {os.environ['${accessTokenEnvVar}']}"`);
        snippet = snippet.replace(`"Key ${placeholder}"`, `f"Key {os.environ['${accessTokenEnvVar}']}"`);
        snippet = snippet.replace(`"X-Key ${placeholder}"`, `f"X-Key {os.environ['${accessTokenEnvVar}']}"`);
    }
    else if (language === "js") {
        snippet = snippet.replace(`"${placeholder}"`, `process.env.${accessTokenEnvVar}`);
        snippet = snippet.replace(`Authorization: "Bearer ${placeholder}",`, `Authorization: \`Bearer $\{process.env.${accessTokenEnvVar}}\`,`);
        snippet = snippet.replace(`Authorization: "Key ${placeholder}",`, `Authorization: \`Key $\{process.env.${accessTokenEnvVar}}\`,`);
        snippet = snippet.replace(`Authorization: "X-Key ${placeholder}",`, `Authorization: \`X-Key $\{process.env.${accessTokenEnvVar}}\`,`);
    }
    return snippet;
}
