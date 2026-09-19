import type { NodeRegistry } from '../catalog/node-registry';
import { candidatePrior, retrieveCandidates, type Candidate } from '../catalog/retrieval';
import type { DecisionLogEntry, DecisionService } from '../decision/decision-service';
import { resolveChoice, type ChoiceResolution } from '../decision/policy';
import { NONE_OF_THESE, withNoneOfThese, type DecisionQuestions } from '../decision/schemas';
import type { RequestedAction, RequirementIssue } from '../requirements/types';
import { DECISION_SCHEMA_VERSION } from '../versions';

export interface ActionPlanningInput {
	request: string;
	actions: RequestedAction[];
	registry: NodeRegistry;
	decisions: DecisionService;
	abortSignal?: AbortSignal;
}

export interface ActionPlanningResult {
	actions: RequestedAction[];
	issues: RequirementIssue[];
	log: DecisionLogEntry[];
	/** Number of dependent decision rounds used. */
	waves: number;
}

function candidatesFor(registry: NodeRegistry, action: RequestedAction): Candidate[] {
	const scoped = action.integration
		? retrieveCandidates(registry, action.text, {
				kind: 'action',
				integration: action.integration,
				limit: 4,
			})
		: [];
	if (scoped.length > 0) return scoped;
	return retrieveCandidates(registry, action.text, { kind: ['action', 'control'], limit: 4 });
}

/**
 * Selects one registry operation per requested action. Retrieval narrows the
 * catalog, every ambiguous action goes into one batched decision request, and
 * the deterministic policy turns scores into a choice, a hint or a question.
 */
export async function planActions(input: ActionPlanningInput): Promise<ActionPlanningResult> {
	const issues: RequirementIssue[] = [];
	const log: DecisionLogEntry[] = [];
	const perAction = new Map<string, Candidate[]>();
	const questions: DecisionQuestions = {};

	for (const action of input.actions) {
		if (action.operationId) continue;
		const candidates = candidatesFor(input.registry, action);
		perAction.set(action.id, candidates);
		if (candidates.length === 0) {
			issues.push({
				field: `actions.${action.id}.operation`,
				reason: 'No supported operation matches this step.',
				question: `Which integration should handle "${action.text}"? Supported: ${input.registry.integrations().join(', ')}.`,
			});
			continue;
		}
		if (candidates.length === 1) continue; // single candidate: policy picks it without a read
		const criteria: Record<string, string | null> = {};
		for (const candidate of candidates)
			criteria[candidate.operation.id] = candidate.operation.description;
		questions[action.id] = {
			type: 'choice',
			instructions: `Which operation implements this step of the workflow: "${action.text}"?`,
			criteria: withNoneOfThese(criteria),
		};
	}

	let answers: Awaited<ReturnType<DecisionService['decide']>> | undefined;
	let waves = 0;
	if (Object.keys(questions).length > 0) {
		waves = 1;
		answers = await input.decisions.decide({
			name: 'workflow-compiler.operations',
			schemaVersion: DECISION_SCHEMA_VERSION,
			state: { request: input.request },
			questions,
			abortSignal: input.abortSignal,
		});
		log.push({
			name: 'workflow-compiler.operations',
			schemaVersion: DECISION_SCHEMA_VERSION,
			backend: input.decisions.kind,
			...(answers.ok
				? { model: answers.model, reads: answers.reads }
				: { failureReason: answers.reason }),
			latencyMs: answers.latencyMs,
			ok: answers.ok,
			questionNames: Object.keys(questions),
			answers: answers.ok ? answers.answers : {},
			policy: {},
		});
	}

	const planned = input.actions.map((action) => {
		if (action.operationId) return action;
		const candidates = perAction.get(action.id) ?? [];
		if (candidates.length === 0) return action;
		const resolution: ChoiceResolution = resolveChoice({
			allowed: candidates.map((candidate) => candidate.operation.id),
			answer: answers?.ok ? answers.answers[action.id] : undefined,
			prior: candidatePrior(candidates),
		});
		const entry = log[0];
		if (entry)
			entry.policy[action.id] =
				resolution.status === 'chosen'
					? `${resolution.value} (${resolution.source})`
					: `abstain:${resolution.reason}`;
		if (resolution.status === 'chosen') return { ...action, operationId: resolution.value };
		const titles = candidates.map((candidate) => candidate.operation.title);
		issues.push({
			field: `actions.${action.id}.operation`,
			reason:
				resolution.reason === 'none_of_these'
					? 'None of the supported operations fit.'
					: 'Several operations could implement this step.',
			question:
				resolution.reason === 'none_of_these'
					? `None of the supported operations fit "${action.text}". Which integration and action should it use?`
					: `For "${action.text}", should the workflow use ${titles.join(' or ')}?`,
			candidates: candidates.map((candidate) => candidate.operation.id),
		});
		return action;
	});

	void NONE_OF_THESE;
	return { actions: planned, issues, log, waves };
}
