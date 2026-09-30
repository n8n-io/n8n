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
	it('describes a re-run and keeps the input fields and handler', () => {
		const handler = vi.fn();
		const inputSchema = z.object({
			workflowId: z.string().describe('long text'),
			extra: z.number(),
		});
		const reverify = asReverifyTool({ ...tool('verify-built-workflow', handler), inputSchema });
		expect(reverify.description).toMatch(/^Re-run verification/);
		expect(reverify).toMatchObject({ name: 'verify-built-workflow', handler });
		expect(reverify.inputSchema).toBeInstanceOf(z.ZodObject);
		const shape = reverify.inputSchema instanceof z.ZodObject ? reverify.inputSchema.shape : {};
		expect(Object.keys(shape)).toEqual(['workflowId', 'extra']);
		expect(shape.workflowId.description).toBe('The workflow ID to verify');
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

const wrap = (label: string, body: string) =>
	`<untrusted_data source="execution-output" label="node:${label}">\n${body}\n</untrusted_data>`;

const simulated = [{ nodeName: 'Get Pages', reason: 'fixture' }];

const verifiedBuild = {
	...ready,
	filePath: 'src/workflows/pages.workflow.ts',
	sourceHash: 'f436',
	publishState: { live: 'unpublished', activeVersionId: null, savedVersionId: 'v1' },
	publishStateNote: 'This workflow is an unpublished draft. Nothing is live in production.',
	isSupportingWorkflow: null,
	postBuildFlow: {
		required: true,
		skillId: 'post-build-flow',
		reason: 'direct-build-succeeded',
		guidance: 'This direct build is not complete yet.',
		instructions: 'Follow the active post-build-flow skill instructions.',
	},
	resolvedCredentialsByNode: {
		'Get Pages': [{ type: 'notionApi', id: 'c1', name: 'Notion account' }],
	},
	credentialResolutionNote:
		'Connected existing credential(s) automatically: "Notion account" (notionApi) on node "Get Pages". Those attached credentials are already set up.',
	grouping: { topLevelItemCount: 3, ceiling: 7, groupCount: 0, decision: 'under_ceiling' },
	warnings: null,
	verification: {
		resolvedWorkItemId: 'wi_1',
		success: true,
		claim: { level: 'partial', simulatedNodes: simulated, pinnedNodes: [] },
		nodePreviews: [
			{ nodeName: 'Start', itemCount: 1, preview: wrap('Start', '[\n  {}\n]'), truncated: false },
			{ nodeName: 'Get Pages', itemCount: 1, preview: wrap('Get Pages', '[{"id":"p1"}]') },
		],
		simulatedNodes: simulated,
		error: null,
	},
	verificationNote: 'Verification already ran for this build.',
};

describe('withBuildVerification toModelOutput', () => {
	const toModelOutput = (output: unknown, build = tool('build-workflow', vi.fn())) =>
		withBuildVerification(build, tool('verify-built-workflow', vi.fn())).toModelOutput?.(output);

	it('sends a compact view of a verified build and keeps the raw result', async () => {
		const raw = structuredClone(verifiedBuild);
		const composite = withBuildVerification(
			tool('build-workflow', async () => await Promise.resolve(raw)),
			tool('verify-built-workflow', async () => await Promise.resolve(raw.verification)),
		);
		const stored = await composite.handler?.({}, {} as never);

		expect(composite.toModelOutput?.(stored)).toEqual({
			...ready,
			filePath: 'src/workflows/pages.workflow.ts',
			live: 'unpublished',
			postBuildFlow: { required: true, skillId: 'post-build-flow' },
			resolvedCredentialsByNode: verifiedBuild.resolvedCredentialsByNode,
			credentialResolutionNote:
				'Already set up, do not route to setup: "Notion account" on "Get Pages".',
			verification: {
				success: true,
				claim: verifiedBuild.verification.claim,
				nodePreviews: [verifiedBuild.verification.nodePreviews[1]],
			},
		});
		expect(stored).toEqual({ ...verifiedBuild, verificationNote: expect.any(String) });
		expect(raw).toEqual(verifiedBuild);
		expect(composite.description).toContain('verify again only after a change');
	});

	it('only drops null fields from a failed build', () => {
		const failed = {
			success: false,
			sourceHash: 'f436',
			postBuildFlow: verifiedBuild.postBuildFlow,
			grouping: verifiedBuild.grouping,
			errors: ['Type error'],
			remediation: { category: 'code', guidance: null },
			warnings: null,
			verification: undefined,
		};
		expect(toModelOutput(failed)).toEqual({
			success: false,
			sourceHash: 'f436',
			postBuildFlow: verifiedBuild.postBuildFlow,
			grouping: verifiedBuild.grouping,
			errors: ['Type error'],
			remediation: { category: 'code' },
		});
	});

	it('keeps fields that carry more than the compact view', () => {
		const note = 'Left unresolved because the user asked to create them fresh: slackApi.';
		const guidance = { ...verifiedBuild.postBuildFlow, instructions: '# Post-build flow' };
		const stale = {
			...verifiedBuild,
			publishState: { live: 'stale', activeVersionId: 'v0', savedVersionId: 'v1' },
			publishStateNote: 'This save is a draft.',
			postBuildFlow: guidance,
			credentialResolutionNote: note,
			grouping: { decision: 'grouped', groupCount: 2 },
			verification: { ...verifiedBuild.verification, success: false },
		};
		expect(toModelOutput(stale)).toMatchObject({
			live: 'stale: This save is a draft.',
			postBuildFlow: guidance,
			credentialResolutionNote: note,
			grouping: stale.grouping,
			verification: { nodePreviews: verifiedBuild.verification.nodePreviews },
		});
	});

	it('keeps the credential note when Gateway credits are attached', () => {
		const gateway = {
			...verifiedBuild,
			resolvedCredentialsByNode: {
				...verifiedBuild.resolvedCredentialsByNode,
				Agent: [{ type: 'openAiApi', id: null, name: 'Gateway', __aiGatewayManaged: true }],
			},
		};
		expect(toModelOutput(gateway)).toMatchObject({
			credentialResolutionNote: verifiedBuild.credentialResolutionNote,
		});
	});

	it('applies the build tool transform first', () => {
		const build = { ...tool('build-workflow', vi.fn()), toModelOutput: () => verifiedBuild };
		expect(toModelOutput({}, build)).toMatchObject({ live: 'unpublished' });
	});
});
