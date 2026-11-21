import { describe, expect, it } from 'vitest';

import type { Message } from '../../../types/sdk/message';
import { hasIncompatibleModelHistory, sanitizeForeignModelMessages } from '../model-compatibility';

describe('model-compatibility', () => {
	describe('hasIncompatibleModelHistory', () => {
		it('returns false for unknown target model IDs', () => {
			const messages: Message[] = [
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [
						{
							type: 'reasoning',
							text: 'thinking',
							providerMetadata: { anthropic: { signature: 'sig-1' } },
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(messages, 'unknown')).toBe(false);
		});

		it('returns false when all assistant messages match the canonical model ID', () => {
			const messages: Message[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Search the web' }] },
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [
						{
							type: 'reasoning',
							text: 'plan',
							providerMetadata: { anthropic: { signature: 'sig-1' } },
						},
						{
							type: 'tool-call',
							toolCallId: 'srvtoolu_1',
							toolName: 'anthropic.web_search_20250305',
							input: { query: 'n8n' },
							providerExecuted: true,
							state: 'resolved',
							output: { hits: [] },
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(messages, 'anthropic/claude-sonnet-5-5')).toBe(false);
		});

		it('returns false for plain-text-only history even across different providers', () => {
			const messages: Message[] = [
				{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [{ type: 'text', text: 'Hi there!' }],
				},
			];

			expect(hasIncompatibleModelHistory(messages, 'google/gemini-3-flash')).toBe(false);
		});

		it('returns false for same-provider regular tool calls without metadata or reasoning', () => {
			const messages: Message[] = [
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-4-5',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'toolu_1',
							toolName: 'lookup',
							input: { id: 1 },
							state: 'resolved',
							output: { ok: true },
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(messages, 'anthropic/claude-sonnet-5-5')).toBe(false);
		});

		it('returns true for same-provider model change when signed reasoning or providerExecuted tools exist', () => {
			const withReasoning: Message[] = [
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-4-5',
					content: [
						{
							type: 'reasoning',
							text: 'step',
							providerMetadata: { anthropic: { signature: 'sig-1' } },
						},
						{ type: 'text', text: 'Done' },
					],
				},
			];
			const withProviderTool: Message[] = [
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-4-5',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'srvtoolu_1',
							toolName: 'anthropic.web_search_20250305',
							input: { query: 'test' },
							providerExecuted: true,
							state: 'resolved',
							output: {},
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(withReasoning, 'anthropic/claude-sonnet-5-5')).toBe(true);
			expect(hasIncompatibleModelHistory(withProviderTool, 'anthropic/claude-sonnet-5-5')).toBe(
				true,
			);
		});

		it('returns true for cross-provider switch with regular tool calls', () => {
			const messages: Message[] = [
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'toolu_1',
							toolName: 'search_notes',
							input: { q: 'signup' },
							state: 'resolved',
							output: { count: 2 },
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(messages, 'google/gemini-3-flash')).toBe(true);
		});

		it('returns true for reasoning-file, custom, provider blocks, and message providerOptions', () => {
			const base = { role: 'assistant' as const, model: 'openai/gpt-5' };

			expect(
				hasIncompatibleModelHistory(
					[{ ...base, content: [{ type: 'reasoning-file', data: 'abc', mediaType: 'image/png' }] }],
					'anthropic/claude-sonnet-5-5',
				),
			).toBe(true);
			expect(
				hasIncompatibleModelHistory(
					[{ ...base, content: [{ type: 'custom', kind: 'openai.compaction' }] }],
					'anthropic/claude-sonnet-5-5',
				),
			).toBe(true);
			expect(
				hasIncompatibleModelHistory(
					[{ ...base, content: [{ type: 'provider', value: { raw: 1 } }] }],
					'anthropic/claude-sonnet-5-5',
				),
			).toBe(true);
			expect(
				hasIncompatibleModelHistory(
					[
						{
							...base,
							providerOptions: { openai: { itemId: 'msg_1' } },
							content: [{ type: 'text', text: 'hi' }],
						},
					],
					'anthropic/claude-sonnet-5-5',
				),
			).toBe(true);
		});

		it('detects legacy messages without a model stamp using foreign-provider signals', () => {
			const legacyAnthropicSearch: Message[] = [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'srvtoolu_1',
							toolName: 'anthropic.web_search_20250305',
							input: { query: 'n8n' },
							providerExecuted: true,
							state: 'resolved',
							output: {},
						},
					],
				},
			];
			const legacyGeminiSignature: Message[] = [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'call_1',
							toolName: 'lookup',
							input: {},
							state: 'resolved',
							output: {},
							providerMetadata: { google: { thoughtSignature: 'ts-1' } },
						},
					],
				},
			];

			expect(hasIncompatibleModelHistory(legacyAnthropicSearch, 'google/gemini-3-flash')).toBe(
				true,
			);
			expect(
				hasIncompatibleModelHistory(legacyAnthropicSearch, 'anthropic/claude-sonnet-5-5'),
			).toBe(false);
			expect(
				hasIncompatibleModelHistory(
					legacyAnthropicSearch,
					'google-vertex-anthropic/claude-sonnet-5-5',
				),
			).toBe(false);
			expect(
				hasIncompatibleModelHistory(legacyGeminiSignature, 'anthropic/claude-sonnet-5-5'),
			).toBe(true);
			expect(hasIncompatibleModelHistory(legacyGeminiSignature, 'google/gemini-3-flash')).toBe(
				false,
			);
		});
	});

	describe('sanitizeForeignModelMessages', () => {
		it('returns the original array reference when no message needs sanitization', () => {
			const messages: Message[] = [
				{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [{ type: 'text', text: 'hello' }],
				},
			];

			expect(sanitizeForeignModelMessages(messages, 'google/gemini-3-flash')).toBe(messages);
		});

		it('strips reasoning, provider metadata, and degrades cross-provider tool calls to text', () => {
			const messages: Message[] = [
				{ role: 'user', content: [{ type: 'text', text: 'check weather' }] },
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
					content: [
						{
							type: 'reasoning',
							text: 'internal thoughts',
							providerMetadata: { anthropic: { signature: 'sig-1' } },
						},
						{
							type: 'tool-call',
							toolCallId: 'srvtoolu_1',
							toolName: 'anthropic.web_search_20250305',
							input: { query: 'weather berlin' },
							providerExecuted: true,
							state: 'resolved',
							output: { temp: 18 },
						},
						{
							type: 'tool-call',
							toolCallId: 'toolu_2',
							toolName: 'save_note',
							input: { note: 'sunny' },
							state: 'rejected',
							error: 'disk full',
						},
						{
							type: 'text',
							text: 'It is 18C.',
							providerMetadata: { anthropic: { foo: 'bar' } },
						},
					],
				},
			];

			const sanitized = sanitizeForeignModelMessages(messages, 'google/gemini-3-flash');

			expect(sanitized).toHaveLength(2);
			expect(sanitized[0]).toBe(messages[0]);
			expect(sanitized[1].providerOptions).toBeUndefined();
			expect(sanitized[1].content).toEqual([
				{
					type: 'text',
					text: '[Previous tool call anthropic.web_search_20250305 input={"query":"weather berlin"} output={"temp":18}]',
				},
				{
					type: 'text',
					text: '[Previous tool call save_note input={"note":"sunny"} error=disk full]',
				},
				{
					type: 'text',
					text: 'It is 18C.',
				},
			]);
		});

		it('keeps same-provider regular tool calls while stripping metadata and dropping reasoning', () => {
			const messages: Message[] = [
				{
					role: 'assistant',
					model: 'google/gemini-2.5-pro',
					content: [
						{
							type: 'reasoning',
							text: 'plan',
							providerMetadata: { google: { thoughtSignature: 'sig-r' } },
						},
						{
							type: 'tool-call',
							toolCallId: 'call_1',
							toolName: 'lookup',
							input: { id: 42 },
							state: 'resolved',
							output: { name: 'Acme' },
							providerMetadata: { google: { thoughtSignature: 'sig-tc' } },
						},
					],
				},
			];

			const sanitized = sanitizeForeignModelMessages(messages, 'google/gemini-3-flash');

			expect(sanitized).toHaveLength(1);
			expect(sanitized[0].content).toEqual([
				{
					type: 'tool-call',
					toolCallId: 'call_1',
					toolName: 'lookup',
					input: { id: 42 },
					state: 'resolved',
					output: { name: 'Acme' },
				},
			]);
		});

		it('drops assistant messages that become empty after removing foreign-only blocks', () => {
			const messages: Message[] = [
				{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
				{
					role: 'assistant',
					model: 'anthropic/claude-sonnet-5-5',
					content: [
						{
							type: 'reasoning',
							text: 'only thinking',
							providerMetadata: { anthropic: { signature: 'sig-1' } },
						},
					],
				},
				{ role: 'user', content: [{ type: 'text', text: 'next' }] },
			];

			const sanitized = sanitizeForeignModelMessages(messages, 'openai/gpt-5');

			expect(sanitized).toHaveLength(2);
			expect(sanitized.map((m) => m.role)).toEqual(['user', 'user']);
		});
	});
});
