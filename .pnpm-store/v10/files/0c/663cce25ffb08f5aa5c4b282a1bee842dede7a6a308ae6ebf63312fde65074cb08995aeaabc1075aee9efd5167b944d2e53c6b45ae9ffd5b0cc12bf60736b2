/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Table Question Answering inference
 */
export interface TableQuestionAnsweringInput {
	/**
	 * One (table, question) pair to answer
	 */
	inputs: TableQuestionAnsweringInputData;
	/**
	 * Additional inference parameters for Table Question Answering
	 */
	parameters?: TableQuestionAnsweringParameters;
	[property: string]: unknown;
}
/**
 * One (table, question) pair to answer
 */
export interface TableQuestionAnsweringInputData {
	/**
	 * The question to be answered about the table
	 */
	question: string;
	/**
	 * The table to serve as context for the questions
	 */
	table: {
		[key: string]: string[];
	};
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Table Question Answering
 */
export interface TableQuestionAnsweringParameters {
	/**
	 * Activates and controls padding.
	 */
	padding?: Padding;
	/**
	 * Whether to do inference sequentially or as a batch. Batching is faster, but models like
	 * SQA require the inference to be done sequentially to extract relations within sequences,
	 * given their conversational nature.
	 */
	sequential?: boolean;
	/**
	 * Activates and controls truncation.
	 */
	truncation?: boolean;
	[property: string]: unknown;
}
/**
 * Activates and controls padding.
 */
export type Padding = "do_not_pad" | "longest" | "max_length";
export type TableQuestionAnsweringOutput = TableQuestionAnsweringOutputElement[];
/**
 * Outputs of inference for the Table Question Answering task
 */
export interface TableQuestionAnsweringOutputElement {
	/**
	 * If the model has an aggregator, this returns the aggregator.
	 */
	aggregator?: string;
	/**
	 * The answer of the question given the table. If there is an aggregator, the answer will be
	 * preceded by `AGGREGATOR >`.
	 */
	answer: string;
	/**
	 * List of strings made up of the answer cell values.
	 */
	cells: string[];
	/**
	 * Coordinates of the cells of the answers.
	 */
	coordinates: Array<number[]>;
	[property: string]: unknown;
}
