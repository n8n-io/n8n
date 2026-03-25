/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Document Question Answering inference
 */
export interface DocumentQuestionAnsweringInput {
	/**
	 * One (document, question) pair to answer
	 */
	inputs: DocumentQuestionAnsweringInputData;
	/**
	 * Additional inference parameters for Document Question Answering
	 */
	parameters?: DocumentQuestionAnsweringParameters;
	[property: string]: unknown;
}
/**
 * One (document, question) pair to answer
 */
export interface DocumentQuestionAnsweringInputData {
	/**
	 * The image on which the question is asked
	 */
	image: unknown;
	/**
	 * A question to ask of the document
	 */
	question: string;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Document Question Answering
 */
export interface DocumentQuestionAnsweringParameters {
	/**
	 * If the words in the document are too long to fit with the question for the model, it will
	 * be split in several chunks with some overlap. This argument controls the size of that
	 * overlap.
	 */
	doc_stride?: number;
	/**
	 * Whether to accept impossible as an answer
	 */
	handle_impossible_answer?: boolean;
	/**
	 * Language to use while running OCR. Defaults to english.
	 */
	lang?: string;
	/**
	 * The maximum length of predicted answers (e.g., only answers with a shorter length are
	 * considered).
	 */
	max_answer_len?: number;
	/**
	 * The maximum length of the question after tokenization. It will be truncated if needed.
	 */
	max_question_len?: number;
	/**
	 * The maximum length of the total sentence (context + question) in tokens of each chunk
	 * passed to the model. The context will be split in several chunks (using doc_stride as
	 * overlap) if needed.
	 */
	max_seq_len?: number;
	/**
	 * The number of answers to return (will be chosen by order of likelihood). Can return less
	 * than top_k answers if there are not enough options available within the context.
	 */
	top_k?: number;
	/**
	 * A list of words and bounding boxes (normalized 0->1000). If provided, the inference will
	 * skip the OCR step and use the provided bounding boxes instead.
	 */
	word_boxes?: WordBox[];
	[property: string]: unknown;
}
export type WordBox = number[] | string;
export type DocumentQuestionAnsweringOutput = DocumentQuestionAnsweringOutputElement[];
/**
 * Outputs of inference for the Document Question Answering task
 */
export interface DocumentQuestionAnsweringOutputElement {
	/**
	 * The answer to the question.
	 */
	answer: string;
	/**
	 * The end word index of the answer (in the OCR’d version of the input or provided word
	 * boxes).
	 */
	end: number;
	/**
	 * The probability associated to the answer.
	 */
	score: number;
	/**
	 * The start word index of the answer (in the OCR’d version of the input or provided word
	 * boxes).
	 */
	start: number;
	[property: string]: unknown;
}
