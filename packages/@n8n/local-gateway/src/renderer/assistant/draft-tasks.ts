/*
 * In-memory store for locally-created assistant tasks.
 *
 * TODO(desktop-assistant): persist these via the backend. Real tasks come from
 * `window.electronAPI.getTasks()`; until "Set it up" is wired to a backend,
 * tasks created in the composer/confirmation flow live here and are merged into
 * the Tasks list client-side. The list is reset on reload (no persistence).
 */
import { ref } from 'vue';

import type { Plan } from './planner';

import type { DesktopAssistantTaskCard } from '../../shared/types';

/** Which Tasks section a locally-created task belongs to. */
export type DraftTaskBucket = 'actionNeeded' | 'upcoming' | 'readyToRun';

export interface DraftTask {
	/** Stable id, also used as the card's `workflowId`, so the setup flow can target this task. */
	id: string;
	bucket: DraftTaskBucket;
	/** The (possibly edited) plan this task was created from — the source of truth for re-bucketing. */
	plan: Plan;
	card: DesktopAssistantTaskCard;
}

/** Module-scope reactive list — shared across the renderer. */
const draftTasks = ref<DraftTask[]>([]);

export function useDraftTasks() {
	return draftTasks;
}

let counter = 0;
function nextId(): string {
	counter += 1;
	return `draft-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Bucket precedence matches the prototype's `createTaskFromPlan`:
 * needs connection → actionNeeded; recurring/trigger → upcoming; else readyToRun.
 */
function bucketFor(plan: Plan): DraftTaskBucket {
	if (plan.requiredConnections.length > 0) return 'actionNeeded';
	if (plan.recurring || plan.trigger) return 'upcoming';
	return 'readyToRun';
}

/** The subtitle a card shows in each bucket. */
function descriptionFor(plan: Plan, bucket: DraftTaskBucket): string {
	if (bucket === 'actionNeeded') {
		return `Connect ${plan.requiredConnections.join(', ')} to continue`;
	}
	if (bucket === 'upcoming') {
		// Upcoming tasks lead with their cadence/trigger, not the full sentence.
		return plan.schedule ?? plan.trigger ?? plan.summary;
	}
	return plan.summary;
}

function cardFromPlan(id: string, plan: Plan, bucket: DraftTaskBucket): DesktopAssistantTaskCard {
	return {
		workflowId: id,
		name: plan.title,
		description: descriptionFor(plan, bucket),
		icon: { type: 'emoji', value: plan.icon },
		trigger: plan.recurring
			? { kind: 'schedule', nextRunAt: null }
			: plan.trigger
				? { kind: 'other' }
				: { kind: 'manual' },
		source: 'desktop-assistant',
		active: true,
		runsLocally: plan.location === 'local',
	};
}

function makeTask(plan: Plan, bucket: DraftTaskBucket): DraftTask {
	const id = nextId();
	return { id, bucket, plan, card: cardFromPlan(id, plan, bucket) };
}

/** Adds a task created from a plan, classified into the matching section. */
export function addTaskFromPlan(plan: Plan): DraftTask {
	const task = makeTask(plan, bucketFor(plan));
	draftTasks.value = [task, ...draftTasks.value];
	return task;
}

/** Adds a "ready to run" task (used by the Done card's "Save as ready to run"). */
export function addReadyTaskFromPlan(plan: Plan): DraftTask {
	const task = makeTask({ ...plan, requiredConnections: [] }, 'readyToRun');
	draftTasks.value = [task, ...draftTasks.value];
	return task;
}

/**
 * Marks a required service as connected for a draft task and re-buckets it,
 * mirroring the prototype's `connect(taskId, service)`: drop the service from
 * the task's required connections, then re-classify — remaining connections →
 * actionNeeded; recurring/trigger → upcoming; else readyToRun. No-op if the
 * task isn't a draft (e.g. it came from the backend).
 */
export function connectDraftTask(id: string, service: string): void {
	draftTasks.value = draftTasks.value.map((task) => {
		if (task.id !== id) return task;
		const requiredConnections = task.plan.requiredConnections.filter((s) => s !== service);
		const plan: Plan = { ...task.plan, requiredConnections };
		const bucket = bucketFor(plan);
		return { ...task, plan, bucket, card: cardFromPlan(id, plan, bucket) };
	});
}
