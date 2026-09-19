import type { NodeRegistry } from '../catalog/node-registry';
import type { DecisionService } from '../decision/decision-service';
import { expr, field, input, template, type Expression } from '../expressions/expression';
import type { ActionIR, BranchIR, RespondIR, StepIR, TriggerIR, WorkflowIR } from '../ir/schema';
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

function makePatternContext(triggerStepId: string): PatternContext {
	const used = new Set<string>([triggerStepId]);
	return {
		triggerStepId,
		stepId(prefix) {
			let id = prefix;
			let n = 1;
			while (used.has(id)) {
				n += 1;
				id = `${prefix}-${n}`;
			}
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
	return {
		status: 'needs_clarification',
		issues,
		questions: buildClarificationQuestions(issues),
		requirements,
		...(planning ? { planning } : {}),
	};
}

function paramValue(requirements: Requirements, action: RequestedAction, name: string): unknown {
	return action.params[name] ?? requirements.answers[`actions.${action.id}.${name}`];
}

/**
 * Create mode: requirements → trigger pattern → one operation decision wave →
 * IR. Deterministic apart from the batched decision; any gap becomes a
 * clarification instead of a guess.
 */
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
	const patternIds: string[] = [];
	const context = makePatternContext('trigger');
	const triggers: TriggerIR[] = [];
	const steps: StepIR[] = [];
	const triggerParam = (name: string) =>
		valueOf(
			requirements.triggerParams[name],
			(value): value is string | number => typeof value === 'string' || typeof value === 'number',
		);
	const triggerPattern =
		triggerKind === 'webhook'
			? patterns.require('webhook_request_response')
			: triggerKind === 'schedule'
				? patterns.require('scheduled_job')
				: patterns.require('manual_run');
	patternIds.push(triggerPattern.id);
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
	triggers.push(...(expanded.triggers ?? []));
	steps.push(...expanded.steps);

	// Actions in request order. Conditional actions wrap in a branch.
	const emitted: Array<{ action: RequestedAction; step: ActionIR }> = [];
	const issues: RequirementIssue[] = [];
	for (const action of requirements.actions) {
		if (!action.operationId) continue;
		const operation = registry.require(action.operationId);
		const step: ActionIR = {
			id: context.stepId(action.id),
			kind: 'action',
			label: operation.label ?? operation.title,
			operation: { operationId: operation.id },
			params: {},
			...(errorPolicyFor(requirements) ? { onError: errorPolicyFor(requirements) } : {}),
		};
		for (const definition of [...operation.requiredParameters, ...operation.optionalParameters]) {
			const value = paramValue(requirements, action, definition.name);
			if (value !== undefined) step.params[definition.name] = value;
		}
		// Derivable parameters: values the trigger payload or an earlier step provides.
		if (
			operation.integration === 'hubspot' &&
			step.params.email === undefined &&
			triggerKind === 'webhook'
		) {
			step.params.email = expr(field(context.triggerStepId, 'body', 'email'));
		}
		if (operation.integration === 'slack' && step.params.text === undefined) {
			step.params.text = expr(defaultSlackText(action, emitted, context.triggerStepId));
		}
		if (operation.id === 'http.request' && step.params.method === undefined)
			step.params.method = 'POST';
		if (
			operation.id === 'http.request' &&
			step.params.body === undefined &&
			triggerKind === 'webhook'
		) {
			step.params.body = expr(field(context.triggerStepId, 'body'));
		}
		if (action.conditional) {
			const condition = deriveCondition(
				action.conditional,
				emitted,
				triggerKind === 'webhook' ? context.triggerStepId : undefined,
			);
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
		} else {
			steps.push(step);
		}
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
		const respond: RespondIR = {
			id: context.stepId('respond'),
			kind: 'respond',
			label: 'Respond',
			status: 200,
			body,
		};
		steps.push(respond);
		patternIds.push('respond_with_result');
	}

	const ir: WorkflowIR = {
		id: inputs.workflowId ?? slugify(valueOf(requirements.workflowName, isString) ?? 'workflow'),
		name: valueOf(requirements.workflowName, isString) ?? 'New workflow',
		triggers,
		steps,
		errorPolicy: errorPolicyFor(requirements) ?? 'fail_workflow',
		settings: { executionOrder: 'v1' },
		patternIds,
	};
	return { status: 'planned', ir, requirements, planning, patternIds };
}

function errorPolicyFor(requirements: Requirements): ActionIR['onError'] | undefined {
	const policy = valueOf(requirements.errorPolicy, isString);
	if (policy === 'retry') return 'retry';
	if (policy === 'dead_letter') return 'dead_letter';
	return undefined;
}

function defaultSlackText(
	action: RequestedAction,
	emitted: Array<{ action: RequestedAction; step: ActionIR }>,
	triggerStepId: string,
): Expression {
	const crm = [...emitted]
		.reverse()
		.find((entry) => entry.step.operation.operationId.startsWith('hubspot.'));
	if (crm) return template('New contact created: ', field(triggerStepId, 'body', 'email'));
	const quoted = action.text.match(/["“]([^"”]+)["”]/)?.[1];
	if (quoted) return { type: 'literal', value: quoted };
	return template('Workflow update: ', input('email'));
}

function deriveCondition(
	text: string,
	emitted: Array<{ action: RequestedAction; step: ActionIR }>,
	triggerStepId: string | undefined,
): BranchIR['condition'] | undefined {
	if (/\b(new|created)\b/i.test(text)) {
		const crm = [...emitted]
			.reverse()
			.find(
				(entry) =>
					entry.step.operation.operationId.endsWith('.upsert') ||
					entry.step.operation.operationId.endsWith('.create'),
			);
		if (crm) return { op: 'is_true', left: field(crm.step.id, 'isNew') };
	}
	const fieldMatch = text.match(/\b([a-z_][a-z0-9_]*)\s+(?:is|equals|=)\s+["']?([^"'\s]+)["']?/i);
	if (fieldMatch) {
		const left: Expression = triggerStepId
			? field(triggerStepId, 'body', fieldMatch[1])
			: input(fieldMatch[1]);
		return { op: 'equals', left, right: { type: 'literal', value: fieldMatch[2] } };
	}
	const presence = text.match(/\b([a-z_][a-z0-9_]*)\s+(?:is (?:present|set|provided)|exists)\b/i);
	if (presence) {
		const left: Expression = triggerStepId
			? field(triggerStepId, 'body', presence[1])
			: input(presence[1]);
		return { op: 'exists', left };
	}
	return undefined;
}

function conditionLabel(text: string): string {
	const trimmed = text.trim().replace(/[.]$/, '');
	return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}?`;
}

function mapResponseField(
	described: string,
	emitted: Array<{ action: RequestedAction; step: ActionIR }>,
): { key: string; expression: Expression } | undefined {
	const lower = described.toLowerCase();
	const producer = [...emitted]
		.reverse()
		.find((entry) => lower.includes(entry.step.operation.operationId.split('.')[0]));
	const source = producer ?? emitted[emitted.length - 1];
	if (!source) return undefined;
	if (/\bid\b/i.test(lower)) {
		const contractId = source.step.operation.operationId.startsWith('hubspot.') ? 'vid' : 'id';
		return {
			key: `${source.step.operation.operationId.split('.')[1] ?? 'result'}Id`,
			expression: field(source.step.id, contractId),
		};
	}
	const key = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'result';
	return { key, expression: field(source.step.id) };
}

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'workflow'
	);
}
