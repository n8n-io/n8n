import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			// TODO write proper description
			description: "Benchmark dataset used for video classification with videos that belong to 400 classes.",
			id: "kinetics400",
		},
	],
	demo: {
		inputs: [
			{
				filename: "video-classification-input.gif",
				type: "img",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "Playing Guitar",
						score: 0.514,
					},
					{
						label: "Playing Tennis",
						score: 0.193,
					},
					{
						label: "Cooking",
						score: 0.068,
					},
				],
			},
		],
	},
	metrics: [
		{
			description: "",
			id: "accuracy",
		},
		{
			description: "",
			id: "recall",
		},
		{
			description: "",
			id: "precision",
		},
		{
			description: "",
			id: "f1",
		},
	],
	models: [
		{
			// TO DO: write description
			description: "Strong Video Classification model trained on the Kinetics 400 dataset.",
			id: "google/vivit-b-16x2-kinetics400",
		},
		{
			// TO DO: write description
			description: "Strong Video Classification model trained on the Kinetics 400 dataset.",
			id: "microsoft/xclip-base-patch32",
		},
	],
	spaces: [
		{
			description: "An application that classifies video at different timestamps.",
			id: "nateraw/lavila",
		},
		{
			description: "An application that classifies video.",
			id: "fcakyon/video-classification",
		},
	],
	summary:
		"Video classification is the task of assigning a label or class to an entire video. Videos are expected to have only one class for each video. Video classification models take a video as input and return a prediction about which class the video belongs to.",
	widgetModels: [],
	youtubeId: "",
};

export default taskData;
