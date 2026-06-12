import {
	addPrompt,
	removeInstancePromptsByRun,
	removeInstancePromptsByThread,
	removeInstancePromptsByToolCall,
} from './permission-prompt-store';
import { classifyConfirmation, pendingPromptsFromSnapshot } from './prompt-classification';
import type { InstanceAiEvent } from '../../shared/types';
import { getThreadClient, type ThreadClient, type ThreadListener } from '../services/thread-client';

type WatcherClient = Pick<ThreadClient, 'get' | 'listen' | 'unlisten'>;

interface ThreadWatch {
	refs: number;
	listener: ThreadListener;
}

export interface ThreadPromptWatcher {
	/**
	 * Keep the thread's permission prompts in the store while watched: seeds the
	 * pending ones from the message snapshot, then folds the live events. Refcounted —
	 * the returned release drops this watch; the last release also drops the thread's
	 * prompts. Releasing more than once is a no-op.
	 */
	watchThread(threadId: string): () => void;
	/** Watch a task-triggered thread app-wide; auto-released when its run finishes. */
	trackTaskThread(threadId: string, runId: string): void;
	/** Drop all watches and their prompts (sign-out). */
	stopAllWatches(): void;
}

export function createThreadPromptWatcher(client: WatcherClient): ThreadPromptWatcher {
	const watches = new Map<string, ThreadWatch>();
	const taskWatchReleases = new Map<string, () => void>();

	function applyEvent(threadId: string, event: InstanceAiEvent): void {
		switch (event.type) {
			case 'confirmation-request': {
				const prompt = classifyConfirmation(threadId, event.payload, {
					toolCallId: event.payload.toolCallId,
					runId: event.runId,
					agentId: event.agentId,
				});
				if (prompt) addPrompt(prompt);
				break;
			}
			case 'tool-result':
			case 'tool-error':
				removeInstancePromptsByToolCall(threadId, event.payload.toolCallId);
				break;
			case 'run-finish': {
				removeInstancePromptsByRun(threadId, event.runId);
				taskWatchReleases.get(event.runId)?.();
				taskWatchReleases.delete(event.runId);
				break;
			}
			default:
				break;
		}
	}

	async function open(threadId: string, watch: ThreadWatch): Promise<void> {
		let lastEventId: number | undefined;
		try {
			const snapshot = await client.get(threadId);
			// Released (or superseded) while the snapshot was loading — don't listen.
			if (watches.get(threadId) !== watch) return;
			for (const prompt of pendingPromptsFromSnapshot(threadId, snapshot.messages)) {
				addPrompt(prompt);
			}
			lastEventId = Math.max(0, snapshot.nextEventId - 1);
		} catch (error) {
			console.error('Failed to seed permission prompts from thread snapshot', threadId, error);
			if (watches.get(threadId) !== watch) return;
		}
		client.listen(threadId, watch.listener, { lastEventId });
	}

	function release(threadId: string): void {
		const watch = watches.get(threadId);
		if (!watch) return;
		watch.refs -= 1;
		if (watch.refs > 0) return;
		watches.delete(threadId);
		client.unlisten(threadId, watch.listener);
		removeInstancePromptsByThread(threadId);
	}

	function watchThread(threadId: string): () => void {
		let watch = watches.get(threadId);
		if (watch) {
			watch.refs += 1;
		} else {
			watch = { refs: 1, listener: (event) => applyEvent(threadId, event) };
			watches.set(threadId, watch);
			void open(threadId, watch);
		}
		let released = false;
		return () => {
			if (released) return;
			released = true;
			release(threadId);
		};
	}

	function trackTaskThread(threadId: string, runId: string): void {
		if (taskWatchReleases.has(runId)) return;
		taskWatchReleases.set(runId, watchThread(threadId));
	}

	function stopAllWatches(): void {
		for (const [threadId, watch] of watches) {
			client.unlisten(threadId, watch.listener);
			removeInstancePromptsByThread(threadId);
		}
		watches.clear();
		taskWatchReleases.clear();
	}

	return { watchThread, trackTaskThread, stopAllWatches };
}

let watcher: ThreadPromptWatcher | undefined;

/** The app-wide watcher over the shared ThreadClient, created on first use. */
export function getThreadPromptWatcher(): ThreadPromptWatcher {
	watcher ??= createThreadPromptWatcher(getThreadClient());
	return watcher;
}
