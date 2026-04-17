export type ChannelPromptBody = {
	prompt: string;
	file?: string;
	line?: number;
	col?: number;
	testid?: string;
	component?: string;
	selector?: string;
	classes?: string[];
	outerHtmlSnippet?: string;
};

const CHANNEL_BASE_URL = 'http://127.0.0.1:8788';
const SENDER_HEADER = { 'Content-Type': 'application/json', 'X-Sender': 'n8n-dev-panel' };

export async function sendPrompt(body: ChannelPromptBody): Promise<void> {
	const response = await fetch(`${CHANNEL_BASE_URL}/prompt`, {
		method: 'POST',
		headers: SENDER_HEADER,
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		const text = await response.text().catch(() => response.statusText);
		throw new Error(`channel rejected prompt (${response.status}): ${text}`);
	}
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
	try {
		const response = await fetch(`${CHANNEL_BASE_URL}/health`, { signal });
		return response.ok;
	} catch {
		return false;
	}
}
