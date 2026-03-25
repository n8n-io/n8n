export declare const MODALITIES: readonly ["multimodal", "nlp", "cv", "audio", "tabular", "rl", "other"];
export type Modality = (typeof MODALITIES)[number];
export declare const MODALITY_LABELS: {
    multimodal: string;
    nlp: string;
    audio: string;
    cv: string;
    rl: string;
    tabular: string;
    other: string;
};
/**
 * Public interface for a sub task.
 *
 * This can be used in a model card's `model-index` metadata.
 * and is more granular classification that can grow significantly
 * over time as new tasks are added.
 */
export interface SubTask {
    /**
     * type of the task (e.g. audio-source-separation)
     */
    type: string;
    /**
     * displayed name of the task (e.g. Audio Source Separation)
     */
    name: string;
}
/**
 * Public interface for a PipelineData.
 *
 * This information corresponds to a pipeline type (aka task)
 * in the Hub.
 */
export interface PipelineData {
    /**
     * displayed name of the task (e.g. Text Classification)
     */
    name: string;
    subtasks?: SubTask[];
    modality: Modality;
    /**
     * whether to hide in /models filters
     */
    hideInModels?: boolean;
    /**
     * whether to hide in /datasets filters
     */
    hideInDatasets?: boolean;
}
export declare const PIPELINE_DATA: {
    "text-classification": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "token-classification": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "table-question-answering": {
        name: string;
        modality: "nlp";
    };
    "question-answering": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "zero-shot-classification": {
        name: string;
        modality: "nlp";
    };
    translation: {
        name: string;
        modality: "nlp";
    };
    summarization: {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "feature-extraction": {
        name: string;
        modality: "nlp";
    };
    "text-generation": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "fill-mask": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
    };
    "sentence-similarity": {
        name: string;
        modality: "nlp";
    };
    "text-to-speech": {
        name: string;
        modality: "audio";
    };
    "text-to-audio": {
        name: string;
        modality: "audio";
    };
    "automatic-speech-recognition": {
        name: string;
        modality: "audio";
    };
    "audio-to-audio": {
        name: string;
        modality: "audio";
    };
    "audio-classification": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "audio";
    };
    "audio-text-to-text": {
        name: string;
        modality: "multimodal";
        hideInDatasets: true;
    };
    "voice-activity-detection": {
        name: string;
        modality: "audio";
    };
    "depth-estimation": {
        name: string;
        modality: "cv";
    };
    "image-classification": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
    };
    "object-detection": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
    };
    "image-segmentation": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
    };
    "text-to-image": {
        name: string;
        modality: "cv";
    };
    "image-to-text": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
    };
    "image-to-image": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
    };
    "image-to-video": {
        name: string;
        modality: "cv";
    };
    "unconditional-image-generation": {
        name: string;
        modality: "cv";
    };
    "video-classification": {
        name: string;
        modality: "cv";
    };
    "reinforcement-learning": {
        name: string;
        modality: "rl";
    };
    robotics: {
        name: string;
        modality: "rl";
        subtasks: {
            type: string;
            name: string;
        }[];
    };
    "tabular-classification": {
        name: string;
        modality: "tabular";
        subtasks: {
            type: string;
            name: string;
        }[];
    };
    "tabular-regression": {
        name: string;
        modality: "tabular";
        subtasks: {
            type: string;
            name: string;
        }[];
    };
    "tabular-to-text": {
        name: string;
        modality: "tabular";
        subtasks: {
            type: string;
            name: string;
        }[];
        hideInModels: true;
    };
    "table-to-text": {
        name: string;
        modality: "nlp";
        hideInModels: true;
    };
    "multiple-choice": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
        hideInModels: true;
    };
    "text-ranking": {
        name: string;
        modality: "nlp";
    };
    "text-retrieval": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "nlp";
        hideInModels: true;
    };
    "time-series-forecasting": {
        name: string;
        modality: "tabular";
        subtasks: {
            type: string;
            name: string;
        }[];
    };
    "text-to-video": {
        name: string;
        modality: "cv";
    };
    "image-text-to-text": {
        name: string;
        modality: "multimodal";
    };
    "visual-question-answering": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "multimodal";
    };
    "document-question-answering": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "multimodal";
        hideInDatasets: true;
    };
    "zero-shot-image-classification": {
        name: string;
        modality: "cv";
    };
    "graph-ml": {
        name: string;
        modality: "other";
    };
    "mask-generation": {
        name: string;
        modality: "cv";
    };
    "zero-shot-object-detection": {
        name: string;
        modality: "cv";
    };
    "text-to-3d": {
        name: string;
        modality: "cv";
    };
    "image-to-3d": {
        name: string;
        modality: "cv";
    };
    "image-feature-extraction": {
        name: string;
        modality: "cv";
    };
    "video-text-to-text": {
        name: string;
        modality: "multimodal";
        hideInDatasets: false;
    };
    "keypoint-detection": {
        name: string;
        subtasks: {
            type: string;
            name: string;
        }[];
        modality: "cv";
        hideInDatasets: true;
    };
    "visual-document-retrieval": {
        name: string;
        modality: "multimodal";
    };
    "any-to-any": {
        name: string;
        modality: "multimodal";
    };
    "video-to-video": {
        name: string;
        modality: "cv";
        hideInDatasets: true;
    };
    other: {
        name: string;
        modality: "other";
        hideInModels: true;
        hideInDatasets: true;
    };
};
export type PipelineType = keyof typeof PIPELINE_DATA;
export type WidgetType = PipelineType | "conversational";
export declare const PIPELINE_TYPES: PipelineType[];
export declare const SUBTASK_TYPES: string[];
export declare const PIPELINE_TYPES_SET: Set<"other" | "text-classification" | "token-classification" | "table-question-answering" | "question-answering" | "zero-shot-classification" | "translation" | "summarization" | "feature-extraction" | "text-generation" | "fill-mask" | "sentence-similarity" | "text-to-speech" | "text-to-audio" | "automatic-speech-recognition" | "audio-to-audio" | "audio-classification" | "audio-text-to-text" | "voice-activity-detection" | "depth-estimation" | "image-classification" | "object-detection" | "image-segmentation" | "text-to-image" | "image-to-text" | "image-to-image" | "image-to-video" | "unconditional-image-generation" | "video-classification" | "reinforcement-learning" | "robotics" | "tabular-classification" | "tabular-regression" | "tabular-to-text" | "table-to-text" | "multiple-choice" | "text-ranking" | "text-retrieval" | "time-series-forecasting" | "text-to-video" | "image-text-to-text" | "visual-question-answering" | "document-question-answering" | "zero-shot-image-classification" | "graph-ml" | "mask-generation" | "zero-shot-object-detection" | "text-to-3d" | "image-to-3d" | "image-feature-extraction" | "video-text-to-text" | "keypoint-detection" | "visual-document-retrieval" | "any-to-any" | "video-to-video">;
//# sourceMappingURL=pipelines.d.ts.map