import { wrapUntrustedData, type BuiltTool } from '@n8n/agents';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import {
	asReverifyTool,
	withBuildVerification,
	type BuildVerificationSources,
} from '../build-and-verify';

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
	it('describes a re-run, keeps the input fields and handler, and adds the slice keys', () => {
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
		expect(Object.keys(shape)).toEqual(['workflowId', 'extra', 'until', 'variants']);
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

describe('withBuildVerification trigger input', () => {
	const node = (name: string, type: string, parameters: Record<string, string> = {}) => ({
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters,
	});
	const workflow = (
		nodes: WorkflowJSON['nodes'],
		connections: WorkflowJSON['connections'],
	): WorkflowJSON => ({ name: 'W', nodes, connections });
	const sources = (
		json: WorkflowJSON,
		fixtures: Record<string, Array<Record<string, unknown>>> = {},
	): BuildVerificationSources => ({
		getWorkflow: async () => await Promise.resolve(json),
		getBuildOutcome: async () =>
			await Promise.resolve({ simulationFixtures: fixtures } as unknown as WorkflowBuildOutcome),
	});
	const build = (triggerNodes: Array<{ nodeName: string; nodeType: string }>) =>
		tool('build-workflow', async () => await Promise.resolve({ ...ready, triggerNodes }));
	const verified = { success: true, claim: { level: 'verified' } };

	const manualReadsInput = workflow(
		[
			node('Start', 'n8n-nodes-base.manualTrigger'),
			node('Get Rows', 'n8n-nodes-base.dataTable', { tableName: '={{ $json.tableName }}' }),
		],
		{ Start: { main: [[{ node: 'Get Rows', type: 'main', index: 0 }]] } },
	);
	const start = [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.manualTrigger' }];

	it('does not run a trigger whose output the nodes read and that has no sample', async () => {
		const verify = vi.fn(async () => await Promise.resolve(verified));
		const composite = withBuildVerification(
			build(start),
			tool('verify-built-workflow', verify),
			sources(manualReadsInput),
		);
		const result = await composite.handler?.({}, {} as never);
		expect(verify).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			verification: {
				skipped: 'needs_input',
				guidance: expect.stringContaining('inputData'),
			},
		});
		expect(result).not.toHaveProperty('verification.success');
	});

	it('runs a trigger whose sample the build declared', async () => {
		const verify = vi.fn(async () => await Promise.resolve(verified));
		const composite = withBuildVerification(
			build(start),
			tool('verify-built-workflow', verify),
			sources(manualReadsInput, { Start: [{ tableName: 'orders' }] }),
		);
		const result = await composite.handler?.({}, {} as never);
		expect(verify).toHaveBeenCalledWith({ workItemId: 'wi_1', workflowId: 'wf_1' }, {});
		expect(result).toMatchObject({ verification: verified });
	});

	it('runs each trigger of a multi-trigger build and names the one it skipped', async () => {
		const json = workflow(
			[
				node('Schedule', 'n8n-nodes-base.scheduleTrigger'),
				node('Hook', 'n8n-nodes-base.webhook'),
				node('Post', 'n8n-nodes-base.httpRequest', { body: "={{ $('Hook').item.json.body }}" }),
			],
			{
				Schedule: { main: [[{ node: 'Post', type: 'main', index: 0 }]] },
				Hook: { main: [[{ node: 'Post', type: 'main', index: 0 }]] },
			},
		);
		const verify = vi.fn(async () => await Promise.resolve(verified));
		const composite = withBuildVerification(
			build([
				{ nodeName: 'Schedule', nodeType: 'n8n-nodes-base.scheduleTrigger' },
				{ nodeName: 'Hook', nodeType: 'n8n-nodes-base.webhook' },
			]),
			tool('verify-built-workflow', verify),
			sources(json),
		);
		const result = await composite.handler?.({}, {} as never);
		expect(verify).toHaveBeenCalledTimes(1);
		expect(verify).toHaveBeenCalledWith(
			{ workItemId: 'wi_1', workflowId: 'wf_1', triggerNodeName: 'Schedule' },
			{},
		);
		expect(result).toMatchObject({
			verificationByTrigger: {
				Schedule: verified,
				Hook: { skipped: 'needs_input' },
			},
		});
		expect(composite.toModelOutput?.(result)).toMatchObject({
			verificationByTrigger: { Schedule: verified, Hook: { skipped: 'needs_input' } },
			verificationNote: expect.stringContaining('union of those runs'),
		});
	});
});

describe('withBuildVerification resolved values', () => {
	const json: WorkflowJSON = {
		name: 'W',
		nodes: [
			{
				id: 'Start',
				name: 'Start',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'Keep',
				name: 'Keep',
				type: 'n8n-nodes-base.filter',
				typeVersion: 2.2,
				position: [0, 0],
				parameters: { conditions: { conditions: [{ leftValue: '={{ $json.ok }}' }] } },
			},
		],
		connections: { Start: { main: [[{ node: 'Keep', type: 'main', index: 0 }]] } },
	};
	const build = tool(
		'build-workflow',
		async () =>
			await Promise.resolve({
				...ready,
				triggerNodes: [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.scheduleTrigger' }],
			}),
	);
	const sources: BuildVerificationSources = {
		getWorkflow: async () => await Promise.resolve(json),
		getBuildOutcome: async () => await Promise.resolve({} as WorkflowBuildOutcome),
		getResolvedNodeParameters: async (_executionId, nodeName) =>
			await Promise.resolve({
				nodeName,
				runIndex: 0,
				itemIndex: 0,
				parameters: json.nodes[1].parameters ?? {},
				resolved: wrapUntrustedData(
					JSON.stringify({ conditions: { conditions: [{ leftValue: true }] } }),
					'execution-output',
				),
				failedExpressions: [],
				emptyResolutions: [],
			}),
	};

	it('adds the resolved values of a run that has an execution', async () => {
		const verify = tool(
			'verify-built-workflow',
			async () => await Promise.resolve({ success: true, executionId: 'e1' }),
		);
		const result = await withBuildVerification(build, verify, sources).handler?.({}, {} as never);
		expect(result).toMatchObject({
			verification: {
				resolvedValues: expect.stringContaining(
					'Keep (ran)\n  conditions.conditions[0].leftValue <- $json.ok = true  [Start.ok; ran]',
				),
			},
		});
	});

	it('adds nothing to a run without an execution', async () => {
		const verify = tool(
			'verify-built-workflow',
			async () => await Promise.resolve({ success: false }),
		);
		const result = await withBuildVerification(build, verify, sources).handler?.({}, {} as never);
		expect(result).not.toHaveProperty('verification.resolvedValues');
	});
});

describe('declared shapes in verification', () => {
	const json: WorkflowJSON = {
		name: 'W',
		nodes: [
			{
				id: 'Start',
				name: 'Start',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'Fetch',
				name: 'Fetch',
				type: '@n8n/nodes-core.httpRequestGet',
				typeVersion: 3,
				position: [0, 0],
				parameters: {
					url: 'https://api.example.com/x',
					schema: { type: 'object', properties: { ids: { type: 'array' } } },
				},
			},
		],
		connections: { Start: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] } },
	};
	const outcome = {
		nodeSimulationPlan: [
			{
				nodeName: 'Fetch',
				verdict: 'simulate',
				reason: 'test',
				confidence: 'high',
				source: 'deterministic',
			},
		],
		simulationFixtures: { Fetch: [{ ids: ['a'] }] },
		fixtureOrigins: { Fetch: 'declared' },
	} as unknown as WorkflowBuildOutcome;
	const getNodeOutput = vi.fn(
		async (_executionId: string, nodeName: string) =>
			await Promise.resolve({
				nodeName,
				outputs: [
					{
						index: 0,
						totalItems: 1,
						items: [wrapUntrustedData('{"userIds": ["a"]}', 'execution-output')],
					},
				],
				totalItems: 1,
				returned: { from: 0, to: 1 },
			}),
	);
	const sources: BuildVerificationSources = {
		getWorkflow: async () => await Promise.resolve(json),
		getBuildOutcome: async () => await Promise.resolve(outcome),
		getNodeOutput,
	};
	const ran = { success: true, executionId: 'e1', nodesExecuted: ['Start', 'Fetch'] };
	const verify = tool('verify-built-workflow', async () => await Promise.resolve(ran));

	it('warns where the output differs from the declared schema and says the fixture is declared', async () => {
		const build = tool(
			'build-workflow',
			async () =>
				await Promise.resolve({
					...ready,
					triggerNodes: [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.scheduleTrigger' }],
				}),
		);
		const result = await withBuildVerification(build, verify, sources).handler?.({}, {} as never);
		expect(getNodeOutput).toHaveBeenCalledWith('e1', 'Fetch');
		expect(result).toMatchObject({
			verification: {
				shapeWarnings: expect.stringContaining(
					'Fetch: the output does not match its declared schema: $json.ids: missing; $json: unknown field(s) userIds. Allowed: ids',
				),
				declaredShapeNote: expect.stringContaining('declared `schema` of Fetch'),
			},
		});
	});

	it('warns on a re-run too', async () => {
		const result = await asReverifyTool(verify, sources).handler?.(
			{ workflowId: 'wf_1' },
			{} as never,
		);
		expect(result).toMatchObject({
			shapeWarnings: expect.stringContaining('$json: unknown field(s) userIds'),
		});
	});
});

describe('live reads in build verification', () => {
	const json: WorkflowJSON = {
		name: 'W',
		nodes: [
			{
				id: 'Start',
				name: 'Start',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'Fetch',
				name: 'Fetch',
				type: '@n8n/nodes-core.httpRequestGet',
				typeVersion: 3,
				position: [0, 0],
				parameters: {
					url: 'https://api.example.com/users',
					schema: {
						type: 'object',
						properties: { ids: { type: 'array', items: { type: 'string' } } },
					},
				},
			},
			{
				id: 'Keep',
				name: 'Keep',
				type: 'n8n-nodes-base.filter',
				typeVersion: 2.2,
				position: [0, 0],
				parameters: { conditions: { conditions: [{ leftValue: '={{ $json.ids }}' }] } },
			},
		],
		connections: {
			Start: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] },
			Fetch: { main: [[{ node: 'Keep', type: 'main', index: 0 }]] },
		},
	};
	// The live read ran: its verdict is `execute`, and its declared fixture waits as a fallback.
	const outcome = {
		nodeSimulationPlan: [
			{
				nodeName: 'Fetch',
				verdict: 'execute',
				reason: 'GET a URL reads from HTTP Request',
				confidence: 'high',
				source: 'deterministic',
			},
		],
		liveReadFallbacks: { Fetch: [{ ids: ['example ids'] }] },
		fixtureOrigins: { Fetch: 'declared' },
	} as unknown as WorkflowBuildOutcome;
	const build = tool(
		'build-workflow',
		async () =>
			await Promise.resolve({
				...ready,
				triggerNodes: [{ nodeName: 'Start', nodeType: 'n8n-nodes-base.scheduleTrigger' }],
			}),
	);
	const verify = tool(
		'verify-built-workflow',
		async () =>
			await Promise.resolve({
				success: true,
				executionId: 'e1',
				nodesExecuted: ['Start', 'Fetch', 'Keep'],
			}),
	);
	const sourcesFor = (response: string): BuildVerificationSources => ({
		getWorkflow: async () => await Promise.resolve(json),
		getBuildOutcome: async () => await Promise.resolve(outcome),
		getNodeOutput: async (_executionId, nodeName) =>
			await Promise.resolve({
				nodeName,
				outputs: [
					{
						index: 0,
						totalItems: 1,
						items: [wrapUntrustedData(response, 'execution-output')],
					},
				],
				totalItems: 1,
				returned: { from: 0, to: 1 },
			}),
		getResolvedNodeParameters: async (_executionId, nodeName) =>
			await Promise.resolve({
				nodeName,
				runIndex: 0,
				itemIndex: 0,
				parameters: json.nodes[2].parameters ?? {},
				resolved: wrapUntrustedData(
					JSON.stringify({ conditions: { conditions: [{ leftValue: null }] } }),
					'execution-output',
				),
				failedExpressions: [],
				emptyResolutions: [],
			}),
	});

	it('labels the live values observed and warns where the response differs from the schema', async () => {
		const result = await withBuildVerification(
			build,
			verify,
			sourcesFor('{"userIds": ["u1"], "total": 1}'),
		).handler?.({}, {} as never);

		expect(result).toMatchObject({
			verification: {
				resolvedValues: expect.stringContaining('[Fetch.ids; observed]'),
				shapeWarnings: expect.stringContaining(
					'Fetch: the output does not match its declared schema: $json.ids: missing; $json: unknown field(s) userIds, total. Allowed: ids',
				),
			},
		});
		expect(result).not.toHaveProperty('verification.declaredShapeNote');
	});

	it('gives no warning when the live response matches the schema', async () => {
		const result = await withBuildVerification(
			build,
			verify,
			sourcesFor('{"ids": ["u1", "u2"]}'),
		).handler?.({}, {} as never);

		expect(result).toMatchObject({
			verification: { resolvedValues: expect.stringContaining('[Fetch.ids; observed]') },
		});
		expect(result).not.toHaveProperty('verification.shapeWarnings');
		expect(result).not.toHaveProperty('verification.declaredShapeNote');
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
