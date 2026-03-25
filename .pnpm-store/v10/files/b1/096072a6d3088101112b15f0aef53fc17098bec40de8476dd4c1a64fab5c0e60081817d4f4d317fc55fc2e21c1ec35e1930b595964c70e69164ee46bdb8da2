"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDERS = void 0;
exports.getProviderHelper = getProviderHelper;
const BlackForestLabs = __importStar(require("../providers/black-forest-labs.js"));
const Cerebras = __importStar(require("../providers/cerebras.js"));
const Cohere = __importStar(require("../providers/cohere.js"));
const FalAI = __importStar(require("../providers/fal-ai.js"));
const FeatherlessAI = __importStar(require("../providers/featherless-ai.js"));
const Fireworks = __importStar(require("../providers/fireworks-ai.js"));
const Groq = __importStar(require("../providers/groq.js"));
const HFInference = __importStar(require("../providers/hf-inference.js"));
const Hyperbolic = __importStar(require("../providers/hyperbolic.js"));
const Nebius = __importStar(require("../providers/nebius.js"));
const Novita = __importStar(require("../providers/novita.js"));
const Nscale = __importStar(require("../providers/nscale.js"));
const OpenAI = __importStar(require("../providers/openai.js"));
const OvhCloud = __importStar(require("../providers/ovhcloud.js"));
const Replicate = __importStar(require("../providers/replicate.js"));
const Sambanova = __importStar(require("../providers/sambanova.js"));
const Together = __importStar(require("../providers/together.js"));
const errors_js_1 = require("../errors.js");
exports.PROVIDERS = {
    "black-forest-labs": {
        "text-to-image": new BlackForestLabs.BlackForestLabsTextToImageTask(),
    },
    cerebras: {
        conversational: new Cerebras.CerebrasConversationalTask(),
    },
    cohere: {
        conversational: new Cohere.CohereConversationalTask(),
    },
    "fal-ai": {
        "text-to-image": new FalAI.FalAITextToImageTask(),
        "text-to-speech": new FalAI.FalAITextToSpeechTask(),
        "text-to-video": new FalAI.FalAITextToVideoTask(),
        "automatic-speech-recognition": new FalAI.FalAIAutomaticSpeechRecognitionTask(),
    },
    "featherless-ai": {
        conversational: new FeatherlessAI.FeatherlessAIConversationalTask(),
        "text-generation": new FeatherlessAI.FeatherlessAITextGenerationTask(),
    },
    "hf-inference": {
        "text-to-image": new HFInference.HFInferenceTextToImageTask(),
        conversational: new HFInference.HFInferenceConversationalTask(),
        "text-generation": new HFInference.HFInferenceTextGenerationTask(),
        "text-classification": new HFInference.HFInferenceTextClassificationTask(),
        "question-answering": new HFInference.HFInferenceQuestionAnsweringTask(),
        "audio-classification": new HFInference.HFInferenceAudioClassificationTask(),
        "automatic-speech-recognition": new HFInference.HFInferenceAutomaticSpeechRecognitionTask(),
        "fill-mask": new HFInference.HFInferenceFillMaskTask(),
        "feature-extraction": new HFInference.HFInferenceFeatureExtractionTask(),
        "image-classification": new HFInference.HFInferenceImageClassificationTask(),
        "image-segmentation": new HFInference.HFInferenceImageSegmentationTask(),
        "document-question-answering": new HFInference.HFInferenceDocumentQuestionAnsweringTask(),
        "image-to-text": new HFInference.HFInferenceImageToTextTask(),
        "object-detection": new HFInference.HFInferenceObjectDetectionTask(),
        "audio-to-audio": new HFInference.HFInferenceAudioToAudioTask(),
        "zero-shot-image-classification": new HFInference.HFInferenceZeroShotImageClassificationTask(),
        "zero-shot-classification": new HFInference.HFInferenceZeroShotClassificationTask(),
        "image-to-image": new HFInference.HFInferenceImageToImageTask(),
        "sentence-similarity": new HFInference.HFInferenceSentenceSimilarityTask(),
        "table-question-answering": new HFInference.HFInferenceTableQuestionAnsweringTask(),
        "tabular-classification": new HFInference.HFInferenceTabularClassificationTask(),
        "text-to-speech": new HFInference.HFInferenceTextToSpeechTask(),
        "token-classification": new HFInference.HFInferenceTokenClassificationTask(),
        translation: new HFInference.HFInferenceTranslationTask(),
        summarization: new HFInference.HFInferenceSummarizationTask(),
        "visual-question-answering": new HFInference.HFInferenceVisualQuestionAnsweringTask(),
        "tabular-regression": new HFInference.HFInferenceTabularRegressionTask(),
        "text-to-audio": new HFInference.HFInferenceTextToAudioTask(),
    },
    "fireworks-ai": {
        conversational: new Fireworks.FireworksConversationalTask(),
    },
    groq: {
        conversational: new Groq.GroqConversationalTask(),
        "text-generation": new Groq.GroqTextGenerationTask(),
    },
    hyperbolic: {
        "text-to-image": new Hyperbolic.HyperbolicTextToImageTask(),
        conversational: new Hyperbolic.HyperbolicConversationalTask(),
        "text-generation": new Hyperbolic.HyperbolicTextGenerationTask(),
    },
    nebius: {
        "text-to-image": new Nebius.NebiusTextToImageTask(),
        conversational: new Nebius.NebiusConversationalTask(),
        "text-generation": new Nebius.NebiusTextGenerationTask(),
        "feature-extraction": new Nebius.NebiusFeatureExtractionTask(),
    },
    novita: {
        conversational: new Novita.NovitaConversationalTask(),
        "text-generation": new Novita.NovitaTextGenerationTask(),
        "text-to-video": new Novita.NovitaTextToVideoTask(),
    },
    nscale: {
        "text-to-image": new Nscale.NscaleTextToImageTask(),
        conversational: new Nscale.NscaleConversationalTask(),
    },
    openai: {
        conversational: new OpenAI.OpenAIConversationalTask(),
    },
    ovhcloud: {
        conversational: new OvhCloud.OvhCloudConversationalTask(),
        "text-generation": new OvhCloud.OvhCloudTextGenerationTask(),
    },
    replicate: {
        "text-to-image": new Replicate.ReplicateTextToImageTask(),
        "text-to-speech": new Replicate.ReplicateTextToSpeechTask(),
        "text-to-video": new Replicate.ReplicateTextToVideoTask(),
    },
    sambanova: {
        conversational: new Sambanova.SambanovaConversationalTask(),
        "feature-extraction": new Sambanova.SambanovaFeatureExtractionTask(),
    },
    together: {
        "text-to-image": new Together.TogetherTextToImageTask(),
        conversational: new Together.TogetherConversationalTask(),
        "text-generation": new Together.TogetherTextGenerationTask(),
    },
};
function getProviderHelper(provider, task) {
    if ((provider === "hf-inference" && !task) || provider === "auto") {
        return new HFInference.HFInferenceTask();
    }
    if (!task) {
        throw new errors_js_1.InferenceClientInputError("you need to provide a task name when using an external provider, e.g. 'text-to-image'");
    }
    if (!(provider in exports.PROVIDERS)) {
        throw new errors_js_1.InferenceClientInputError(`Provider '${provider}' not supported. Available providers: ${Object.keys(exports.PROVIDERS)}`);
    }
    const providerTasks = exports.PROVIDERS[provider];
    if (!providerTasks || !(task in providerTasks)) {
        throw new errors_js_1.InferenceClientInputError(`Task '${task}' not supported for provider '${provider}'. Available tasks: ${Object.keys(providerTasks ?? {})}`);
    }
    return providerTasks[task];
}
