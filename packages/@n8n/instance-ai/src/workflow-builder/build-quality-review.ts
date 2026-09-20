import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { DecisionService } from '../workflow-compiler/decision/decision-service';
import { resolveNoul } from '../workflow-compiler/decision/policy';
import type { DecisionQuestions } from '../workflow-compiler/decision/schemas';

const reviewCriteria = {
	identity:
		'Do executable nodes validate identity for participant-scoped reads and writes? Derive identity from validated tokens or trusted runtime context. A nonempty caller ID, a model-supplied ID, a node name, and instructions alone do not verify identity. Answer yes if participant-scoped access does not apply.',
	recovery:
		'Does the graph recover from partial failure between an external effect and its database update? Inspect error connections, durable state, and retry keys. A successful calendar create followed by a failed database write needs recovery. Answer yes if separate effects do not need coordination.',
	availability:
		'Does each calendar booking or reschedule check conflicts for the full selected interval before writing? Inspect operation parameters and connections. A reschedule must exclude its own stored event, preserve the intended duration, and reject incomplete availability results. Answer yes if there is no calendar scheduling operation.',
	duplicates:
		'Do repeated requests avoid repeating completed external effects? Inspect fixed queries, durable event IDs, conditional state updates, and idempotency keys. Answer yes if there are no external writes.',
	parameters:
		'Do SQL parameters preserve separate values? An array expression is valid. Joining values with commas can split free text. Answer yes if parameters use arrays or single values without concatenation, or if no SQL exists.',
	emptyResults:
		'Do required missing-record branches execute when a lookup returns zero rows? Zero items stop downstream IF nodes. Check explicit existence results or alwaysOutputData with empty-object handling. Answer yes if no action is required after an empty lookup.',
};

const answerCriteria: Record<string, { true: string; false: string }> = {
	identity: {
		true: 'The workflow has no participant-scoped record access, or every such access derives the participant from a validated token or trusted runtime context.',
		false:
			'The workflow reads or changes participant-owned records using an unverified caller or model-supplied identity.',
	},
	recovery: {
		true: 'The workflow has no external effect followed by a separate database update, or durable state and retry handling recover when either write fails.',
		false:
			'An external effect can succeed before a separate database update fails, and the graph has no recovery path for that partial completion.',
	},
	emptyResults: {
		true: 'The workflow has no record lookup, or every required missing-record path receives an explicit existence result or an empty item.',
		false:
			'A record lookup can return zero items and stop a required downstream missing-record action.',
	},
};

export const buildQualityReviewSchema = z.object({
	status: z.enum(['no_concerns', 'needs_reasoning', 'unavailable']),
	latencyMs: z.number(),
	checks: z.array(
		z.object({
			check: z.string(),
			outcome: z.enum(['yes', 'no', 'uncertain']),
			probabilityOfYes: z
				.number()
				.optional()
				.describe('Probability that the criterion is satisfied. A low value indicates a concern.'),
			criterion: z.string(),
		}),
	),
	guidance: z.string(),
});

/** Review executable parameters and edges after the LLM has written them. */
export async function reviewBuiltWorkflow(
	workflow: WorkflowJSON,
	decisions: DecisionService,
	abortSignal?: AbortSignal,
	allowSendingParameterValues = true,
): Promise<z.infer<typeof buildQualityReviewSchema>> {
	abortSignal?.throwIfAborted();
	const unavailable = (latencyMs: number): z.infer<typeof buildQualityReviewSchema> => ({
		status: 'unavailable',
		latencyMs,
		checks: [],
		guidance:
			'The graph review is unavailable. Use LLM reasoning to inspect identity, partial failures, availability, duplicate effects, SQL parameters, and empty results. Then verify the required paths. A saved draft is not execution evidence.',
	});
	// Let the outer LLM resolve missing evidence without another generative model call.
	if (!allowSendingParameterValues || decisions.kind !== 'systemone') return unavailable(0);
	const questions: DecisionQuestions = Object.fromEntries(
		Object.entries(reviewCriteria).map(([name, instructions]) => [
			name,
			{ type: 'noul', instructions, criteria: answerCriteria[name] },
		]),
	);
	const outcome = await decisions.decide({
		name: 'build-workflow.quality',
		schemaVersion: 'build-quality-v2',
		state: {
			workflow: scrubSecretsInText(
				JSON.stringify({
					name: workflow.name,
					nodes: workflow.nodes.map((node) => ({
						name: node.name,
						type: node.type,
						typeVersion: node.typeVersion,
						parameters: node.parameters,
						disabled: node.disabled,
						alwaysOutputData: node.alwaysOutputData,
						onError: node.onError,
						retryOnFail: node.retryOnFail,
						maxTries: node.maxTries,
					})),
					connections: workflow.connections,
				}),
			),
		},
		questions,
		abortSignal,
	});
	abortSignal?.throwIfAborted();
	if (!outcome.ok) return unavailable(outcome.latencyMs);
	const checks = Object.entries(reviewCriteria).map(([check, criterion]) => {
		const answer = outcome.answers[check];
		return {
			check,
			criterion,
			outcome: resolveNoul(answer),
			probabilityOfYes: answer?.type === 'noul' ? answer.noul : undefined,
		};
	});
	return {
		status: checks.every((check) => check.outcome === 'yes') ? 'no_concerns' : 'needs_reasoning',
		latencyMs: outcome.latencyMs,
		checks,
		guidance:
			'Review each no or uncertain finding against the executable nodes. A no outcome means the criterion is not satisfied. probabilityOfYes is the probability that it is satisfied. Use LLM reasoning and execution evidence to correct defects or explain why the finding does not apply. Limit edits to the requested scope and report remaining issues. Use targeted edits for repairs. Keep the existing setup and approval flow. This review does not prove execution or authorize publication.',
	};
}
