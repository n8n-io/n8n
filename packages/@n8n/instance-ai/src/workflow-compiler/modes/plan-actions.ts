import type { NodeRegistry } from '../catalog/node-registry';
import { candidatePrior, retrieveCandidates, type Candidate } from '../catalog/retrieval';
import type {
	DecisionLogEntry,
	DecisionOutcome,
	DecisionService,
} from '../decision/decision-service';
import { resolveChoice } from '../decision/policy';
import { withNoneOfThese, type DecisionQuestions } from '../decision/schemas';
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

/** Runs one named decision request and appends its log entry (with an empty policy) to `log`. */
export async function runDecision(
	input: Pick<ActionPlanningInput, 'request' | 'decisions' | 'abortSignal'>,
	name: string,
	questions: DecisionQuestions,
	log: DecisionLogEntry[],
): Promise<DecisionOutcome> {
	const { decisions, abortSignal } = input;
	const schemaVersion = DECISION_SCHEMA_VERSION;
	const state = { request: input.request };
	const outcome = await decisions.decide({ name, schemaVersion, state, questions, abortSignal });
	log.push({
		name,
		schemaVersion,
		backend: decisions.kind,
		...(outcome.ok
			? { model: outcome.model, reads: outcome.reads }
			: { failureReason: outcome.reason }),
		latencyMs: outcome.latencyMs,
		ok: outcome.ok,
		questionNames: Object.keys(questions),
		answers: outcome.ok ? outcome.answers : {},
		policy: {},
	});
	return outcome;
}

function candidatesFor(registry: NodeRegistry, action: RequestedAction): Candidate[] {
	const { integration, text } = action;
	const scoped = integration
		? retrieveCandidates(registry, text, { kind: 'action', integration, limit: 4 })
		: [];
	return scoped.length > 0
		? scoped
		: retrieveCandidates(registry, text, { kind: ['action', 'control'], limit: 4 });
}

/**
 * Selects one registry operation per requested action: retrieval narrows the catalog, one batched
 * decision request covers every ambiguous action, and the policy turns scores into a choice or a question.
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

	const waves = Object.keys(questions).length > 0 ? 1 : 0;
	const answers = waves
		? await runDecision(input, 'workflow-compiler.operations', questions, log)
		: undefined;

	const planned = input.actions.map((action) => {
		if (action.operationId) return action;
		const candidates = perAction.get(action.id) ?? [];
		if (candidates.length === 0) return action;
		const resolution = resolveChoice({
			allowed: candidates.map((candidate) => candidate.operation.id),
			answer: answers?.ok ? answers.answers[action.id] : undefined,
			prior: candidatePrior(candidates),
		});
		const entry = log[0];
		if (entry) {
			entry.policy[action.id] =
				resolution.status === 'chosen'
					? `${resolution.value} (${resolution.source})`
					: `abstain:${resolution.reason}`;
		}
		if (resolution.status === 'chosen') return { ...action, operationId: resolution.value };
		const titles = candidates.map((candidate) => candidate.operation.title);
		const noneFit = resolution.reason === 'none_of_these';
		issues.push({
			field: `actions.${action.id}.operation`,
			reason: noneFit
				? 'None of the supported operations fit.'
				: 'Several operations could implement this step.',
			question: noneFit
				? `None of the supported operations fit "${action.text}". Which integration and action should it use?`
				: `For "${action.text}", should the workflow use ${titles.join(' or ')}?`,
			candidates: candidates.map((candidate) => candidate.operation.id),
		});
		return action;
	});

	return { actions: planned, issues, log, waves };
}
