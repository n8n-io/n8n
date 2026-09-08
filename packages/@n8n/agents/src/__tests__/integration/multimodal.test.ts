import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	getModel,
	findLastTextContent,
} from './helpers';
import { Agent } from '../../index';
import type { Message, StreamChunk } from '../../index';

const describe = describeIf('anthropic');

/** Convert a base64 string to Uint8Array for the AI SDK file part. */
function base64ToUint8Array(base64: string): Uint8Array {
	return Uint8Array.from(Buffer.from(base64, 'base64'));
}

// Valid 1×1 red PNG pixel
const RED_PIXEL_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
// Valid 1×1 blue PNG pixel
const BLUE_PIXEL_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC';

describe('multimodal integration', () => {
	it('accepts an image via binary data and references it in the response', async () => {
		const messages: Message[] = [
			{
				role: 'user',
				content: [
					{
						type: 'file',
						mediaType: 'image/png',
						data: base64ToUint8Array(RED_PIXEL_BASE64),
					},
					{
						type: 'text',
						text: 'What color is this image? Reply with just the color name, nothing else.',
					},
				],
			},
		];

		const agent = new Agent('vision-test')
			.model(getModel('anthropic'))
			.instructions('You are a vision assistant. Describe images concisely.');

		const { stream: fullStream } = await agent.stream(messages);

		const chunks = await collectStreamChunks(fullStream);
		const textChunks = chunksOfType(chunks, 'text-delta') as Array<
			StreamChunk & { type: 'text-delta' }
		>;
		expect(textChunks.length).toBeGreaterThan(0);

		const text = textChunks.map((c) => c.delta).join('');
		expect(text).toBeTruthy();
		expect(text).toMatch(/red/i);
	});

	it('accepts multiple content blocks (text + image) in a single message', async () => {
		const messages: Message[] = [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'I have two questions.' },
					{
						type: 'file',
						mediaType: 'image/png',
						data: base64ToUint8Array(BLUE_PIXEL_BASE64),
					},
					{
						type: 'text',
						text: 'Question 1: Can you see an image above? Answer only YES or NO. Question 2: What is 2+2? Answer both briefly.',
					},
				],
			},
		];

		const agent = new Agent('multi-content-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant with vision capabilities. Be concise.');

		const { stream: fullStream } = await agent.stream(messages);
		const chunks = await collectStreamChunks(fullStream);
		const textChunks = chunksOfType(chunks, 'text-delta') as Array<
			StreamChunk & { type: 'text-delta' }
		>;
		expect(textChunks.length).toBeGreaterThan(0);

		const text = textChunks.map((c) => c.delta).join('');
		expect(text).toBeTruthy();
		expect(text).toMatch(/4/);
		expect(text).toMatch(/yes/i);
	});

	it('passes image content through the run() path (non-streaming)', async () => {
		const messages: Message[] = [
			{
				role: 'user',
				content: [
					{
						type: 'file',
						mediaType: 'image/png',
						data: base64ToUint8Array(RED_PIXEL_BASE64),
					},
					{
						type: 'text',
						text: 'What color is this image? Reply with just the color name.',
					},
				],
			},
		];

		const agent = new Agent('vision-run-test')
			.model(getModel('anthropic'))
			.instructions('You are a vision assistant. Be concise.');

		const result = await agent.generate(messages);
		const text = findLastTextContent(result.messages);
		expect(text).toBeTruthy();
		expect(text).toMatch(/red/i);
	});
});
