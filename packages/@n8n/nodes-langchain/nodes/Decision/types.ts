import type { DecisionQuestionType } from '@n8n/ai-utilities';

/** One entry of the node's `questions` fixed collection, as the editor stores it. */
export interface QuestionParameter {
	id?: string;
	type?: DecisionQuestionType;
	instructions?: string;
	/** Choice options. */
	options?: {
		option?: Array<{ value?: string; description?: string }>;
	};
	/** Score rubric levels, lowest first. */
	levels?: {
		level?: Array<{ description?: string }>;
	};
	/** Boolean probability criteria. */
	trueDescription?: string;
	falseDescription?: string;
}

export interface DecisionNodeOptions {
	confidenceThreshold?: number;
}
