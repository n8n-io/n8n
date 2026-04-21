/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/naming-convention, @typescript-eslint/require-await -- tests intentionally access private bridge internals via any; `StreamingMarkdownRenderer` mirrors the chat SDK's exported class name; mock factories declare async for call-site parity */
import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import { mock } from 'jest-mock-extended';
import type { Logger } from 'n8n-workflow';

import type { AgentsService } from '../../agents.service';
import { AgentChatBridge } from '../agent-chat-bridge';
import type { ComponentMapper } from '../component-mapper';

// Mock the chat SDK loader before the bridge module imports it. The fake
// StreamingMarkdownRenderer mimics the real one's contract closely enough
// to exercise our integration: it holds unclosed `**` and closes on finish.
jest.mock('../esm-loader', () => ({
	loadChatSdk: async () => ({
		StreamingMarkdownRenderer: class FakeRenderer {
			private accumulated = '';
			push(chunk: string) {
				this.accumulated += chunk;
			}
			getCommittableText(): string {
				// Hold back an unclosed trailing `**` region.
				const text = this.accumulated;
				const stars = (text.match(/\*\*/g) ?? []).length;
				if (stars % 2 === 0) return text;
				const lastOpenIdx = text.lastIndexOf('**');
				return text.slice(0, lastOpenIdx);
			}
			finish(): string {
				const stars = (this.accumulated.match(/\*\*/g) ?? []).length;
				return stars % 2 === 1 ? `${this.accumulated}**` : this.accumulated;
			}
		},
	}),
}));

function fakeBot() {
	return {
		onNewMention: () => {},
		onSubscribedMessage: () => {},
		onAction: () => {},
	};
}

async function drain(iterable: AsyncIterable<string>): Promise<string[]> {
	const out: string[] = [];
	for await (const c of iterable) out.push(c);
	return out;
}

async function runConsumeStream(
	chunks: StreamChunk[],
	integrationType: string,
): Promise<{ posts: string[][]; allText: string[] }> {
	const posts: string[][] = [];
	const thread = {
		id: 't',
		subscribe: async () => {},
		post: async (content: unknown) => {
			if (content && typeof content === 'object' && Symbol.asyncIterator in content) {
				posts.push(await drain(content as AsyncIterable<string>));
			}
			return { id: `m${posts.length}`, threadId: 't' };
		},
	};

	const bridge = AgentChatBridge.create(
		fakeBot(),
		'agent-1',
		mock<AgentsService>(),
		mock<CredentialProvider>(),
		mock<ComponentMapper>(),
		mock<Logger>(),
		'user-1',
		'project-1',
		integrationType,
	);

	async function* stream() {
		for (const c of chunks) yield c;
	}

	await (bridge as any).consumeStream(stream(), thread);

	return { posts, allText: posts.map((p) => p.join('')) };
}

describe('AgentChatBridge — committable-text streaming for Telegram', () => {
	it('holds back unclosed `**` and releases when the closing marker arrives', async () => {
		const { posts, allText } = await runConsumeStream(
			[
				{ type: 'text-delta', delta: 'hello ' },
				{ type: 'text-delta', delta: '**bold' },
				{ type: 'text-delta', delta: ' text**' },
				{ type: 'text-delta', delta: ' done' },
			] as StreamChunk[],
			'telegram',
		);

		// Final accumulated text across the streaming iterable must be balanced.
		expect(allText[0]).toBe('hello **bold text** done');
		expect(posts).toHaveLength(1);

		// At least one delta was held back between the open `**` and close `**`.
		// Specifically: "**bold" was not yielded immediately; it waited for " text**".
		const deltas = posts[0];
		const firstBoldYield = deltas.findIndex((d) => d.includes('**'));
		expect(firstBoldYield).toBeGreaterThan(0); // not the very first yield
		expect(deltas.slice(0, firstBoldYield).join('')).toBe('hello ');
	});

	it('flushes via finish() if the stream ends with an unclosed marker', async () => {
		const { allText } = await runConsumeStream(
			[
				{ type: 'text-delta', delta: 'oops **never' },
				{ type: 'text-delta', delta: ' closes' },
			] as StreamChunk[],
			'telegram',
		);

		// finish() auto-closes so the chat SDK's final raw-accumulated edit is balanced.
		expect(allText[0]).toBe('oops **never closes**');
	});

	it('does not hold anything back when text is already balanced', async () => {
		const { allText } = await runConsumeStream(
			[
				{ type: 'text-delta', delta: 'plain ' },
				{ type: 'text-delta', delta: 'text' },
			] as StreamChunk[],
			'telegram',
		);

		expect(allText[0]).toBe('plain text');
	});

	it('runs the renderer per segment (tool-call-suspended splits segments)', async () => {
		const { posts } = await runConsumeStream(
			[
				{ type: 'text-delta', delta: 'seg1 **bold' },
				{
					type: 'tool-call-suspended',
					runId: 'r',
					toolCallId: 'tc',
					toolName: 'noop',
				} as unknown as StreamChunk,
				{ type: 'text-delta', delta: 'seg2 **other**' },
			] as StreamChunk[],
			'telegram',
		);

		// Each segment gets its own finish() flush, producing balanced text independently.
		expect(posts).toHaveLength(2);
		expect(posts[0].join('')).toBe('seg1 **bold**');
		expect(posts[1].join('')).toBe('seg2 **other**');
	});
});

describe('AgentChatBridge — Slack (native streaming) yields raw deltas', () => {
	it('passes deltas through untouched, no committable filter', async () => {
		const { posts } = await runConsumeStream(
			[
				{ type: 'text-delta', delta: 'hello ' },
				{ type: 'text-delta', delta: '**bold' },
			] as StreamChunk[],
			'slack',
		);

		expect(posts).toHaveLength(1);
		expect(posts[0]).toEqual(['hello ', '**bold']);
	});
});
