"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskData = {
    datasets: [
        {
            description: "A benchmark dataset for reference image controlled video generation.",
            id: "ali-vilab/VACE-Benchmark",
        },
        {
            description: "A dataset of video generation style preferences.",
            id: "Rapidata/sora-video-generation-style-likert-scoring",
        },
        {
            description: "A dataset with videos and captions throughout the videos.",
            id: "BestWishYsh/ChronoMagic",
        },
    ],
    demo: {
        inputs: [
            {
                filename: "image-to-video-input.jpg",
                type: "img",
            },
            {
                label: "Optional Text Prompt",
                content: "This penguin is dancing",
                type: "text",
            },
        ],
        outputs: [
            {
                filename: "image-to-video-output.gif",
                type: "img",
            },
        ],
    },
    metrics: [
        {
            description: "Fréchet Video Distance (FVD) measures the perceptual similarity between the distributions of generated videos and a set of real videos, assessing overall visual quality and temporal coherence of the video generated from an input image.",
            id: "fvd",
        },
        {
            description: "CLIP Score measures the semantic similarity between a textual prompt (if provided alongside the input image) and the generated video frames. It evaluates how well the video's generated content and motion align with the textual description, conditioned on the initial image.",
            id: "clip_score",
        },
        {
            description: "First Frame Fidelity, often measured using LPIPS (Learned Perceptual Image Patch Similarity), PSNR, or SSIM, quantifies how closely the first frame of the generated video matches the input conditioning image.",
            id: "lpips",
        },
        {
            description: "Identity Preservation Score measures the consistency of identity (e.g., a person's face or a specific object's characteristics) between the input image and throughout the generated video frames, often calculated using features from specialized models like face recognition (e.g., ArcFace) or re-identification models.",
            id: "identity_preservation",
        },
        {
            description: "Motion Score evaluates the quality, realism, and temporal consistency of motion in the video generated from a static image. This can be based on optical flow analysis (e.g., smoothness, magnitude), consistency of object trajectories, or specific motion plausibility assessments.",
            id: "motion_score",
        },
    ],
    models: [
        {
            description: "LTX-Video, a 13B parameter model for high quality video generation",
            id: "Lightricks/LTX-Video-0.9.7-dev",
        },
        {
            description: "A 14B parameter model for reference image controlled video generation",
            id: "Wan-AI/Wan2.1-VACE-14B",
        },
        {
            description: "An image-to-video generation model using FramePack F1 methodology with Hunyuan-DiT architecture",
            id: "lllyasviel/FramePack_F1_I2V_HY_20250503",
        },
        {
            description: "A distilled version of the LTX-Video-0.9.7-dev model for faster inference",
            id: "Lightricks/LTX-Video-0.9.7-distilled",
        },
        {
            description: "An image-to-video generation model by Skywork AI, 14B parameters, producing 720p videos.",
            id: "Skywork/SkyReels-V2-I2V-14B-720P",
        },
        {
            description: "Image-to-video variant of Tencent's HunyuanVideo.",
            id: "tencent/HunyuanVideo-I2V",
        },
        {
            description: "A 14B parameter model for 720p image-to-video generation by Wan-AI.",
            id: "Wan-AI/Wan2.1-I2V-14B-720P",
        },
        {
            description: "A Diffusers version of the Wan2.1-I2V-14B-720P model for 720p image-to-video generation.",
            id: "Wan-AI/Wan2.1-I2V-14B-720P-Diffusers",
        },
    ],
    spaces: [
        {
            description: "An application to generate videos fast.",
            id: "Lightricks/ltx-video-distilled",
        },
        {
            description: "Generate videos with the FramePack-F1",
            id: "linoyts/FramePack-F1",
        },
        {
            description: "Generate videos with the FramePack",
            id: "lisonallen/framepack-i2v",
        },
        {
            description: "Wan2.1 with CausVid LoRA",
            id: "multimodalart/wan2-1-fast",
        },
        {
            description: "A demo for Stable Video Diffusion",
            id: "multimodalart/stable-video-diffusion",
        },
    ],
    summary: "Image-to-video models take a still image as input and generate a video. These models can be guided by text prompts to influence the content and style of the output video.",
    widgetModels: [],
    youtubeId: undefined,
};
exports.default = taskData;
