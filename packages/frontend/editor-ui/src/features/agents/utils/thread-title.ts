import { useI18n } from '@n8n/i18n';

interface ThreadLike {
	title: string | null;
}

/**
 * Display title for a chat thread. Threads carry an LLM-generated `title`
 * summarising the first user message; until that arrives (or if it fails),
 * callers used to fall back to `Session ${sessionNumber}` — but sessionNumber
 * is project-scoped, so a brand-new agent's first thread could read
 * "Session 24" which is nonsensical. This helper falls back to a neutral
 * "New chat" label instead. The numeric sessionNumber still shows in the
 * dedicated column on AgentSessionsListView where it's actually meaningful.
 */
export function formatThreadTitle(thread: ThreadLike, fallbackLabel: string): string {
	return thread.title ?? fallbackLabel;
}

export function useThreadTitle() {
	const i18n = useI18n();
	return (thread: ThreadLike) =>
		formatThreadTitle(thread, i18n.baseText('agents.builder.chat.newChat.label'));
}
