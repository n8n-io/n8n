import type { BaseMessage } from '@langchain/core/messages';

/**
 * Deterministic JSON.stringify for hashing (sorted object keys recursively).
 */
export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(',')}]`;
	}
	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj).sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function previewForLog(value: unknown, maxLength: number): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') {
		return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
	}
	try {
		const s = JSON.stringify(value);
		return s.length <= maxLength ? s : `${s.slice(0, maxLength)}…`;
	} catch {
		return '[unserializable]';
	}
}

export function stripSystemMessages(messages: BaseMessage[]): BaseMessage[] {
	return messages.filter((m) => m.type !== 'system');
}

export function stripToolCallOptions<T extends object>(options: T): T {
	const next = { ...options } as Record<string, unknown>;
	delete next.tools;
	delete next.tool_choice;
	delete next.allowed_function_names;
	return next as T;
}

export function parseExpireMs(expireTime: string): number {
	const t = Date.parse(expireTime);
	return Number.isFinite(t) ? t : 0;
}

/** Plain text from the first system message (for hashing and cache body building). */
export function getFirstSystemMessagePlainText(messages: BaseMessage[]): string {
	const systemMessage = messages.find((message) => message.type === 'system');
	if (!systemMessage) {
		return '';
	}
	if (typeof systemMessage.content === 'string') {
		return systemMessage.content;
	}
	if (Array.isArray(systemMessage.content)) {
		return systemMessage.content
			.map((part) => {
				if (part && typeof part === 'object' && 'text' in part) {
					return String((part as { text?: string }).text ?? '');
				}
				return '';
			})
			.join('');
	}
	return JSON.stringify(systemMessage.content);
}
