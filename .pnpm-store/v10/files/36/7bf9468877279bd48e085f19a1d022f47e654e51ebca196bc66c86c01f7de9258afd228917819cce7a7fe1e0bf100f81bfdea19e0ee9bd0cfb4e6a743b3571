import { PIPELINE_DATA } from "../pipelines.js";
import anyToAny from "./any-to-any/data.js";
import audioClassification from "./audio-classification/data.js";
import audioToAudio from "./audio-to-audio/data.js";
import automaticSpeechRecognition from "./automatic-speech-recognition/data.js";
import documentQuestionAnswering from "./document-question-answering/data.js";
import featureExtraction from "./feature-extraction/data.js";
import fillMask from "./fill-mask/data.js";
import imageClassification from "./image-classification/data.js";
import imageFeatureExtraction from "./image-feature-extraction/data.js";
import imageToImage from "./image-to-image/data.js";
import imageToText from "./image-to-text/data.js";
import imageTextToText from "./image-text-to-text/data.js";
import imageSegmentation from "./image-segmentation/data.js";
import imageToVideo from "./image-to-video/data.js";
import maskGeneration from "./mask-generation/data.js";
import objectDetection from "./object-detection/data.js";
import depthEstimation from "./depth-estimation/data.js";
import placeholder from "./placeholder/data.js";
import reinforcementLearning from "./reinforcement-learning/data.js";
import questionAnswering from "./question-answering/data.js";
import sentenceSimilarity from "./sentence-similarity/data.js";
import summarization from "./summarization/data.js";
import tableQuestionAnswering from "./table-question-answering/data.js";
import tabularClassification from "./tabular-classification/data.js";
import tabularRegression from "./tabular-regression/data.js";
import textToImage from "./text-to-image/data.js";
import textToSpeech from "./text-to-speech/data.js";
import tokenClassification from "./token-classification/data.js";
import translation from "./translation/data.js";
import textClassification from "./text-classification/data.js";
import textGeneration from "./text-generation/data.js";
import textRanking from "./text-ranking/data.js";
import textToVideo from "./text-to-video/data.js";
import unconditionalImageGeneration from "./unconditional-image-generation/data.js";
import videoClassification from "./video-classification/data.js";
import visualDocumentRetrieval from "./visual-document-retrieval/data.js";
import visualQuestionAnswering from "./visual-question-answering/data.js";
import zeroShotClassification from "./zero-shot-classification/data.js";
import zeroShotImageClassification from "./zero-shot-image-classification/data.js";
import zeroShotObjectDetection from "./zero-shot-object-detection/data.js";
import imageTo3D from "./image-to-3d/data.js";
import textTo3D from "./text-to-3d/data.js";
import keypointDetection from "./keypoint-detection/data.js";
import videoTextToText from "./video-text-to-text/data.js";
/**
 * Model libraries compatible with each ML task
 */
export const TASKS_MODEL_LIBRARIES = {
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
function getData(type, partialTaskData = placeholder) {
    return {
        ...partialTaskData,
        id: type,
        label: PIPELINE_DATA[type].name,
        libraries: TASKS_MODEL_LIBRARIES[type],
    };
}
// To make comparisons easier, task order is the same as in const.ts
// Tasks set to undefined won't have an associated task page.
// Tasks that call getData() without the second argument will
// have a "placeholder" page.
export const TASKS_DATA = {
    "any-to-any": getData("any-to-any", anyToAny),
    "audio-classification": getData("audio-classification", audioClassification),
    "audio-to-audio": getData("audio-to-audio", audioToAudio),
    "audio-text-to-text": getData("audio-text-to-text", placeholder),
    "automatic-speech-recognition": getData("automatic-speech-recognition", automaticSpeechRecognition),
    "depth-estimation": getData("depth-estimation", depthEstimation),
    "document-question-answering": getData("document-question-answering", documentQuestionAnswering),
    "visual-document-retrieval": getData("visual-document-retrieval", visualDocumentRetrieval),
    "feature-extraction": getData("feature-extraction", featureExtraction),
    "fill-mask": getData("fill-mask", fillMask),
    "graph-ml": undefined,
    "image-classification": getData("image-classification", imageClassification),
    "image-feature-extraction": getData("image-feature-extraction", imageFeatureExtraction),
    "image-segmentation": getData("image-segmentation", imageSegmentation),
    "image-to-image": getData("image-to-image", imageToImage),
    "image-text-to-text": getData("image-text-to-text", imageTextToText),
    "image-to-text": getData("image-to-text", imageToText),
    "image-to-video": getData("image-to-video", imageToVideo),
    "keypoint-detection": getData("keypoint-detection", keypointDetection),
    "mask-generation": getData("mask-generation", maskGeneration),
    "multiple-choice": undefined,
    "object-detection": getData("object-detection", objectDetection),
    "video-classification": getData("video-classification", videoClassification),
    other: undefined,
    "question-answering": getData("question-answering", questionAnswering),
    "reinforcement-learning": getData("reinforcement-learning", reinforcementLearning),
    robotics: undefined,
    "sentence-similarity": getData("sentence-similarity", sentenceSimilarity),
    summarization: getData("summarization", summarization),
    "table-question-answering": getData("table-question-answering", tableQuestionAnswering),
    "table-to-text": undefined,
    "tabular-classification": getData("tabular-classification", tabularClassification),
    "tabular-regression": getData("tabular-regression", tabularRegression),
    "tabular-to-text": undefined,
    "text-classification": getData("text-classification", textClassification),
    "text-generation": getData("text-generation", textGeneration),
    "text-ranking": getData("text-ranking", textRanking),
    "text-retrieval": undefined,
    "text-to-image": getData("text-to-image", textToImage),
    "text-to-speech": getData("text-to-speech", textToSpeech),
    "text-to-audio": undefined,
    "text-to-video": getData("text-to-video", textToVideo),
    "time-series-forecasting": undefined,
    "token-classification": getData("token-classification", tokenClassification),
    translation: getData("translation", translation),
    "unconditional-image-generation": getData("unconditional-image-generation", unconditionalImageGeneration),
    "video-text-to-text": getData("video-text-to-text", videoTextToText),
    "video-to-video": getData("video-to-video", placeholder),
    "visual-question-answering": getData("visual-question-answering", visualQuestionAnswering),
    "voice-activity-detection": undefined,
    "zero-shot-classification": getData("zero-shot-classification", zeroShotClassification),
    "zero-shot-image-classification": getData("zero-shot-image-classification", zeroShotImageClassification),
    "zero-shot-object-detection": getData("zero-shot-object-detection", zeroShotObjectDetection),
    "text-to-3d": getData("text-to-3d", textTo3D),
    "image-to-3d": getData("image-to-3d", imageTo3D),
};
