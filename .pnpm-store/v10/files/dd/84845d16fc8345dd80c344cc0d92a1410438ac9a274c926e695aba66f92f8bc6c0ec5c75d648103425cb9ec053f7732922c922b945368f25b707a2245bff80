"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskData = {
    datasets: [
        {
            description: "Synthetic dataset, for image relighting",
            id: "VIDIT",
        },
        {
            description: "Multiple images of celebrities, used for facial expression translation",
            id: "huggan/CelebA-faces",
        },
        {
            description: "12M image-caption pairs.",
            id: "Spawning/PD12M",
        },
    ],
    demo: {
        inputs: [
            {
                filename: "image-to-image-input.jpeg",
                type: "img",
            },
        ],
        outputs: [
            {
                filename: "image-to-image-output.png",
                type: "img",
            },
        ],
    },
    isPlaceholder: false,
    metrics: [
        {
            description: "Peak Signal to Noise Ratio (PSNR) is an approximation of the human perception, considering the ratio of the absolute intensity with respect to the variations. Measured in dB, a high value indicates a high fidelity.",
            id: "PSNR",
        },
        {
            description: "Structural Similarity Index (SSIM) is a perceptual metric which compares the luminance, contrast and structure of two images. The values of SSIM range between -1 and 1, and higher values indicate closer resemblance to the original image.",
            id: "SSIM",
        },
        {
            description: "Inception Score (IS) is an analysis of the labels predicted by an image classification model when presented with a sample of the generated images.",
            id: "IS",
        },
    ],
    models: [
        {
            description: "An image-to-image model to improve image resolution.",
            id: "fal/AuraSR-v2",
        },
        {
            description: "A model that increases the resolution of an image.",
            id: "keras-io/super-resolution",
        },
        {
            description: "A model for applying edits to images through image controls.",
            id: "Yuanshi/OminiControl",
        },
        {
            description: "A model that generates images based on segments in the input image and the text prompt.",
            id: "mfidabel/controlnet-segment-anything",
        },
        {
            description: "Strong model for inpainting and outpainting.",
            id: "black-forest-labs/FLUX.1-Fill-dev",
        },
        {
            description: "Strong model for image editing using depth maps.",
            id: "black-forest-labs/FLUX.1-Depth-dev-lora",
        },
    ],
    spaces: [
        {
            description: "Image enhancer application for low light.",
            id: "keras-io/low-light-image-enhancement",
        },
        {
            description: "Style transfer application.",
            id: "keras-io/neural-style-transfer",
        },
        {
            description: "An application that generates images based on segment control.",
            id: "mfidabel/controlnet-segment-anything",
        },
        {
            description: "Image generation application that takes image control and text prompt.",
            id: "hysts/ControlNet",
        },
        {
            description: "Colorize any image using this app.",
            id: "ioclab/brightness-controlnet",
        },
        {
            description: "Edit images with instructions.",
            id: "timbrooks/instruct-pix2pix",
        },
    ],
    summary: "Image-to-image is the task of transforming an input image through a variety of possible manipulations and enhancements, such as super-resolution, image inpainting, colorization, and more.",
    widgetModels: ["stabilityai/stable-diffusion-2-inpainting"],
    youtubeId: "",
};
exports.default = taskData;
