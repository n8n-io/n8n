/**
 * See default-widget-inputs.ts for the default widget inputs, this files only contains the types
 */

import type { ChatCompletionInputMessage } from "./tasks/index.js";

type TableData = Record<string, (string | number)[]>;

//#region outputs
export type WidgetExampleOutputLabels = Array<{ label: string; score: number }>;
export interface WidgetExampleOutputAnswerScore {
	answer: string;
	score: number;
}
export interface WidgetExampleOutputText {
	text: string;
}
export interface WidgetExampleOutputUrl {
	url: string;
}

export type WidgetExampleOutput =
	| WidgetExampleOutputLabels
	| WidgetExampleOutputAnswerScore
	| WidgetExampleOutputText
	| WidgetExampleOutputUrl;
//#endregion

export interface WidgetExampleBase<TOutput> {
	example_title?: string;
	group?: string;
	/**
	 * Potential overrides to API parameters for this specific example
	 * (takes precedences over the model card metadata's inference.parameters)
	 */
	parameters?: {
		/// token-classification
		aggregation_strategy?: string;
		/// text-generation
		top_k?: number;
		top_p?: number;
		temperature?: number;
		max_new_tokens?: number;
		do_sample?: boolean;
		/// text-to-image
		negative_prompt?: string;
		guidance_scale?: number;
		num_inference_steps?: number;
	};
	/**
	 * Optional output
	 */
	output?: TOutput;
}

export interface WidgetExampleChatInput<TOutput = WidgetExampleOutput> extends WidgetExampleBase<TOutput> {
	messages: ChatCompletionInputMessage[];
}

export interface WidgetExampleTextInput<TOutput = WidgetExampleOutput> extends WidgetExampleBase<TOutput> {
	text: string;
}

export interface WidgetExampleTextAndContextInput<TOutput = WidgetExampleOutput>
	extends WidgetExampleTextInput<TOutput> {
	context: string;
}

export interface WidgetExampleTextAndTableInput<TOutput = WidgetExampleOutput> extends WidgetExampleTextInput<TOutput> {
	table: TableData;
}

export interface WidgetExampleAssetInput<TOutput = WidgetExampleOutput> extends WidgetExampleBase<TOutput> {
	src: string;
}
export interface WidgetExampleAssetAndPromptInput<TOutput = WidgetExampleOutput>
	extends WidgetExampleAssetInput<TOutput> {
	prompt: string;
}

export type WidgetExampleAssetAndTextInput<TOutput = WidgetExampleOutput> = WidgetExampleAssetInput<TOutput> &
	WidgetExampleTextInput<TOutput>;

export type WidgetExampleAssetAndZeroShotInput<TOutput = WidgetExampleOutput> = WidgetExampleAssetInput<TOutput> &
	WidgetExampleZeroShotTextInput<TOutput>;

export interface WidgetExampleStructuredDataInput<TOutput = WidgetExampleOutput> extends WidgetExampleBase<TOutput> {
	structured_data: TableData;
}

export interface WidgetExampleTableDataInput<TOutput = WidgetExampleOutput> extends WidgetExampleBase<TOutput> {
	table: TableData;
}

export interface WidgetExampleZeroShotTextInput<TOutput = WidgetExampleOutput> extends WidgetExampleTextInput<TOutput> {
	text: string;
	candidate_labels: string;
	multi_class: boolean;
}

export interface WidgetExampleSentenceSimilarityInput<TOutput = WidgetExampleOutput>
	extends WidgetExampleBase<TOutput> {
	source_sentence: string;
	sentences: string[];
}

//#endregion

export type WidgetExample<TOutput = WidgetExampleOutput> =
	| WidgetExampleChatInput<TOutput>
	| WidgetExampleTextInput<TOutput>
	| WidgetExampleTextAndContextInput<TOutput>
	| WidgetExampleTextAndTableInput<TOutput>
	| WidgetExampleAssetInput<TOutput>
	| WidgetExampleAssetAndPromptInput<TOutput>
	| WidgetExampleAssetAndTextInput<TOutput>
	| WidgetExampleAssetAndZeroShotInput<TOutput>
	| WidgetExampleStructuredDataInput<TOutput>
	| WidgetExampleTableDataInput<TOutput>
	| WidgetExampleZeroShotTextInput<TOutput>
	| WidgetExampleSentenceSimilarityInput<TOutput>;

type KeysOfUnion<T> = T extends unknown ? keyof T : never;

export type WidgetExampleAttribute = KeysOfUnion<WidgetExample>;
