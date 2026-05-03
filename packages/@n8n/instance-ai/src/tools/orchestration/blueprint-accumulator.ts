/**
 * BlueprintAccumulator — incremental accumulator for blueprint items.
 *
 * Replaces the old all-at-once `blueprintToTasks()` conversion. The planner
 * calls `addItem()` once per blueprint item; each call converts the item to a
 * typed `PlannedTask` and stores it. After the planner finishes,
 * `reconcileDependencies()` fixes any late dep-inference gaps and
 * `getTaskList()` returns the full task array for `createPlan()`.
 */

import type {
	BlueprintCheckpointItem,
	BlueprintDataTableItem,
	BlueprintDelegateItem,
	BlueprintResearchItem,
	BlueprintWorkflowItem,
} from './blueprint.schema';
import { DELEGATE_DEFAULT_INSTRUCTIONS, type PlannedHandoff } from '../../agent/handoff';
import type { PlannedTask } from '../../types';

// ---------------------------------------------------------------------------
// Discriminated item union — input to addItem()
// ---------------------------------------------------------------------------

type BlueprintItem =
	| (BlueprintWorkflowItem & { kind: 'workflow' })
	| (BlueprintDataTableItem & { kind: 'data-table' })
	| (BlueprintResearchItem & { kind: 'research' })
	| (BlueprintDelegateItem & { kind: 'delegate' })
	| (BlueprintCheckpointItem & { kind: 'checkpoint' });

// ---------------------------------------------------------------------------
// Per-item conversion helpers
// ---------------------------------------------------------------------------

/** Format a data table schema as a compact string for builder context. */
export function formatTableSchema(dt: BlueprintDataTableItem): string {
	if (!dt.columns || dt.columns.length === 0) return `Table '${dt.name}'`;
	const cols = dt.columns.map((c) => `${c.name} (${c.type})`).join(', ');
	return `Table '${dt.name}': ${cols}`;
}

function makeHandoff(id: string, handoff: Omit<PlannedHandoff, 'taskKey'>): PlannedHandoff {
	return { ...handoff, taskKey: id } as PlannedHandoff;
}

function dataTableItemToTask(dt: BlueprintDataTableItem): PlannedTask {
	const goal =
		dt.columns && dt.columns.length > 0
			? `Create a data table named '${dt.name}'. Purpose: ${dt.purpose}\nColumns: ${dt.columns.map((c) => `${c.name} (${c.type})`).join(', ')}`
			: dt.purpose;
	const title = dt.columns && dt.columns.length > 0 ? `Create '${dt.name}' data table` : dt.name;
	return {
		id: dt.id,
		title,
		kind: 'manage-data-tables',
		deps: dt.dependsOn,
		handoff: makeHandoff(dt.id, { kind: 'manage-data-tables', input: { goal } }),
	};
}

function workflowItemToTask(
	wf: BlueprintWorkflowItem,
	knownTables: BlueprintDataTableItem[],
	assumptions: string[],
): PlannedTask {
	const specParts = [wf.purpose];
	if (wf.triggerDescription) specParts.push(`Trigger: ${wf.triggerDescription}`);
	if (wf.integrations.length > 0) specParts.push(`Integrations: ${wf.integrations.join(', ')}`);

	// Infer missing table dependencies by checking if the workflow's
	// purpose or integrations mention any table name (word-boundary match).
	// Skip short names (< 4 chars) — they're too ambiguous for substring inference.
	const tableIds = new Set(knownTables.map((dt) => dt.id));
	const explicitDeps = new Set(wf.dependsOn);
	const inferredDeps = [...explicitDeps];
	const wfText = `${wf.purpose} ${wf.integrations.join(' ')}`;
	const tablePatterns = knownTables
		.filter((dt) => dt.name.length >= 4)
		.map((dt) => ({
			id: dt.id,
			pattern: new RegExp(`\\b${dt.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
		}));
	for (const { id, pattern } of tablePatterns) {
		if (!explicitDeps.has(id) && pattern.test(wfText)) {
			inferredDeps.push(id);
		}
	}

	// Append schemas of tables this workflow depends on (explicit + inferred)
	const depTableIds = new Set(inferredDeps.filter((id) => tableIds.has(id)));
	const depTables = knownTables.filter((dt) => depTableIds.has(dt.id));
	if (depTables.length > 0) {
		specParts.push('\nData table schemas:');
		for (const dt of depTables) {
			specParts.push(`- ${formatTableSchema(dt)}`);
		}
	}

	// Append blueprint assumptions so the builder has design context
	if (assumptions.length > 0) {
		specParts.push('\nAssumptions:');
		for (const a of assumptions) {
			specParts.push(`- ${a}`);
		}
	}

	return {
		id: wf.id,
		title: `Build '${wf.name}' workflow`,
		kind: 'build-workflow',
		deps: inferredDeps,
		handoff: makeHandoff(wf.id, {
			kind: 'build-workflow',
			input: {
				goal: specParts.join('\n'),
				workflowId: wf.existingWorkflowId,
				workItemId: `wi_${wf.id}`,
				sandboxMode: true,
			},
		}),
	};
}

function researchItemToTask(ri: BlueprintResearchItem): PlannedTask {
	return {
		id: ri.id,
		title: ri.question,
		kind: 'research',
		deps: ri.dependsOn,
		handoff: makeHandoff(ri.id, {
			kind: 'research',
			input: { goal: ri.question, constraints: ri.constraints },
		}),
	};
}

function delegateItemToTask(di: BlueprintDelegateItem): PlannedTask {
	return {
		id: di.id,
		title: di.title,
		kind: 'delegate',
		deps: di.dependsOn,
		tools: di.requiredTools,
		handoff: makeHandoff(di.id, {
			kind: 'delegate',
			input: {
				role: di.title,
				instructions: DELEGATE_DEFAULT_INSTRUCTIONS,
				goal: di.description,
				toolNames: di.requiredTools,
			},
		}),
	};
}

function checkpointItemToTask(c: BlueprintCheckpointItem): PlannedTask {
	return {
		id: c.id,
		title: c.title,
		kind: 'checkpoint',
		spec: c.instructions,
		deps: c.dependsOn,
	};
}

// ---------------------------------------------------------------------------
// BlueprintAccumulator
// ---------------------------------------------------------------------------

export class BlueprintAccumulator {
	private dataTables: BlueprintDataTableItem[] = [];

	private workflows: BlueprintWorkflowItem[] = [];

	private researchItems: BlueprintResearchItem[] = [];

	private delegateItems: BlueprintDelegateItem[] = [];

	private checkpoints: BlueprintCheckpointItem[] = [];

	private tasks: PlannedTask[] = [];

	private summary = '';

	private assumptions: string[] = [];

	private approved = false;

	/** Route item by kind, upsert into arrays, convert to task, return the task. */
	addItem(item: BlueprintItem): PlannedTask {
		let task: PlannedTask;

		switch (item.kind) {
			case 'data-table': {
				const { kind: _, ...dt } = item;
				this.upsertArray(this.dataTables, dt);
				task = dataTableItemToTask(dt);
				break;
			}
			case 'workflow': {
				const { kind: _, ...wf } = item;
				this.upsertArray(this.workflows, wf);
				task = workflowItemToTask(wf, this.dataTables, this.assumptions);
				break;
			}
			case 'research': {
				const { kind: _, ...ri } = item;
				this.upsertArray(this.researchItems, ri);
				task = researchItemToTask(ri);
				break;
			}
			case 'delegate': {
				const { kind: _, ...di } = item;
				this.upsertArray(this.delegateItems, di);
				task = delegateItemToTask(di);
				break;
			}
			case 'checkpoint': {
				const { kind: _, ...c } = item;
				this.upsertArray(this.checkpoints, c);
				task = checkpointItemToTask(c);
				break;
			}
		}

		this.upsertTask(task);
		return task;
	}

	/** Update plan-level metadata (summary and/or assumptions). */
	updateMeta(summary?: string, assumptions?: string[]): void {
		if (summary !== undefined) this.summary = summary;
		if (assumptions !== undefined) this.assumptions = assumptions;
	}

	/** Return the full task list for createPlan(). */
	getTaskList(): PlannedTask[] {
		return [...this.tasks];
	}

	/** Return simplified task items for tasks-update events. */
	getTaskItemsForEvent(): Array<{ id: string; description: string; status: 'todo' }> {
		return this.tasks.map((t) => ({
			id: t.id,
			description: t.title,
			status: 'todo' as const,
		}));
	}

	/**
	 * Re-run dependency inference for all workflow tasks against the full
	 * table set. Catches tables that were added after workflows that need them.
	 */
	reconcileDependencies(): void {
		for (let i = 0; i < this.workflows.length; i++) {
			const wf = this.workflows[i];
			const updatedTask = workflowItemToTask(wf, this.dataTables, this.assumptions);
			this.upsertTask(updatedTask);
		}
	}

	/** Remove an item by ID. Returns true if found and removed.
	 *  Cascade-removes any checkpoint that loses its last build-workflow dep as
	 *  a result — otherwise submit-plan would later fail validation because
	 *  checkpoints must depend on at least one build-workflow task. */
	removeItem(id: string): boolean {
		const taskIdx = this.tasks.findIndex((t) => t.id === id);
		if (taskIdx < 0) return false;
		this.tasks.splice(taskIdx, 1);
		// Also remove from the typed item arrays
		this.removeFromArray(this.dataTables, id);
		this.removeFromArray(this.workflows, id);
		this.removeFromArray(this.researchItems, id);
		this.removeFromArray(this.delegateItems, id);
		this.removeFromArray(this.checkpoints, id);
		// Clean up dangling dep references in remaining tasks
		for (const task of this.tasks) {
			task.deps = task.deps.filter((dep) => dep !== id);
		}

		// Cascade-remove orphaned checkpoints: any checkpoint whose deps no
		// longer reference a build-workflow task is invalid and must go too.
		const workflowIds = new Set(this.workflows.map((w) => w.id));
		const orphanedCheckpointIds: string[] = [];
		for (const cp of this.checkpoints) {
			const stillHasWorkflowDep = cp.dependsOn.some((depId) => workflowIds.has(depId));
			if (!stillHasWorkflowDep) {
				orphanedCheckpointIds.push(cp.id);
			}
		}
		for (const orphanId of orphanedCheckpointIds) {
			this.removeItem(orphanId);
		}

		return true;
	}

	/** Load pre-existing tasks into the accumulator (for revision flows). */
	loadFromTasks(tasks: PlannedTask[]): void {
		for (const t of tasks) {
			this.upsertTask(t);
		}
	}

	/** Mark the plan as approved by the user (called by submit-plan on approval). */
	markApproved(): void {
		this.approved = true;
	}

	/** Whether the user approved the plan via submit-plan. */
	isApproved(): boolean {
		return this.approved;
	}

	/** Whether any items have been added. */
	isEmpty(): boolean {
		return this.tasks.length === 0;
	}

	/** Get the plan summary. */
	getSummary(): string {
		return this.summary;
	}

	/** Get the plan assumptions. */
	getAssumptions(): string[] {
		return [...this.assumptions];
	}

	// ── Private helpers ──────────────────────────────────────────────────

	/** Upsert into a typed item array by ID (replace if exists, append if not). */
	private upsertArray<T extends { id: string }>(arr: T[], item: T): void {
		const idx = arr.findIndex((existing) => existing.id === item.id);
		if (idx >= 0) {
			arr[idx] = item;
		} else {
			arr.push(item);
		}
	}

	/** Remove from a typed item array by ID. */
	private removeFromArray<T extends { id: string }>(arr: T[], id: string): void {
		const idx = arr.findIndex((item) => item.id === id);
		if (idx >= 0) arr.splice(idx, 1);
	}

	/** Upsert into the tasks array by ID. */
	private upsertTask(task: PlannedTask): void {
		const idx = this.tasks.findIndex((t) => t.id === task.id);
		if (idx >= 0) {
			this.tasks[idx] = task;
		} else {
			this.tasks.push(task);
		}
	}
}
