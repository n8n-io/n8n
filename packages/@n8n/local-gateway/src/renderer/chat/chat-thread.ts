import type { InstanceAiEvent, InstanceAiMessage } from '../../shared/types';

/** What the chat transcript renders — a flat projection of thread messages. */
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	isStreaming: boolean;
}

/** Routing for a live run: which message its events belong to, and the orchestrator agent. */
interface RunInfo {
	messageId: string;
	rootAgentId: string;
	/**
	 * The run's message is already complete in the snapshot — any of its events can
	 * only be a replay (caller-supplied cursor) and must not mutate the message again.
	 */
	replayOnly?: boolean;
	/**
	 * Whether we're mid-text-block. A model turn emits text in separate blocks
	 * (text → tool call → more text); the deltas within a block concatenate
	 * seamlessly, but block boundaries (a tool call or reasoning between them)
	 * need a paragraph break, or sentences run together ("…model.Workflow…").
	 */
	textOpen?: boolean;
}

export interface ChatThreadState {
	/** Append a locally-sent user message (optimistic — the server stores it on post). */
	addUserMessage(text: string): void;
	/**
	 * Route a run's upcoming `text-delta`s into the transcript. Needed for runs whose
	 * `run-start` predates this listener (e.g. a suspended run resumed by answering its
	 * confirmation from the chat). The message is created lazily on the first delta.
	 */
	registerRun(runId: string, rootAgentId: string): void;
	/** Fold one SSE event into the messages array. */
	apply(event: InstanceAiEvent): void;
}

export function chatMessageFromSnapshot(message: InstanceAiMessage): ChatMessage {
	return {
		id: message.id,
		role: message.role,
		content: message.content,
		isStreaming: message.isStreaming,
	};
}

/**
 * Minimal streaming reducer over thread events, mutating the given `messages` array in
 * place (pass a reactive array so Vue picks the changes up). Only the assistant's main
 * text is rendered for now:
 *
 * - `run-start` opens an assistant message (one bubble per `messageGroupId` — follow-up
 *   runs of the same turn reuse it) and records the run's root agent.
 * - `text-delta` appends, but only from the run's root agent — sub-agents stream their
 *   own deltas on the same channel and would garble the transcript.
 * - `run-finish` ends the streaming state.
 *
 * Tool calls, reasoning, and `run-sync` recovery are out of scope for v1. Snapshot
 * messages seed the run routing via `runIds` + `agentTree.agentId`; a run that is
 * already live when the snapshot omits its agent tree won't stream until it finishes.
 *
 * Replay safety: the listen cursor may predate the snapshot (a chat opened mid-run
 * replays from where the caller started observing). Runs whose snapshot message is
 * already complete are marked replay-only — their replayed events are ignored so the
 * stored text isn't duplicated.
 */
export function createChatThreadState(
	messages: ChatMessage[],
	snapshot: InstanceAiMessage[] = [],
	options: { onTitle?: (title: string) => void } = {},
): ChatThreadState {
	const runs = new Map<string, RunInfo>();
	const messageIdByGroup = new Map<string, string>();

	messages.push(...snapshot.map(chatMessageFromSnapshot));
	for (const message of snapshot) {
		if (message.messageGroupId) messageIdByGroup.set(message.messageGroupId, message.id);
		const rootAgentId = message.agentTree?.agentId;
		if (!rootAgentId) continue;
		for (const runId of message.runIds ?? (message.runId ? [message.runId] : [])) {
			// A live snapshot message's next delta continues its in-flight text block,
			// so start mid-block (no spurious paragraph break before the resumed text).
			runs.set(runId, {
				messageId: message.id,
				rootAgentId,
				replayOnly: !message.isStreaming,
				textOpen: true,
			});
		}
	}

	const findMessage = (id: string) => messages.find((message) => message.id === id);

	return {
		addUserMessage(text: string) {
			messages.push({ id: crypto.randomUUID(), role: 'user', content: text, isStreaming: false });
		},

		registerRun(runId: string, rootAgentId: string) {
			if (runs.has(runId)) return;
			runs.set(runId, { messageId: '', rootAgentId });
		},

		apply(event: InstanceAiEvent) {
			switch (event.type) {
				case 'run-start': {
					// Replayed start of a run whose message is already complete — leave it be.
					if (runs.get(event.runId)?.replayOnly) break;
					const groupId = event.payload.messageGroupId;
					const existingId = groupId && messageIdByGroup.get(groupId);
					let message = existingId ? findMessage(existingId) : undefined;
					if (!message) {
						message = {
							id: groupId ?? event.runId,
							role: 'assistant',
							content: '',
							isStreaming: true,
						};
						messages.push(message);
						if (groupId) messageIdByGroup.set(groupId, message.id);
					} else {
						message.isStreaming = true;
					}
					runs.set(event.runId, {
						messageId: message.id,
						rootAgentId: event.agentId,
						textOpen: false,
					});
					break;
				}
				case 'text-delta': {
					const run = runs.get(event.runId);
					if (!run || run.replayOnly || run.rootAgentId !== event.agentId) break;
					let message = findMessage(run.messageId);
					if (!message) {
						// Run registered without a message (registerRun) — create it on first text.
						message = { id: event.runId, role: 'assistant', content: '', isStreaming: true };
						messages.push(message);
						run.messageId = message.id;
					}
					// Starting a new text block after a tool call / reasoning — separate it
					// from the previous block with a paragraph break so sentences across
					// blocks don't run together.
					if (!run.textOpen && message.content.length > 0) {
						message.content = `${message.content.replace(/\s+$/, '')}\n\n`;
					}
					message.content += event.payload.text;
					run.textOpen = true;
					break;
				}
				case 'tool-call':
				case 'reasoning-delta': {
					// A non-text event from the orchestrator closes the current text block;
					// the next text-delta starts a fresh paragraph. (Sub-agent events carry a
					// different agentId and are ignored — only the rendered run's text matters.)
					const run = runs.get(event.runId);
					if (run && !run.replayOnly && run.rootAgentId === event.agentId) {
						run.textOpen = false;
					}
					break;
				}
				case 'run-finish': {
					const run = runs.get(event.runId);
					const message = run && findMessage(run.messageId);
					if (message) message.isStreaming = false;
					break;
				}
				case 'thread-title-updated': {
					options.onTitle?.(event.payload.title);
					break;
				}
				default:
					break;
			}
		},
	};
}
