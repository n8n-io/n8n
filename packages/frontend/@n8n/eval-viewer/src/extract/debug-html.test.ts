import { describe, expect, it } from 'vitest';

import { parseDebugHtml, turnOfRuns, unescapeHtml } from './debug-html';

const escape = (value: unknown) =>
	JSON.stringify(value, null, 2)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;');

const block = (label: string, value: unknown) =>
	`<details class="json-panel"><summary><span class="json-label">${label}</span> …</summary><pre class="json-block"><code>${escape(value)}</code></pre></details>`;

const toolCall = (name: string, id: string) =>
	`<div class="segment-block segment-tool-call"><div class="segment-kind">Tool call · <code>${name}</code></div>${block('Input', { a: 1 })}${block('Metadata', { toolCallId: id })}</div>`;

const toolResult = (name: string, id: string, texts: string[]) =>
	`<div class="segment-block segment-tool-result"><div class="segment-kind">Tool result · <code>${name}</code></div>${block('Output', { type: 'content', value: texts.map((text) => ({ type: 'text', text })) })}${block('Metadata', { toolCallId: id })}</div>`;

const reasoning = (text: string) =>
	`<div class="segment-block segment-reasoning"><div class="segment-kind">Reasoning</div><p class="segment-text">${text}</p></div>`;

const SKILL_TEXT = [
	'[Skill: "setup"]',
	'[Skill directory: "/skills/setup"]',
	'[Skill path: "/skills/setup/SKILL.md"]',
	'[Skill hash: "abc"]',
	'[Linked files — load via load_skill with filePath: "references/a.md"]',
	'',
	'# Setup',
	'',
	'Use "this" & that.',
].join('\n');

const system = (text: string) =>
	`<div class="detail-subsection"><div class="detail-subsection-title">System</div><div class="content-block role-system"><div class="content-role">system</div><p class="segment-text">${text}</p></div></div>`;

const tools = (defs: Array<[string, string]>) =>
	`<details class="json-panel"><summary>Tools (${defs.length}) · ≈10 tokens</summary>${defs
		.map(
			([name, description]) =>
				`<details class="json-panel"><summary><code>${name}</code> ≈5 tokens</summary><p class="segment-text">${description}</p>${block('Input schema', { type: 'object', title: name })}</details>`,
		)
		.join('')}</details>`;

function stepPanel(
	index: number,
	timestamp: string,
	stepTimeMs: number,
	calls: Array<[string, string]>,
	usage = true,
	{
		input = [] as string[],
		thinking = [] as string[],
		toolDefs = [['nodes', 'Find &lt;nodes&gt;']] as Array<[string, string]>,
	} = {},
) {
	return [
		`<div class="step-panel${index > 0 ? ' hidden' : ''}" data-step-index="${index}"><div class="step-detail-inner">`,
		`<div class="detail-section"><div class="detail-section-title">Input</div>${system('You build &quot;workflows&quot;.')}${block('Metadata', { x: 1 })}`,
		// A tool call in the input (an earlier assistant message) must not count for this step.
		toolCall('earlier', 'toolu_input'),
		// Earlier reasoning in the input must not count for this step.
		reasoning('earlier thought'),
		...input,
		'</div>',
		'<div class="detail-section"><div class="detail-section-title">Output</div>',
		...thinking.map(reasoning),
		...calls.map(([name, id]) => toolCall(name, id)),
		'</div>',
		tools(toolDefs),
		usage
			? block('Raw usage', {
					inputTokens: 1000,
					outputTokens: 50,
					inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 900, cacheWriteTokens: 90 },
				})
			: '',
		block('Output extras', {
			rawFinishReason: calls.length ? 'tool_use' : 'end_turn',
			model: { modelId: 'claude-test' },
			responseMeta: { timestamp, modelId: 'claude-test' },
			performance: { stepTimeMs, toolExecutionMs: {} },
		}),
		'</div></div>',
	].join('\n');
}

const section = (thread: string, runs: string[][]) =>
	[
		'<section class="debug-case" id="tc-case" data-case-index="0">',
		`<span class="meta-item mono">thread ${thread}</span>`,
		...runs.map(
			(_, i) =>
				`<button type="button" class="run-btn" data-run-index="${i}"><span class="run-label">Run &amp; ${i}</span><span class="run-meta">x</span></button>`,
		),
		...runs.map(
			(panels, i) =>
				`<div class="run-panel${i > 0 ? ' hidden' : ''}" data-run-index="${i}">${panels.join('\n')}</div>`,
		),
		'</section>',
	].join('\n');

const THREAD_A = '11111111-2222-3333-4444-555555555555';
const THREAD_B = '66666666-7777-8888-9999-000000000000';

const html = [
	'<html><head><style>.debug-case { color: red; }</style></head><body>',
	section(THREAD_A, [
		[
			stepPanel(
				0,
				'2026-10-04T10:00:00.000Z',
				2000,
				[
					['load_skill', 'toolu_1'],
					['nodes', 'toolu_2'],
				],
				true,
				{ thinking: ['I need the &#39;setup&#39; skill.\n\n', 'Then the nodes.'] },
			),
			stepPanel(1, '2026-10-04T10:00:05.000Z', 1000, [['build-workflow', 'toolu_3']], true, {
				toolDefs: [
					['nodes', 'Find &lt;nodes&gt;'],
					['load_tool', 'Load a tool'],
				],
				input: [
					toolResult('load_skill', 'toolu_1', ['{"skillId":"setup","active":true}', SKILL_TEXT]),
					toolResult('nodes', 'toolu_2', ['[Skill: "not a skill tool"]']),
				],
			}),
			stepPanel(2, '2026-10-04T10:00:20.000Z', 500, []),
		],
		[stepPanel(0, '2026-10-04T10:01:00.000Z', 700, [], false)],
	]),
	section(THREAD_B, [[stepPanel(0, '2026-10-04T11:00:00.000Z', 300, [])]]),
	'</body></html>',
].join('\n');

describe('parseDebugHtml', () => {
	const threads = parseDebugHtml(html);

	it('reads one entry per thread with its runs', () => {
		expect([...threads.keys()]).toEqual([THREAD_A, THREAD_B]);
		expect(threads.get(THREAD_A)?.runs.map((run) => run.label)).toEqual(['Run & 0', 'Run & 1']);
	});

	it('reads timing, usage and the tool calls of each output', () => {
		const [first, second, third] = threads.get(THREAD_A)?.runs[0].steps ?? [];
		expect(first).toEqual({
			index: 0,
			startMs: Date.parse('2026-10-04T10:00:00.000Z'),
			modelMs: 2000,
			toolWindowMs: 3000,
			finishReason: 'tool_use',
			modelId: 'claude-test',
			usage: { input: 1000, output: 50, noCache: 10, cacheRead: 900, cacheWrite: 90 },
			reasoning: "I need the 'setup' skill.\n\nThen the nodes.",
			toolCalls: [
				{ id: 'toolu_1', tool: 'load_skill', skill: '# Setup\n\nUse "this" & that.' },
				{ id: 'toolu_2', tool: 'nodes', skill: null },
			],
		});
		expect(second.reasoning).toBeNull();
		expect(second.toolWindowMs).toBe(14000);
		expect(third.toolWindowMs).toBeNull();
		expect(third.toolCalls).toEqual([]);
	});

	it('reads the system prompt and every tool definition of a run once', () => {
		const run = threads.get(THREAD_A)?.runs[0];
		expect(run?.system).toBe('You build "workflows".');
		expect(run?.tools).toEqual([
			{
				name: 'nodes',
				description: 'Find <nodes>',
				inputSchema: { type: 'object', title: 'nodes' },
			},
			{
				name: 'load_tool',
				description: 'Load a tool',
				inputSchema: { type: 'object', title: 'load_tool' },
			},
		]);
	});

	it('keeps a step without usage', () => {
		const [step] = threads.get(THREAD_A)?.runs[1].steps ?? [];
		expect(step.usage).toBeNull();
		expect(step.toolWindowMs).toBeNull();
	});
});

describe('unescapeHtml', () => {
	it('decodes named and numeric entities', () => {
		expect(unescapeHtml('&lt;a&gt; &amp; &quot;b&quot; &#39;c&#39; &#x41; &unknown;')).toBe(
			'<a> & "b" \'c\' A &unknown;',
		);
	});
});

describe('turnOfRuns', () => {
	it('gives each run the turn that lists it, extra runs to the last turn', () => {
		expect(turnOfRuns([1, 2], 3)).toEqual([0, 1, 1]);
		expect(turnOfRuns([3], 3)).toEqual([0, 0, 0]);
		expect(turnOfRuns([1, 1], 4)).toEqual([0, 1, 1, 1]);
		expect(turnOfRuns([], 1)).toEqual([0]);
	});
});
