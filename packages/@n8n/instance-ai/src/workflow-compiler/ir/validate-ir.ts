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
	if (workflow.triggers.length === 0) {
		issues.push({
			code: 'missing_trigger',
			message: 'A workflow needs at least one trigger.',
			workflowId: workflow.id,
		});
	}
	const seen = new Set<string>();
	for (const step of allSteps(workflow)) {
		if (seen.has(step.id)) {
			issues.push({
				code: 'duplicate_step_id',
				message: `Step id "${step.id}" is used twice.`,
				stepId: step.id,
				workflowId: workflow.id,
			});
		}
		seen.add(step.id);
	}

	const hasWebhook = workflow.triggers.some((trigger) => trigger.triggerKind === 'webhook');
	const executedBefore = new Set<string>(workflow.triggers.map((trigger) => trigger.id));
	checkOrder(workflow.steps, {
		executedBefore,
		allIds: seen,
		hasWebhook,
		workflowId: workflow.id,
		issues,
	});
	return issues;
}

function paramsOf(step: StepIR): unknown {
	switch (step.kind) {
		case 'trigger':
		case 'action':
			return step.params;
		case 'branch':
			return step.condition;
		case 'switch':
			return step.on;
		case 'call_workflow':
			return step.inputs;
		case 'respond':
			return step.body;
		case 'transform':
			return step.fields;
		default:
			return undefined;
	}
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
		for (const ref of referencedStepsInTree(paramsOf(step))) {
			if (!executedBefore.has(ref)) {
				issues.push({
					code: allIds.has(ref) ? 'unreachable_step_reference' : 'unknown_step_reference',
					message: allIds.has(ref)
						? `Step "${step.id}" references "${ref}", which is not guaranteed to execute before it.`
						: `Step "${step.id}" references unknown step "${ref}".`,
					stepId: step.id,
					workflowId,
				});
			}
		}
		if (step.kind === 'respond' && !hasWebhook) {
			issues.push({
				code: 'respond_without_webhook',
				message: `Step "${step.id}" responds to a webhook but the workflow has no webhook trigger.`,
				stepId: step.id,
				workflowId,
			});
		}
		if (step.kind === 'validate' && step.onInvalid === 'respond_400' && !hasWebhook) {
			issues.push({
				code: 'validate_respond_without_webhook',
				message: `Step "${step.id}" wants to respond 400 but the workflow has no webhook trigger.`,
				stepId: step.id,
				workflowId,
			});
		}
		switch (step.kind) {
			case 'branch': {
				const inThen = new Set(executedBefore);
				inThen.add(step.id);
				checkOrder(step.then, { ...context, executedBefore: inThen });
				const inElse = new Set(executedBefore);
				inElse.add(step.id);
				checkOrder(step.else, { ...context, executedBefore: inElse });
				// Steps after a branch may only reference what both arms guarantee.
				executedBefore.add(step.id);
				break;
			}
			case 'switch': {
				for (const c of step.cases) {
					const inCase = new Set(executedBefore);
					inCase.add(step.id);
					checkOrder(c.steps, { ...context, executedBefore: inCase });
				}
				if (step.fallback) {
					const inFallback = new Set(executedBefore);
					inFallback.add(step.id);
					checkOrder(step.fallback, { ...context, executedBefore: inFallback });
				}
				executedBefore.add(step.id);
				break;
			}
			case 'parallel': {
				for (const branch of step.branches) {
					const inBranch = new Set(executedBefore);
					checkOrder(branch, { ...context, executedBefore: inBranch });
				}
				// After a joined parallel, every branch step has executed.
				if (step.join === 'all') {
					for (const branch of step.branches)
						for (const inner of walkSteps(branch)) executedBefore.add(inner.id);
				}
				executedBefore.add(step.id);
				break;
			}
			case 'map': {
				const inLoop = new Set(executedBefore);
				inLoop.add(step.id);
				checkOrder(step.steps, { ...context, executedBefore: inLoop });
				for (const inner of walkSteps(step.steps)) executedBefore.add(inner.id);
				executedBefore.add(step.id);
				break;
			}
			default:
				executedBefore.add(step.id);
		}
	}
}

export function validateBundleIr(bundle: BundleIR): IrIssue[] {
	const issues: IrIssue[] = [];
	const ids = new Set(bundle.workflows.map((workflow) => workflow.id));
	for (const workflow of bundle.workflows) {
		issues.push(...validateWorkflowIr(workflow));
		for (const step of walkSteps(workflow.steps)) {
			if (step.kind === 'call_workflow' && step.workflowRef && !ids.has(step.workflowRef)) {
				issues.push({
					code: 'unknown_workflow_reference',
					message: `Step "${step.id}" calls unknown workflow "${step.workflowRef}".`,
					stepId: step.id,
					workflowId: workflow.id,
				});
			}
		}
	}
	for (const dependency of bundle.dependencies) {
		if (!ids.has(dependency.from) || !ids.has(dependency.to)) {
			issues.push({
				code: 'unknown_workflow_reference',
				message: `Dependency ${dependency.from} → ${dependency.to} names an unknown workflow.`,
			});
		}
	}
	const callEdges = new Map<string, Set<string>>();
	for (const workflow of bundle.workflows) {
		const targets = new Set<string>();
		for (const step of walkSteps(workflow.steps)) {
			if (step.kind === 'call_workflow' && step.workflowRef) targets.add(step.workflowRef);
		}
		callEdges.set(workflow.id, targets);
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
	for (const id of ids) {
		if (visit(id)) {
			issues.push({
				code: 'circular_workflow_dependency',
				message: `Workflow calls form a cycle through "${id}".`,
				workflowId: id,
			});
			break;
		}
	}
	return issues;
}
