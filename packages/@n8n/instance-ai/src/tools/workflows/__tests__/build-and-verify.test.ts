import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import { asReverifyTool, withBuildVerification } from '../build-and-verify';

const tool = (name: string, handler: BuiltTool['handler']): BuiltTool => ({
	name,
	description: name,
	outputSchema: z.object({ success: z.boolean() }),
	handler,
});

const ready = {
	success: true,
	workItemId: 'wi_1',
	workflowId: 'wf_1',
	verificationReadiness: { status: 'ready' },
	setupRequirement: { status: 'not_required' },
};

describe('asReverifyTool', () => {
	it('describes a re-run and keeps the input schema and handler', () => {
		const handler = vi.fn();
		const verify = { ...tool('verify-built-workflow', handler), inputSchema: z.object({}) };
		const reverify = asReverifyTool(verify);
		expect(reverify.description).toMatch(/^Re-run verification/);
		expect(reverify.description).toContain('`inputData` shape depends on the trigger type');
		expect(reverify).toMatchObject({
			name: 'verify-built-workflow',
			inputSchema: verify.inputSchema,
			handler,
		});
	});
});

describe('withBuildVerification', () => {
	it('verifies a ready build in the same call', async () => {
		const verify = vi.fn(
			async () => await Promise.resolve({ success: true, claim: { level: 'partial' } }),
		);
		const composite = withBuildVerification(
			tool('build-workflow', async () => await Promise.resolve(ready)),
			tool('verify-built-workflow', verify),
		);
		const result = await composite.handler?.({}, {} as never);
		expect(verify).toHaveBeenCalledWith({ workItemId: 'wi_1', workflowId: 'wf_1' }, {});
		expect(result).toMatchObject({ ...ready, verification: { claim: { level: 'partial' } } });
	});

	it.each([
		['a failed build', { success: false }],
		['a build that needs setup', { ...ready, setupRequirement: { status: 'required' } }],
		['a build that is not ready', { ...ready, verificationReadiness: { status: 'blocked' } }],
	])('returns %s unchanged', async (_name, result) => {
		const verify = vi.fn();
		const composite = withBuildVerification(
			tool('build-workflow', async () => await Promise.resolve(result)),
			tool('verify-built-workflow', verify),
		);
		expect(await composite.handler?.({}, {} as never)).toEqual(result);
		expect(verify).not.toHaveBeenCalled();
	});
});
