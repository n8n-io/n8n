import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A widely used dataset containing questions (with answers) about images.",
			id: "Graphcore/vqa",
		},
		{
			description: "A dataset to benchmark visual reasoning based on text in images.",
			id: "facebook/textvqa",
		},
	],
	demo: {
		inputs: [
			{
				filename: "elephant.jpeg",
				type: "img",
			},
			{
				label: "Question",
				content: "What is in this image?",
				type: "text",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "elephant",
						score: 0.97,
					},
					{
						label: "elephants",
						score: 0.06,
					},
					{
						label: "animal",
						score: 0.003,
					},
				],
			},
		],
	},
	isPlaceholder: false,
	metrics: [
		{
			description: "",
			id: "accuracy",
		},
		{
			description:
				"Measures how much a predicted answer differs from the ground truth based on the difference in their semantic meaning.",
			id: "wu-palmer similarity",
		},
	],
	models: [
		{
			description: "A visual question answering model trained to convert charts and plots to text.",
			id: "google/deplot",
		},
		{
			description:
				"A visual question answering model trained for mathematical reasoning and chart derendering from images.",
			id: "google/matcha-base",
		},
		{
			description: "A strong visual question answering that answers questions from book covers.",
			id: "google/pix2struct-ocrvqa-large",
		},
	],
	spaces: [
		{
			description: "An application that compares visual question answering models across different tasks.",
			id: "merve/pix2struct",
		},
		{
			description: "An application that can answer questions based on images.",
			id: "nielsr/vilt-vqa",
		},
		{
			description: "An application that can caption images and answer questions about a given image. ",
			id: "Salesforce/BLIP",
		},
		{
			description: "An application that can caption images and answer questions about a given image. ",
			id: "vumichien/Img2Prompt",
		},
	],
	summary:
		"Visual Question Answering is the task of answering open-ended questions based on an image. They output natural language responses to natural language questions.",
	widgetModels: ["dandelin/vilt-b32-finetuned-vqa"],
	youtubeId: "",
};

export default taskData;
