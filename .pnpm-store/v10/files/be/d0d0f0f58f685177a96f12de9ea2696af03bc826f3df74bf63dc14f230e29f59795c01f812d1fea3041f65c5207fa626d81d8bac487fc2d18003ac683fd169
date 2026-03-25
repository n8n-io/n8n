import { HF_ROUTER_URL } from "../config.js";
import { InferenceClientProviderOutputError } from "../errors.js";
import { toArray } from "../utils/toArray.js";
import { TaskProviderHelper } from "./providerHelper.js";
import { base64FromBytes } from "../utils/base64FromBytes.js";
import { omit } from "../utils/omit.js";
export const EQUIVALENT_SENTENCE_TRANSFORMERS_TASKS = ["feature-extraction", "sentence-similarity"];
export class HFInferenceTask extends TaskProviderHelper {
    constructor() {
        super("hf-inference", `${HF_ROUTER_URL}/hf-inference`);
    }
    preparePayload(params) {
        return params.args;
    }
    makeUrl(params) {
        if (params.model.startsWith("http://") || params.model.startsWith("https://")) {
            return params.model;
        }
        return super.makeUrl(params);
    }
    makeRoute(params) {
        if (params.task && ["feature-extraction", "sentence-similarity"].includes(params.task)) {
            // when deployed on hf-inference, those two tasks are automatically compatible with one another.
            return `models/${params.model}/pipeline/${params.task}`;
        }
        return `models/${params.model}`;
    }
    async getResponse(response) {
        return response;
    }
}
export class HFInferenceTextToImageTask extends HFInferenceTask {
    async getResponse(response, url, headers, outputType) {
        if (!response) {
            throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference text-to-image API: response is undefined");
        }
        if (typeof response == "object") {
            if ("data" in response && Array.isArray(response.data) && response.data[0].b64_json) {
                const base64Data = response.data[0].b64_json;
                if (outputType === "url") {
                    return `data:image/jpeg;base64,${base64Data}`;
                }
                const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
                return await base64Response.blob();
            }
            if ("output" in response && Array.isArray(response.output)) {
                if (outputType === "url") {
                    return response.output[0];
                }
                const urlResponse = await fetch(response.output[0]);
                const blob = await urlResponse.blob();
                return blob;
            }
        }
        if (response instanceof Blob) {
            if (outputType === "url") {
                const b64 = await response.arrayBuffer().then((buf) => Buffer.from(buf).toString("base64"));
                return `data:image/jpeg;base64,${b64}`;
            }
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference text-to-image API: expected a Blob");
    }
}
export class HFInferenceConversationalTask extends HFInferenceTask {
    makeUrl(params) {
        let url;
        if (params.model.startsWith("http://") || params.model.startsWith("https://")) {
            url = params.model.trim();
        }
        else {
            url = `${this.makeBaseUrl(params)}/models/${params.model}`;
        }
        url = url.replace(/\/+$/, "");
        if (url.endsWith("/v1")) {
            url += "/chat/completions";
        }
        else if (!url.endsWith("/chat/completions")) {
            url += "/v1/chat/completions";
        }
        return url;
    }
    preparePayload(params) {
        return {
            ...params.args,
            model: params.model,
        };
    }
    async getResponse(response) {
        return response;
    }
}
export class HFInferenceTextGenerationTask extends HFInferenceTask {
    async getResponse(response) {
        const res = toArray(response);
        if (Array.isArray(res) && res.every((x) => "generated_text" in x && typeof x?.generated_text === "string")) {
            return res?.[0];
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference text generation API: expected Array<{generated_text: string}>");
    }
}
export class HFInferenceAudioClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => typeof x === "object" && x !== null && typeof x.label === "string" && typeof x.score === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference audio-classification API: expected Array<{label: string, score: number}> but received different format");
    }
}
export class HFInferenceAutomaticSpeechRecognitionTask extends HFInferenceTask {
    async getResponse(response) {
        return response;
    }
    async preparePayloadAsync(args) {
        return "data" in args
            ? args
            : {
                ...omit(args, "inputs"),
                data: args.inputs,
            };
    }
}
export class HFInferenceAudioToAudioTask extends HFInferenceTask {
    async getResponse(response) {
        if (!Array.isArray(response)) {
            throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference audio-to-audio API: expected Array");
        }
        if (!response.every((elem) => {
            return (typeof elem === "object" &&
                elem &&
                "label" in elem &&
                typeof elem.label === "string" &&
                "content-type" in elem &&
                typeof elem["content-type"] === "string" &&
                "blob" in elem &&
                typeof elem.blob === "string");
        })) {
            throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference audio-to-audio API: expected Array<{label: string, audio: Blob}>");
        }
        return response;
    }
}
export class HFInferenceDocumentQuestionAnsweringTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((elem) => typeof elem === "object" &&
                !!elem &&
                typeof elem?.answer === "string" &&
                (typeof elem.end === "number" || typeof elem.end === "undefined") &&
                (typeof elem.score === "number" || typeof elem.score === "undefined") &&
                (typeof elem.start === "number" || typeof elem.start === "undefined"))) {
            return response[0];
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference document-question-answering API: expected Array<{answer: string, end: number, score: number, start: number}>");
    }
}
export class HFInferenceFeatureExtractionTask extends HFInferenceTask {
    async getResponse(response) {
        const isNumArrayRec = (arr, maxDepth, curDepth = 0) => {
            if (curDepth > maxDepth)
                return false;
            if (arr.every((x) => Array.isArray(x))) {
                return arr.every((x) => isNumArrayRec(x, maxDepth, curDepth + 1));
            }
            else {
                return arr.every((x) => typeof x === "number");
            }
        };
        if (Array.isArray(response) && isNumArrayRec(response, 3, 0)) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference feature-extraction API: expected Array<number[][][] | number[][] | number[] | number>");
    }
}
export class HFInferenceImageClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x.label === "string" && typeof x.score === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference image-classification API: expected Array<{label: string, score: number}>");
    }
}
export class HFInferenceImageSegmentationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => typeof x.label === "string" &&
                typeof x.mask === "string" &&
                (x.score === undefined || typeof x.score === "number"))) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference image-segmentation API: expected Array<{label: string, mask: string, score: number}>");
    }
}
export class HFInferenceImageToTextTask extends HFInferenceTask {
    async getResponse(response) {
        if (typeof response?.generated_text !== "string") {
            throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference image-to-text API: expected {generated_text: string}");
        }
        return response;
    }
}
export class HFInferenceImageToImageTask extends HFInferenceTask {
    async preparePayloadAsync(args) {
        if (!args.parameters) {
            return {
                ...args,
                model: args.model,
                data: args.inputs,
            };
        }
        else {
            return {
                ...args,
                inputs: base64FromBytes(new Uint8Array(args.inputs instanceof ArrayBuffer ? args.inputs : await args.inputs.arrayBuffer())),
            };
        }
    }
    async getResponse(response) {
        if (response instanceof Blob) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference image-to-image API: expected Blob");
    }
}
export class HFInferenceObjectDetectionTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => typeof x.label === "string" &&
                typeof x.score === "number" &&
                typeof x.box.xmin === "number" &&
                typeof x.box.ymin === "number" &&
                typeof x.box.xmax === "number" &&
                typeof x.box.ymax === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference object-detection API: expected Array<{label: string, score: number, box: {xmin: number, ymin: number, xmax: number, ymax: number}}>");
    }
}
export class HFInferenceZeroShotImageClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x.label === "string" && typeof x.score === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference zero-shot-image-classification API: expected Array<{label: string, score: number}>");
    }
}
export class HFInferenceTextClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        const output = response?.[0];
        if (Array.isArray(output) && output.every((x) => typeof x?.label === "string" && typeof x.score === "number")) {
            return output;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference text-classification API: expected Array<{label: string, score: number}>");
    }
}
export class HFInferenceQuestionAnsweringTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response)
            ? response.every((elem) => typeof elem === "object" &&
                !!elem &&
                typeof elem.answer === "string" &&
                typeof elem.end === "number" &&
                typeof elem.score === "number" &&
                typeof elem.start === "number")
            : typeof response === "object" &&
                !!response &&
                typeof response.answer === "string" &&
                typeof response.end === "number" &&
                typeof response.score === "number" &&
                typeof response.start === "number") {
            return Array.isArray(response) ? response[0] : response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference question-answering API: expected Array<{answer: string, end: number, score: number, start: number}>");
    }
}
export class HFInferenceFillMaskTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => typeof x.score === "number" &&
                typeof x.sequence === "string" &&
                typeof x.token === "number" &&
                typeof x.token_str === "string")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference fill-mask API: expected Array<{score: number, sequence: string, token: number, token_str: string}>");
    }
}
export class HFInferenceZeroShotClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => Array.isArray(x.labels) &&
                x.labels.every((_label) => typeof _label === "string") &&
                Array.isArray(x.scores) &&
                x.scores.every((_score) => typeof _score === "number") &&
                typeof x.sequence === "string")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference zero-shot-classification API: expected Array<{labels: string[], scores: number[], sequence: string}>");
    }
}
export class HFInferenceSentenceSimilarityTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference sentence-similarity API: expected Array<number>");
    }
}
export class HFInferenceTableQuestionAnsweringTask extends HFInferenceTask {
    static validate(elem) {
        return (typeof elem === "object" &&
            !!elem &&
            "aggregator" in elem &&
            typeof elem.aggregator === "string" &&
            "answer" in elem &&
            typeof elem.answer === "string" &&
            "cells" in elem &&
            Array.isArray(elem.cells) &&
            elem.cells.every((x) => typeof x === "string") &&
            "coordinates" in elem &&
            Array.isArray(elem.coordinates) &&
            elem.coordinates.every((coord) => Array.isArray(coord) && coord.every((x) => typeof x === "number")));
    }
    async getResponse(response) {
        if (Array.isArray(response) && Array.isArray(response)
            ? response.every((elem) => HFInferenceTableQuestionAnsweringTask.validate(elem))
            : HFInferenceTableQuestionAnsweringTask.validate(response)) {
            return Array.isArray(response) ? response[0] : response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference table-question-answering API: expected {aggregator: string, answer: string, cells: string[], coordinates: number[][]}");
    }
}
export class HFInferenceTokenClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((x) => typeof x.end === "number" &&
                typeof x.entity_group === "string" &&
                typeof x.score === "number" &&
                typeof x.start === "number" &&
                typeof x.word === "string")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference token-classification API: expected Array<{end: number, entity_group: string, score: number, start: number, word: string}>");
    }
}
export class HFInferenceTranslationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x?.translation_text === "string")) {
            return response?.length === 1 ? response?.[0] : response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference translation API: expected Array<{translation_text: string}>");
    }
}
export class HFInferenceSummarizationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x?.summary_text === "string")) {
            return response?.[0];
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference summarization API: expected Array<{summary_text: string}>");
    }
}
export class HFInferenceTextToSpeechTask extends HFInferenceTask {
    async getResponse(response) {
        return response;
    }
}
export class HFInferenceTabularClassificationTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference tabular-classification API: expected Array<number>");
    }
}
export class HFInferenceVisualQuestionAnsweringTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) &&
            response.every((elem) => typeof elem === "object" && !!elem && typeof elem?.answer === "string" && typeof elem.score === "number")) {
            return response[0];
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference visual-question-answering API: expected Array<{answer: string, score: number}>");
    }
}
export class HFInferenceTabularRegressionTask extends HFInferenceTask {
    async getResponse(response) {
        if (Array.isArray(response) && response.every((x) => typeof x === "number")) {
            return response;
        }
        throw new InferenceClientProviderOutputError("Received malformed response from HF-Inference tabular-regression API: expected Array<number>");
    }
}
export class HFInferenceTextToAudioTask extends HFInferenceTask {
    async getResponse(response) {
        return response;
    }
}
