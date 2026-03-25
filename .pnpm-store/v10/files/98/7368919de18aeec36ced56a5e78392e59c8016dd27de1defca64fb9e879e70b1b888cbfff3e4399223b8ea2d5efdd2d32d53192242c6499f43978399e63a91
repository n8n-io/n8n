import type { PipelineType } from "../pipelines.js";
export type * from "./audio-classification/inference.js";
export type * from "./automatic-speech-recognition/inference.js";
export type { ChatCompletionInput, ChatCompletionInputMessage, ChatCompletionInputMessageChunkType, ChatCompletionOutput, ChatCompletionOutputComplete, ChatCompletionOutputMessage, ChatCompletionStreamOutput, ChatCompletionStreamOutputChoice, ChatCompletionStreamOutputDelta, } from "./chat-completion/inference.js";
export type * from "./document-question-answering/inference.js";
export type * from "./feature-extraction/inference.js";
export type * from "./fill-mask/inference.js";
export type { ImageClassificationInput, ImageClassificationOutput, ImageClassificationOutputElement, ImageClassificationParameters, } from "./image-classification/inference.js";
export type * from "./image-to-image/inference.js";
export type { ImageToTextInput, ImageToTextOutput, ImageToTextParameters } from "./image-to-text/inference.js";
export type * from "./image-segmentation/inference.js";
export type { ImageToVideoInput, ImageToVideoOutput, ImageToVideoParameters } from "./image-to-video/inference.js";
export type * from "./object-detection/inference.js";
export type * from "./depth-estimation/inference.js";
export type * from "./question-answering/inference.js";
export type * from "./sentence-similarity/inference.js";
export type * from "./summarization/inference.js";
export type * from "./table-question-answering/inference.js";
export type { TextToImageInput, TextToImageOutput, TextToImageParameters } from "./text-to-image/inference.js";
export type { TextToVideoParameters, TextToVideoOutput, TextToVideoInput } from "./text-to-video/inference.js";
export type { TextToSpeechParameters, TextToSpeechInput, TextToSpeechOutput } from "./text-to-speech/inference.js";
export type * from "./token-classification/inference.js";
export type { TranslationInput, TranslationOutput } from "./translation/inference.js";
export type { ClassificationOutputTransform, TextClassificationInput, TextClassificationOutput, TextClassificationOutputElement, TextClassificationParameters, } from "./text-classification/inference.js";
export type { TextGenerationOutputFinishReason, TextGenerationOutputPrefillToken, TextGenerationInput, TextGenerationOutput, TextGenerationOutputDetails, TextGenerationInputGenerateParameters, TextGenerationOutputBestOfSequence, TextGenerationOutputToken, TextGenerationStreamOutputStreamDetails, TextGenerationStreamOutput, } from "./text-generation/inference.js";
export type * from "./video-classification/inference.js";
export type * from "./visual-question-answering/inference.js";
export type * from "./zero-shot-classification/inference.js";
export type * from "./zero-shot-image-classification/inference.js";
export type { BoundingBox, ZeroShotObjectDetectionInput, ZeroShotObjectDetectionOutput, ZeroShotObjectDetectionOutputElement, } from "./zero-shot-object-detection/inference.js";
import type { ModelLibraryKey } from "../model-libraries.js";
/**
 * Model libraries compatible with each ML task
 */
export declare const TASKS_MODEL_LIBRARIES: Record<PipelineType, ModelLibraryKey[]>;
export declare const TASKS_DATA: Record<PipelineType, TaskData | undefined>;
export interface ExampleRepo {
    description: string;
    id: string;
}
export type TaskDemoEntry = {
    filename: string;
    type: "audio";
} | {
    data: Array<{
        label: string;
        score: number;
    }>;
    type: "chart";
} | {
    filename: string;
    type: "img";
} | {
    table: string[][];
    type: "tabular";
} | {
    content: string;
    label: string;
    type: "text";
} | {
    text: string;
    tokens: Array<{
        end: number;
        start: number;
        type: string;
    }>;
    type: "text-with-tokens";
};
export interface TaskDemo {
    inputs: TaskDemoEntry[];
    outputs: TaskDemoEntry[];
}
export interface TaskData {
    datasets: ExampleRepo[];
    demo: TaskDemo;
    id: PipelineType;
    canonicalId?: PipelineType;
    isPlaceholder?: boolean;
    label: string;
    libraries: ModelLibraryKey[];
    metrics: ExampleRepo[];
    models: ExampleRepo[];
    spaces: ExampleRepo[];
    summary: string;
    widgetModels: string[];
    youtubeId?: string;
}
export type TaskDataCustom = Omit<TaskData, "id" | "label" | "libraries">;
//# sourceMappingURL=index.d.ts.map