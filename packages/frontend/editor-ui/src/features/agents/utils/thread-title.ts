import { useI18n } from '@n8n/i18n';

interface ThreadLike {
	title: string | null;
	/** First user message body — populated server-side, used when the LLM-generated title isn't ready. */
	firstMessage?: string | null;
}

/** Cap the inline preview so a paragraph-long first message doesn't blow up dropdown rows. */
const PREVIEW_MAX_CHARS = 60;

function previewFromFirstMessage(text: string): string {
	const trimmed = text.replace(/\s+/g, ' ').trim();
	if (!trimmed) return '';
	if (trimmed.length <= PREVIEW_MAX_CHARS) return trimmed;
	return `${trimmed.slice(0, PREVIEW_MAX_CHARS - 1).trimEnd()}…`;
}

/**
 * Display title for a chat thread, in fallback order:
 *
 * 1. `title` — LLM-generated summary, set after the first turn completes.
 * 2. `firstMessage` preview — what the user actually typed, available as soon
 *    as the thread is persisted. Distinguishes untitled sessions in lists.
 * 3. `fallbackLabel` — the i18n "New chat" string for empty / brand-new sessions.
 */
export function formatThreadTitle(thread: ThreadLike, fallbackLabel: string): string {
	if (thread.title) return thread.title;
	if (thread.firstMessage) {
		const preview = previewFromFirstMessage(thread.firstMessage);
		if (preview) return preview;
	}
	return fallbackLabel;
}

export function useThreadTitle() {
	const i18n = useI18n();
	return (thread: ThreadLike) =>
		formatThreadTitle(thread, i18n.baseText('agents.builder.chat.newChat.label'));
}
