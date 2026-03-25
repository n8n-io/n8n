import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "Bing queries with relevant passages from various web sources.",
			id: "microsoft/ms_marco",
		},
	],
	demo: {
		inputs: [
			{
				label: "Source sentence",
				content: "Machine learning is so easy.",
				type: "text",
			},
			{
				label: "Sentences to compare to",
				content: "Deep learning is so straightforward.",
				type: "text",
			},
			{
				label: "",
				content: "This is so difficult, like rocket science.",
				type: "text",
			},
			{
				label: "",
				content: "I can't believe how much I struggled with this.",
				type: "text",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "Deep learning is so straightforward.",
						score: 2.2006407,
					},
					{
						label: "This is so difficult, like rocket science.",
						score: -6.2634873,
					},
					{
						label: "I can't believe how much I struggled with this.",
						score: -10.251488,
					},
				],
			},
		],
	},
	metrics: [
		{
			description:
				"Discounted Cumulative Gain (DCG) measures the gain, or usefulness, of search results discounted by their position. The normalization is done by dividing the DCG by the ideal DCG, which is the DCG of the perfect ranking.",
			id: "Normalized Discounted Cumulative Gain",
		},
		{
			description:
				"Reciprocal Rank is a measure used to rank the relevancy of documents given a set of documents. Reciprocal Rank is the reciprocal of the rank of the document retrieved, meaning, if the rank is 3, the Reciprocal Rank is 0.33. If the rank is 1, the Reciprocal Rank is 1",
			id: "Mean Reciprocal Rank",
		},
		{
			description:
				"Mean Average Precision (mAP) is the overall average of the Average Precision (AP) values, where AP is the Area Under the PR Curve (AUC-PR)",
			id: "Mean Average Precision",
		},
	],
	models: [
		{
			description: "An extremely efficient text ranking model trained on a web search dataset.",
			id: "cross-encoder/ms-marco-MiniLM-L6-v2",
		},
		{
			description: "A strong multilingual text reranker model.",
			id: "Alibaba-NLP/gte-multilingual-reranker-base",
		},
		{
			description: "An efficient text ranking model that punches above its weight.",
			id: "Alibaba-NLP/gte-reranker-modernbert-base",
		},
	],
	spaces: [],
	summary:
		"Text Ranking is the task of ranking a set of texts based on their relevance to a query. Text ranking models are trained on large datasets of queries and relevant documents to learn how to rank documents based on their relevance to the query. This task is particularly useful for search engines and information retrieval systems.",
	widgetModels: ["cross-encoder/ms-marco-MiniLM-L6-v2"],
	youtubeId: "",
};

export default taskData;
