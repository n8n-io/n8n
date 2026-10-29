import type {
	AgentBuilderOpenSuspension,
	AgentPersistedMessageDto,
	AgentSseEvent,
} from '@n8n/api-types';
import type { DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

export interface AgentChatTraceEvent {
	receivedAt: string;
	event: AgentSseEvent;
}

export interface AgentChatTraceHistory {
	fetchedAt: string;
	messages: AgentPersistedMessageDto[];
	openSuspensions: AgentBuilderOpenSuspension[];
	activeExecutionId: string | null | undefined;
}

export interface AgentChatTrace {
	threadId: string;
	agentId: string;
	exportedAt: string;
	/** The chat as the browser shows it. */
	messages: ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
	/** The last persisted history that the browser loaded. */
	history: AgentChatTraceHistory | null;
	/** The stream events that the browser received, with the deltas joined. */
	events: AgentChatTraceEvent[];
}

/**
 * Keeps the data that the browser receives for an agent chat, so that a tester
 * can export it. The chat stream records into it only when the host gives one.
 */
export interface AgentChatTraceRecorder {
	recordEvent: (event: AgentSseEvent) => void;
	recordHistory: (history: Omit<AgentChatTraceHistory, 'fetchedAt'>) => void;
	snapshot: (context: {
		threadId: string;
		agentId: string;
		messages: ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
	}) => AgentChatTrace;
}

type DeltaEvent = Extract<
	AgentSseEvent,
	{ type: 'text-delta' | 'reasoning-delta' | 'tool-input-delta' }
>;

function isDeltaEvent(event: AgentSseEvent): event is DeltaEvent {
	return (
		event.type === 'text-delta' ||
		event.type === 'reasoning-delta' ||
		event.type === 'tool-input-delta'
	);
}

function deltaKey(event: DeltaEvent): string {
	return `${event.type}:${event.type === 'tool-input-delta' ? event.toolCallId : event.id}`;
}

/** Joins each run of deltas for the same part into one event, so the export stays readable. */
export function collapseAgentDeltaEvents(
	events: readonly AgentChatTraceEvent[],
): AgentChatTraceEvent[] {
	const collapsed: AgentChatTraceEvent[] = [];
	let openKey: string | undefined;

	for (const entry of events) {
		const { event } = entry;
		if (!isDeltaEvent(event)) {
			openKey = undefined;
			collapsed.push(entry);
			continue;
		}
		const key = deltaKey(event);
		const last = collapsed.at(-1);
		if (key === openKey && last && isDeltaEvent(last.event)) {
			collapsed[collapsed.length - 1] = {
				receivedAt: last.receivedAt,
				event: { ...last.event, delta: last.event.delta + event.delta },
			};
			continue;
		}
		openKey = key;
		collapsed.push(entry);
	}

	return collapsed;
}

export function createAgentChatTraceRecorder(): AgentChatTraceRecorder {
	// Plain arrays, not refs: nothing renders them, and a long turn sends many deltas.
	const events: AgentChatTraceEvent[] = [];
	let history: AgentChatTraceHistory | null = null;

	return {
		recordEvent(event) {
			events.push({ receivedAt: new Date().toISOString(), event });
		},
		recordHistory(next) {
			history = { fetchedAt: new Date().toISOString(), ...next };
		},
		snapshot({ threadId, agentId, messages }) {
			return {
				threadId,
				agentId,
				exportedAt: new Date().toISOString(),
				messages,
				history,
				events: collapseAgentDeltaEvents(events),
			};
		},
	};
}
