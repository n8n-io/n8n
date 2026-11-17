/**
 * Workload classes of the compiled engine (workflow-runtime/docs/workload-classes.md).
 * A setting maps workflow IDs to a class. `wfrt` gets the class names when it
 * starts, and the class of a workflow with each load.
 */

/** The class of a workflow that the setting does not name. */
export const DEFAULT_WORKLOAD_CLASS = 'default';

/** `wfrt` takes at most 8 classes, with names of at most 16 of these characters. */
const MAX_CLASSES = 8;
const CLASS_NAME = /^[A-Za-z0-9_-]{1,16}$/;

export interface WorkloadClasses {
	/** The class names in the order of the setting. `default` is always one of them. */
	names: string[];
	byWorkflowId: Map<string, string>;
}

/**
 * Reads a setting such as `critical=wfA,wfB;background=wfC`. A rule with a
 * name that `wfrt` cannot take is ignored, and so is each rule after the eighth class.
 * A workflow ID in two rules keeps its first class.
 */
export function parseWorkloadClasses(setting: unknown): WorkloadClasses {
	const names: string[] = [];
	const byWorkflowId = new Map<string, string>();
	const rules = typeof setting === 'string' ? setting.split(';') : [];
	for (const rule of rules) {
		const separator = rule.indexOf('=');
		const name = (separator < 0 ? rule : rule.slice(0, separator)).trim();
		if (!CLASS_NAME.test(name)) continue;
		if (!names.includes(name)) {
			if (names.length === MAX_CLASSES) continue;
			names.push(name);
		}
		if (separator < 0) continue;
		for (const id of rule.slice(separator + 1).split(',')) {
			const workflowId = id.trim();
			if (workflowId.length > 0 && !byWorkflowId.has(workflowId)) {
				byWorkflowId.set(workflowId, name);
			}
		}
	}
	if (!names.includes(DEFAULT_WORKLOAD_CLASS)) {
		if (names.length === MAX_CLASSES) names.pop();
		names.push(DEFAULT_WORKLOAD_CLASS);
	}
	return { names, byWorkflowId };
}

/** True when the setting names a class other than the default one. */
export function hasWorkloadClasses(classes: WorkloadClasses) {
	return classes.names.length > 1;
}

/**
 * The class of a workflow by its ID in `wfrt`. The copy of a workflow for manual runs
 * (`<id>~manual`) has the class of the workflow. Undefined without classes: the load
 * call then sends no class.
 */
export function workloadClassOf(classes: WorkloadClasses, wfrtId: string): string | undefined {
	if (!hasWorkloadClasses(classes)) return undefined;
	const suffix = wfrtId.indexOf('~');
	const workflowId = suffix < 0 ? wfrtId : wfrtId.slice(0, suffix);
	const name = classes.byWorkflowId.get(workflowId);
	return name !== undefined && classes.names.includes(name) ? name : DEFAULT_WORKLOAD_CLASS;
}

/** The class flags of `wfrt serve`. `limits` are `name=number` lists for `wfrt`. */
export function workloadClassArgs(
	classes: WorkloadClasses,
	limits: { slots: unknown; hostSteps: unknown },
): string[] {
	if (!hasWorkloadClasses(classes)) return [];
	const args = ['--classes', classes.names.join(',')];
	if (typeof limits.slots === 'string' && limits.slots.trim().length > 0) {
		args.push('--class-slots', limits.slots.trim());
	}
	if (typeof limits.hostSteps === 'string' && limits.hostSteps.trim().length > 0) {
		args.push('--class-host-steps', limits.hostSteps.trim());
	}
	return args;
}
