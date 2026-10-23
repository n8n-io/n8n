import type { DecisionAnswer, DecisionRequest, DecisionResponse } from '@n8n/ai-utilities';
import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** An answer plus the node's own confidence annotation, when one is configured. */
type AnnotatedAnswer = DecisionAnswer & { meetsConfidenceThreshold?: boolean };

function fail(node: INode, itemIndex: number, message: string, description?: string): never {
	throw new NodeOperationError(node, message, { itemIndex, description });
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks the answer of one question against the question that was asked. A
 * provider that answers a different question type, picks an option that was
 * never offered, or omits a probability produced a malformed response: report
 * it instead of passing a wrong decision downstream.
 */
function validateAnswer(
	answer: unknown,
	id: string,
	question: DecisionRequest['questions'][string],
	node: INode,
	itemIndex: number,
): DecisionAnswer {
	if (!isRecord(answer)) {
		fail(node, itemIndex, `The model returned no answer for question “${id}”`);
	}

	if (answer.type !== question.type) {
		fail(
			node,
			itemIndex,
			`The model answered question “${id}” with type “${String(answer.type)}”`,
			`The question is of type “${question.type}”.`,
		);
	}

	switch (question.type) {
		case 'choice': {
			const allowed = question.options.map((option) => option.value);
			if (typeof answer.value !== 'string' || !allowed.includes(answer.value)) {
				fail(
					node,
					itemIndex,
					`The model chose “${String(answer.value)}” for question “${id}”, which is not one of its options`,
					`Configured options: ${allowed.join(', ')}.`,
				);
			}
			break;
		}

		case 'score':
			if (!isFiniteNumber(answer.value)) {
				fail(node, itemIndex, `The model returned no score for question “${id}”`);
			}
			break;

		case 'booleanProbability':
			if (!isFiniteNumber(answer.probability)) {
				fail(node, itemIndex, `The model returned no probability for question “${id}”`);
			}
			break;
	}

	return answer as unknown as DecisionAnswer;
}

/**
 * Validates the provider's response against the request and shapes the item
 * JSON. Answers are correlated by question ID, never by position.
 */
export function buildDecisionOutput(
	response: unknown,
	request: DecisionRequest,
	node: INode,
	itemIndex: number,
	confidenceThreshold?: number,
): IDataObject {
	if (!isRecord(response) || !isRecord(response.decisions)) {
		fail(
			node,
			itemIndex,
			'The Decision Model returned a malformed response',
			'Expected an object with a “decisions” property.',
		);
	}

	const {
		decisions: rawDecisions,
		model,
		usage,
		providerMetadata,
	} = response as unknown as DecisionResponse;

	const missing = Object.keys(request.questions).filter((id) => !(id in rawDecisions));
	if (missing.length > 0) {
		fail(
			node,
			itemIndex,
			`The Decision Model answered ${missing.length === 1 ? 'no' : 'not all'} questions`,
			`Missing: ${missing.join(', ')}.`,
		);
	}

	const decisions: Record<string, AnnotatedAnswer> = {};
	for (const [id, question] of Object.entries(request.questions)) {
		const validated = validateAnswer(rawDecisions[id], id, question, node, itemIndex);

		// Copied, never annotated in place: the provider owns its response object,
		// and `providerMetadata` may hold the same answers.
		const answer: AnnotatedAnswer = { ...validated };

		if (confidenceThreshold !== undefined && isFiniteNumber(answer.confidence)) {
			answer.meetsConfidenceThreshold = answer.confidence >= confidenceThreshold;
		}

		decisions[id] = answer;
	}

	return {
		decisions,
		...(model === undefined ? {} : { model }),
		...(usage === undefined ? {} : { usage }),
		...(confidenceThreshold === undefined ? {} : { confidenceThreshold }),
		...(providerMetadata === undefined ? {} : { providerMetadata }),
	};
}
