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
	onChunk: (chunk: string, nodeId?: string, runIndex?: number) => void,
	onBeginMessage: (nodeId: string, runIndex?: number) => void,
	onEndMessage: (nodeId: string, runIndex?: number) => void,
): Promise<void> {
	let response: Response;

	if (files.length > 0) {
		// Handle file uploads with FormData for streaming
		const formData = new FormData();
		formData.append('action', 'sendMessage');
		formData.append(options.chatSessionKey as string, sessionId);
		formData.append(options.chatInputKey as string, message);

		if (options.metadata) {
			formData.append('metadata', JSON.stringify(options.metadata));
		}

		// Add all files
		for (const file of files) {
			formData.append('files', file);
		}

		response = await fetch(options.webhookUrl, {
			method: 'POST',
			headers: {
				Accept: 'text/plain',
				...options.webhookConfig?.headers,
			},
			body: formData,
		});
	} else {
		// Handle text-only messages with JSON
		const body = {
			action: 'sendMessage',
			[options.chatSessionKey as string]: sessionId,
			[options.chatInputKey as string]: message,
			...(options.metadata ? { metadata: options.metadata } : {}),
		};

		response = await fetch(options.webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/plain',
				...options.webhookConfig?.headers,
			},
			body: JSON.stringify(body),
		});
	}

	if (!response.ok) {
		const errorText = await response.text();
		console.error('HTTP error response:', response.status, errorText);
		throw new Error(`Error while sending message. Error: ${errorText}`);
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
						const runIndex = decoded.metadata?.runIndex;

						if (decoded?.type === 'begin') {
							onBeginMessage(nodeId, runIndex);
						}
						if (decoded?.type === 'item') {
							onChunk(decoded?.content ?? '', nodeId, runIndex);
						}
						if (decoded?.type === 'end') {
							onEndMessage(nodeId, runIndex);
						}
						if (decoded?.type === 'error') {
							onChunk(`Error: ${decoded.content ?? 'Unknown error'}`, nodeId, runIndex);
							onEndMessage(nodeId, runIndex);
						}
					} catch (error) {
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
				const runIndex = decoded.metadata?.runIndex;
				if (decoded?.type === 'item') {
					onChunk(decoded?.content ?? '', nodeId, runIndex);
				}
			} catch (error) {
				onChunk(buffer, undefined);
			}
		}
	} finally {
		reader.releaseLock();
	}
}
