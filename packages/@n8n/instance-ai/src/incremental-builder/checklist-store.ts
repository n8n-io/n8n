/**
 * Checklist store — drives the executor and the frontend checklist render.
 *
 * Every mutation bumps `revision` and publishes an `inc-checklist-update` event
 * so the UI can re-render rows in place.
 */

import type {
	AgentId,
	IncChecklist,
	IncChecklistItem,
	IncChecklistItemStatus,
	InstanceAiEvent,
	RunId,
} from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';

export interface ChecklistStoreOptions {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	eventBus: InstanceAiEventBus;
}

export class ChecklistStore {
	private readonly threadId: string;

	private readonly runId: string;

	private readonly agentId: string;

	private readonly userId?: string;

	private readonly eventBus: InstanceAiEventBus;

	private checklist: IncChecklist = { items: [], revision: 0 };

	constructor(opts: ChecklistStoreOptions) {
		this.threadId = opts.threadId;
		this.runId = opts.runId;
		this.agentId = opts.agentId;
		this.userId = opts.userId;
		this.eventBus = opts.eventBus;
	}

	get(): IncChecklist {
		return this.checklist;
	}

	replace(items: IncChecklistItem[]): void {
		this.checklist = { items, revision: this.checklist.revision + 1 };
		this.emit();
	}

	updateItem(
		id: string,
		patch: Partial<Omit<IncChecklistItem, 'id'>>,
	): IncChecklistItem | undefined {
		const idx = this.checklist.items.findIndex((i) => i.id === id);
		if (idx === -1) return undefined;
		const next = { ...this.checklist.items[idx], ...patch };
		const items = [...this.checklist.items];
		items[idx] = next;
		this.checklist = { items, revision: this.checklist.revision + 1 };
		this.emit(id);
		return next;
	}

	setStatus(id: string, status: IncChecklistItemStatus, note?: string): void {
		this.updateItem(id, note !== undefined ? { status, note } : { status });
	}

	insertItem(item: IncChecklistItem, afterId?: string): void {
		const items = [...this.checklist.items];
		if (afterId) {
			const idx = items.findIndex((i) => i.id === afterId);
			if (idx === -1) items.push(item);
			else items.splice(idx + 1, 0, item);
		} else {
			items.push(item);
		}
		this.checklist = { items, revision: this.checklist.revision + 1 };
		this.emit(item.id);
	}

	findNextPending(): IncChecklistItem | undefined {
		const done = new Set(this.checklist.items.filter((i) => i.status === 'done').map((i) => i.id));
		return this.checklist.items.find(
			(i) => i.status === 'pending' && i.deps.every((d) => done.has(d)),
		);
	}

	allTerminal(): boolean {
		return this.checklist.items.every((i) => ['done', 'skipped', 'failed'].includes(i.status));
	}

	private emit(changedItemId?: string): void {
		const event: InstanceAiEvent = {
			type: 'inc-checklist-update',
			runId: this.runId as RunId,
			agentId: this.agentId as AgentId,
			...(this.userId !== undefined && { userId: this.userId }),
			payload: {
				checklist: this.checklist,
				...(changedItemId !== undefined && { changedItemId }),
			},
		};
		this.eventBus.publish(this.threadId, event);
	}
}
