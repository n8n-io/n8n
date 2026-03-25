import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	datasets: [
		{
			description: "A widely used dataset used to benchmark multiple variants of text classification.",
			id: "nyu-mll/glue",
		},
		{
			description:
				"The Multi-Genre Natural Language Inference (MultiNLI) corpus is a crowd-sourced collection of 433k sentence pairs annotated with textual entailment information.",
			id: "nyu-mll/multi_nli",
		},
		{
			description:
				"FEVER is a publicly available dataset for fact extraction and verification against textual sources.",
			id: "fever/fever",
		},
	],
	demo: {
		inputs: [
			{
				label: "Text Input",
				content: "Dune is the best movie ever.",
				type: "text",
			},
			{
				label: "Candidate Labels",
				content: "CINEMA, ART, MUSIC",
				type: "text",
			},
		],
		outputs: [
			{
				type: "chart",
				data: [
					{
						label: "CINEMA",
						score: 0.9,
					},
					{
						label: "ART",
						score: 0.1,
					},
					{
						label: "MUSIC",
						score: 0.0,
					},
				],
			},
		],
	},
	metrics: [],
	models: [
		{
			description: "Powerful zero-shot text classification model.",
			id: "facebook/bart-large-mnli",
		},
		{
			description: "Cutting-edge zero-shot multilingual text classification model.",
			id: "MoritzLaurer/ModernBERT-large-zeroshot-v2.0",
		},
		{
			description: "Zero-shot text classification model that can be used for topic and sentiment classification.",
			id: "knowledgator/gliclass-modern-base-v2.0-init",
		},
	],
	spaces: [],
	summary:
		"Zero-shot text classification is a task in natural language processing where a model is trained on a set of labeled examples but is then able to classify new examples from previously unseen classes.",
	widgetModels: ["facebook/bart-large-mnli"],
};

export default taskData;
