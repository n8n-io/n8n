import type { InstanceAiBackgroundInboxItem } from '@n8n/api-types';
import type { BackgroundTaskInboxItem } from '@n8n/instance-ai';

import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';

export interface QueuedItem extends BackgroundTaskInboxItem {
	at: Date;
	/** The turn that started the task. Its own run gets the event mid-run. */
	messageGroupId?: string;
	/** The user asked for it to reach the orchestrator now, whatever turn is running. */
	sendNow?: boolean;
}

/**
 * PROTOTYPE (cloud browser): what background tasks have to tell the orchestrator, per thread.
 *
 * Events are queued here instead of starting a run, so none is dropped while the
 * orchestrator is busy. Tasks only push how they ended (a result, or that the user stopped
 * them). Where a task is in between, the orchestrator reads with check-background-tasks.
 * A task has at most one event here: a newer one replaces it.
 *
 * TBD: in memory, so lost on restart and local to one main. Needs a table for multi-main.
 */
export class BackgroundTaskInbox {
	private readonly itemsByThread = new Map<string, Map<string, QueuedItem>>();

	/** Called after every change, so the UI can show what is queued. */
	constructor(private readonly onChange: (threadId: string) => void = () => {}) {}

	push(threadId: string, item: Omit<QueuedItem, 'at'>): void {
		const items = this.itemsFor(threadId);
		// Delete first so the map keeps arrival order.
		items.delete(item.taskId);
		items.set(item.taskId, { ...item, at: new Date() });
		this.onChange(threadId);
	}

	/** Whether anything queued for the thread needs the orchestrator now. */
	needsWake(threadId: string): boolean {
		return this.list(threadId).some((item) => item.wake || item.sendNow);
	}

	/** Marks queued events to be sent now. Returns false when nothing is queued. */
	markSendNow(threadId: string, taskId?: string): boolean {
		const items = this.list(threadId).filter((item) => !taskId || item.taskId === taskId);
		for (const item of items) item.sendNow = true;
		if (items.length > 0) this.onChange(threadId);
		return items.length > 0;
	}

	drain(threadId: string): QueuedItem[] {
		const items = this.list(threadId);
		this.itemsByThread.delete(threadId);
		if (items.length > 0) this.onChange(threadId);
		return items;
	}

	/**
	 * Takes the events a live run should see now: those from tasks the run's own turn
	 * started, and those the user asked to send now. The rest wait for the run to end,
	 * so an unrelated conversation is not interrupted.
	 */
	drainForTurn(
		threadId: string,
		messageGroupId: string | undefined,
		{ completing = false }: { completing?: boolean } = {},
	): QueuedItem[] {
		const items = this.itemsByThread.get(threadId);
		if (!items) return [];
		const taken = [...items.values()].filter(
			(item) => item.sendNow || (messageGroupId && item.messageGroupId === messageGroupId),
		);
		// Input at the end of a run makes the model write its answer again. So a finishing run
		// only takes events that need it (a hand-off, a result, or the user's "Send now"), and
		// minor ones wait for the next delivery. Between steps, everything goes in.
		if (completing && !taken.some((item) => item.wake || item.sendNow)) return [];
		for (const item of taken) items.delete(item.taskId);
		if (taken.length > 0) this.onChange(threadId);
		return taken;
	}

	/** Puts drained items back when delivery did not happen. Newer events for a task win. */
	restore(threadId: string, items: QueuedItem[]): void {
		const current = this.itemsByThread.get(threadId) ?? new Map<string, QueuedItem>();
		const merged = new Map<string, QueuedItem>();
		for (const item of items) merged.set(item.taskId, item);
		for (const [taskId, item] of current) {
			merged.delete(taskId);
			merged.set(taskId, item);
		}
		this.itemsByThread.set(threadId, merged);
		this.onChange(threadId);
	}

	/** What the UI shows as waiting to reach the orchestrator. */
	snapshot(threadId: string): InstanceAiBackgroundInboxItem[] {
		return this.list(threadId).map((item) => ({
			taskId: item.taskId,
			kind: item.kind,
			sendNow: item.sendNow ?? false,
		}));
	}

	clearThread(threadId: string): void {
		this.itemsByThread.delete(threadId);
	}

	private list(threadId: string): QueuedItem[] {
		return [...(this.itemsByThread.get(threadId)?.values() ?? [])];
	}

	private itemsFor(threadId: string): Map<string, QueuedItem> {
		let items = this.itemsByThread.get(threadId);
		if (!items) {
			items = new Map();
			this.itemsByThread.set(threadId, items);
		}
		return items;
	}
}

/** One automated message for the orchestrator, labelled so it is never read as the user. */
export function renderInboxMessage(items: QueuedItem[]): string {
	const lines = items.map(
		(item) =>
			`<event taskId="${item.taskId}" role="${item.role}" kind="${item.kind}" at="${item.at.toISOString()}">\n${item.text}\n</event>`,
	);
	return [
		'<background-task-events>',
		'Automated events from background tasks, not messages from the user. Each one says how a',
		'task ended.',
		...lines,
		'</background-task-events>',
		'',
		AUTO_FOLLOW_UP_MESSAGE,
	].join('\n');
}
