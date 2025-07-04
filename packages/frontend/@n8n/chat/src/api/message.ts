import { get, post, postWithFiles } from '@n8n/chat/api/generic';
import type {
	ChatOptions,
	LoadPreviousSessionResponse,
	SendMessageResponse,
	StructuredChunk,
} from '@n8n/chat/types';

export async function loadPreviousSession(sessionId: string, options: ChatOptions) {
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return await method<LoadPreviousSessionResponse>(
		`${options.webhookUrl}`,
		{
			action: 'loadPreviousSession',
			[options.chatSessionKey as string]: sessionId,
			...(options.metadata ? { metadata: options.metadata } : {}),
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}

export async function sendMessage(
	message: string,
	files: File[],
	sessionId: string,
	options: ChatOptions,
) {
	if (files.length > 0) {
		return await postWithFiles<SendMessageResponse>(
			`${options.webhookUrl}`,
			{
				action: 'sendMessage',
				[options.chatSessionKey as string]: sessionId,
				[options.chatInputKey as string]: message,
				...(options.metadata ? { metadata: options.metadata } : {}),
			},
			files,
			{
				headers: options.webhookConfig?.headers,
			},
		);
	}
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return await method<SendMessageResponse>(
		`${options.webhookUrl}`,
		{
			action: 'sendMessage',
			[options.chatSessionKey as string]: sessionId,
			[options.chatInputKey as string]: message,
			...(options.metadata ? { metadata: options.metadata } : {}),
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}

export async function sendMessageStreaming(
	message: string,
	files: File[],
	sessionId: string,
	options: ChatOptions,
	onChunk: (chunk: string, nodeId?: string) => void,
	onBeginMessage: (nodeId: string) => void,
	onEndMessage: (nodeId: string) => void,
): Promise<void> {
	if (files.length > 0) {
		throw new Error('File uploads are not supported with streaming responses');
	}

	const body = {
		action: 'sendMessage',
		[options.chatSessionKey as string]: sessionId,
		[options.chatInputKey as string]: message,
		...(options.metadata ? { metadata: options.metadata } : {}),
	};

	const response = await fetch(options.webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/plain',
			...options.webhookConfig?.headers,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('HTTP error response:', errorText);
		throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('Response body is not readable');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			const chunk = decoder.decode(value, { stream: true });
			buffer += chunk;

			// Process all complete lines in the buffer
			let newlineIndex;
			while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
				const line = buffer.substring(0, newlineIndex);
				buffer = buffer.substring(newlineIndex + 1);

				if (line.trim()) {
					try {
						const decoded: StructuredChunk = JSON.parse(line);
						const nodeId = decoded.metadata?.nodeId || 'unknown';

						if (decoded?.type === 'begin') {
							onBeginMessage(nodeId);
						}
						if (decoded?.type === 'item') {
							onChunk(decoded?.content ?? '', nodeId);
						}
						if (decoded?.type === 'end') {
							onEndMessage(nodeId);
						}
						if (decoded?.type === 'error') {
							onChunk(`Error: ${decoded.content ?? 'Unknown error'}`, nodeId);
						}
					} catch (error) {
						console.warn('Failed to parse JSON line:', line, error);
						// Fallback: treat as plain text chunk without nodeId
						onChunk(line, undefined);
					}
				}
			}
		}

		// Process any remaining buffer content
		if (buffer.trim()) {
			try {
				const decoded: StructuredChunk = JSON.parse(buffer);
				const nodeId = decoded.metadata?.nodeId || 'unknown';
				if (decoded?.type === 'item') {
					onChunk(decoded?.content ?? '', nodeId);
				}
			} catch (error) {
				console.warn('Failed to parse remaining buffer as JSON, treating as plain text:', buffer);
				onChunk(buffer, undefined);
			}
		}
	} finally {
		reader.releaseLock();
	}
}
