import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "Multiple-choice questions and answers about videos.",
			id: "lmms-lab/Video-MME",
		},
		{
			description: "A dataset of instructions and question-answer pairs about videos.",
			id: "lmms-lab/VideoChatGPT",
		},
		{
			description: "Large video understanding dataset.",
			id: "HuggingFaceFV/finevideo",
		},
	],
	demo: {
		inputs: [
			{
				filename: "video-text-to-text-input.gif",
				type: "img",
			},
			{
				label: "Text Prompt",
				content: "What is happening in this video?",
				type: "text",
			},
		],
		outputs: [
			{
				label: "Answer",
				content:
					"The video shows a series of images showing a fountain with water jets and a variety of colorful flowers and butterflies in the background.",
				type: "text",
			},
		],
	},
	metrics: [],
	models: [
		{
			description: "A robust video-text-to-text model.",
			id: "Vision-CAIR/LongVU_Qwen2_7B",
		},
		{
			description: "Strong video-text-to-text model with reasoning capabilities.",
			id: "GoodiesHere/Apollo-LMMs-Apollo-7B-t32",
		},
		{
			description: "Strong video-text-to-text model.",
			id: "HuggingFaceTB/SmolVLM2-2.2B-Instruct",
		},
	],
	spaces: [
		{
			description: "An application to chat with a video-text-to-text model.",
			id: "llava-hf/video-llava",
		},
		{
			description: "A leaderboard for various video-text-to-text models.",
			id: "opencompass/openvlm_video_leaderboard",
		},
		{
			description: "An application to generate highlights from a video.",
			id: "HuggingFaceTB/SmolVLM2-HighlightGenerator",
		},
	],
	summary:
		"Video-text-to-text models take in a video and a text prompt and output text. These models are also called video-language models.",
	widgetModels: [""],
	youtubeId: "",
};

export default taskData;
