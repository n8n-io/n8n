"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASKS_DATA = exports.TASKS_MODEL_LIBRARIES = void 0;
const pipelines_js_1 = require("../pipelines.js");
const data_js_1 = __importDefault(require("./any-to-any/data.js"));
const data_js_2 = __importDefault(require("./audio-classification/data.js"));
const data_js_3 = __importDefault(require("./audio-to-audio/data.js"));
const data_js_4 = __importDefault(require("./automatic-speech-recognition/data.js"));
const data_js_5 = __importDefault(require("./document-question-answering/data.js"));
const data_js_6 = __importDefault(require("./feature-extraction/data.js"));
const data_js_7 = __importDefault(require("./fill-mask/data.js"));
const data_js_8 = __importDefault(require("./image-classification/data.js"));
const data_js_9 = __importDefault(require("./image-feature-extraction/data.js"));
const data_js_10 = __importDefault(require("./image-to-image/data.js"));
const data_js_11 = __importDefault(require("./image-to-text/data.js"));
const data_js_12 = __importDefault(require("./image-text-to-text/data.js"));
const data_js_13 = __importDefault(require("./image-segmentation/data.js"));
const data_js_14 = __importDefault(require("./image-to-video/data.js"));
const data_js_15 = __importDefault(require("./mask-generation/data.js"));
const data_js_16 = __importDefault(require("./object-detection/data.js"));
const data_js_17 = __importDefault(require("./depth-estimation/data.js"));
const data_js_18 = __importDefault(require("./placeholder/data.js"));
const data_js_19 = __importDefault(require("./reinforcement-learning/data.js"));
const data_js_20 = __importDefault(require("./question-answering/data.js"));
const data_js_21 = __importDefault(require("./sentence-similarity/data.js"));
const data_js_22 = __importDefault(require("./summarization/data.js"));
const data_js_23 = __importDefault(require("./table-question-answering/data.js"));
const data_js_24 = __importDefault(require("./tabular-classification/data.js"));
const data_js_25 = __importDefault(require("./tabular-regression/data.js"));
const data_js_26 = __importDefault(require("./text-to-image/data.js"));
const data_js_27 = __importDefault(require("./text-to-speech/data.js"));
const data_js_28 = __importDefault(require("./token-classification/data.js"));
const data_js_29 = __importDefault(require("./translation/data.js"));
const data_js_30 = __importDefault(require("./text-classification/data.js"));
const data_js_31 = __importDefault(require("./text-generation/data.js"));
const data_js_32 = __importDefault(require("./text-ranking/data.js"));
const data_js_33 = __importDefault(require("./text-to-video/data.js"));
const data_js_34 = __importDefault(require("./unconditional-image-generation/data.js"));
const data_js_35 = __importDefault(require("./video-classification/data.js"));
const data_js_36 = __importDefault(require("./visual-document-retrieval/data.js"));
const data_js_37 = __importDefault(require("./visual-question-answering/data.js"));
const data_js_38 = __importDefault(require("./zero-shot-classification/data.js"));
const data_js_39 = __importDefault(require("./zero-shot-image-classification/data.js"));
const data_js_40 = __importDefault(require("./zero-shot-object-detection/data.js"));
const data_js_41 = __importDefault(require("./image-to-3d/data.js"));
const data_js_42 = __importDefault(require("./text-to-3d/data.js"));
const data_js_43 = __importDefault(require("./keypoint-detection/data.js"));
const data_js_44 = __importDefault(require("./video-text-to-text/data.js"));
/**
 * Model libraries compatible with each ML task
 */
exports.TASKS_MODEL_LIBRARIES = {
    "audio-classification": ["speechbrain", "transformers", "transformers.js"],
    "audio-to-audio": ["asteroid", "fairseq", "speechbrain"],
    "automatic-speech-recognition": ["espnet", "nemo", "speechbrain", "transformers", "transformers.js"],
    "audio-text-to-text": [],
    "depth-estimation": ["transformers", "transformers.js"],
    "document-question-answering": ["transformers", "transformers.js"],
    "feature-extraction": ["sentence-transformers", "transformers", "transformers.js"],
    "fill-mask": ["transformers", "transformers.js"],
    "graph-ml": ["transformers"],
    "image-classification": ["keras", "timm", "transformers", "transformers.js"],
    "image-feature-extraction": ["timm", "transformers"],
    "image-segmentation": ["transformers", "transformers.js"],
    "image-text-to-text": ["transformers"],
    "image-to-image": ["diffusers", "transformers", "transformers.js"],
    "image-to-text": ["transformers", "transformers.js"],
    "image-to-video": ["diffusers"],
    "keypoint-detection": ["transformers"],
    "video-classification": ["transformers"],
    "mask-generation": ["transformers"],
    "multiple-choice": ["transformers"],
    "object-detection": ["transformers", "transformers.js", "ultralytics"],
    other: [],
    "question-answering": ["adapter-transformers", "allennlp", "transformers", "transformers.js"],
    robotics: [],
    "reinforcement-learning": ["transformers", "stable-baselines3", "ml-agents", "sample-factory"],
    "sentence-similarity": ["sentence-transformers", "spacy", "transformers.js"],
    summarization: ["transformers", "transformers.js"],
    "table-question-answering": ["transformers"],
    "table-to-text": ["transformers"],
    "tabular-classification": ["sklearn"],
    "tabular-regression": ["sklearn"],
    "tabular-to-text": ["transformers"],
    "text-classification": ["adapter-transformers", "setfit", "spacy", "transformers", "transformers.js"],
    "text-generation": ["transformers", "transformers.js"],
    "text-ranking": ["sentence-transformers", "transformers"],
    "text-retrieval": [],
    "text-to-image": ["diffusers"],
    "text-to-speech": ["espnet", "tensorflowtts", "transformers", "transformers.js"],
    "text-to-audio": ["transformers", "transformers.js"],
    "text-to-video": ["diffusers"],
    "time-series-forecasting": [],
    "token-classification": [
        "adapter-transformers",
        "flair",
        "spacy",
        "span-marker",
        "stanza",
        "transformers",
        "transformers.js",
    ],
    translation: ["transformers", "transformers.js"],
    "unconditional-image-generation": ["diffusers"],
    "video-text-to-text": ["transformers"],
    "visual-question-answering": ["transformers", "transformers.js"],
    "voice-activity-detection": [],
    "zero-shot-classification": ["transformers", "transformers.js"],
    "zero-shot-image-classification": ["transformers", "transformers.js"],
    "zero-shot-object-detection": ["transformers", "transformers.js"],
    "text-to-3d": ["diffusers"],
    "image-to-3d": ["diffusers"],
    "any-to-any": ["transformers"],
    "visual-document-retrieval": ["transformers"],
    "video-to-video": ["diffusers"],
};
/**
 * Return the whole TaskData object for a certain task.
 * If the partialTaskData argument is left undefined,
 * the default placeholder data will be used.
 */
function getData(type, partialTaskData = data_js_18.default) {
    return {
        ...partialTaskData,
        id: type,
        label: pipelines_js_1.PIPELINE_DATA[type].name,
        libraries: exports.TASKS_MODEL_LIBRARIES[type],
    };
}
// To make comparisons easier, task order is the same as in const.ts
// Tasks set to undefined won't have an associated task page.
// Tasks that call getData() without the second argument will
// have a "placeholder" page.
exports.TASKS_DATA = {
    "any-to-any": getData("any-to-any", data_js_1.default),
    "audio-classification": getData("audio-classification", data_js_2.default),
    "audio-to-audio": getData("audio-to-audio", data_js_3.default),
    "audio-text-to-text": getData("audio-text-to-text", data_js_18.default),
    "automatic-speech-recognition": getData("automatic-speech-recognition", data_js_4.default),
    "depth-estimation": getData("depth-estimation", data_js_17.default),
    "document-question-answering": getData("document-question-answering", data_js_5.default),
    "visual-document-retrieval": getData("visual-document-retrieval", data_js_36.default),
    "feature-extraction": getData("feature-extraction", data_js_6.default),
    "fill-mask": getData("fill-mask", data_js_7.default),
    "graph-ml": undefined,
    "image-classification": getData("image-classification", data_js_8.default),
    "image-feature-extraction": getData("image-feature-extraction", data_js_9.default),
    "image-segmentation": getData("image-segmentation", data_js_13.default),
    "image-to-image": getData("image-to-image", data_js_10.default),
    "image-text-to-text": getData("image-text-to-text", data_js_12.default),
    "image-to-text": getData("image-to-text", data_js_11.default),
    "image-to-video": getData("image-to-video", data_js_14.default),
    "keypoint-detection": getData("keypoint-detection", data_js_43.default),
    "mask-generation": getData("mask-generation", data_js_15.default),
    "multiple-choice": undefined,
    "object-detection": getData("object-detection", data_js_16.default),
    "video-classification": getData("video-classification", data_js_35.default),
    other: undefined,
    "question-answering": getData("question-answering", data_js_20.default),
    "reinforcement-learning": getData("reinforcement-learning", data_js_19.default),
    robotics: undefined,
    "sentence-similarity": getData("sentence-similarity", data_js_21.default),
    summarization: getData("summarization", data_js_22.default),
    "table-question-answering": getData("table-question-answering", data_js_23.default),
    "table-to-text": undefined,
    "tabular-classification": getData("tabular-classification", data_js_24.default),
    "tabular-regression": getData("tabular-regression", data_js_25.default),
    "tabular-to-text": undefined,
    "text-classification": getData("text-classification", data_js_30.default),
    "text-generation": getData("text-generation", data_js_31.default),
    "text-ranking": getData("text-ranking", data_js_32.default),
    "text-retrieval": undefined,
    "text-to-image": getData("text-to-image", data_js_26.default),
    "text-to-speech": getData("text-to-speech", data_js_27.default),
    "text-to-audio": undefined,
    "text-to-video": getData("text-to-video", data_js_33.default),
    "time-series-forecasting": undefined,
    "token-classification": getData("token-classification", data_js_28.default),
    translation: getData("translation", data_js_29.default),
    "unconditional-image-generation": getData("unconditional-image-generation", data_js_34.default),
    "video-text-to-text": getData("video-text-to-text", data_js_44.default),
    "video-to-video": getData("video-to-video", data_js_18.default),
    "visual-question-answering": getData("visual-question-answering", data_js_37.default),
    "voice-activity-detection": undefined,
    "zero-shot-classification": getData("zero-shot-classification", data_js_38.default),
    "zero-shot-image-classification": getData("zero-shot-image-classification", data_js_39.default),
    "zero-shot-object-detection": getData("zero-shot-object-detection", data_js_40.default),
    "text-to-3d": getData("text-to-3d", data_js_42.default),
    "image-to-3d": getData("image-to-3d", data_js_41.default),
};
