/**
 * Inference code generated from the JSON schema spec in ./spec
 *
 * Using src/scripts/inference-codegen
 */
/**
 * Inputs for Question Answering inference
 */
export interface QuestionAnsweringInput {
	/**
	 * One (context, question) pair to answer
	 */
	inputs: QuestionAnsweringInputData;
	/**
	 * Additional inference parameters for Question Answering
	 */
	parameters?: QuestionAnsweringParameters;
	[property: string]: unknown;
}
/**
 * One (context, question) pair to answer
 */
export interface QuestionAnsweringInputData {
	/**
	 * The context to be used for answering the question
	 */
	context: string;
	/**
	 * The question to be answered
	 */
	question: string;
	[property: string]: unknown;
}
/**
 * Additional inference parameters for Question Answering
 */
export interface QuestionAnsweringParameters {
	/**
	 * Attempts to align the answer to real words. Improves quality on space separated
	 * languages. Might hurt on non-space-separated languages (like Japanese or Chinese)
	 */
	align_to_words?: boolean;
	/**
	 * If the context is too long to fit with the question for the model, it will be split in
	 * several chunks with some overlap. This argument controls the size of that overlap.
	 */
	doc_stride?: number;
	/**
	 * Whether to accept impossible as an answer.
	 */
	handle_impossible_answer?: boolean;
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
	 * passed to the model. The context will be split in several chunks (using docStride as
	 * overlap) if needed.
	 */
	max_seq_len?: number;
	/**
	 * The number of answers to return (will be chosen by order of likelihood). Note that we
	 * return less than topk answers if there are not enough options available within the
	 * context.
	 */
	top_k?: number;
	[property: string]: unknown;
}
export type QuestionAnsweringOutput = QuestionAnsweringOutputElement[];
/**
 * Outputs of inference for the Question Answering task
 */
export interface QuestionAnsweringOutputElement {
	/**
	 * The answer to the question.
	 */
	answer: string;
	/**
	 * The character position in the input where the answer ends.
	 */
	end: number;
	/**
	 * The probability associated to the answer.
	 */
	score: number;
	/**
	 * The character position in the input where the answer begins.
	 */
	start: number;
	[property: string]: unknown;
}
