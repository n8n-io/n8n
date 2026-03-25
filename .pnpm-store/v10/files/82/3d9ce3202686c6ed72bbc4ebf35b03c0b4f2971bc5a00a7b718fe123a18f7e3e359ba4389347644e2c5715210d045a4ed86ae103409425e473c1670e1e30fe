import type { TaskDataCustom } from "../index.js";

const taskData: TaskDataCustom = {
	canonicalId: "text-generation",
	datasets: [
		{
			description: "A dataset of copyright-free books translated into 16 different languages.",
			id: "Helsinki-NLP/opus_books",
		},
		{
			description:
				"An example of translation between programming languages. This dataset consists of functions in Java and C#.",
			id: "google/code_x_glue_cc_code_to_code_trans",
		},
	],
	demo: {
		inputs: [
			{
				label: "Input",
				content: "My name is Omar and I live in Zürich.",
				type: "text",
			},
		],
		outputs: [
			{
				label: "Output",
				content: "Mein Name ist Omar und ich wohne in Zürich.",
				type: "text",
			},
		],
	},
	metrics: [
		{
			description:
				"BLEU score is calculated by counting the number of shared single or subsequent tokens between the generated sequence and the reference. Subsequent n tokens are called “n-grams”. Unigram refers to a single token while bi-gram refers to token pairs and n-grams refer to n subsequent tokens. The score ranges from 0 to 1, where 1 means the translation perfectly matched and 0 did not match at all",
			id: "bleu",
		},
		{
			description: "",
			id: "sacrebleu",
		},
	],
	models: [
		{
			description:
				"Very powerful model that can translate many languages between each other, especially low-resource languages.",
			id: "facebook/nllb-200-1.3B",
		},
		{
			description:
				"A general-purpose Transformer that can be used to translate from English to German, French, or Romanian.",
			id: "google-t5/t5-base",
		},
	],
	spaces: [
		{
			description: "An application that can translate between 100 languages.",
			id: "Iker/Translate-100-languages",
		},
		{
			description: "An application that can translate between many languages.",
			id: "Geonmo/nllb-translation-demo",
		},
	],
	summary: "Translation is the task of converting text from one language to another.",
	widgetModels: ["facebook/mbart-large-50-many-to-many-mmt"],
	youtubeId: "1JvfrvZgi6c",
};

export default taskData;
