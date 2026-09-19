import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { normalizeChoiceOptions } from './buildRequest';
import type { QuestionParameter } from './types';

/**
 * How the node maps a decision onto its outputs in "Branch by Choice" mode.
 * One output for each option of the choice question, in the configured order,
 * plus a last output for low confidence when a threshold is set.
 */
export interface RoutingPlan {
	questionId: string;
	optionValues: string[];
	/** Index of the "Low Confidence" output, when a threshold is configured. */
	lowConfidenceIndex?: number;
	confidenceThreshold?: number;
}

/** A threshold of 0 accepts every answer, so it adds no output. */
function routesLowConfidence(confidenceThreshold?: number): boolean {
	return typeof confidenceThreshold === 'number' && confidenceThreshold > 0;
}

export function buildRoutingPlan(
	questions: QuestionParameter[],
	confidenceThreshold: number | undefined,
	node: INode,
): RoutingPlan {
	const choices = questions.filter((question) => question.type === 'choice');

	if (choices.length === 0) {
		throw new NodeOperationError(node, 'Branch by Choice needs a choice question', {
			description:
				'Add a question of type Choice, or set Output to “Single Output” and branch with a Switch node.',
		});
	}

	if (choices.length > 1) {
		throw new NodeOperationError(node, 'Branch by Choice needs exactly one choice question', {
			description: `This node has ${choices.length}: ${choices
				.map((question) => `“${(question.id ?? '').trim()}”`)
				.join(', ')}. Keep one, or set Output to “Single Output” and branch with a Switch node.`,
		});
	}

	const routing = choices[0];
	const optionValues = normalizeChoiceOptions(routing).map((option) => option.value);

	if (optionValues.length === 0) {
		throw new NodeOperationError(node, 'The choice question has no options to branch on', {
			description: 'Add at least one option with a value.',
		});
	}

	return {
		questionId: (routing.id ?? '').trim(),
		optionValues,
		...(routesLowConfidence(confidenceThreshold)
			? { lowConfidenceIndex: optionValues.length, confidenceThreshold }
			: {}),
	};
}

/** Number of main outputs a plan produces. Matches the node's `outputs`. */
export function branchCount(plan: RoutingPlan): number {
	return plan.optionValues.length + (plan.lowConfidenceIndex === undefined ? 0 : 1);
}

/**
 * Picks the output for one decided item. An answer below the configured
 * threshold goes to "Low Confidence" instead of its option, so an uncertain
 * decision never silently takes a confident path. An answer that reports no
 * confidence is routed by its value, because absent confidence is not doubt.
 */
export function resolveBranch(
	plan: RoutingPlan,
	decisions: IDataObject,
	node: INode,
	itemIndex: number,
): number {
	const answer = decisions[plan.questionId] as
		| { value?: unknown; confidence?: unknown }
		| undefined;

	const value = answer?.value;
	if (typeof value !== 'string') {
		throw new NodeOperationError(
			node,
			`The model returned no choice for question “${plan.questionId}”`,
			{ itemIndex },
		);
	}

	if (
		plan.lowConfidenceIndex !== undefined &&
		plan.confidenceThreshold !== undefined &&
		typeof answer?.confidence === 'number' &&
		answer.confidence < plan.confidenceThreshold
	) {
		return plan.lowConfidenceIndex;
	}

	const index = plan.optionValues.indexOf(value);
	if (index === -1) {
		throw new NodeOperationError(node, `“${value}” is not one of this node's outputs`, {
			itemIndex,
			description: `Outputs: ${plan.optionValues.join(', ')}. An expression that changes the options for each item cannot be used with Branch by Choice.`,
		});
	}

	return index;
}
