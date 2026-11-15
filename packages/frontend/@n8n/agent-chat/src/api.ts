/**
 * Wire protocol of the agent chat surface (v0, spike).
 *
 * POST {base}/messages  { message, conversationId? }  →  NDJSON events:
 *   { type: 'conversation', id }        always first; the server picks the id
 *   { type: 'text', delta }
 *   { type: 'tool-start', id, name } / { type: 'tool-end', id }
 *   { type: 'notice', text }            e.g. an action that needs approval
 *   { type: 'error', message, code? }
 *   { type: 'done' }
 * GET {base}/config  →  { name, welcomeMessage }
 */
export type ChatEvent =
	| { type: 'conversation'; id: string }
	| { type: 'text'; delta: string }
	| { type: 'tool-start'; id: string; name: string }
	| { type: 'tool-end'; id: string }
	| { type: 'notice'; text: string }
	| { type: 'error'; message: string; code?: string }
	| { type: 'done' };

export interface ChatConfig {
	name: string;
	welcomeMessage?: string;
}

export async function fetchConfig(base: string): Promise<ChatConfig> {
	const res = await fetch(`${base}/config`);
	if (!res.ok) throw new Error(`This chat is not available (${res.status})`);
	return (await res.json()) as ChatConfig;
}

export async function* sendMessage(
	base: string,
	body: { message: string; conversationId?: string },
	signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
	const res = await fetch(`${base}/messages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
		body: JSON.stringify(body),
		signal,
	});
	if (!res.ok || !res.body) {
		yield { type: 'error', message: `The agent could not answer (${res.status})` };
		return;
	}
	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += value;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) if (line.trim()) yield JSON.parse(line) as ChatEvent;
	}
	if (buffer.trim()) yield JSON.parse(buffer) as ChatEvent;
}
