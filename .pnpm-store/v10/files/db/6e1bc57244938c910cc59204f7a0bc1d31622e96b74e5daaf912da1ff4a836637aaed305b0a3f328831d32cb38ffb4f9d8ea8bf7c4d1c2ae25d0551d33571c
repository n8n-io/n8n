export const MODALITIES = ["multimodal", "nlp", "cv", "audio", "tabular", "rl", "other"];
export const MODALITY_LABELS = {
    multimodal: "Multimodal",
    nlp: "Natural Language Processing",
    audio: "Audio",
    cv: "Computer Vision",
    rl: "Reinforcement Learning",
    tabular: "Tabular",
    other: "Other",
};
/// Coarse-grained taxonomy of tasks
///
/// This type is used in multiple places in the Hugging Face
/// ecosystem:
///  - To determine which widget to show.
///  - To determine which endpoint of Inference Endpoints to use.
///  - As filters at the left of models and datasets page.
///
/// Note that this is sensitive to order.
/// For each domain, the order should be of decreasing specificity.
/// This will impact the default pipeline tag of a model when not
/// specified.
export const PIPELINE_DATA = {
    "text-classification": {
        name: "Text Classification",
        subtasks: [
            {
                type: "acceptability-classification",
                name: "Acceptability Classification",
            },
            {
                type: "entity-linking-classification",
                name: "Entity Linking Classification",
            },
            {
                type: "fact-checking",
                name: "Fact Checking",
            },
            {
                type: "intent-classification",
                name: "Intent Classification",
            },
            {
                type: "language-identification",
                name: "Language Identification",
            },
            {
                type: "multi-class-classification",
                name: "Multi Class Classification",
            },
            {
                type: "multi-label-classification",
                name: "Multi Label Classification",
            },
            {
                type: "multi-input-text-classification",
                name: "Multi-input Text Classification",
            },
            {
                type: "natural-language-inference",
                name: "Natural Language Inference",
            },
            {
                type: "semantic-similarity-classification",
                name: "Semantic Similarity Classification",
            },
            {
                type: "sentiment-classification",
                name: "Sentiment Classification",
            },
            {
                type: "topic-classification",
                name: "Topic Classification",
            },
            {
                type: "semantic-similarity-scoring",
                name: "Semantic Similarity Scoring",
            },
            {
                type: "sentiment-scoring",
                name: "Sentiment Scoring",
            },
            {
                type: "sentiment-analysis",
                name: "Sentiment Analysis",
            },
            {
                type: "hate-speech-detection",
                name: "Hate Speech Detection",
            },
            {
                type: "text-scoring",
                name: "Text Scoring",
            },
        ],
        modality: "nlp",
    },
    "token-classification": {
        name: "Token Classification",
        subtasks: [
            {
                type: "named-entity-recognition",
                name: "Named Entity Recognition",
            },
            {
                type: "part-of-speech",
                name: "Part of Speech",
            },
            {
                type: "parsing",
                name: "Parsing",
            },
            {
                type: "lemmatization",
                name: "Lemmatization",
            },
            {
                type: "word-sense-disambiguation",
                name: "Word Sense Disambiguation",
            },
            {
                type: "coreference-resolution",
                name: "Coreference-resolution",
            },
        ],
        modality: "nlp",
    },
    "table-question-answering": {
        name: "Table Question Answering",
        modality: "nlp",
    },
    "question-answering": {
        name: "Question Answering",
        subtasks: [
            {
                type: "extractive-qa",
                name: "Extractive QA",
            },
            {
                type: "open-domain-qa",
                name: "Open Domain QA",
            },
            {
                type: "closed-domain-qa",
                name: "Closed Domain QA",
            },
        ],
        modality: "nlp",
    },
    "zero-shot-classification": {
        name: "Zero-Shot Classification",
        modality: "nlp",
    },
    translation: {
        name: "Translation",
        modality: "nlp",
    },
    summarization: {
        name: "Summarization",
        subtasks: [
            {
                type: "news-articles-summarization",
                name: "News Articles Summarization",
            },
            {
                type: "news-articles-headline-generation",
                name: "News Articles Headline Generation",
            },
        ],
        modality: "nlp",
    },
    "feature-extraction": {
        name: "Feature Extraction",
        modality: "nlp",
    },
    "text-generation": {
        name: "Text Generation",
        subtasks: [
            {
                type: "dialogue-modeling",
                name: "Dialogue Modeling",
            },
            {
                type: "dialogue-generation",
                name: "Dialogue Generation",
            },
            {
                type: "conversational",
                name: "Conversational",
            },
            {
                type: "language-modeling",
                name: "Language Modeling",
            },
            {
                type: "text-simplification",
                name: "Text simplification",
            },
            {
                type: "explanation-generation",
                name: "Explanation Generation",
            },
            {
                type: "abstractive-qa",
                name: "Abstractive QA",
            },
            {
                type: "open-domain-abstractive-qa",
                name: "Open Domain Abstractive QA",
            },
            {
                type: "closed-domain-qa",
                name: "Closed Domain QA",
            },
            {
                type: "open-book-qa",
                name: "Open Book QA",
            },
            {
                type: "closed-book-qa",
                name: "Closed Book QA",
            },
            {
                type: "text2text-generation",
                name: "Text2Text Generation",
            },
        ],
        modality: "nlp",
    },
    "fill-mask": {
        name: "Fill-Mask",
        subtasks: [
            {
                type: "slot-filling",
                name: "Slot Filling",
            },
            {
                type: "masked-language-modeling",
                name: "Masked Language Modeling",
            },
        ],
        modality: "nlp",
    },
    "sentence-similarity": {
        name: "Sentence Similarity",
        modality: "nlp",
    },
    "text-to-speech": {
        name: "Text-to-Speech",
        modality: "audio",
    },
    "text-to-audio": {
        name: "Text-to-Audio",
        modality: "audio",
    },
    "automatic-speech-recognition": {
        name: "Automatic Speech Recognition",
        modality: "audio",
    },
    "audio-to-audio": {
        name: "Audio-to-Audio",
        modality: "audio",
    },
    "audio-classification": {
        name: "Audio Classification",
        subtasks: [
            {
                type: "keyword-spotting",
                name: "Keyword Spotting",
            },
            {
                type: "speaker-identification",
                name: "Speaker Identification",
            },
            {
                type: "audio-intent-classification",
                name: "Audio Intent Classification",
            },
            {
                type: "audio-emotion-recognition",
                name: "Audio Emotion Recognition",
            },
            {
                type: "audio-language-identification",
                name: "Audio Language Identification",
            },
        ],
        modality: "audio",
    },
    "audio-text-to-text": {
        name: "Audio-Text-to-Text",
        modality: "multimodal",
        hideInDatasets: true,
    },
    "voice-activity-detection": {
        name: "Voice Activity Detection",
        modality: "audio",
    },
    "depth-estimation": {
        name: "Depth Estimation",
        modality: "cv",
    },
    "image-classification": {
        name: "Image Classification",
        subtasks: [
            {
                type: "multi-label-image-classification",
                name: "Multi Label Image Classification",
            },
            {
                type: "multi-class-image-classification",
                name: "Multi Class Image Classification",
            },
        ],
        modality: "cv",
    },
    "object-detection": {
        name: "Object Detection",
        subtasks: [
            {
                type: "face-detection",
                name: "Face Detection",
            },
            {
                type: "vehicle-detection",
                name: "Vehicle Detection",
            },
        ],
        modality: "cv",
    },
    "image-segmentation": {
        name: "Image Segmentation",
        subtasks: [
            {
                type: "instance-segmentation",
                name: "Instance Segmentation",
            },
            {
                type: "semantic-segmentation",
                name: "Semantic Segmentation",
            },
            {
                type: "panoptic-segmentation",
                name: "Panoptic Segmentation",
            },
        ],
        modality: "cv",
    },
    "text-to-image": {
        name: "Text-to-Image",
        modality: "cv",
    },
    "image-to-text": {
        name: "Image-to-Text",
        subtasks: [
            {
                type: "image-captioning",
                name: "Image Captioning",
            },
        ],
        modality: "cv",
    },
    "image-to-image": {
        name: "Image-to-Image",
        subtasks: [
            {
                type: "image-inpainting",
                name: "Image Inpainting",
            },
            {
                type: "image-colorization",
                name: "Image Colorization",
            },
            {
                type: "super-resolution",
                name: "Super Resolution",
            },
        ],
        modality: "cv",
    },
    "image-to-video": {
        name: "Image-to-Video",
        modality: "cv",
    },
    "unconditional-image-generation": {
        name: "Unconditional Image Generation",
        modality: "cv",
    },
    "video-classification": {
        name: "Video Classification",
        modality: "cv",
    },
    "reinforcement-learning": {
        name: "Reinforcement Learning",
        modality: "rl",
    },
    robotics: {
        name: "Robotics",
        modality: "rl",
        subtasks: [
            {
                type: "grasping",
                name: "Grasping",
            },
            {
                type: "task-planning",
                name: "Task Planning",
            },
        ],
    },
    "tabular-classification": {
        name: "Tabular Classification",
        modality: "tabular",
        subtasks: [
            {
                type: "tabular-multi-class-classification",
                name: "Tabular Multi Class Classification",
            },
            {
                type: "tabular-multi-label-classification",
                name: "Tabular Multi Label Classification",
            },
        ],
    },
    "tabular-regression": {
        name: "Tabular Regression",
        modality: "tabular",
        subtasks: [
            {
                type: "tabular-single-column-regression",
                name: "Tabular Single Column Regression",
            },
        ],
    },
    "tabular-to-text": {
        name: "Tabular to Text",
        modality: "tabular",
        subtasks: [
            {
                type: "rdf-to-text",
                name: "RDF to text",
            },
        ],
        hideInModels: true,
    },
    "table-to-text": {
        name: "Table to Text",
        modality: "nlp",
        hideInModels: true,
    },
    "multiple-choice": {
        name: "Multiple Choice",
        subtasks: [
            {
                type: "multiple-choice-qa",
                name: "Multiple Choice QA",
            },
            {
                type: "multiple-choice-coreference-resolution",
                name: "Multiple Choice Coreference Resolution",
            },
        ],
        modality: "nlp",
        hideInModels: true,
    },
    "text-ranking": {
        name: "Text Ranking",
        modality: "nlp",
    },
    "text-retrieval": {
        name: "Text Retrieval",
        subtasks: [
            {
                type: "document-retrieval",
                name: "Document Retrieval",
            },
            {
                type: "utterance-retrieval",
                name: "Utterance Retrieval",
            },
            {
                type: "entity-linking-retrieval",
                name: "Entity Linking Retrieval",
            },
            {
                type: "fact-checking-retrieval",
                name: "Fact Checking Retrieval",
            },
        ],
        modality: "nlp",
        hideInModels: true,
    },
    "time-series-forecasting": {
        name: "Time Series Forecasting",
        modality: "tabular",
        subtasks: [
            {
                type: "univariate-time-series-forecasting",
                name: "Univariate Time Series Forecasting",
            },
            {
                type: "multivariate-time-series-forecasting",
                name: "Multivariate Time Series Forecasting",
            },
        ],
    },
    "text-to-video": {
        name: "Text-to-Video",
        modality: "cv",
    },
    "image-text-to-text": {
        name: "Image-Text-to-Text",
        modality: "multimodal",
    },
    "visual-question-answering": {
        name: "Visual Question Answering",
        subtasks: [
            {
                type: "visual-question-answering",
                name: "Visual Question Answering",
            },
        ],
        modality: "multimodal",
    },
    "document-question-answering": {
        name: "Document Question Answering",
        subtasks: [
            {
                type: "document-question-answering",
                name: "Document Question Answering",
            },
        ],
        modality: "multimodal",
        hideInDatasets: true,
    },
    "zero-shot-image-classification": {
        name: "Zero-Shot Image Classification",
        modality: "cv",
    },
    "graph-ml": {
        name: "Graph Machine Learning",
        modality: "other",
    },
    "mask-generation": {
        name: "Mask Generation",
        modality: "cv",
    },
    "zero-shot-object-detection": {
        name: "Zero-Shot Object Detection",
        modality: "cv",
    },
    "text-to-3d": {
        name: "Text-to-3D",
        modality: "cv",
    },
    "image-to-3d": {
        name: "Image-to-3D",
        modality: "cv",
    },
    "image-feature-extraction": {
        name: "Image Feature Extraction",
        modality: "cv",
    },
    "video-text-to-text": {
        name: "Video-Text-to-Text",
        modality: "multimodal",
        hideInDatasets: false,
    },
    "keypoint-detection": {
        name: "Keypoint Detection",
        subtasks: [
            {
                type: "pose-estimation",
                name: "Pose Estimation",
            },
        ],
        modality: "cv",
        hideInDatasets: true,
    },
    "visual-document-retrieval": {
        name: "Visual Document Retrieval",
        modality: "multimodal",
    },
    "any-to-any": {
        name: "Any-to-Any",
        modality: "multimodal",
    },
    "video-to-video": {
        name: "Video-to-Video",
        modality: "cv",
        hideInDatasets: true,
    },
    other: {
        name: "Other",
        modality: "other",
        hideInModels: true,
        hideInDatasets: true,
    },
};
export const PIPELINE_TYPES = Object.keys(PIPELINE_DATA);
export const SUBTASK_TYPES = Object.values(PIPELINE_DATA)
    .flatMap((data) => ("subtasks" in data ? data.subtasks : []))
    .map((s) => s.type);
export const PIPELINE_TYPES_SET = new Set(PIPELINE_TYPES);
