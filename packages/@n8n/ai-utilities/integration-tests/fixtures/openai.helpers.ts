import axios from 'axios';
import { Readable } from 'node:stream';

import type { Message, StreamChunk } from 'src';

import { OpenAIChatModel } from './openai';

type SseReply = readonly [number, Readable, Record<string, string>];

export const baseURL = 'https://api.openai.com/v1';

export const userMessage: Message = { role: 'user', content: [{ type: 'text', text: 'Hi' }] };

export const createModel = (): OpenAIChatModel =>
	new OpenAIChatModel('gpt-4o', createMockHttpRequests(), { baseURL });

export const sseEvents = (...events: object[]): SseReply => {
	const lines = events.map((event) => `data: ${JSON.stringify(event)}\n\n`);
	return [200, Readable.from(lines), { 'Content-Type': 'text/event-stream' }] as const;
};

export const collect = async (stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> => {
	const chunks: StreamChunk[] = [];
	for await (const chunk of stream) chunks.push(chunk);
	return chunks;
};

export function createSSEStream(events: Array<{ type: string; data: unknown }>): Readable {
	const stream = new Readable({
		read() {},
	});

	let eventIndex = 0;

	function sendData() {
		setTimeout(() => {
			const event = events[eventIndex];
			eventIndex++;
			switch (true) {
				case event === undefined:
					stream.push(null);
					break;
				case event.type === 'done':
					stream.push('data: [DONE]\n\n');
					stream.push(null);
					break;
				default:
					stream.push(`data: ${JSON.stringify(event.data)}\n\n`);
					sendData();
			}
		}, 50);
	}

	sendData();
	return stream;
}

export function createMockHttpRequests(): ConstructorParameters<typeof OpenAIChatModel>[1] {
	return {
		httpRequest: async (
			method: string,
			url: string,
			body?: object,
			headers?: Record<string, string>,
			abortSignal?: AbortSignal,
		) => {
			const response = await axios({
				method,
				url,
				data: body,
				signal: abortSignal,
				headers: {
					...headers,
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-api-key',
				},
				validateStatus: () => true, // Don't throw on any status
			});

			return {
				ok: response.status >= 200 && response.status < 300,
				status: response.status,
				statusText: response.statusText,
				body: response.data,
			};
		},
		openStream: async (
			method: string,
			url: string,
			body?: object,
			headers?: Record<string, string>,
			abortSignal?: AbortSignal,
		) => {
			const response = await axios({
				method,
				url,
				data: body,
				signal: abortSignal,
				headers: {
					...headers,
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-api-key',
				},
				responseType: 'stream',
				validateStatus: () => true, // Don't throw on any status
			});

			return {
				ok: response.status >= 200 && response.status < 300,
				status: response.status,
				statusText: response.statusText,
				body: response.data,
			};
		},
	};
}

export const sseReply = (events: Array<{ type: string; data: unknown }>): SseReply =>
	[
		200,
		createSSEStream(events),
		{ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
	] as const;
