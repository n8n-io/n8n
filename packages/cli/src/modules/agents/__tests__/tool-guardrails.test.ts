import type { ExecutionOptions, RunOptions } from '@n8n/agents';
import { createKeywordsCheckFn } from '@n8n/ai-utilities/guardrails';
import type { AgentToolGuardrailConfig } from '@n8n/api-types';
import { vi } from 'vitest';

import { withToolGuardrails } from '../tool-guardrails';
import type { ToolRegistry } from '../tool-registry';

vi.mock('@n8n/ai-utilities/guardrails', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/ai-utilities/guardrails')>();
	return {
		...actual,
		// Only the keywords factory is mockable: the fail-closed test overrides
		// it once; every other call runs the real check.
		createKeywordsCheckFn: vi.fn(actual.createKeywordsCheckFn),
	};
});

const base: RunOptions & ExecutionOptions = {
	persistence: { threadId: 'thread-1', resourceId: 'user-1' },
};

/** Registry with one renamed workflow tool and one node tool. */
const registry: ToolRegistry = new Map([
	['my_renamed_tool', { kind: 'workflow', workflowId: 'wf-1', workflowName: 'My Workflow' }],
	['read_file', { kind: 'node', nodeType: 'n8n-nodes-base.readBinaryFile' }],
]);

const ctx = (toolName: string, input: unknown) => ({
	toolCallId: 'tc-1',
	toolName,
	input,
	runId: 'run-1',
});

function hooksFor(toolGuardrails: AgentToolGuardrailConfig[]) {
	const attached = withToolGuardrails(base, { toolGuardrails, toolRegistry: registry });
	return attached.guardrails?.hooks ?? [];
}

describe('withToolGuardrails', () => {
	it('passes the options through unchanged when no guardrails are configured', () => {
		expect(withToolGuardrails(base, { toolRegistry: registry })).toBe(base);
		expect(withToolGuardrails(base, { toolGuardrails: [], toolRegistry: registry })).toBe(base);
	});

	it('skips model-based kinds, which have their own follow-up ticket', () => {
		const hooks = hooksFor([
			{
				kind: 'nsfw',
				id: 'g1',
				stage: 'before',
				threshold: 0.5,
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);
		expect(hooks).toHaveLength(0);
	});

	it('resolves a workflow ref by workflowId even when the tool was renamed', async () => {
		const hooks = hooksFor([
			{
				kind: 'keywords',
				id: 'g1',
				stage: 'before',
				keywords: ['secret'],
				tools: [{ type: 'workflow', workflowId: 'wf-1' }],
			},
		]);
		expect(hooks).toHaveLength(1);

		const stop = await hooks[0].beforeTool?.(ctx('my_renamed_tool', { note: 'the secret plan' }));
		expect(stop).toEqual({ action: 'stop', code: 'guardrail.keywords.g1' });
	});

	it('resolves a node ref by tool name and no-ops for uncovered or unresolved tools', async () => {
		const hooks = hooksFor([
			{
				kind: 'keywords',
				id: 'g1',
				stage: 'before',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		// Not covered by this entry: the check never runs.
		expect(
			await hooks[0].beforeTool?.(ctx('my_renamed_tool', { note: 'a secret' })),
		).toBeUndefined();

		// Covered tool with matching content stops.
		expect(await hooks[0].beforeTool?.(ctx('read_file', { note: 'a secret' }))).toEqual({
			action: 'stop',
			code: 'guardrail.keywords.g1',
		});
	});

	it('no-ops a ref that no registry entry resolves', async () => {
		const hooks = hooksFor([
			{
				kind: 'keywords',
				id: 'g1',
				stage: 'before',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'missing_tool' }],
			},
		]);

		expect(await hooks[0].beforeTool?.(ctx('read_file', { note: 'a secret' }))).toBeUndefined();
	});

	it('registers before-stage guardrails on beforeTool only, after-stage on afterTool', () => {
		const [beforeHook] = hooksFor([
			{
				kind: 'keywords',
				id: 'before-g',
				stage: 'before',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);
		expect(beforeHook.beforeTool).toBeTypeOf('function');
		expect(beforeHook.afterTool).toBeUndefined();

		const [afterHook] = hooksFor([
			{
				kind: 'keywords',
				id: 'after-g',
				stage: 'after',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);
		expect(afterHook.afterTool).toBeTypeOf('function');
		expect(afterHook.beforeTool).toBeUndefined();
	});

	it('runs one hook at both stages when stage is absent', async () => {
		const [hook] = hooksFor([
			{
				kind: 'keywords',
				id: 'both-g',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		expect(hook.beforeTool).toBeTypeOf('function');
		expect(hook.afterTool).toBeTypeOf('function');

		const stoppedInput = await hook.beforeTool?.(ctx('read_file', { note: 'a secret' }));
		expect(stoppedInput).toEqual({ action: 'stop', code: 'guardrail.keywords.both-g' });

		const stoppedResult = await hook.afterTool?.(ctx('read_file', {}), { note: 'a secret' });
		expect(stoppedResult).toEqual({ action: 'stop', code: 'guardrail.keywords.both-g' });

		const cleanResult = await hook.afterTool?.(ctx('read_file', {}), { note: 'all clean' });
		expect(cleanResult).toEqual({ action: 'allow' });
	});

	it('covers every tool when tools is absent', async () => {
		const [hook] = hooksFor([
			{ kind: 'keywords', id: 'g1', stage: 'before', keywords: ['secret'] },
		]);

		// No refs, yet the registry's tools are all covered.
		const stop = await hook.beforeTool?.(ctx('read_file', { note: 'a secret' }));
		expect(stop).toEqual({ action: 'stop', code: 'guardrail.keywords.g1' });

		const otherStop = await hook.beforeTool?.(ctx('my_renamed_tool', { note: 'a secret' }));
		expect(otherStop).toEqual({ action: 'stop', code: 'guardrail.keywords.g1' });

		// The check still applies to the content.
		const clean = await hook.beforeTool?.(ctx('read_file', { note: 'hello' }));
		expect(clean).toBeUndefined();
	});

	it('runs both stages but stays filtered when stage is absent and tools is set', async () => {
		const [hook] = hooksFor([
			{
				kind: 'keywords',
				id: 'g1',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		const uncovered = await hook.beforeTool?.(ctx('my_renamed_tool', { note: 'a secret' }));
		expect(uncovered).toBeUndefined();

		const uncoveredAfter = await hook.afterTool?.(ctx('my_renamed_tool', {}), {
			note: 'a secret',
		});
		expect(uncoveredAfter).toEqual({ action: 'allow' });
	});

	it('stops a PII before-guardrail on matching input and allows clean input', async () => {
		const hooks = hooksFor([
			{
				kind: 'pii',
				id: 'pii-g',
				stage: 'before',
				type: 'selected',
				entities: ['EMAIL_ADDRESS'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		const dirty = await hooks[0].beforeTool?.(
			ctx('read_file', { message: 'Contact john@example.com' }),
		);
		expect(dirty).toEqual({ action: 'stop', code: 'guardrail.pii.pii-g' });

		const clean = await hooks[0].beforeTool?.(ctx('read_file', { message: 'Just a note' }));
		expect(clean).toBeUndefined();
	});

	it('stops an after-guardrail on a matching tool result and allows a clean one', async () => {
		const hooks = hooksFor([
			{
				kind: 'pii',
				id: 'pii-g',
				stage: 'after',
				type: 'selected',
				entities: ['EMAIL_ADDRESS'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		const dirty = await hooks[0].afterTool?.(ctx('read_file', {}), {
			content: 'Reply to john@example.com',
		});
		expect(dirty).toEqual({ action: 'stop', code: 'guardrail.pii.pii-g' });

		const clean = await hooks[0].afterTool?.(ctx('read_file', {}), { content: 'All done' });
		expect(clean).toEqual({ action: 'allow' });
	});

	it('fails closed when the check itself throws', async () => {
		vi.mocked(createKeywordsCheckFn).mockImplementationOnce(() => () => {
			throw new Error('check blew up');
		});

		const hooks = hooksFor([
			{
				kind: 'keywords',
				id: 'g1',
				stage: 'before',
				keywords: ['secret'],
				tools: [{ type: 'node', name: 'read_file' }],
			},
		]);

		const stop = await hooks[0].beforeTool?.(ctx('read_file', { note: 'anything' }));
		expect(stop).toEqual({ action: 'stop', code: 'guardrail.keywords.g1' });
	});
});
