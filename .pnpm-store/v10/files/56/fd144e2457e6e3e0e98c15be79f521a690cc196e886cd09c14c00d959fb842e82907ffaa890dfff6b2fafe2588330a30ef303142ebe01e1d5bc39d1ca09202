import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A widely used dataset used to benchmark multiple variants of text classification.",
			id: "nyu-mll/glue",
		},
		{
			description: "A text classification dataset used to benchmark natural language inference models",
			id: "stanfordnlp/snli",
		},
	],
	demo: {
		inputs: [
			{
				label: "Input",
				content: "I love Hugging Face!",
				type: "text",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "POSITIVE",
						score: 0.9,
					},
					{
						label: "NEUTRAL",
						score: 0.1,
					},
					{
						label: "NEGATIVE",
						score: 0.0,
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
			description:
				"The F1 metric is the harmonic mean of the precision and recall. It can be calculated as: F1 = 2 * (precision * recall) / (precision + recall)",
			id: "f1",
		},
	],
	models: [
		{
			description: "A robust model trained for sentiment analysis.",
			id: "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
		},
		{
			description: "A sentiment analysis model specialized in financial sentiment.",
			id: "ProsusAI/finbert",
		},
		{
			description: "A sentiment analysis model specialized in analyzing tweets.",
			id: "cardiffnlp/twitter-roberta-base-sentiment-latest",
		},
		{
			description: "A model that can classify languages.",
			id: "papluca/xlm-roberta-base-language-detection",
		},
		{
			description: "A model that can classify text generation attacks.",
			id: "meta-llama/Prompt-Guard-86M",
		},
	],
	spaces: [
		{
			description: "An application that can classify financial sentiment.",
			id: "IoannisTr/Tech_Stocks_Trading_Assistant",
		},
		{
			description: "A dashboard that contains various text classification tasks.",
			id: "miesnerjacob/Multi-task-NLP",
		},
		{
			description: "An application that analyzes user reviews in healthcare.",
			id: "spacy/healthsea-demo",
		},
	],
	summary:
		"Text Classification is the task of assigning a label or class to a given text. Some use cases are sentiment analysis, natural language inference, and assessing grammatical correctness.",
	widgetModels: ["distilbert/distilbert-base-uncased-finetuned-sst-2-english"],
	youtubeId: "leNG9fN9FQU",
};

export default taskData;
