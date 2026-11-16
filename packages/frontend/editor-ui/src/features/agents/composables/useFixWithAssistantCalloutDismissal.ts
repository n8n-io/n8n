import { computed, onBeforeUnmount, ref, type Ref } from 'vue';
import { isRecord } from '@n8n/utils/is-record';
import { agentsEventBus, type AgentUpdatedEvent } from '../agents.eventBus';

/**
 * The preview message list unmounts when the dock closes, then history reload
 * brings the same tool errors back. Remember handed-off ids here so the
 * callout stays gone after that remount.
 */
const STORAGE_PREFIX = 'N8N_AGENT_PREVIEW_FIX_CALLOUT:';

interface FixCalloutRecord {
	agentId: string;
	pending: string[];
	dismissed: string[];
}

function storageKey(sessionId: string): string {
	return `${STORAGE_PREFIX}${sessionId}`;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseRecord(raw: string | null): FixCalloutRecord | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) return null;
		if (typeof parsed.agentId !== 'string') return null;
		if (!isStringArray(parsed.pending) || !isStringArray(parsed.dismissed)) return null;
		return {
			agentId: parsed.agentId,
			pending: parsed.pending,
			dismissed: parsed.dismissed,
		};
	} catch {
		return null;
	}
}

function readRecord(sessionId: string): FixCalloutRecord | null {
	return parseRecord(sessionStorage.getItem(storageKey(sessionId)));
}

function listStorageKeys(): string[] {
	const keys: string[] = [];
	for (let index = 0; index < sessionStorage.length; index++) {
		const key = sessionStorage.key(index);
		if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
	}
	return keys;
}

function unique(ids: string[]): string[] {
	return [...new Set(ids)];
}

export function useFixWithAssistantCalloutDismissal(sessionId: Ref<string | undefined>) {
	// Bumped when storage changes so the computed re-reads the current session.
	const storageVersion = ref(0);

	const dismissedToolCallIds = computed(() => {
		void storageVersion.value;
		const id = sessionId.value;
		if (!id) return [];
		return readRecord(id)?.dismissed ?? [];
	});

	function trackAcceptedFixHandoff(
		targetSessionId: string,
		agentId: string,
		toolCallIds: string[],
	): void {
		if (toolCallIds.length === 0) return;
		const existing = readRecord(targetSessionId) ?? {
			agentId,
			pending: [],
			dismissed: [],
		};
		existing.agentId = agentId;
		existing.pending = unique([...existing.pending, ...toolCallIds]);
		sessionStorage.setItem(storageKey(targetSessionId), JSON.stringify(existing));
	}

	function onAgentUpdated(event?: AgentUpdatedEvent): void {
		if (event?.source !== 'instance-ai' || !event.agentId) return;

		let changed = false;
		for (const key of listStorageKeys()) {
			const record = parseRecord(sessionStorage.getItem(key));
			if (!record || record.agentId !== event.agentId || record.pending.length === 0) continue;
			record.dismissed = unique([...record.dismissed, ...record.pending]);
			record.pending = [];
			sessionStorage.setItem(key, JSON.stringify(record));
			changed = true;
		}
		if (changed) storageVersion.value++;
	}

	agentsEventBus.on('agentUpdated', onAgentUpdated);
	onBeforeUnmount(() => {
		agentsEventBus.off('agentUpdated', onAgentUpdated);
	});

	return { dismissedToolCallIds, trackAcceptedFixHandoff };
}
