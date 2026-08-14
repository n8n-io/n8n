import { describe, expect, it } from 'vitest';

import {
	parseInputExtras,
	parseMessageBlocks,
	parseOutputDisplayBlocks,
	parseStepSummary,
	parseSystemBlocks,
	parseSystemPromptForDisplay,
	parseToolCallBlocks,
	parseToolResultBlocks,
	parseUsageSummary,
	summarizeJsonValue,
	extractObservationsBlock,
} from '../llm-step-display';

describe('llm-step-display', () => {
	it('parses string system prompts into readable blocks', () => {
		expect(parseSystemBlocks('You are helpful')).toEqual([
			{
				role: 'system',
				content: 'You are helpful',
				segments: [{ type: 'text', text: 'You are helpful' }],
			},
		]);
	});

	it('parses message content with role-first layout and collapsible metadata', () => {
		const blocks = parseMessageBlocks([
			{
				role: 'user',
				content: 'Build a weather workflow',
				providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
			},
		]);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.role).toBe('user');
		expect(blocks[0]?.content).toBe('Build a weather workflow');
		expect(blocks[0]?.segments).toEqual([{ type: 'text', text: 'Build a weather workflow' }]);
		expect(blocks[0]?.metadata).toEqual({
			providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
		});
	});

	it('extracts structured tool-call segments from multipart assistant messages', () => {
		const blocks = parseMessageBlocks([
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Here is the plan.' },
					{ type: 'tool-call', toolName: 'search_nodes', input: { query: 'webhook' } },
				],
			},
		]);

		expect(blocks[0]?.segments).toEqual([
			{ type: 'text', text: 'Here is the plan.' },
			{
				type: 'tool-call',
				name: 'search_nodes',
				payload: { query: 'webhook' },
				metadata: undefined,
			},
		]);
	});

	it('extracts structured tool-result segments from tool messages', () => {
		const blocks = parseMessageBlocks([
			{
				role: 'tool',
				content: [
					{
						type: 'tool-result',
						toolName: 'load_skill',
						output: { type: 'json', value: { ok: true, skillId: 'workflow-builder' } },
					},
				],
			},
		]);

		expect(blocks[0]?.segments?.[0]).toMatchObject({
			type: 'tool-result',
			name: 'load_skill',
			payload: { type: 'json', value: { ok: true, skillId: 'workflow-builder' } },
		});
	});

	it('summarizes json payloads for collapsed previews', () => {
		expect(summarizeJsonValue({ name: 'workflow-builder', extra: true })).toBe('{ name, extra }');
		expect(summarizeJsonValue({ type: 'json', value: { ok: true } })).toBe('{ ok: true }');
	});

	it('formats tool calls with structured payload and metadata', () => {
		const blocks = parseToolCallBlocks([
			{
				toolCallId: 'tc-1',
				toolName: 'build-workflow',
				input: { code: 'workflow code' },
			},
		]);

		expect(blocks[0]?.name).toBe('build-workflow');
		expect(blocks[0]?.kind).toBe('input');
		expect(blocks[0]?.payload).toEqual({ code: 'workflow code' });
		expect(blocks[0]?.content).toBe('{ code: workflow code }');
		expect(blocks[0]?.metadata).toEqual({ toolCallId: 'tc-1' });
	});

	it('formats tool results with structured payload', () => {
		const blocks = parseToolResultBlocks([
			{
				toolCallId: 'tc-1',
				toolName: 'build-workflow',
				output: { success: true, workflowId: 'wf-1' },
			},
		]);

		expect(blocks[0]?.name).toBe('build-workflow');
		expect(blocks[0]?.kind).toBe('output');
		expect(blocks[0]?.payload).toEqual({ success: true, workflowId: 'wf-1' });
		expect(blocks[0]?.content).toBe('{ success, workflowId }');
	});

	it('parses standalone tool-result content objects as structured segments', () => {
		const blocks = parseMessageBlocks([
			{
				type: 'tool-result',
				toolName: 'nodes',
				output: { results: [], totalResults: 0 },
				toolCallId: 'tc-1',
			},
		]);

		expect(blocks[0]?.role).toBe('tool');
		expect(blocks[0]?.segments?.[0]).toMatchObject({
			type: 'tool-result',
			name: 'nodes',
			payload: { results: [], totalResults: 0 },
			metadata: { toolCallId: 'tc-1' },
		});
		expect(blocks[0]?.metadata).toBeUndefined();
	});

	it('deduplicates overlapping tool call sources in output display blocks', () => {
		const blocks = parseOutputDisplayBlocks({
			toolCalls: [
				{
					toolCallId: 'tc-1',
					toolName: 'nodes',
					input: { action: 'search', nodeTypes: ['trigger'] },
				},
			],
			response: {
				messages: [
					{
						role: 'assistant',
						toolCallId: 'tc-1',
						providerMetadata: { anthropic: { cacheCreationInputTokens: 0 } },
						content: [
							{
								type: 'tool-call',
								toolName: 'nodes',
								toolCallId: 'tc-1',
								input: { action: 'search', nodeTypes: ['trigger'] },
								providerMetadata: { anthropic: { cacheCreationInputTokens: 0 } },
							},
						],
					},
				],
			},
		});

		expect(blocks.filter((block) => block.role === 'assistant')).toHaveLength(1);
		expect(blocks[0]?.metadata).toBeUndefined();
		expect(blocks[0]?.segments?.[0]).toMatchObject({
			type: 'tool-call',
			name: 'nodes',
		});
	});

	it('builds unified output display blocks using the same message card shape', () => {
		const blocks = parseOutputDisplayBlocks({
			toolResults: [
				{
					toolCallId: 'tc-1',
					toolName: 'nodes',
					output: { results: [], totalResults: 0 },
				},
			],
			response: {
				messages: [
					{
						role: 'assistant',
						content: [{ type: 'tool-call', toolName: 'nodes', input: { action: 'search' } }],
					},
				],
			},
		});

		expect(blocks[0]?.role).toBe('tool');
		expect(blocks[0]?.segments?.[0]).toMatchObject({
			type: 'tool-result',
			name: 'nodes',
		});
		expect(blocks[1]?.role).toBe('assistant');
		expect(blocks[1]?.segments?.[0]).toMatchObject({
			type: 'tool-call',
			name: 'nodes',
			payload: { action: 'search' },
		});
	});

	it('summarizes steps for sidebar display', () => {
		expect(
			parseStepSummary(
				{
					system: 'x'.repeat(100),
					messages: [{ role: 'user', content: 'Build a weather workflow please' }],
				},
				{
					finishReason: 'tool-calls',
					toolCalls: [{ toolName: 'search_nodes' }, { toolName: 'build-workflow' }],
					usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 },
				},
			),
		).toEqual({
			finishReason: 'tool-calls',
			toolNames: ['search_nodes', 'build-workflow'],
			usageLabel: 'in: 100 · out: 20 · total: 120',
			messagePreview: 'Build a weather workflow please',
			systemCharCount: 100,
		});
	});

	it('includes full tools and config in input extras', () => {
		expect(
			parseInputExtras({
				system: 'prompt',
				messages: [],
				tools: { search: { description: 'search' } },
				toolChoice: 'auto',
				activeTools: ['search'],
				stepNumber: 0,
				sdkStepNumber: 0,
			}),
		).toEqual({
			tools: { search: { description: 'search' } },
			toolChoice: 'auto',
			activeTools: ['search'],
		});
	});

	it('summarizes usage tokens for inline display', () => {
		expect(parseUsageSummary({ inputTokens: 100, outputTokens: 20, totalTokens: 120 })?.label).toBe(
			'in: 100 · out: 20 · total: 120',
		);
	});

	it('extracts observations block from system prompt text', () => {
		const systemPrompt = [
			'You are helpful.',
			'<observations>',
			'* CRITICAL (14:28) User is rebuilding observational memory.',
			'</observations>',
		].join('\n');

		expect(extractObservationsBlock(systemPrompt)).toEqual({
			withoutObservations: 'You are helpful.',
			observations: '* CRITICAL (14:28) User is rebuilding observational memory.',
		});
	});

	it('splits system prompt display into collapsed system and observations blocks', () => {
		const parsed = parseSystemPromptForDisplay(
			[
				'Skill loading protocol',
				'<observations>',
				'* INFO (09:15) User prefers Slack notifications',
				'</observations>',
			].join('\n'),
		);

		expect(parsed.observations).toBe('* INFO (09:15) User prefers Slack notifications');
		expect(parsed.systemBlocks[0]?.content).toBe('Skill loading protocol');
		expect(parsed.systemBlocks[0]?.segments).toEqual([
			{ type: 'text', text: 'Skill loading protocol' },
		]);
	});
});
