/**
 * BlueprintAccumulator — incremental accumulator for blueprint items.
 *
 * Replaces the old all-at-once `blueprintToTasks()` conversion. The planner
 * calls `addItem()` once per blueprint item; each call converts the item to a
 * `PlannedTaskInput` and stores it. After the planner finishes,
 * `reconcileDependencies()` fixes any late dep-inference gaps and
 * `getTaskList()` returns the full task array for `createPlan()`.
 */

import type {
	BlueprintCheckpointItem,
	BlueprintDelegateItem,
	BlueprintResearchItem,
	BlueprintWorkflowItem,
} from './blueprint.schema';

// ---------------------------------------------------------------------------
// PlannedTaskInput — the shape consumed by createPlan()
// ---------------------------------------------------------------------------

export interface PlannedTaskInput {
	id: string;
	title: string;
	kind: string;
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

// ---------------------------------------------------------------------------
// Discriminated item union — input to addItem()
// ---------------------------------------------------------------------------

type BlueprintItem =
	| (BlueprintWorkflowItem & { kind: 'workflow' })
	| (BlueprintResearchItem & { kind: 'research' })
	| (BlueprintDelegateItem & { kind: 'delegate' })
	| (BlueprintCheckpointItem & { kind: 'checkpoint' });

// ---------------------------------------------------------------------------
// Per-item conversion helpers
// ---------------------------------------------------------------------------

function workflowItemToTask(wf: BlueprintWorkflowItem, assumptions: string[]): PlannedTaskInput {
	const specParts = [wf.purpose];
	if (wf.triggerDescription) specParts.push(`Trigger: ${wf.triggerDescription}`);
	if (wf.integrations.length > 0) specParts.push(`Integrations: ${wf.integrations.join(', ')}`);

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
		spec: specParts.join('\n'),
		deps: wf.dependsOn,
		workflowId: wf.existingWorkflowId,
	};
}

function researchItemToTask(ri: BlueprintResearchItem): PlannedTaskInput {
	return {
		id: ri.id,
		title: ri.question,
		kind: 'research',
		spec: ri.constraints ?? ri.question,
		deps: ri.dependsOn,
	};
}

function delegateItemToTask(di: BlueprintDelegateItem): PlannedTaskInput {
	return {
		id: di.id,
		title: di.title,
		kind: 'delegate',
		spec: di.description,
		deps: di.dependsOn,
		tools: di.requiredTools,
	};
}

function checkpointItemToTask(c: BlueprintCheckpointItem): PlannedTaskInput {
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
	private workflows: BlueprintWorkflowItem[] = [];

	private researchItems: BlueprintResearchItem[] = [];

	private delegateItems: BlueprintDelegateItem[] = [];

	private checkpoints: BlueprintCheckpointItem[] = [];

	private tasks: PlannedTaskInput[] = [];

	private summary = '';

	private assumptions: string[] = [];

	private approved = false;

	/** Route item by kind, upsert into arrays, convert to task, return the task. */
	addItem(item: BlueprintItem): PlannedTaskInput {
		let task: PlannedTaskInput;

		switch (item.kind) {
			case 'workflow': {
				const { kind: _, ...wf } = item;
				this.upsertArray(this.workflows, wf);
				task = workflowItemToTask(wf, this.assumptions);
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
	getTaskList(): PlannedTaskInput[] {
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
	 * Re-render workflow specs against the latest plan metadata and assumptions.
	 */
	reconcileDependencies(): void {
		for (let i = 0; i < this.workflows.length; i++) {
			const wf = this.workflows[i];
			const updatedTask = workflowItemToTask(wf, this.assumptions);
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
	loadFromTasks(tasks: PlannedTaskInput[]): void {
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
	private upsertTask(task: PlannedTaskInput): void {
		const idx = this.tasks.findIndex((t) => t.id === task.id);
		if (idx >= 0) {
			this.tasks[idx] = task;
		} else {
			this.tasks.push(task);
		}
	}
}
