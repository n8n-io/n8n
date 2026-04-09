"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskData = {
    datasets: [],
    demo: {
        inputs: [
            {
                filename: "zero-shot-object-detection-input.jpg",
                type: "img",
            },
            {
                label: "Classes",
                content: "cat, dog, bird",
                type: "text",
            },
        ],
        outputs: [
            {
                filename: "zero-shot-object-detection-output.jpg",
                type: "img",
            },
        ],
    },
    metrics: [
        {
            description: "The Average Precision (AP) metric is the Area Under the PR Curve (AUC-PR). It is calculated for each class separately",
            id: "Average Precision",
        },
        {
            description: "The Mean Average Precision (mAP) metric is the overall average of the AP values",
            id: "Mean Average Precision",
        },
        {
            description: "The APα metric is the Average Precision at the IoU threshold of a α value, for example, AP50 and AP75",
            id: "APα",
        },
    ],
    models: [
        {
            description: "Solid zero-shot object detection model.",
            id: "openmmlab-community/mm_grounding_dino_large_all",
        },
        {
            description: "Cutting-edge zero-shot object detection model.",
            id: "fushh7/LLMDet",
        },
    ],
    spaces: [
        {
            description: "A demo to compare different zero-shot object detection models per output and latency.",
            id: "ariG23498/zero-shot-od",
        },
        {
            description: "A demo that combines a zero-shot object detection and mask generation model for zero-shot segmentation.",
            id: "merve/OWLSAM",
        },
    ],
    summary: "Zero-shot object detection is a computer vision task to detect objects and their classes in images, without any prior training or knowledge of the classes. Zero-shot object detection models receive an image as input, as well as a list of candidate classes, and output the bounding boxes and labels where the objects have been detected.",
    widgetModels: [],
    youtubeId: "",
};
exports.default = taskData;
