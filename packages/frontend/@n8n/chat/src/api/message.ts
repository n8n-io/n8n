import { get, post, postWithFiles } from '@n8n/chat/api/generic';
import type {
	ChatOptions,
	LoadPreviousSessionResponse,
	SendMessageResponse,
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
	onChunk: (chunk: string) => void,
): Promise<void> {
	// Note: File uploads are not currently supported with streaming
	if (files.length > 0) {
		throw new Error('File uploads are not supported with streaming responses');
	}

	const body = {
		action: 'sendMessage',
		[options.chatSessionKey as string]: sessionId,
		[options.chatInputKey as string]: message,
		...(options.metadata ? { metadata: options.metadata } : {}),
	};

	console.log('Starting streaming request to:', options.webhookUrl);
	console.log('Request body:', body);

	const response = await fetch(options.webhookUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...options.webhookConfig?.headers,
		},
		body: JSON.stringify(body),
	});

	console.log('Response status:', response.status);
	console.log('Response headers:', Object.fromEntries(response.headers.entries()));

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	// Check if response is actually streaming
	const contentType = response.headers.get('content-type');
	console.log('Content-Type:', contentType);

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('Response body is not readable');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		console.log('Starting to read streaming response...');
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				console.log('Streaming response complete');
				break;
			}

			const chunk = decoder.decode(value, { stream: true });

			if(chunk.includes('\n')) {
				const decoded = JSON.parse(chunk.substring(0, chunk.indexOf('\n')));
				console.log('Received raw chunk:', chunk);
				if(decoded?.type === 'progress'){
					onChunk(decoded?.output);
				}
				buffer += chunk.substring(chunk.indexOf('\n'))
			}

			// Try to process complete JSON objects immediately
		}
	} finally {
		reader.releaseLock();
	}
}
