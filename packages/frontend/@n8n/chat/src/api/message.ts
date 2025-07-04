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
	onChunk: (chunk: string, nodeId?: string, runIndex?: number, itemIndex?: number) => void,
	onBeginMessage: (nodeId: string, runIndex?: number, itemIndex?: number) => void,
	onEndMessage: (nodeId: string, runIndex?: number, itemIndex?: number) => void,
): Promise<void> {
	let response: Response;

	if (files.length > 0) {
		console.log('Files message');
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
		console.log('Text only message');
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
						console.log(line);
						const decoded: StructuredChunk = JSON.parse(line);
						const nodeId = decoded.metadata?.nodeId || 'unknown';
						const runIndex = decoded.metadata?.runIndex;
						const itemIndex = decoded.metadata?.itemIndex;

						if (decoded?.type === 'begin') {
							console.log('Begin message:', decoded);
							onBeginMessage(nodeId, runIndex, itemIndex);
						}
						if (decoded?.type === 'item') {
							console.log('item message:', decoded);
							onChunk(decoded?.content ?? '', nodeId, runIndex, itemIndex);
						}
						if (decoded?.type === 'end') {
							console.log('end message:', decoded);
							onEndMessage(nodeId, runIndex, itemIndex);
						}
						if (decoded?.type === 'error') {
							console.log('error message:', decoded);
							onChunk(`Error: ${decoded.content ?? 'Unknown error'}`, nodeId, runIndex, itemIndex);
							onEndMessage(nodeId, runIndex, itemIndex);
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
				const runIndex = decoded.metadata?.runIndex;
				const itemIndex = decoded.metadata?.itemIndex;
				if (decoded?.type === 'item') {
					onChunk(decoded?.content ?? '', nodeId, runIndex, itemIndex);
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
