import type { DecisionQuestion, DecisionRequest, DecisionState } from '@n8n/ai-utilities';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { QuestionParameter } from './types';

const MIN_SCORE_LEVELS = 2;

function fail(node: INode, itemIndex: number, message: string, description?: string): never {
	throw new NodeOperationError(node, message, { itemIndex, description });
}

/**
 * Structured state reaches the model as JSON. Anything else is described as
 * text, because a model reads text and a bare number carries no meaning.
 */
export function buildState(rawState: unknown, node: INode, itemIndex: number): DecisionState {
	if (rawState === undefined || rawState === null) {
		fail(node, itemIndex, 'State is empty', 'Fill in the “State” field with what to evaluate.');
	}

	if (typeof rawState === 'object') {
		return rawState as DecisionState;
	}

	const text = String(rawState);
	if (text.trim() === '') {
		fail(node, itemIndex, 'State is empty', 'Fill in the “State” field with what to evaluate.');
	}

	return text;
}

/**
 * Trims a choice question's options and drops the blank ones. Shared with the
 * output planner, so a branch always matches an option that was sent.
 */
export function normalizeChoiceOptions(
	question: QuestionParameter,
): Array<{ value: string; description: string }> {
	return (question.options?.option ?? [])
		.map((option) => ({
			value: (option.value ?? '').trim(),
			description: option.description?.trim() ?? '',
		}))
		.filter((option) => option.value !== '');
}

function buildQuestion(
	question: QuestionParameter,
	id: string,
	node: INode,
	itemIndex: number,
): DecisionQuestion {
	const instructions = (question.instructions ?? '').trim();
	if (instructions === '') {
		fail(node, itemIndex, `Question “${id}” has no instructions`);
	}

	switch (question.type) {
		case 'choice': {
			const options = normalizeChoiceOptions(question);

			if (options.length === 0) {
				fail(
					node,
					itemIndex,
					`Choice question “${id}” has no options`,
					'Add at least one option with a value.',
				);
			}

			const duplicate = findDuplicate(options.map((option) => option.value));
			if (duplicate !== undefined) {
				fail(node, itemIndex, `Choice question “${id}” has a duplicate option “${duplicate}”`);
			}

			return {
				type: 'choice',
				instructions,
				options: options.map(({ value, description }) =>
					description === '' ? { value } : { value, description },
				),
			};
		}

		case 'score': {
			const levels = (question.levels?.level ?? [])
				.map((level) => (level.description ?? '').trim())
				.filter((description) => description !== '');

			if (levels.length < MIN_SCORE_LEVELS) {
				fail(
					node,
					itemIndex,
					`Score question “${id}” needs at least ${MIN_SCORE_LEVELS} rubric levels`,
					`It has ${levels.length}. Describe each level of the rubric, lowest first.`,
				);
			}

			return { type: 'score', instructions, levels };
		}

		case 'booleanProbability': {
			const trueDescription = question.trueDescription?.trim() ?? '';
			const falseDescription = question.falseDescription?.trim() ?? '';
			const criteria = {
				...(trueDescription === '' ? {} : { true: trueDescription }),
				...(falseDescription === '' ? {} : { false: falseDescription }),
			};

			return {
				type: 'booleanProbability',
				instructions,
				...(Object.keys(criteria).length === 0 ? {} : { criteria }),
			};
		}

		default:
			return fail(
				node,
				itemIndex,
				`Question “${id}” has an unsupported type “${String(question.type)}”`,
				'Supported types are Choice, Score, and Boolean Probability.',
			);
	}
}

function findDuplicate(values: string[]): string | undefined {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) return value;
		seen.add(value);
	}
	return undefined;
}

export function buildDecisionRequest(
	rawState: unknown,
	questions: QuestionParameter[],
	node: INode,
	itemIndex: number,
): DecisionRequest {
	if (questions.length === 0) {
		fail(node, itemIndex, 'At least one question must be defined');
	}

	const ids = questions.map((question) => (question.id ?? '').trim());

	const blankIndex = ids.indexOf('');
	if (blankIndex !== -1) {
		fail(
			node,
			itemIndex,
			`Question ${blankIndex + 1} has no ID`,
			'Every question needs an ID. It becomes the key of its result in the output.',
		);
	}

	const duplicate = findDuplicate(ids);
	if (duplicate !== undefined) {
		fail(
			node,
			itemIndex,
			`Duplicate question ID “${duplicate}”`,
			'Question IDs become output keys, so each one must be unique.',
		);
	}

	const built: Record<string, DecisionQuestion> = {};
	questions.forEach((question, index) => {
		built[ids[index]] = buildQuestion(question, ids[index], node, itemIndex);
	});

	return {
		state: buildState(rawState, node, itemIndex),
		questions: built,
	};
}
