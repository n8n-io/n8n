import type { TextStreamPart, ToolSet } from 'ai';

import { PartialResponseAccumulator } from '../partial-response-accumulator';

function collect(chunks: Array<TextStreamPart<ToolSet>>) {
	const accumulator = new PartialResponseAccumulator();
	for (const chunk of chunks) {
		accumulator.add(chunk);
	}
	return accumulator.toAgentMessages();
}

describe('PartialResponseAccumulator', () => {
	it('folds text deltas into one assistant text block without requiring text-end', () => {
		const messages = collect([
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', text: 'hello ' },
			{ type: 'text-delta', id: 'text-1', text: 'world' },
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'hello world' }],
			},
		]);
	});

	it('creates a text block when a text-delta arrives without text-start', () => {
		const messages = collect([{ type: 'text-delta', id: 'late-text', text: 'partial' }]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'partial' }],
			},
		]);
	});

	it('keeps first-seen ordering for interleaved text ids', () => {
		const messages = collect([
			{ type: 'text-start', id: 'first' },
			{ type: 'text-delta', id: 'first', text: 'A' },
			{ type: 'text-start', id: 'second' },
			{ type: 'text-delta', id: 'second', text: 'B' },
			{ type: 'text-delta', id: 'first', text: 'C' },
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'AC' },
					{ type: 'text', text: 'B' },
				],
			},
		]);
	});

	it('drops empty text blocks and source chunks', () => {
		const messages = collect([
			{ type: 'text-start', id: 'empty' },
			{
				type: 'source',
				sourceType: 'url',
				id: 'source-1',
				url: 'https://example.com',
			},
		]);

		expect(messages).toEqual([]);
	});

	it('preserves generated file parts on the assistant message', () => {
		const messages = collect([
			{
				type: 'file',
				file: {
					base64: 'aGVsbG8=',
					uint8Array: new Uint8Array([104, 101, 108, 108, 111]),
					mediaType: 'text/plain',
				},
			},
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [{ type: 'file', data: 'aGVsbG8=', mediaType: 'text/plain' }],
			},
		]);
	});

	it('settles tool calls with matching tool results', () => {
		const messages = collect([
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
			},
			{
				type: 'tool-result',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
				output: { result: 'found' },
			},
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'lookup',
						input: { query: 'n8n' },
						state: 'resolved',
						output: { result: 'found' },
					},
				],
			},
		]);
	});

	it('marks matching tool calls as rejected on tool-error chunks', () => {
		const messages = collect([
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
			},
			{
				type: 'tool-error',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: { query: 'n8n' },
				error: 'provider failed',
			},
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'lookup',
						input: { query: 'n8n' },
						state: 'rejected',
						error: 'provider failed',
					},
				],
			},
		]);
	});

	it('drops orphan tool results because they cannot be replayed safely', () => {
		const messages = collect([
			{
				type: 'tool-result',
				toolCallId: 'missing-call',
				toolName: 'lookup',
				input: {},
				output: { result: 'found' },
			},
		]);

		expect(messages).toEqual([]);
	});

	it('retains provider metadata on reconstructed content parts', () => {
		const providerMetadata = { google: { thoughtSignature: 'signature' } };
		const messages = collect([
			{ type: 'text-start', id: 'text-1', providerMetadata },
			{ type: 'text-delta', id: 'text-1', text: 'hello' },
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: {},
				providerMetadata,
			},
		]);

		expect(messages).toEqual([
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'hello', providerOptions: providerMetadata },
					{
						type: 'tool-call',
						toolCallId: 'call-1',
						toolName: 'lookup',
						input: {},
						state: 'pending',
						providerOptions: providerMetadata,
					},
				],
			},
		]);
	});
});
