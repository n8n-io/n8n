import { executeTool } from '../../../__tests__/tool-test-utils';
import { emitTraceOnlyChildRun } from '../../../tracing/langsmith-tracing';
import type { InstanceAiContext } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import {
	autoImportMissingSdkSymbols,
	buildWorkflowInputSchema,
	createBuildWorkflowTool,
} from '../build-workflow.tool';
import type { SetupRequest } from '../setup-workflow.schema';
import { analyzeWorkflow } from '../setup-workflow.service';
import { getWorkflowSourceFileBinding, hashWorkflowSource } from '../workflow-file-bindings';
import { ensureWebhookIds } from '../workflow-json-utils';
import { compileWorkflowSource } from '../workflow-source-compiler';
import { partitionWarnings, type ValidationWarning } from '../workflow-validation-warnings';

// Passthrough spy: real behavior (handle-fallback path in unit env), observable calls.
vi.mock('../../../tracing/langsmith-tracing', async () => {
	const actual = await vi.importActual<Record<string, unknown>>(
		'../../../tracing/langsmith-tracing',
	);
	return {
		...actual,
		emitTraceOnlyChildRun: vi.fn(actual.emitTraceOnlyChildRun as typeof emitTraceOnlyChildRun),
	};
});

vi.mock('../workflow-validation-warnings', () => ({
	partitionWarnings: vi.fn((warnings: unknown[]) => ({ errors: [], informational: warnings })),
}));

const generatedWorkflow = {
	name: 'Generated workflow',
	nodes: [
		{
			id: 'webhook-1',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0] as [number, number],
			parameters: {},
		},
	],
	connections: {},
};

vi.mock('../workflow-source-compiler', () => ({
	compileWorkflowSource: vi.fn(),
}));

vi.mock('../resolve-credentials', () => ({
	buildCredentialMap: vi.fn(async () => await Promise.resolve(new Map())),
	buildCredentialResolutionNote: vi.fn(() => undefined),
	resolveCredentials: vi.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				resolvedCredentialsByNode: {},
			}),
	),
}));

vi.mock('../setup-workflow.service', () => ({
	analyzeWorkflow: vi.fn(async () => await Promise.resolve([])),
	stripStaleCredentialsFromWorkflow: vi.fn(async () => await Promise.resolve()),
}));

vi.mock('../workflow-json-utils', async () => {
	const actual = await vi.importActual('../workflow-json-utils');
	return {
		...actual,
		ensureWebhookIds: vi.fn(async () => await Promise.resolve()),
	};
});

// LLM-backed services must never hit the network from unit tests.
vi.mock('../classify-node-destructiveness.service', () => ({
	classifyNodesForSimulation: vi.fn(async () => await Promise.resolve([])),
}));
vi.mock('../generate-simulation-fixtures.service', () => ({
	generateSimulationFixtures: vi.fn(async () => await Promise.resolve({})),
}));

type BuildToolOutput = {
	success: boolean;
	filePath: string;
	sourceHash?: string;
	workflowId?: string;
	workflowName?: string;
	workItemId?: string;
	verificationReadiness?: {
		status: string;
		reason?: string;
		guidance?: string;
	};
	setupRequirement?: {
		status: string;
		reason?: string;
		guidance?: string;
	};
	postBuildFlow?: {
		required: boolean;
		skillId: string;
		reason: string;
		guidance: string;
		instructions: string;
	};
	warnings?: string[];
	errors?: string[];
	remediation?: {
		category: string;
		shouldEdit: boolean;
		reason?: string;
	};
};

function makeContext(input: {
	source?: string;
	filePath?: string;
	overrides?: Partial<InstanceAiContext>;
}) {
	const source = input.source ?? 'workflow source';
	const filePath = input.filePath ?? 'src/workflows/main.workflow.ts';
	const files = new Map<string, string>([[filePath, source]]);
	const trackTelemetry = vi.fn<(eventName: string, properties: Record<string, unknown>) => void>();

	const context = {
		userId: 'user-1',
		runId: 'run-1',
		workflowService: {
			createFromWorkflowJSON: vi.fn(
				async () => await Promise.resolve({ id: 'wf-1', versionId: 'v-1' }),
			),
			updateFromWorkflowJSON: vi.fn(
				async (workflowId: string) =>
					await Promise.resolve({ id: workflowId, versionId: 'v-next' }),
			),
			getAsWorkflowJSON: vi.fn(async () => await Promise.resolve({ name: 'Target workflow' })),
			clearAiTemporary: vi.fn(async () => await Promise.resolve()),
		},
		credentialService: {},
		nodeService: {},
		dataTableService: {},
		executionService: {},
		workspace: {
			filesystem: {
				readFile: vi.fn(async (path: string) => {
					const content = files.get(path);
					if (content === undefined) throw new Error(`ENOENT ${path}`);
					return await Promise.resolve(content);
				}),
				writeFile: vi.fn(async (path: string, content: string | Buffer) => {
					files.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
					await Promise.resolve();
				}),
			},
		},
		trackTelemetry,
		permissions: { createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
		logger: { warn: vi.fn(), debug: vi.fn() },
		...input.overrides,
	} as unknown as InstanceAiContext;

	return { context, files, filePath, trackTelemetry };
}

function workflowSourceBuildFailure(error: string) {
	return {
		success: false as const,
		reason: 'workflow_source_build_failed' as const,
		editable: true,
		errors: [error],
		summary: 'Workflow source failed during sandbox execution.',
	};
}

describe('createBuildWorkflowTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(compileWorkflowSource).mockResolvedValue({
			success: true,
			workflow: structuredClone(generatedWorkflow),
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		vi.mocked(partitionWarnings).mockImplementation((warnings: ValidationWarning[]) => ({
			errors: [],
			informational: warnings,
		}));
		vi.mocked(analyzeWorkflow).mockResolvedValue([]);
	});

	it('builds a new workflow from a workspace source file', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath } = makeContext({ source });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result).toMatchObject({
			success: true,
			filePath,
			sourceHash: hashWorkflowSource(source),
			workflowId: 'wf-1',
			workflowName: 'Daily Weather to Slack',
			workItemId: filePath,
			postBuildFlow: {
				required: true,
				skillId: 'post-build-flow',
				reason: 'direct-build-succeeded',
			},
		});
		expect(result.postBuildFlow?.guidance).toContain(
			'Follow the post-build instructions in `instructions` now',
		);
		expect(result.postBuildFlow?.instructions).toContain('# Post-Build Flow');
		expect(result.postBuildFlow?.instructions).not.toContain('recommended_tools');
		// Tag-turn-only sections are stripped from the inline copy.
		expect(result.postBuildFlow?.instructions).not.toContain('## Verification follow-up');
		expect(result.postBuildFlow?.instructions).not.toContain('## Setup follow-up');
		expect(result.postBuildFlow?.instructions).not.toContain('## Credentials before build');
		expect(result.postBuildFlow?.instructions).toContain('## After build-workflow succeeds');
		expect(result.postBuildFlow?.guidance).toContain(
			'then mocked/no-mock live-test when latest verification used mocks or simulations',
		);
		expect(result.postBuildFlow?.guidance).toContain(
			'Do not replace the error-workflow opt-in with a generic add-anything',
		);
		expect(compileWorkflowSource).toHaveBeenCalledWith(context, filePath, source);
		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Daily Weather to Slack' }),
			{ markAsAiTemporary: true },
		);
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			filePath,
			workflowId: 'wf-1',
			workflowVersionId: 'v-1',
			sourceHash: hashWorkflowSource(source),
		});
	});

	it('emits a compiled-workflow trace child run carrying the compiled JSON when tracing is present', async () => {
		const source = 'workflow source from workspace';
		const actorRun = { id: 'actor-run-1' };
		const startChildRun = vi.fn<
			(parent: unknown, init: Record<string, unknown>) => Promise<{ id: string }>
		>(async () => await Promise.resolve({ id: 'compiled-run-1' }));
		const finishRun = vi.fn<(run: { id: string }, opts: Record<string, unknown>) => Promise<void>>(
			async () => await Promise.resolve(),
		);
		const tracing = {
			actorRun,
			startChildRun,
			finishRun,
		} as unknown as InstanceAiContext['tracing'];
		const { context, filePath } = makeContext({ source, overrides: { tracing } });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result.success).toBe(true);
		// Attaches to the active actor run as a trace-only child named 'compiled-workflow'.
		expect(startChildRun).toHaveBeenCalledTimes(1);
		const [parentRun, init] = startChildRun.mock.calls[0];
		expect(parentRun).toBe(actorRun);
		expect(init).toMatchObject({
			name: 'compiled-workflow',
			// Bookkeeping span, not an agent tool call.
			runType: 'chain',
			metadata: { workflow_id: 'wf-1', source_hash: hashWorkflowSource(source) },
		});
		// The compiled workflow JSON lands in the child run's outputs...
		expect(finishRun).toHaveBeenCalledTimes(1);
		const [finishedRun, finishOpts] = finishRun.mock.calls[0];
		expect(finishedRun).toMatchObject({ id: 'compiled-run-1' });
		expect(finishOpts).toMatchObject({
			// Raw: skips structural sanitization; export scrubbing still applies.
			rawOutputs: true,
			outputs: {
				workflowId: 'wf-1',
				sourceHash: hashWorkflowSource(source),
				workflow: { nodes: [{ type: 'n8n-nodes-base.webhook' }] },
			},
		});
		// ...and never leaks into the agent-facing tool output.
		expect(result).not.toHaveProperty('workflow');
	});

	it('emits only a truncated marker when the compiled JSON exceeds the size gate', async () => {
		const source = 'workflow source from workspace';
		const huge = structuredClone(generatedWorkflow);
		(huge.nodes[0] as { parameters: Record<string, unknown> }).parameters = {
			blob: 'x'.repeat(1_100_000),
		};
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: huge,
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		const startChildRun = vi.fn<
			(parent: unknown, init: Record<string, unknown>) => Promise<{ id: string }>
		>(async () => await Promise.resolve({ id: 'compiled-run-1' }));
		const finishRun = vi.fn<(run: { id: string }, opts: Record<string, unknown>) => Promise<void>>(
			async () => await Promise.resolve(),
		);
		const tracing = {
			actorRun: { id: 'actor-run-1' },
			startChildRun,
			finishRun,
		} as unknown as InstanceAiContext['tracing'];
		const { context, filePath } = makeContext({ source, overrides: { tracing } });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result.success).toBe(true);
		expect(finishRun).toHaveBeenCalledTimes(1);
		const [, finishOpts] = finishRun.mock.calls[0];
		// Marker only, and small ⇒ not raw; the consumer falls back to source replay.
		expect(finishOpts).toMatchObject({
			outputs: { workflowId: 'wf-1', sourceHash: hashWorkflowSource(source), truncated: true },
		});
		expect((finishOpts as { outputs: Record<string, unknown> }).outputs).not.toHaveProperty(
			'workflow',
		);
		expect((finishOpts as { rawOutputs?: boolean }).rawOutputs).toBeUndefined();
	});

	it('reports the emission as skipped when tracing is absent', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source from workspace' });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result.success).toBe(true);
		// No ambient trace in unit env and no handle ⇒ the emission is a no-op
		// and says so — it must not claim success into a void.
		expect(emitTraceOnlyChildRun).toHaveBeenCalledTimes(1);
		expect(vi.mocked(emitTraceOnlyChildRun).mock.calls[0][0]).toBeUndefined();
		await expect(vi.mocked(emitTraceOnlyChildRun).mock.results[0].value).resolves.toBe('skipped');
	});

	it('reports the emission as skipped when the handle is stale (runtime shut down)', async () => {
		const startChildRun = vi.fn();
		const tracing = {
			actorRun: { id: 'actor-run-1' },
			isLive: () => false,
			startChildRun,
			finishRun: vi.fn(),
		} as unknown as InstanceAiContext['tracing'];
		const { context, filePath } = makeContext({
			source: 'workflow source from workspace',
			overrides: { tracing },
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result.success).toBe(true);
		// A dead runtime's runs are spanless and export nothing — no attempt, no
		// 'handle' claim.
		expect(startChildRun).not.toHaveBeenCalled();
		await expect(vi.mocked(emitTraceOnlyChildRun).mock.results[0].value).resolves.toBe('skipped');
	});

	it('keeps pending workflow setup ready for verification', async () => {
		vi.mocked(analyzeWorkflow).mockResolvedValueOnce([
			{
				node: {
					id: 'slack-1',
					name: 'Send No-Rain Message',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.3,
					parameters: {
						channelId: { __rl: true, mode: 'id', value: '' },
					},
					position: [0, 0],
				},
				parameterIssues: {
					channelId: ['Not a valid Slack Channel ID or name'],
				},
				isTrigger: false,
				needsAction: true,
			} as SetupRequest,
		]);
		const { context, filePath } = makeContext({ source: 'workflow source from workspace' });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
		});

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			verificationReadiness: {
				status: 'ready',
			},
			setupRequirement: {
				status: 'required',
				reason: 'workflow-needs-setup',
			},
		});
	});

	it('updates the workflow bound to the source file and remembers the binding', async () => {
		const { context, filePath, trackTelemetry } = makeContext({ source: 'workflow source' });
		const tool = createBuildWorkflowTool(context);

		const first = await executeTool<BuildToolOutput>(tool, {
			filePath,
			workflowId: 'wf-bound',
		});
		const second = await executeTool<BuildToolOutput>(tool, { filePath });

		expect(first).toMatchObject({ success: true, workflowId: 'wf-bound' });
		expect(second).toMatchObject({ success: true, workflowId: 'wf-bound' });
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(2);
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-bound',
			expect.any(Object),
			undefined,
		);
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'success',
				stage: 'save',
				file_path: filePath,
				identity_bound: true,
				target_workflow_id: 'wf-bound',
				workflow_id: 'wf-bound',
				save_operation: 'update',
			}),
		);
	});

	it('preserves setup-applied placeholder values before updating an existing workflow', async () => {
		const rebuiltWorkflow = {
			name: 'Daily Berlin Rain Alert',
			nodes: [
				{
					id: 'new-email',
					name: 'Email Rain Alert',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 2.1,
					position: [0, 0] as [number, number],
					parameters: {
						resource: 'message',
						operation: 'send',
						sendTo: '<__PLACEHOLDER_VALUE__Your email address__>',
						subject: 'Rain alert',
					},
				},
				{
					id: 'new-slack',
					name: 'Slack Sunny Day',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.3,
					position: [280, 0] as [number, number],
					parameters: {
						resource: 'message',
						operation: 'post',
						select: 'user',
						user: {
							__rl: true,
							mode: 'username',
							value: 'oleg',
							cachedResultName: 'oleg',
						},
					},
				},
			],
			connections: {},
		};
		const existingWorkflow = {
			name: 'Daily Berlin Rain Alert',
			nodes: [
				{
					id: 'old-email',
					name: 'Email Rain Alert',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 2.1,
					position: [0, 0] as [number, number],
					parameters: {
						resource: 'message',
						operation: 'send',
						sendTo: 'person@example.com',
						subject: 'Old rain alert',
					},
				},
			],
			connections: {},
		};
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: rebuiltWorkflow,
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				workflowService: {
					createFromWorkflowJSON: vi.fn(
						async () => await Promise.resolve({ id: 'wf-1', versionId: 'v-1' }),
					),
					updateFromWorkflowJSON: vi.fn(
						async (workflowId: string) =>
							await Promise.resolve({ id: workflowId, versionId: 'v-next' }),
					),
					getAsWorkflowJSON: vi.fn(async () => await Promise.resolve(existingWorkflow)),
					clearAiTemporary: vi.fn(async () => await Promise.resolve()),
				} as unknown as InstanceAiContext['workflowService'],
			},
		});

		await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-existing',
			expect.any(Object),
			undefined,
		);
		const savedWorkflow = vi.mocked(context.workflowService.updateFromWorkflowJSON).mock
			.calls[0]?.[1];
		const emailNode = savedWorkflow?.nodes.find((node) => node.name === 'Email Rain Alert');
		const slackNode = savedWorkflow?.nodes.find((node) => node.name === 'Slack Sunny Day');
		expect(emailNode?.parameters).toMatchObject({
			sendTo: 'person@example.com',
			subject: 'Rain alert',
		});
		expect(slackNode?.parameters?.user).toMatchObject({ value: 'oleg' });
	});

	it('updates an existing workflow from a WorkflowJSON workspace source file', async () => {
		const workflowJson = {
			id: 'wf-existing',
			name: 'Daily Slack Channel Digest',
			nodes: [
				{
					id: 'node-1',
					name: 'Send Summary DM',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.5,
					position: [0, 0] as [number, number],
					parameters: {
						resource: 'message',
						operation: 'post',
						select: 'user',
						user: { __rl: true, mode: 'username', value: 'oleg', cachedResultName: '@oleg' },
					},
				},
			],
			connections: {},
			settings: { executionOrder: 'v1' as const },
		};
		const source = JSON.stringify(workflowJson, null, 2);
		const { context, filePath } = makeContext({
			source,
			filePath: 'src/workflows/daily-slack-digest.workflow.json',
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: workflowJson,
			warnings: [],
			compiler: 'workflow-json',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		expect(result).toMatchObject({
			success: true,
			filePath,
			sourceHash: hashWorkflowSource(source),
			workflowId: 'wf-existing',
			workflowName: 'Daily Slack Channel Digest',
		});
		expect(compileWorkflowSource).toHaveBeenCalledWith(context, filePath, source);
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-existing',
			workflowJson,
			undefined,
		);
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns a code-fixable error for malformed WorkflowJSON source files', async () => {
		const source = '{ "name": "Broken", ';
		const { context, filePath } = makeContext({
			source,
			filePath: 'src/workflows/broken.workflow.json',
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: false,
			reason: 'workflow_json_parse_failed',
			editable: true,
			errors: ['Failed to parse workflow JSON: Unexpected end of JSON input'],
			summary: 'Workflow JSON source did not parse.',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			sourceHash: hashWorkflowSource(source),
			workflowId: 'wf-existing',
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_json_parse_failed',
			},
		});
		expect(result.errors?.[0]).toContain('Failed to parse workflow JSON');
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns a code-fixable error for incomplete WorkflowJSON source files', async () => {
		const source = JSON.stringify({ name: 'Missing nodes', connections: {} });
		const { context, filePath } = makeContext({
			source,
			filePath: 'src/workflows/incomplete.workflow.json',
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: false,
			reason: 'workflow_json_invalid',
			editable: true,
			errors: ['Workflow JSON must include name, nodes, and connections.'],
			summary: 'Workflow JSON source is missing required workflow fields.',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			sourceHash: hashWorkflowSource(source),
			workflowId: 'wf-existing',
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_json_invalid',
			},
		});
		expect(result.errors).toEqual(['Workflow JSON must include name, nodes, and connections.']);
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('uses the current workspace file hash after source edits', async () => {
		const originalSource = 'old source';
		const editedSource = 'edited source';
		const { context, files, filePath } = makeContext({ source: originalSource });
		files.set(filePath, editedSource);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: true,
			sourceHash: hashWorkflowSource(editedSource),
		});
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			sourceHash: hashWorkflowSource(editedSource),
			workflowId: 'wf-1',
			workflowVersionId: 'v-1',
		});
	});

	it('escalates when the same source build failure repeats for one source file', async () => {
		const { context, filePath } = makeContext({ source: 'a.join()' });
		const failure = workflowSourceBuildFailure(
			"Failed to execute workflow source: Method 'join' is not available.",
		);
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce(failure).mockResolvedValueOnce(failure);

		const tool = createBuildWorkflowTool(context);
		const first = await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const second = await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });

		expect(first.success).toBe(false);
		expect((first.errors ?? []).join('\n')).not.toContain('You already tried this');
		expect(second.success).toBe(false);
		expect((second.errors ?? []).join('\n')).toContain('You already tried this');
		expect((second.errors ?? []).join('\n')).not.toContain('workflow-sdk-language.md');
	});

	it('rejects obsolete inline build payload fields', () => {
		expect(
			buildWorkflowInputSchema.safeParse({
				filePath: 'src/workflows/main.workflow.ts',
				sourceRef: 'wfsrc_legacy',
			}).success,
		).toBe(false);
		expect(
			buildWorkflowInputSchema.safeParse({
				filePath: 'src/workflows/main.workflow.ts',
				code: 'const workflow = new Workflow()',
			}).success,
		).toBe(false);
		expect(
			buildWorkflowInputSchema.safeParse({
				filePath: 'src/workflows/main.workflow.ts',
				patches: [{ old: 'foo', new: 'bar' }],
			}).success,
		).toBe(false);
	});

	it('rejects source paths outside the runtime workspace', () => {
		expect(buildWorkflowInputSchema.safeParse({ filePath: '../main.workflow.ts' }).success).toBe(
			false,
		);
		expect(buildWorkflowInputSchema.safeParse({ filePath: '/tmp/main.workflow.ts' }).success).toBe(
			false,
		);
		expect(buildWorkflowInputSchema.safeParse({ filePath: '~/main.workflow.ts' }).success).toBe(
			false,
		);
	});

	it('returns blocked remediation when the bound workflow no longer exists', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.updateFromWorkflowJSON).mockRejectedValue(
			new Error('Workflow not found'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-deleted',
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			workflowId: 'wf-deleted',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'bound_workflow_not_found',
			},
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns a structured save failure when preserving existing webhook IDs fails', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(ensureWebhookIds).mockRejectedValueOnce(
			new Error(
				'Failed to load existing workflow wf-bound to preserve webhook IDs: Workflow not found',
			),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-bound',
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			workflowId: 'wf-bound',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'bound_workflow_not_found',
			},
		});
		expect(result.errors?.[0]).toContain('preserve webhook IDs');
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns blocked remediation when create permission is blocked', async () => {
		const { context, filePath, trackTelemetry } = makeContext({
			overrides: {
				permissions: {
					createWorkflow: 'blocked',
					updateWorkflow: 'always_allow',
				} as InstanceAiContext['permissions'],
			},
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'permission_blocked',
			},
			errors: ['Action blocked by admin'],
		});
		expect(compileWorkflowSource).not.toHaveBeenCalled();
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'blocked',
				stage: 'permission',
				file_path: filePath,
				remediation_category: 'blocked',
				remediation_reason: 'permission_blocked',
			}),
		);
	});

	it('routes credential save failures to setup', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.createFromWorkflowJSON).mockRejectedValue(
			new Error('Credential "slackApi" is not accessible'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'workflow_save_credential_setup_required',
			},
		});
	});

	it('blocks read-only save failures', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.createFromWorkflowJSON).mockRejectedValue(
			new Error('This instance is read-only'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'workflow_save_permission_blocked',
			},
		});
	});

	it('reports planned build outcomes without source artifact metadata', async () => {
		const reportBuildOutcome = vi.fn<
			(outcome: WorkflowBuildOutcome) => Promise<{ type: 'verify'; workflowId: string }>
		>(async () => await Promise.resolve({ type: 'verify', workflowId: 'wf-1' }));
		const markSucceeded = vi.fn(async () => await Promise.resolve(null));
		const onBuildOutcome = vi.fn<(outcome: WorkflowBuildOutcome) => void>();
		const { context, filePath } = makeContext({
			overrides: {
				workflowBuildContext: {
					threadId: 'thread-1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-planned',
					plannedTaskService: { markSucceeded } as unknown as NonNullable<
						InstanceAiContext['workflowBuildContext']
					>['plannedTaskService'],
					workflowTaskService: { reportBuildOutcome } as unknown as NonNullable<
						InstanceAiContext['workflowBuildContext']
					>['workflowTaskService'],
					onBuildOutcome,
				},
			},
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-planned',
		});
		expect(result.postBuildFlow).toBeUndefined();
		const storedOutcome = onBuildOutcome.mock.calls[0]?.[0] as WorkflowBuildOutcome | undefined;
		expect(storedOutcome).toMatchObject({
			workItemId: 'wi-planned',
			taskId: 'task-1',
			owner: { type: 'planned', taskId: 'task-1' },
			plannedTaskId: 'task-1',
			sourceFilePath: filePath,
		});
		expect(storedOutcome).not.toHaveProperty('sourceArtifact');

		const reportedOutcome = reportBuildOutcome.mock.calls[0]?.[0] as
			| WorkflowBuildOutcome
			| undefined;
		expect(reportedOutcome).toMatchObject({
			workItemId: 'wi-planned',
			sourceFilePath: filePath,
		});
		expect(reportedOutcome).not.toHaveProperty('sourceArtifact');
		expect(markSucceeded).toHaveBeenCalledWith('thread-1', 'task-1', expect.any(Object));
	});

	it('routes source-declared node outputs through the simulation plan', async () => {
		const onBuildOutcome = vi.fn<(outcome: WorkflowBuildOutcome) => void>();
		const reportBuildOutcome = vi.fn(async () => await Promise.resolve(null));
		const rainyOutput = [
			{
				daily: {
					time: ['2026-06-23'],
					precipitation_sum: [6.4],
					precipitation_probability_max: [85],
				},
			},
		];
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: {
				...structuredClone(generatedWorkflow),
				nodes: [
					...structuredClone(generatedWorkflow.nodes),
					{
						id: 'weather-1',
						name: 'Get Berlin Weather',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.4,
						position: [240, 0],
						parameters: { method: 'GET', url: 'https://api.open-meteo.com/v1/forecast' },
					},
				],
			},
			declaredOutputFixtures: { 'Get Berlin Weather': rainyOutput },
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		const { context, filePath } = makeContext({
			overrides: {
				workflowBuildContext: {
					threadId: 'thread-1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-1',
					workflowTaskService: { reportBuildOutcome } as unknown as NonNullable<
						InstanceAiContext['workflowBuildContext']
					>['workflowTaskService'],
					onBuildOutcome,
				},
			},
		});

		await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), { filePath });

		const outcome = onBuildOutcome.mock.calls[0]?.[0] as WorkflowBuildOutcome | undefined;
		expect(outcome?.nodeSimulationPlan).toContainEqual({
			nodeName: 'Get Berlin Weather',
			verdict: 'simulate',
			reason: 'Source declares verification output for this node',
			confidence: 'high',
			source: 'deterministic',
		});
		expect(outcome?.simulationFixtures).toEqual({ 'Get Berlin Weather': rainyOutput });
		expect(outcome?.verificationPinData).toBeUndefined();
	});

	it('returns source file metadata on validation failures', async () => {
		const { context, filePath } = makeContext({ source: 'invalid source' });
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: { name: 'Generated workflow', nodes: [], connections: {} },
			warnings: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
			compiler: 'sandbox-tsx',
		});
		vi.mocked(partitionWarnings).mockReturnValueOnce({
			errors: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
			informational: [],
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			sourceHash: hashWorkflowSource('invalid source'),
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_source_validation_failed',
			},
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('keeps repeated validation-error escalation generic', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		const validationResult = {
			success: true as const,
			workflow: { name: 'Generated workflow', nodes: [], connections: {} },
			warnings: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
			compiler: 'sandbox-tsx' as const,
		};
		const partitionedWarnings = {
			errors: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
			informational: [],
		};
		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(validationResult)
			.mockResolvedValueOnce(validationResult);
		vi.mocked(partitionWarnings)
			.mockReturnValueOnce(partitionedWarnings)
			.mockReturnValueOnce(partitionedWarnings);

		const tool = createBuildWorkflowTool(context);

		await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const second = await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const errorText = (second.errors ?? []).join('\n');
		expect(errorText).toContain('You already tried this');
		expect(errorText).not.toContain('workflow-sdk-language.md');
		expect(errorText).not.toContain('Code node');
	});

	it('adds HTTP raw-body guidance to repeated specifyBody validation errors', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		const validationResult = {
			success: true as const,
			workflow: { name: 'Generated workflow', nodes: [], connections: {} },
			warnings: [
				{
					code: 'INVALID_PARAMETER',
					nodeName: 'HTTP Request',
					message:
						'Node "EWS FindItem": parameters.specifyBody: This field is only allowed when one of: (sendBody=true, contentType="json") or (sendBody=true, contentType="form-urlencoded")',
				},
			],
			compiler: 'sandbox-tsx' as const,
		};
		const partitionedWarnings = {
			errors: validationResult.warnings,
			informational: [],
		};
		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(validationResult)
			.mockResolvedValueOnce(validationResult);
		vi.mocked(partitionWarnings)
			.mockReturnValueOnce(partitionedWarnings)
			.mockReturnValueOnce(partitionedWarnings);

		const tool = createBuildWorkflowTool(context);

		await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const second = await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const errorText = (second.errors ?? []).join('\n');
		expect(errorText).toContain('contentType="raw"');
		expect(errorText).toContain('omit specifyBody');
		expect(errorText).toContain('rawContentType');
		expect(errorText).not.toContain('workflow-sdk-language.md');
	});

	it('uses workflowBuildContext work item as the repeat-failure key', async () => {
		const workflowBuildContext = {
			threadId: 'thread-1',
			runId: 'run-1',
			taskId: 'task-1',
			workItemId: 'wi-1',
		};
		const { context, filePath } = makeContext({ overrides: { workflowBuildContext } });

		const failure = workflowSourceBuildFailure(
			"Failed to execute workflow source: Method 'join' is not available.",
		);
		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(failure)
			.mockResolvedValueOnce(failure)
			.mockResolvedValueOnce(failure);

		const tool = createBuildWorkflowTool(context);
		await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		workflowBuildContext.workItemId = 'wi-2';
		const firstForSecondWorkItem = await executeTool<{ success: boolean; errors?: string[] }>(
			tool,
			{ filePath },
		);
		const repeatForSecondWorkItem = await executeTool<{ success: boolean; errors?: string[] }>(
			tool,
			{ filePath },
		);

		expect((firstForSecondWorkItem.errors ?? []).join('\n')).not.toContain(
			'You already tried this',
		);
		expect((repeatForSecondWorkItem.errors ?? []).join('\n')).toContain('You already tried this');
	});

	it('does not share repeat-failure history between main and supporting workflows', async () => {
		const { context, filePath } = makeContext({
			overrides: {
				workflowBuildContext: {
					threadId: 'thread-1',
					runId: 'run-1',
					taskId: 'task-1',
					workItemId: 'wi-main',
				},
			},
		});

		const failure = workflowSourceBuildFailure(
			"Failed to execute workflow source: Method 'join' is not available.",
		);
		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(failure)
			.mockResolvedValueOnce(failure)
			.mockResolvedValueOnce(failure);

		const tool = createBuildWorkflowTool(context);
		await executeTool<{ success: boolean; errors?: string[] }>(tool, { filePath });
		const firstSupportingAttempt = await executeTool<{ success: boolean; errors?: string[] }>(
			tool,
			{ filePath, isSupportingWorkflow: true, name: 'Support workflow' },
		);
		const repeatSupportingAttempt = await executeTool<{ success: boolean; errors?: string[] }>(
			tool,
			{ filePath, isSupportingWorkflow: true, name: 'Support workflow' },
		);

		expect((firstSupportingAttempt.errors ?? []).join('\n')).not.toContain(
			'You already tried this',
		);
		expect((repeatSupportingAttempt.errors ?? []).join('\n')).toContain('You already tried this');
	});
});

describe('autoImportMissingSdkSymbols', () => {
	it('adds missing symbols to an existing SDK import', () => {
		const source =
			"import {\n  workflow,\n  node,\n} from '@n8n/workflow-sdk';\n\nexport default workflow('id', 'n');";
		const result = autoImportMissingSdkSymbols(source, [
			'ReferenceError: expr is not defined',
			'nodeJson is not defined',
		]);

		expect(result?.symbols.sort()).toEqual(['expr', 'nodeJson']);
		expect(result?.source).toContain('expr,');
		expect(result?.source).toContain('nodeJson,');
		expect(result?.source).toContain('workflow,');
	});

	it('prepends an import when none exists', () => {
		const result = autoImportMissingSdkSymbols('export default workflow();', [
			'workflow is not defined',
		]);

		expect(result?.source.startsWith("import { workflow } from '@n8n/workflow-sdk';")).toBe(true);
	});

	it('ignores unknown symbols and unrelated errors', () => {
		expect(
			autoImportMissingSdkSymbols('code', ['myHelper is not defined', 'Unexpected token']),
		).toBeUndefined();
	});
});

describe('auto-import recovery on compile failure', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Real classifier: guards that auto_imported_sdk_symbols stays informational.
		const actual = await vi.importActual<{ partitionWarnings: typeof partitionWarnings }>(
			'../workflow-validation-warnings',
		);
		vi.mocked(partitionWarnings).mockImplementation(actual.partitionWarnings);
		vi.mocked(analyzeWorkflow).mockResolvedValue([]);
	});

	it('injects missing SDK imports, persists the corrected source, and retries once', async () => {
		const source = "export default workflow('id', 'n').add(t).to(s);";
		const { context, files, filePath } = makeContext({ source });

		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(workflowSourceBuildFailure('ReferenceError: expr is not defined'))
			.mockResolvedValueOnce({
				success: true,
				workflow: structuredClone(generatedWorkflow),
				warnings: [],
				compiler: 'sandbox-tsx',
			});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Recovered Workflow',
		});

		expect(result.success).toBe(true);
		// Corrected source persisted so later edits/repairs see it.
		const persisted = files.get(filePath);
		expect(persisted).toContain("import { expr } from '@n8n/workflow-sdk';");
		expect(result.sourceHash).toBe(hashWorkflowSource(persisted!));
		// The model is told what was fixed.
		expect(result.warnings?.join('\n')).toContain(
			'Auto-added missing @n8n/workflow-sdk import(s): expr',
		);
		expect(compileWorkflowSource).toHaveBeenCalledTimes(2);
	});

	it('returns the retried errors when the recovery retry still fails', async () => {
		const source = "export default workflow('id', 'n').add(t).to(s);";
		const { context, files, filePath } = makeContext({ source });

		vi.mocked(compileWorkflowSource)
			.mockResolvedValueOnce(workflowSourceBuildFailure('ReferenceError: expr is not defined'))
			.mockResolvedValueOnce(workflowSourceBuildFailure("Cannot find name 'unrelated'"));

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Still Broken Workflow',
		});

		expect(result.success).toBe(false);
		// Errors describe the persisted (import-injected) file, not the original source.
		expect(result.errors?.join('\n')).toContain("Cannot find name 'unrelated'");
		expect(result.errors?.join('\n')).not.toContain('expr is not defined');
		expect(files.get(filePath)).toContain("import { expr } from '@n8n/workflow-sdk';");
		expect(compileWorkflowSource).toHaveBeenCalledTimes(2);
	});

	it('falls through to the original error when recovery does not apply', async () => {
		const source = "export default workflow('id', 'n');";
		const { context, filePath } = makeContext({ source });

		vi.mocked(compileWorkflowSource).mockResolvedValue(
			workflowSourceBuildFailure('Unexpected token'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Broken Workflow',
		});

		expect(result.success).toBe(false);
		expect(result.errors?.join('\n')).toContain('Unexpected token');
		expect(compileWorkflowSource).toHaveBeenCalledTimes(1);
	});
});
