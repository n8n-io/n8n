import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A large dataset used to train visual document retrieval models.",
			id: "vidore/colpali_train_set",
		},
	],
	demo: {
		inputs: [
			{
				filename: "input.png",
				type: "img",
			},
			{
				label: "Question",
				content: "Is the model in this paper the fastest for inference?",
				type: "text",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "Page 10",
						score: 0.7,
					},
					{
						label: "Page 11",
						score: 0.06,
					},
					{
						label: "Page 9",
						score: 0.003,
					},
				],
			},
		],
	},
	isPlaceholder: false,
	metrics: [
		{
			description: "NDCG@k scores ranked recommendation lists for top-k results. 0 is the worst, 1 is the best.",
			id: "Normalized Discounted Cumulative Gain at K",
		},
	],
	models: [
		{
			description: "Very accurate visual document retrieval model for multilingual queries and documents.",
			id: "vidore/colqwen2-v1.0",
		},
		{
			description: "Very fast and efficient visual document retrieval model that works on five languages.",
			id: "marco/mcdse-2b-v1",
		},
	],
	spaces: [
		{
			description: "A leaderboard of visual document retrieval models.",
			id: "vidore/vidore-leaderboard",
		},
	],
	summary:
		"Visual document retrieval is the task of searching for relevant image-based documents, such as PDFs. These models take a text query and multiple documents as input and return the top-most relevant documents and relevancy scores as output.",
	widgetModels: [""],
	youtubeId: "",
};

export default taskData;
