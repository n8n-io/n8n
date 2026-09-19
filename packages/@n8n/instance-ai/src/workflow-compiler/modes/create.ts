import type { NodeRegistry } from '../catalog/node-registry';
import type { DecisionService } from '../decision/decision-service';
import { expr, field, input, template, type Expression } from '../expressions/expression';
import type { ActionIR, BranchIR, StepIR, TriggerIR, WorkflowIR } from '../ir/schema';
import type { PatternRegistry } from '../patterns/registry';
import type { PatternContext } from '../patterns/types';
import {
	buildClarificationQuestions,
	type ClarificationQuestion,
} from '../requirements/clarification';
import {
	missingBehaviorRequirements,
	missingOperationRequirements,
} from '../requirements/completeness';
import {
	isString,
	valueOf,
	type RequestedAction,
	type RequirementIssue,
	type Requirements,
} from '../requirements/types';
import { planActions, type ActionPlanningResult } from './plan-actions';

export interface CreatePlanInput {
	request: string;
	requirements: Requirements;
	registry: NodeRegistry;
	patterns: PatternRegistry;
	decisions: DecisionService;
	workflowId?: string;
	abortSignal?: AbortSignal;
}

export type CreatePlanResult =
	| {
			status: 'needs_clarification';
			issues: RequirementIssue[];
			questions: ClarificationQuestion[];
			requirements: Requirements;
			planning?: ActionPlanningResult;
	  }
	| {
			status: 'planned';
			ir: WorkflowIR;
			requirements: Requirements;
			planning: ActionPlanningResult;
			patternIds: string[];
	  };

type Emitted = { action: RequestedAction; step: ActionIR };

const TRIGGER_PATTERNS = new Map([
	['webhook', 'webhook_request_response'],
	['schedule', 'scheduled_job'],
]);

const isScalar = (value: unknown): value is string | number =>
	typeof value === 'string' || typeof value === 'number';

function makePatternContext(triggerStepId: string): PatternContext {
	const used = new Set<string>([triggerStepId]);
	return {
		triggerStepId,
		stepId(prefix) {
			let id = prefix;
			for (let n = 2; used.has(id); n += 1) id = `${prefix}-${n}`;
			used.add(id);
			return id;
		},
	};
}

function clarification(
	issues: RequirementIssue[],
	requirements: Requirements,
	planning?: ActionPlanningResult,
): CreatePlanResult {
	const status = 'needs_clarification';
	const questions = buildClarificationQuestions(issues);
	return { status, issues, questions, requirements, ...(planning ? { planning } : {}) };
}

/** Create mode: requirements → trigger pattern → one operation decision wave → IR. Any gap becomes a clarification. */
export async function planCreate(inputs: CreatePlanInput): Promise<CreatePlanResult> {
	const { registry, patterns } = inputs;
	let requirements = inputs.requirements;
	const behaviorIssues = missingBehaviorRequirements(requirements);
	if (behaviorIssues.length > 0) return clarification(behaviorIssues, requirements);
	const planning = await planActions({
		request: inputs.request,
		actions: requirements.actions,
		registry,
		decisions: inputs.decisions,
		abortSignal: inputs.abortSignal,
	});
	requirements = { ...requirements, actions: planning.actions };
	if (planning.issues.length > 0) return clarification(planning.issues, requirements, planning);
	const operationIssues = missingOperationRequirements(requirements, registry);
	if (operationIssues.length > 0) return clarification(operationIssues, requirements, planning);

	// Trigger expansion through a pattern.
	const triggerKind = valueOf(requirements.trigger, isString) ?? 'manual';
	const context = makePatternContext('trigger');
	const webhookStepId = triggerKind === 'webhook' ? context.triggerStepId : undefined;
	const triggerParam = (name: string) => valueOf(requirements.triggerParams[name], isScalar);
	const triggerPattern = patterns.require(TRIGGER_PATTERNS.get(triggerKind) ?? 'manual_run');
	const patternIds = [triggerPattern.id];
	const expanded = triggerPattern.instantiate(
		{
			method: triggerParam('method'),
			path: triggerParam('path'),
			cron: triggerParam('cron'),
			requiredFields: requirements.requiredFields,
			emailFields: requirements.emailFields,
		},
		context,
	);
	const triggers: TriggerIR[] = [...(expanded.triggers ?? [])];
	const steps: StepIR[] = [...expanded.steps];

	// Actions in request order. Conditional actions wrap in a branch.
	const onError = errorPolicyFor(requirements);
	const emitted: Emitted[] = [];
	const issues: RequirementIssue[] = [];
	for (const action of requirements.actions) {
		if (!action.operationId) continue;
		const operation = registry.require(action.operationId);
		const params: Record<string, unknown> = {};
		for (const { name } of [...operation.requiredParameters, ...operation.optionalParameters]) {
			const value = action.params[name] ?? requirements.answers[`actions.${action.id}.${name}`];
			if (value !== undefined) params[name] = value;
		}
		// Derivable parameters: values the trigger payload or an earlier step provides.
		if (operation.integration === 'hubspot' && params.email === undefined && webhookStepId) {
			params.email = expr(field(webhookStepId, 'body', 'email'));
		}
		if (operation.integration === 'slack' && params.text === undefined) {
			params.text = expr(defaultSlackText(action, emitted, context.triggerStepId));
		}
		if (operation.id === 'http.request') {
			if (params.method === undefined) params.method = 'POST';
			if (params.body === undefined && webhookStepId)
				params.body = expr(field(webhookStepId, 'body'));
		}
		const step: ActionIR = {
			id: context.stepId(action.id),
			kind: 'action',
			label: operation.label ?? operation.title,
			operation: { operationId: operation.id },
			params,
			...(onError ? { onError } : {}),
		};
		if (action.conditional) {
			const condition = deriveCondition(action.conditional, emitted, webhookStepId);
			if (!condition) {
				issues.push({
					field: `actions.${action.id}.condition`,
					reason: 'The condition could not be mapped to workflow data.',
					question: `Which field decides whether to run "${action.text}" (condition: "${action.conditional}")?`,
				});
				continue;
			}
			const branch: BranchIR = {
				id: context.stepId(`${action.id}-check`),
				kind: 'branch',
				label: conditionLabel(action.conditional),
				condition,
				then: [step],
				else: [],
			};
			steps.push(branch);
		} else steps.push(step);
		emitted.push({ action, step });
	}
	if (issues.length > 0) return clarification(issues, requirements, planning);

	if (triggerKind === 'webhook') {
		const body: Record<string, unknown> = {};
		for (const described of requirements.responseFields) {
			const mapped = mapResponseField(described, emitted);
			if (mapped) body[mapped.key] = expr(mapped.expression);
		}
		if (Object.keys(body).length === 0) body.ok = true;
		const id = context.stepId('respond');
		steps.push({ id, kind: 'respond', label: 'Respond', status: 200, body });
		patternIds.push('respond_with_result');
	}

	const name = valueOf(requirements.workflowName, isString);
	const ir: WorkflowIR = {
		id: inputs.workflowId ?? slugify(name ?? 'workflow'),
		name: name ?? 'New workflow',
		triggers,
		steps,
		errorPolicy: onError ?? 'fail_workflow',
		settings: { executionOrder: 'v1' },
		patternIds,
	};
	return { status: 'planned', ir, requirements, planning, patternIds };
}

function errorPolicyFor(requirements: Requirements): ActionIR['onError'] | undefined {
	const policy = valueOf(requirements.errorPolicy, isString);
	return policy === 'retry' || policy === 'dead_letter' ? policy : undefined;
}

function defaultSlackText(
	action: RequestedAction,
	emitted: Emitted[],
	triggerStepId: string,
): Expression {
	const crm = emitted.findLast((entry) => entry.step.operation.operationId.startsWith('hubspot.'));
	if (crm) return template('New contact created: ', field(triggerStepId, 'body', 'email'));
	const quoted = action.text.match(/["“]([^"”]+)["”]/)?.[1];
	if (quoted) return { type: 'literal', value: quoted };
	return template('Workflow update: ', input('email'));
}

function deriveCondition(
	text: string,
	emitted: Emitted[],
	triggerStepId: string | undefined,
): BranchIR['condition'] | undefined {
	const leftOf = (name: string): Expression =>
		triggerStepId ? field(triggerStepId, 'body', name) : input(name);
	if (/\b(new|created)\b/i.test(text)) {
		const crm = emitted.findLast(({ step }) =>
			/\.(upsert|create)$/.test(step.operation.operationId),
		);
		if (crm) return { op: 'is_true', left: field(crm.step.id, 'isNew') };
	}
	const fieldMatch = text.match(/\b([a-z_][a-z0-9_]*)\s+(?:is|equals|=)\s+["']?([^"'\s]+)["']?/i);
	if (fieldMatch) {
		return {
			op: 'equals',
			left: leftOf(fieldMatch[1]),
			right: { type: 'literal', value: fieldMatch[2] },
		};
	}
	const presence = text.match(/\b([a-z_][a-z0-9_]*)\s+(?:is (?:present|set|provided)|exists)\b/i);
	return presence ? { op: 'exists', left: leftOf(presence[1]) } : undefined;
}

function conditionLabel(text: string): string {
	const trimmed = text.trim().replace(/[.]$/, '');
	return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}?`;
}

function mapResponseField(
	described: string,
	emitted: Emitted[],
): { key: string; expression: Expression } | undefined {
	const lower = described.toLowerCase();
	const producer = emitted.findLast((entry) =>
		lower.includes(entry.step.operation.operationId.split('.')[0]),
	);
	const source = producer ?? emitted[emitted.length - 1];
	if (!source) return undefined;
	const { operationId } = source.step.operation;
	if (/\bid\b/i.test(lower)) {
		const contractId = operationId.startsWith('hubspot.') ? 'vid' : 'id';
		return {
			key: `${operationId.split('.')[1] ?? 'result'}Id`,
			expression: field(source.step.id, contractId),
		};
	}
	const key = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'result';
	return { key, expression: field(source.step.id) };
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'workflow';
}
