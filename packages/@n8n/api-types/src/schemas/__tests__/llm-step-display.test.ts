import { describe, expect, it } from 'vitest';

import {
	parseInputExtras,
	parseMessageBlocks,
	parseOutputDisplayBlocks,
	parseStepCacheBreaks,
	parseStepConfig,
	parseStepSummary,
	parseSystemBlocks,
	parseSystemPromptForDisplay,
	parseToolCallBlocks,
	parseToolResultBlocks,
	parseUsageSummary,
	summarizeJsonValue,
	extractObservationsBlock,
	stepInstructions,
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

	it('excludes AI SDK instructions from input extras', () => {
		expect(
			parseInputExtras({
				instructions: 'You are helpful',
				messages: [],
				callId: 'call-1',
			}),
		).toEqual({ callId: 'call-1' });
	});

	it('leaves config, tools, duplicated prompts, and empty values out of input extras', () => {
		expect(
			parseInputExtras({
				system: 'prompt',
				messages: [],
				modelId: 'claude',
				provider: 'anthropic.messages',
				providerOptions: { anthropic: { effort: 'medium' } },
				tools: { search: { description: 'search' } },
				stepTools: [{ name: 'search' }],
				toolChoice: 'auto',
				stepToolChoice: { type: 'auto' },
				promptMessages: [{ role: 'system', content: 'prompt' }],
				steps: [],
				runtimeContext: {},
				activeTools: ['search'],
				stepNumber: 0,
				sdkStepNumber: 0,
			}),
		).toEqual({ activeTools: ['search'] });
	});

	describe('parseStepConfig', () => {
		it('returns model settings and the tools the model received', () => {
			expect(
				parseStepConfig({
					modelId: 'claude-opus-5-5',
					provider: 'anthropic.messages',
					providerOptions: {
						anthropic: {
							thinking: { type: 'adaptive' },
							effort: 'medium',
							cacheControl: { type: 'ephemeral' },
						},
					},
					stepToolChoice: { type: 'auto' },
					stepTools: [
						{
							type: 'function',
							name: 'search',
							description: 'Search things',
							inputSchema: { type: 'object' },
						},
					],
				}),
			).toEqual({
				settings: [
					{ label: 'model', value: 'claude-opus-5-5' },
					{ label: 'provider', value: 'anthropic.messages' },
					{ label: 'thinking.type', value: 'adaptive' },
					{ label: 'effort', value: 'medium' },
					{ label: 'cacheControl.type', value: 'ephemeral' },
					{ label: 'tool choice', value: 'auto' },
				],
				tools: [
					{
						name: 'search',
						description: 'Search things',
						inputSchema: { type: 'object' },
						estimatedTokens: 20,
					},
				],
				toolsEstimatedTokens: 20,
			});
		});

		it('keeps provider names when several provider namespaces are set', () => {
			expect(
				parseStepConfig({
					providerOptions: { anthropic: { effort: 'high' }, openai: { store: false } },
				})?.settings,
			).toEqual([
				{ label: 'anthropic.effort', value: 'high' },
				{ label: 'openai.store', value: 'false' },
			]);
		});

		it('names the forced tool in the tool choice', () => {
			expect(
				parseStepConfig({ toolChoice: { type: 'tool', toolName: 'search' } })?.settings,
			).toEqual([{ label: 'tool choice', value: 'tool: search' }]);
		});

		it('falls back to the tool set and skips serialized Zod schemas', () => {
			expect(
				parseStepConfig({
					tools: {
						search: {
							description: 'Search things',
							inputSchema: { _def: { typeName: 'ZodObject' }, parse: '[function parse]' },
						},
						fetch: { description: 'Fetch a page', inputSchema: { type: 'object' } },
					},
				})?.tools,
			).toEqual([
				{
					name: 'search',
					description: 'Search things',
					inputSchema: undefined,
					estimatedTokens: 12,
				},
				{
					name: 'fetch',
					description: 'Fetch a page',
					inputSchema: { type: 'object' },
					estimatedTokens: 20,
				},
			]);
		});

		it('returns undefined when the step has no config', () => {
			expect(parseStepConfig({ messages: [] })).toBeUndefined();
			expect(parseStepConfig(undefined)).toBeUndefined();
		});
	});

	it('breaks usage down into token rows and provider facts', () => {
		const usage = {
			inputTokens: 32437,
			inputTokenDetails: { noCacheTokens: 4, cacheReadTokens: 0, cacheWriteTokens: 32433 },
			outputTokens: 208,
			outputTokenDetails: { textTokens: 78, reasoningTokens: 130 },
			totalTokens: 32645,
			raw: {
				input_tokens: 4,
				cache_creation: { ephemeral_5m_input_tokens: 32433 },
				service_tier: 'standard',
				inference_geo: 'global',
			},
		};

		const summary = parseUsageSummary(usage);

		expect(summary?.rows).toEqual([
			{
				label: 'input',
				tokens: 32437,
				details: [
					{ label: 'uncached', tokens: 4 },
					{ label: 'cache read', tokens: 0 },
					{ label: 'cache write', tokens: 32433 },
				],
			},
			{
				label: 'output',
				tokens: 208,
				details: [
					{ label: 'text', tokens: 78 },
					{ label: 'reasoning', tokens: 130 },
				],
			},
			{ label: 'total', tokens: 32645, details: [] },
		]);
		expect(summary?.settings).toEqual([
			{ label: 'service tier', value: 'standard' },
			{ label: 'inference geo', value: 'global' },
		]);
		expect(summary?.metadata).toBe(usage);
	});

	it('labels unknown token details from their key', () => {
		expect(
			parseUsageSummary({ inputTokens: 10, inputTokenDetails: { audioInputTokens: 3 } })?.rows[0]
				?.details,
		).toEqual([{ label: 'audio input', tokens: 3 }]);
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

	describe('stepInstructions', () => {
		it('reads the v7 `instructions` field', () => {
			expect(stepInstructions({ instructions: 'You are helpful.' })).toBe('You are helpful.');
		});

		it('falls back to the pre-v7 `system` field for older snapshots', () => {
			expect(stepInstructions({ system: 'You are helpful.' })).toBe('You are helpful.');
		});

		it('prefers `instructions` when a snapshot somehow carries both', () => {
			expect(stepInstructions({ instructions: 'new', system: 'old' })).toBe('new');
		});

		it('returns undefined for a missing input', () => {
			expect(stepInstructions(undefined)).toBeUndefined();
		});

		// The shape real captures carry: `{ role, content, providerOptions }`.
		it('lets parseStepSummary size a v7 instructions object', () => {
			const summary = parseStepSummary(
				{ instructions: { role: 'system', content: 'x'.repeat(120) } },
				{ finishReason: 'stop' },
			);
			expect(summary.systemCharCount).toBe(120);
		});

		it('still sizes a pre-v7 string system prompt', () => {
			const summary = parseStepSummary({ system: 'x'.repeat(42) }, { finishReason: 'stop' });
			expect(summary.systemCharCount).toBe(42);
		});
	});

	describe('parseStepCacheBreaks', () => {
		const baseInput = {
			instructions: 'system prompt',
			stepTools: [{ name: 'search' }],
			modelId: 'claude',
			providerOptions: { anthropic: { effort: 'medium' } },
		};

		function step(
			cacheReadTokens: number,
			cacheWriteTokens: number,
			options: { input?: Record<string, unknown>; timestamp?: string } = {},
		) {
			return {
				input: { ...baseInput, ...options.input },
				output: {
					usage: { inputTokenDetails: { cacheReadTokens, cacheWriteTokens } },
					response: { timestamp: options.timestamp ?? '2026-01-01T00:00:00.000Z' },
				},
			};
		}

		it('reports no break when each step reads what the previous step cached', () => {
			expect(parseStepCacheBreaks([step(0, 30000), step(30000, 2000), step(32000, 500)])).toEqual([
				undefined,
				undefined,
				undefined,
			]);
		});

		it('ignores a shortfall smaller than the minimum cacheable prefix', () => {
			expect(parseStepCacheBreaks([step(0, 30000), step(29500, 2000)])).toEqual([
				undefined,
				undefined,
			]);
		});

		it('reports a tool list change as the cause', () => {
			const breaks = parseStepCacheBreaks([
				step(0, 30000),
				step(0, 42000, { input: { stepTools: [{ name: 'search' }, { name: 'fetch' }] } }),
			]);

			expect(breaks[1]).toEqual({
				expectedReadTokens: 30000,
				readTokens: 0,
				lostTokens: 30000,
				cause: 'tools',
			});
		});

		it('reports a system prompt change as the cause', () => {
			const breaks = parseStepCacheBreaks([
				step(0, 30000),
				step(12000, 20000, { input: { instructions: 'changed prompt' } }),
			]);

			expect(breaks[1]).toMatchObject({ lostTokens: 18000, cause: 'system' });
		});

		it('reports a request settings change as the cause', () => {
			const breaks = parseStepCacheBreaks([
				step(0, 30000),
				step(0, 30000, { input: { providerOptions: { anthropic: { effort: 'high' } } } }),
			]);

			expect(breaks[1]?.cause).toBe('settings');
		});

		function cachedInstructions(cacheControl: Record<string, unknown>) {
			return {
				role: 'system',
				content: 'system prompt',
				providerOptions: { anthropic: { cacheControl } },
			};
		}

		it('reports cache expiry when more than the default cache lifetime passes', () => {
			const input = { instructions: cachedInstructions({ type: 'ephemeral' }) };
			const breaks = parseStepCacheBreaks([
				step(0, 30000, { input, timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { input, timestamp: '2026-01-01T00:06:00.000Z' }),
			]);

			expect(breaks[1]).toMatchObject({ cause: 'expired', cacheTtlMinutes: 5 });
		});

		it('uses the cache lifetime that the step requested', () => {
			const input = { instructions: cachedInstructions({ type: 'ephemeral', ttl: '1h' }) };
			const withinTtl = parseStepCacheBreaks([
				step(0, 30000, { input, timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { input, timestamp: '2026-01-01T00:06:00.000Z' }),
			]);
			const pastTtl = parseStepCacheBreaks([
				step(0, 30000, { input, timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { input, timestamp: '2026-01-01T01:01:00.000Z' }),
			]);

			expect(withinTtl[1]?.cause).toBe('messages');
			expect(pastTtl[1]).toMatchObject({ cause: 'expired', cacheTtlMinutes: 60 });
		});

		it('uses the OpenAI prompt cache retention', () => {
			const input = { providerOptions: { openai: { promptCacheRetention: '24h' } } };
			const withinRetention = parseStepCacheBreaks([
				step(0, 30000, { input, timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { input, timestamp: '2026-01-01T02:00:00.000Z' }),
			]);
			const pastRetention = parseStepCacheBreaks([
				step(0, 30000, { input, timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { input, timestamp: '2026-01-02T01:00:00.000Z' }),
			]);

			expect(withinRetention[1]?.cause).toBe('messages');
			expect(pastRetention[1]).toMatchObject({ cause: 'expired', cacheTtlMinutes: 1440 });
		});

		it('does not report expiry when the cache lifetime is unknown', () => {
			const breaks = parseStepCacheBreaks([
				step(0, 30000, { timestamp: '2026-01-01T00:00:00.000Z' }),
				step(0, 30000, { timestamp: '2026-01-01T00:06:00.000Z' }),
			]);

			expect(breaks[1]?.cause).toBe('messages');
		});

		it('treats a missing cache write count as zero', () => {
			const readOnly = (cacheReadTokens: number) => ({
				input: baseInput,
				output: { usage: { inputTokenDetails: { cacheReadTokens } } },
			});

			expect(parseStepCacheBreaks([readOnly(30000), readOnly(30000), readOnly(0)])).toEqual([
				undefined,
				undefined,
				{ expectedReadTokens: 30000, readTokens: 0, lostTokens: 30000, cause: 'messages' },
			]);
		});

		it('falls back to a message change when the prompt prefix and timing did not change', () => {
			expect(parseStepCacheBreaks([step(0, 30000), step(0, 30000)])[1]?.cause).toBe('messages');
		});

		it('skips steps without cache token details', () => {
			expect(parseStepCacheBreaks([step(0, 30000), { input: baseInput, output: {} }])).toEqual([
				undefined,
				undefined,
			]);
		});
	});
});
