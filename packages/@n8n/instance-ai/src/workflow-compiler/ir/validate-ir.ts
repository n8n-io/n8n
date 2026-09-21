import { referencedStepsInTree } from '../expressions/expression';
import { allSteps, walkSteps, type BundleIR, type StepIR, type WorkflowIR } from './schema';

export interface IrIssue {
	code:
		| 'duplicate_step_id'
		| 'unknown_step_reference'
		| 'unreachable_step_reference'
		| 'respond_without_webhook'
		| 'validate_respond_without_webhook'
		| 'unknown_workflow_reference'
		| 'circular_workflow_dependency'
		| 'missing_trigger';
	message: string;
	stepId?: string;
	workflowId?: string;
}

/**
 * Semantic checks on the IR before compilation: unique step ids, references
 * only to steps that can execute earlier, respond steps only behind a webhook
 * trigger, resolvable and acyclic workflow calls.
 */
export function validateWorkflowIr(workflow: WorkflowIR): IrIssue[] {
	const issues: IrIssue[] = [];
	const workflowId = workflow.id;
	if (workflow.triggers.length === 0) {
		const message = 'A workflow needs at least one trigger.';
		issues.push({ code: 'missing_trigger', message, workflowId });
	}
	const seen = new Set<string>();
	for (const { id: stepId } of allSteps(workflow)) {
		if (seen.has(stepId)) {
			const message = `Step id "${stepId}" is used twice.`;
			issues.push({ code: 'duplicate_step_id', message, stepId, workflowId });
		}
		seen.add(stepId);
	}
	checkOrder(workflow.steps, {
		executedBefore: new Set(workflow.triggers.map((trigger) => trigger.id)),
		allIds: seen,
		hasWebhook: workflow.triggers.some((trigger) => trigger.triggerKind === 'webhook'),
		workflowId,
		issues,
	});
	return issues;
}

/** The parameter tree of a step that can hold expressions. */
function paramsOf(step: StepIR): unknown {
	if ('params' in step) return step.params;
	if ('condition' in step) return step.condition;
	if ('on' in step) return step.on;
	if ('inputs' in step) return step.inputs;
	if ('body' in step) return step.body;
	return 'fields' in step ? step.fields : undefined;
}

interface OrderContext {
	executedBefore: Set<string>;
	allIds: ReadonlySet<string>;
	hasWebhook: boolean;
	workflowId: string;
	issues: IrIssue[];
}

function checkOrder(steps: readonly StepIR[], context: OrderContext): void {
	const { executedBefore, allIds, hasWebhook, workflowId, issues } = context;
	for (const step of steps) {
		const stepId = step.id;
		const report = (code: IrIssue['code'], message: string) =>
			issues.push({ code, message, stepId, workflowId });
		for (const ref of referencedStepsInTree(paramsOf(step))) {
			if (executedBefore.has(ref)) continue;
			if (allIds.has(ref)) {
				const message = `Step "${stepId}" references "${ref}", which is not guaranteed to execute before it.`;
				report('unreachable_step_reference', message);
			} else report('unknown_step_reference', `Step "${stepId}" references unknown step "${ref}".`);
		}
		if (step.kind === 'respond' && !hasWebhook) {
			const message = `Step "${stepId}" responds to a webhook but the workflow has no webhook trigger.`;
			report('respond_without_webhook', message);
		}
		if (step.kind === 'validate' && step.onInvalid === 'respond_400' && !hasWebhook) {
			const message = `Step "${stepId}" wants to respond 400 but the workflow has no webhook trigger.`;
			report('validate_respond_without_webhook', message);
		}
		// Each arm sees what executed before the step, plus the step itself when it emits a node.
		const arm = (inner: readonly StepIR[], withSelf: boolean) => {
			const executed = new Set(executedBefore);
			if (withSelf) executed.add(stepId);
			checkOrder(inner, { ...context, executedBefore: executed });
		};
		switch (step.kind) {
			case 'branch':
				arm(step.then, true);
				arm(step.else, true);
				// Steps after a branch may only reference what both arms guarantee.
				executedBefore.add(stepId);
				break;
			case 'switch':
				for (const c of step.cases) arm(c.steps, true);
				if (step.fallback) arm(step.fallback, true);
				executedBefore.add(stepId);
				break;
			case 'parallel':
				for (const branch of step.branches) arm(branch, false);
				// After a joined parallel, every branch step has executed. An unjoined
				// parallel emits no node of its own, so nothing can reference it.
				if (step.join === 'all') {
					for (const inner of walkSteps(step.branches.flat())) executedBefore.add(inner.id);
					executedBefore.add(stepId);
				}
				break;
			case 'map':
				arm(step.steps, true);
				for (const inner of walkSteps(step.steps)) executedBefore.add(inner.id);
				executedBefore.add(stepId);
				break;
			default:
				executedBefore.add(stepId);
		}
	}
}

export function validateBundleIr(bundle: BundleIR): IrIssue[] {
	const issues: IrIssue[] = [];
	const ids = new Set(bundle.workflows.map((workflow) => workflow.id));
	const callEdges = new Map<string, Set<string>>();
	for (const workflow of bundle.workflows) {
		issues.push(...validateWorkflowIr(workflow));
		const targets = new Set<string>();
		for (const step of walkSteps(workflow.steps)) {
			if (step.kind !== 'call_workflow' || !step.workflowRef) continue;
			targets.add(step.workflowRef);
			if (!ids.has(step.workflowRef)) {
				issues.push({
					code: 'unknown_workflow_reference',
					message: `Step "${step.id}" calls unknown workflow "${step.workflowRef}".`,
					stepId: step.id,
					workflowId: workflow.id,
				});
			}
		}
		callEdges.set(workflow.id, targets);
	}
	for (const dependency of bundle.dependencies) {
		if (!ids.has(dependency.from) || !ids.has(dependency.to)) {
			issues.push({
				code: 'unknown_workflow_reference',
				message: `Dependency ${dependency.from} → ${dependency.to} names an unknown workflow.`,
			});
		}
	}
	const visiting = new Set<string>();
	const done = new Set<string>();
	const visit = (id: string): boolean => {
		if (done.has(id)) return false;
		if (visiting.has(id)) return true;
		visiting.add(id);
		for (const target of callEdges.get(id) ?? []) if (visit(target)) return true;
		visiting.delete(id);
		done.add(id);
		return false;
	};
	const cycle = [...ids].find(visit);
	if (cycle !== undefined) {
		const message = `Workflow calls form a cycle through "${cycle}".`;
		issues.push({ code: 'circular_workflow_dependency', message, workflowId: cycle });
	}
	return issues;
}
