"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskData = {
    datasets: [
        {
            description: "Largest document understanding dataset.",
            id: "HuggingFaceM4/Docmatix",
        },
        {
            description: "Dataset from the 2020 DocVQA challenge. The documents are taken from the UCSF Industry Documents Library.",
            id: "eliolio/docvqa",
        },
    ],
    demo: {
        inputs: [
            {
                label: "Question",
                content: "What is the idea behind the consumer relations efficiency team?",
                type: "text",
            },
            {
                filename: "document-question-answering-input.png",
                type: "img",
            },
        ],
        outputs: [
            {
                label: "Answer",
                content: "Balance cost efficiency with quality customer service",
                type: "text",
            },
        ],
    },
    metrics: [
        {
            description: "The evaluation metric for the DocVQA challenge is the Average Normalized Levenshtein Similarity (ANLS). This metric is flexible to character regognition errors and compares the predicted answer with the ground truth answer.",
            id: "anls",
        },
        {
            description: "Exact Match is a metric based on the strict character match of the predicted answer and the right answer. For answers predicted correctly, the Exact Match will be 1. Even if only one character is different, Exact Match will be 0",
            id: "exact-match",
        },
    ],
    models: [
        {
            description: "A robust document question answering model.",
            id: "impira/layoutlm-document-qa",
        },
        {
            description: "A document question answering model specialized in invoices.",
            id: "impira/layoutlm-invoices",
        },
        {
            description: "A special model for OCR-free document question answering.",
            id: "microsoft/udop-large",
        },
        {
            description: "A powerful model for document question answering.",
            id: "google/pix2struct-docvqa-large",
        },
    ],
    spaces: [
        {
            description: "A robust document question answering application.",
            id: "impira/docquery",
        },
        {
            description: "An application that can answer questions from invoices.",
            id: "impira/invoices",
        },
        {
            description: "An application to compare different document question answering models.",
            id: "merve/compare_docvqa_models",
        },
    ],
    summary: "Document Question Answering (also known as Document Visual Question Answering) is the task of answering questions on document images. Document question answering models take a (document, question) pair as input and return an answer in natural language. Models usually rely on multi-modal features, combining text, position of words (bounding-boxes) and image.",
    widgetModels: ["impira/layoutlm-invoices"],
    youtubeId: "",
};
exports.default = taskData;
