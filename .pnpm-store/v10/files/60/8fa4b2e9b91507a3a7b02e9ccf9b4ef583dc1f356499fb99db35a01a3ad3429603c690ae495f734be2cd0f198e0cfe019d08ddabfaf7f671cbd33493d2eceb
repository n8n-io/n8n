import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A dataset containing audio conversations with question–answer pairs.",
			id: "nvidia/AF-Think",
		},
		{
			description: "A more advanced and comprehensive dataset that contains characteristics of the audio as well",
			id: "tsinghua-ee/QualiSpeech",
		},
	],
	demo: {
		inputs: [
			{
				filename: "audio.wav",
				type: "audio",
			},
			{
				label: "Text Prompt",
				content: "What is the gender of the speaker?",
				type: "text",
			},
		],
		outputs: [
			{
				label: "Generated Text",
				content: "The gender of the speaker is female.",
				type: "text",
			},
		],
	},
	metrics: [],
	models: [
		{
			description:
				"A lightweight model that has capabilities of taking both audio and text as inputs and generating responses.",
			id: "fixie-ai/ultravox-v0_5-llama-3_2-1b",
		},
		{
			description: "A multimodal model that supports voice chat and audio analysis.",
			id: "Qwen/Qwen2-Audio-7B-Instruct",
		},
		{
			description: "A model for audio understanding, speech translation, and transcription.",
			id: "mistralai/Voxtral-Small-24B-2507",
		},
		{
			description: "A new model capable of audio question answering and reasoning.",
			id: "nvidia/audio-flamingo-3",
		},
	],
	spaces: [
		{
			description: "A space that takes input as both audio and text and generates answers.",
			id: "iamomtiwari/ATTT",
		},
		{
			description: "A web application that demonstrates chatting with the Qwen2Audio Model.",
			id: "freddyaboulton/talk-to-qwen-webrtc",
		},
	],
	summary:
		"Audio-text-to-text models take both an audio clip and a text prompt as input, and generate natural language text as output. These models can answer questions about spoken content, summarize meetings, analyze music, or interpret speech beyond simple transcription. They are useful for applications that combine speech understanding with reasoning or conversation.",
	widgetModels: [],
	youtubeId: "",
};

export default taskData;
