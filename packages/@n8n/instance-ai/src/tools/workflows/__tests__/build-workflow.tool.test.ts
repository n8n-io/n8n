import { executeTool } from '../../../__tests__/tool-test-utils';
import { WorkflowNotFoundError } from '../../../errors/workflow-not-found.error';
import { WorkflowSaveConflictError } from '../../../errors/workflow-save-conflict.error';
import { emitTraceOnlyChildRun } from '../../../tracing/langsmith-tracing';
import type { InstanceAiContext } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import {
	autoImportMissingSdkSymbols,
	buildWorkflowInputSchema,
	createBuildWorkflowTool,
} from '../build-workflow.tool';
import { buildCredentialMap, resolveCredentials } from '../resolve-credentials';
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

vi.mock('../workflow-validation-warnings', async () => {
	const actual = await vi.importActual<typeof import('../workflow-validation-warnings')>(
		'../workflow-validation-warnings',
	);
	return {
		...actual,
		partitionWarnings: vi.fn((warnings: unknown[]) => ({ blocking: [], informational: warnings })),
	};
});

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
	isN8nCreditsWalletDepleted: vi.fn(async () => await Promise.resolve(false)),
	resolveCredentials: vi.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				heldForNewCredentialTypes: [],
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
	executionIntent?: string;
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
		guidance?: string;
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
				async () =>
					await Promise.resolve({ id: 'wf-1', versionId: 'v-1', checksum: 'checksum-create' }),
			),
			updateFromWorkflowJSON: vi.fn(
				async (workflowId: string) =>
					await Promise.resolve({
						id: workflowId,
						versionId: 'v-next',
						checksum: 'checksum-update',
					}),
			),
			get: vi.fn(
				async (workflowId: string) =>
					await Promise.resolve({
						id: workflowId,
						versionId: 'v-current',
						checksum: 'checksum-current',
					}),
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
			blocking: [],
			informational: warnings,
		}));
		vi.mocked(analyzeWorkflow).mockResolvedValue([]);
	});

	// The field that caused the misreport: `projectId` was advertised here as "Project
	// ID to create the workflow in", while the adapter resolved the bound project and
	// ignored it. So the agent picked a project, the workflow went somewhere else, and
	// the build reported the project it had asked for. Writes are bound-project only —
	// there must be no knob suggesting otherwise.
	it("offers no projectId — a build writes to the conversation's own project", () => {
		expect(buildWorkflowInputSchema.shape).not.toHaveProperty('projectId');

		// The schema is `.strict()`, so a stale caller that still sends one fails LOUDLY
		// rather than having it quietly dropped — which is the right end of the trade:
		// the old silent drop is exactly what let a build report a project it never
		// wrote to.
		expect(() =>
			buildWorkflowInputSchema.parse({ filePath: 'wf.workflow.ts', projectId: 'other-project-id' }),
		).toThrow(/projectId/);
	});

	it('requires workflow-builder and data-table-manager skill loads in its description', () => {
		const { context } = makeContext({ source: 'workflow source' });
		const tool = createBuildWorkflowTool(context);

		expect(tool.description).toContain('workflow-builder');
		expect(tool.description).toContain('data-table-manager');
		expect(tool.description).toContain('load_skill');
		expect(tool.description).toContain(
			'Use TypeScript SDK .workflow.ts source for new and existing workflows.',
		);
		expect(tool.description).not.toContain('WorkflowJSON .json source for existing workflow edits');
		expect(buildWorkflowInputSchema.shape.filePath.description).toContain(
			'Workspace-relative path to the TypeScript SDK workflow source file',
		);
		expect(buildWorkflowInputSchema.shape.filePath.description).not.toContain('WorkflowJSON');
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
		// The language reminder in the skill intro must ride along in the inline copy.
		expect(result.postBuildFlow?.instructions).toContain(
			"stays in the user's conversation language",
		);
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
			'never offer publishing as an alternative to the live test',
		);
		expect(result.postBuildFlow?.guidance).toContain(
			'A user-run execution counts only after `executions(action="list")`',
		);
		expect(result.postBuildFlow?.guidance).toContain(
			'Do not replace the error-workflow opt-in with a generic add-anything',
		);
		expect(compileWorkflowSource).toHaveBeenCalledWith(context, filePath, source, undefined);
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

	it('hands one-off builds to the one-off-operations skill with optional verification', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath } = makeContext({ source });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'One-off attendee export',
			executionIntent: 'one-off',
		});

		expect(result).toMatchObject({
			success: true,
			// One-off intent rides on executionIntent, NOT on a new readiness
			// status — the readiness union is persisted and old readers hard-fail
			// on unknown variants (rollback safety).
			verificationReadiness: { status: 'ready' },
			executionIntent: 'one-off',
			postBuildFlow: {
				required: true,
				skillId: 'one-off-operations',
				reason: 'direct-one-off-build-succeeded',
			},
		});
		expect(result.postBuildFlow?.guidance).toContain('Simulated verification is NOT required');
		expect(result.postBuildFlow?.instructions).toContain('# One-Off Operations');
		expect(result.postBuildFlow?.instructions).not.toContain('recommended_tools');
		// The verify-biased post-build-flow body must NOT ride along on a one-off build.
		expect(result.postBuildFlow?.instructions).not.toContain('# Post-Build Flow');
	});

	it('drops invalid node groups before saving and reports the drop', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath, trackTelemetry } = makeContext({ source });
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: {
				name: 'Grouped workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
				nodeGroups: [
					{
						id: 'group-1',
						name: 'Broken group',
						nodeIds: ['missing-node', 'another-missing-node'],
					},
				],
			},
			warnings: [],
			compiler: 'sandbox-tsx',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result.success).toBe(true);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings?.join('\n')).toContain('[NODE_GROUP_DROPPED]');
		expect(result.warnings?.join('\n')).toContain('Broken group');
		expect(result.warnings?.join('\n')).toContain('missing-node');
		expect(result.warnings?.join('\n')).toContain('another-missing-node');

		const savedWorkflow = vi.mocked(context.workflowService.createFromWorkflowJSON).mock
			.calls[0]?.[0];
		expect(savedWorkflow?.nodeGroups).toEqual([]);
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				dropped_group_count: 1,
				warning_count: 1,
			}),
		);
	});

	it('falls back to the post-build-flow handoff for a triggerless one-off build', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath } = makeContext({ source });
		vi.mocked(compileWorkflowSource).mockResolvedValue({
			success: true,
			workflow: {
				...structuredClone(generatedWorkflow),
				nodes: [
					{
						id: 'set-1',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
			},
			warnings: [],
			compiler: 'sandbox-tsx',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'One-off without a trigger',
			executionIntent: 'one-off',
		});

		// The one-off instructions' completion criterion is a live run, which a
		// triggerless workflow cannot start — hand off to the standard flow.
		expect(result.verificationReadiness).toMatchObject({ status: 'not_verifiable' });
		expect(result.postBuildFlow).toMatchObject({
			skillId: 'post-build-flow',
			reason: 'direct-build-succeeded',
		});
	});

	it('keeps one-off intent sticky when a repair rebuild omits executionIntent', async () => {
		const source = 'workflow source from workspace';
		const priorOutcome = { executionIntent: 'one-off' };
		const workflowTaskService = {
			getBuildOutcome: vi.fn(async () => await Promise.resolve(priorOutcome)),
			reportBuildOutcome: vi.fn(async () => await Promise.resolve()),
		} as unknown as NonNullable<InstanceAiContext['workflowBuildContext']>['workflowTaskService'];
		const { context, filePath } = makeContext({
			source,
			overrides: {
				workflowBuildContext: {
					threadId: 'thread-1',
					runId: 'run-1',
					taskId: 'task-1',
					workflowTaskService,
				} as InstanceAiContext['workflowBuildContext'],
			},
		});

		// Repair rebuild: no executionIntent on the input.
		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'One-off attendee export',
		});

		// The stored intent survives the rebuild — the outcome must not silently
		// flip back to the verify-first flow mid-repair.
		expect(result.executionIntent).toBe('one-off');
		expect(result.postBuildFlow).toMatchObject({
			skillId: 'one-off-operations',
			reason: 'direct-one-off-build-succeeded',
		});
	});

	it('keeps reusable builds on the post-build-flow handoff', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath } = makeContext({ source });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			name: 'Daily Weather to Slack',
			executionIntent: 'reusable',
		});

		expect(result).toMatchObject({
			success: true,
			verificationReadiness: { status: 'ready' },
			postBuildFlow: {
				required: true,
				skillId: 'post-build-flow',
				reason: 'direct-build-succeeded',
			},
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

	it('does not fail the build on blocking findings for nodes unchanged from the saved workflow', async () => {
		// Severity-aware partition (the default test mock ignores severity).
		vi.mocked(partitionWarnings).mockImplementation((warnings: ValidationWarning[]) => ({
			blocking: warnings.filter((w) => w.severity !== 'informational'),
			informational: warnings.filter((w) => w.severity === 'informational'),
		}));
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: structuredClone(generatedWorkflow),
			warnings: [
				{
					code: 'INVALID_PARAMETER',
					message: 'Node "Webhook": Missing discriminator "parameters.resource".',
					nodeName: 'Webhook',
				},
			],
			compiler: 'sandbox-tsx',
		});
		const { context, filePath } = makeContext({ source: 'workflow source' });
		// Saved workflow contains the identical node — this build did not touch it.
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			...structuredClone(generatedWorkflow),
			name: 'Target workflow',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-bound',
		});

		expect(result).toMatchObject({ success: true, workflowId: 'wf-bound' });
		expect(result.warnings?.some((w) => w.includes('pre-existing node'))).toBe(true);
	});

	it('still fails the build on blocking findings for nodes the build changed', async () => {
		vi.mocked(partitionWarnings).mockImplementation((warnings: ValidationWarning[]) => ({
			blocking: warnings.filter((w) => w.severity !== 'informational'),
			informational: warnings.filter((w) => w.severity === 'informational'),
		}));
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: structuredClone(generatedWorkflow),
			warnings: [
				{
					code: 'INVALID_PARAMETER',
					message: 'Node "Webhook": Missing discriminator "parameters.resource".',
					nodeName: 'Webhook',
				},
			],
			compiler: 'sandbox-tsx',
		});
		const { context, filePath } = makeContext({ source: 'workflow source' });
		// Saved workflow has different parameters on the node — the build changed it.
		const saved = structuredClone(generatedWorkflow);
		saved.nodes[0].parameters = { path: 'old-path' };
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			...saved,
			name: 'Target workflow',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-bound',
		});

		expect(result.success).toBe(false);
		expect(result.errors?.some((e) => e.includes('Missing discriminator'))).toBe(true);
	});

	it('does not require setup for pending nodes the build did not change', async () => {
		vi.mocked(analyzeWorkflow).mockResolvedValueOnce([
			{
				node: {
					id: 'webhook-1',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					parameters: {},
					position: [0, 0],
				},
				parameterIssues: { path: ['Missing webhook path'] },
				isTrigger: true,
				needsAction: true,
			} as SetupRequest,
		]);
		const { context, filePath } = makeContext({ source: 'workflow source' });
		// Saved workflow is identical to the compiled one — nothing changed.
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			...structuredClone(generatedWorkflow),
			name: 'Target workflow',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-bound',
		});

		expect(result).toMatchObject({
			success: true,
			setupRequirement: { status: 'not_required' },
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
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenNthCalledWith(
			1,
			'wf-bound',
			expect.any(Object),
			{ expectedChecksum: 'checksum-current' },
		);
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenNthCalledWith(
			2,
			'wf-bound',
			expect.any(Object),
			{ expectedChecksum: 'checksum-update' },
		);
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		await expect(getWorkflowSourceFileBinding(context, filePath)).resolves.toMatchObject({
			workflowChecksum: 'checksum-update',
		});
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

	it('updates a workflow created earlier in the run without requesting approval', async () => {
		const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				grantSessionToolApproval,
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'require_approval',
				} as InstanceAiContext['permissions'],
			},
		});
		const tool = createBuildWorkflowTool(context);
		const suspend = vi.fn();

		const created = await executeTool<BuildToolOutput>(tool, { filePath });
		// INS-1044: follow-up builds reuse the workflow created by the first build.
		const updated = await executeTool<BuildToolOutput>(tool, { filePath }, { suspend });

		expect(created).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(updated).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(context.aiCreatedWorkflowIds).toEqual(new Set(['wf-1']));
		expect(grantSessionToolApproval).toHaveBeenCalledWith('workflows:update:wf-1');
		expect(suspend).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('updates a workflow with a session ownership grant without requesting approval', async () => {
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				sessionApprovedToolKeys: new Set(['workflows:update:wf-session']),
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'require_approval',
				} as InstanceAiContext['permissions'],
			},
		});
		const suspend = vi.fn();

		const result = await executeTool<BuildToolOutput>(
			createBuildWorkflowTool(context),
			{ filePath, workflowId: 'wf-session' },
			{ suspend },
		);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-session' });
		expect(suspend).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('requests approval before updating a pre-existing workflow', async () => {
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'require_approval',
				} as InstanceAiContext['permissions'],
			},
		});
		const suspend = vi.fn();

		await executeTool(
			createBuildWorkflowTool(context),
			{ filePath, workflowId: 'wf-existing' },
			{ suspend },
		);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Edit Target workflow (ID: wf-existing)?',
				severity: 'warning',
				workflowId: 'wf-existing',
			}),
		);
		expect(compileWorkflowSource).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('persists a session update grant when edit approval resumes with scope=session', async () => {
		const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				grantSessionToolApproval,
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'require_approval',
				} as InstanceAiContext['permissions'],
			},
		});

		const result = await executeTool<BuildToolOutput>(
			createBuildWorkflowTool(context),
			{ filePath, workflowId: 'wf-existing' },
			{ resumeData: { approved: true, scope: 'session' } },
		);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-existing' });
		expect(grantSessionToolApproval).toHaveBeenCalledWith('workflows:update:wf-existing');
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('does not persist a grant for a one-time edit approval', async () => {
		const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				grantSessionToolApproval,
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'require_approval',
				} as InstanceAiContext['permissions'],
			},
		});

		await executeTool<BuildToolOutput>(
			createBuildWorkflowTool(context),
			{ filePath, workflowId: 'wf-existing' },
			{ resumeData: { approved: true } },
		);

		expect(grantSessionToolApproval).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('blocks updates to workflows created earlier in the run when admin policy denies them', async () => {
		const { context, filePath } = makeContext({
			source: 'workflow source',
			overrides: {
				aiCreatedWorkflowIds: new Set(['wf-created']),
				permissions: {
					createWorkflow: 'always_allow',
					updateWorkflow: 'blocked',
				} as InstanceAiContext['permissions'],
			},
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-created',
		});

		expect(result).toMatchObject({
			success: false,
			workflowId: 'wf-created',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'permission_blocked',
			},
			errors: ['Action blocked by admin'],
		});
		expect(compileWorkflowSource).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns conflict remediation when the workflow changed outside the conversation', async () => {
		const { context, filePath, trackTelemetry } = makeContext({ source: 'workflow source' });
		const tool = createBuildWorkflowTool(context);

		await executeTool<BuildToolOutput>(tool, {
			filePath,
			workflowId: 'wf-bound',
		});

		vi.mocked(context.workflowService.updateFromWorkflowJSON).mockRejectedValueOnce(
			new WorkflowSaveConflictError('wf-bound'),
		);

		const result = await executeTool<BuildToolOutput>(tool, { filePath });

		expect(result).toMatchObject({
			success: false,
			filePath,
			workflowId: 'wf-bound',
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_modified_externally',
			},
		});
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenLastCalledWith(
			'wf-bound',
			expect.any(Object),
			{ expectedChecksum: 'checksum-update' },
		);
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'failure',
				stage: 'conflict',
				target_workflow_id: 'wf-bound',
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
					get: vi.fn(
						async (workflowId: string) =>
							await Promise.resolve({
								id: workflowId,
								versionId: 'v-current',
								checksum: 'checksum-current',
							}),
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
			{ expectedChecksum: 'checksum-current' },
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
		expect(compileWorkflowSource).toHaveBeenCalledWith(context, filePath, source, undefined);
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-existing',
			workflowJson,
			{ expectedChecksum: 'checksum-current' },
		);
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	/**
	 * The compiled graph carries whatever ids the source declared. Surviving nodes must
	 * keep theirs so execution logs and the version diff still pair up (INS-970, INS-1120,
	 * INS-1179), and duplicates must be broken before reaching the DB, where
	 * (workflowId, nodeId) is a primary key.
	 */
	it('saves the node ids declared in the compiled workflow', async () => {
		const workflowJson = {
			id: 'wf-existing',
			name: 'Digest',
			nodes: [
				{
					id: 'saved-trigger',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
				{
					id: 'saved-set',
					name: 'Process',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [220, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
			settings: { executionOrder: 'v1' as const },
		};
		const { context, filePath } = makeContext({
			source: JSON.stringify(workflowJson, null, 2),
			filePath: 'src/workflows/digest.workflow.json',
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: workflowJson,
			warnings: [],
			compiler: 'workflow-json',
		});

		await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		const saved = vi.mocked(context.workflowService.updateFromWorkflowJSON).mock.calls[0][1];
		expect(saved.nodes.find((n) => n.name === 'Start')?.id).toBe('saved-trigger');
		expect(saved.nodes.find((n) => n.name === 'Process')?.id).toBe('saved-set');
	});

	/**
	 * With recovery-by-name in place this only fires when NOTHING matched — neither an id nor a
	 * name — i.e. the rebuild genuinely replaced the graph. That is the case worth reporting.
	 */
	it('warns without blocking when a rebuild matches no saved node at all', async () => {
		const rebuilt = {
			id: 'wf-existing',
			name: 'Digest',
			nodes: [
				{
					id: 'fresh-1',
					name: 'Rebuilt From Scratch',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
			settings: { executionOrder: 'v1' as const },
		};
		const { context, filePath } = makeContext({
			source: JSON.stringify(rebuilt, null, 2),
			filePath: 'src/workflows/digest.workflow.json',
		});
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			name: 'Digest',
			nodes: [
				{
					id: 'saved-1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: rebuilt,
			warnings: [],
			compiler: 'workflow-json',
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		expect(result.success).toBe(true);
		expect(result.warnings?.join('\n')).toContain('node_ids_not_preserved');
	});

	/**
	 * A node added in an earlier build has no `id` in the source file — nothing writes the
	 * assigned one back — so a rebuild from that file arrives with a fresh UUID. The save must
	 * hand it back the id it already has, or its identity churns on every rebuild.
	 */
	it('recovers the saved id of a rebuilt node whose source declares none', async () => {
		const rebuilt = {
			id: 'wf-existing',
			name: 'Digest',
			nodes: [
				{
					id: 'saved-trigger',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
				{
					id: 'fresh-uuid-this-build',
					name: 'Added Earlier',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [220, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
			settings: { executionOrder: 'v1' as const },
		};
		const { context, filePath } = makeContext({
			source: JSON.stringify(rebuilt, null, 2),
			filePath: 'src/workflows/digest.workflow.json',
		});
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue({
			name: 'Digest',
			nodes: [
				{
					id: 'saved-trigger',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'assigned-on-first-build',
					name: 'Added Earlier',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [220, 0],
					parameters: {},
				},
			],
			connections: {},
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: rebuilt,
			warnings: [],
			compiler: 'workflow-json',
		});

		await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		const saved = vi.mocked(context.workflowService.updateFromWorkflowJSON).mock.calls[0][1];
		expect(saved.nodes.find((n) => n.name === 'Added Earlier')?.id).toBe('assigned-on-first-build');
		expect(saved.nodes.find((n) => n.name === 'Start')?.id).toBe('saved-trigger');
	});

	it('breaks duplicate node ids before saving', async () => {
		const duplicated = {
			id: 'wf-existing',
			name: 'Digest',
			nodes: [
				{
					id: 'shared',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
				{
					id: 'shared',
					name: 'Process',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [220, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
			settings: { executionOrder: 'v1' as const },
		};
		const { context, filePath } = makeContext({
			source: JSON.stringify(duplicated, null, 2),
			filePath: 'src/workflows/digest.workflow.json',
		});
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: duplicated,
			warnings: [],
			compiler: 'workflow-json',
		});

		await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-existing',
		});

		const saved = vi.mocked(context.workflowService.updateFromWorkflowJSON).mock.calls[0][1];
		const savedIds = saved.nodes.map((n) => n.id);
		expect(savedIds[0]).toBe('shared');
		expect(new Set(savedIds).size).toBe(2);
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

	it('rejects structurally invalid source paths at the schema layer', () => {
		expect(buildWorkflowInputSchema.safeParse({ filePath: '../main.workflow.ts' }).success).toBe(
			false,
		);
		expect(buildWorkflowInputSchema.safeParse({ filePath: '~/main.workflow.ts' }).success).toBe(
			false,
		);
		expect(
			buildWorkflowInputSchema.safeParse({ filePath: '/src/../../../etc/passwd' }).success,
		).toBe(false);
		expect(buildWorkflowInputSchema.safeParse({ filePath: 'src\\main.workflow.ts' }).success).toBe(
			false,
		);
	});

	it('accepts absolute paths at the schema layer so the handler can resolve them', () => {
		// Root membership is only checkable at handler time; a schema rejection
		// would surface as a hard AI_InvalidToolInputError instead of a
		// recoverable tool result.
		expect(buildWorkflowInputSchema.safeParse({ filePath: '/tmp/main.workflow.ts' }).success).toBe(
			true,
		);
	});

	it('builds from an absolute path under the workspace root', async () => {
		const source = 'workflow source from workspace';
		const { context, filePath } = makeContext({
			source,
			overrides: { workspaceRoot: '/home/user/workspace' },
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath: `/home/user/workspace/${filePath}`,
			name: 'Daily Weather to Slack',
		});

		// Normalized to the workspace-relative path throughout (binding + output).
		expect(result).toMatchObject({ success: true, filePath, workflowId: 'wf-1' });
		expect(compileWorkflowSource).toHaveBeenCalledWith(context, filePath, source, undefined);
	});

	it('returns a recoverable error for absolute paths outside the workspace root', async () => {
		const { context } = makeContext({
			overrides: { workspaceRoot: '/home/user/workspace' },
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath: '/tmp/main.workflow.ts',
		});

		expect(result).toMatchObject({
			success: false,
			filePath: '/tmp/main.workflow.ts',
			remediation: { category: 'code_fixable', reason: 'invalid_file_path' },
		});
		expect((result.errors ?? []).join('\n')).toContain('workspace-relative path');
	});

	it('returns blocked remediation when the bound workflow no longer exists', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.updateFromWorkflowJSON).mockRejectedValue(
			new WorkflowNotFoundError('wf-deleted'),
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
			new Error('Failed to load existing workflow wf-bound to preserve webhook IDs', {
				cause: new WorkflowNotFoundError('wf-bound'),
			}),
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

	it('returns blocked remediation when binding to a missing workflow id fails', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.get).mockRejectedValue(
			new WorkflowNotFoundError('wf-deleted'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
			workflowId: 'wf-deleted',
		});

		expect(result).toMatchObject({
			success: false,
			filePath,
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'workflow_id_not_found',
			},
		});
		expect(result.errors?.[0]).toContain('Failed to bind source file');
		expect(result.remediation?.guidance).toContain(
			'Call build-workflow again with the same filePath and omit workflowId',
		);
		expect(context.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
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

	it('warns when a chat-model node uses a provider without a stored credential while another LLM credential exists', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: {
				name: 'Generated workflow',
				nodes: [
					{
						id: 'model-1',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			},
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		vi.mocked(buildCredentialMap).mockResolvedValueOnce(
			new Map([
				['googlePalmApi', [{ id: 'g1', name: 'Google Gemini account', type: 'googlePalmApi' }]],
			]),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result.success).toBe(true);
		const warningText = (result.warnings ?? []).join('\n');
		expect(warningText).toContain('[chat_model_provider_mismatch]');
		expect(warningText).toContain('"Google Gemini account" (googlePalmApi, id: g1)');
	});

	it('does not warn about the provider when the resolver attached the n8n Connect managed credential', async () => {
		const { context, filePath } = makeContext({ source: 'workflow source' });
		vi.mocked(compileWorkflowSource).mockResolvedValueOnce({
			success: true,
			workflow: {
				name: 'Generated workflow',
				nodes: [
					{
						id: 'model-1',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			},
			warnings: [],
			compiler: 'sandbox-tsx',
		});
		vi.mocked(buildCredentialMap).mockResolvedValueOnce(
			new Map([
				['googlePalmApi', [{ id: 'g1', name: 'Google Gemini account', type: 'googlePalmApi' }]],
			]),
		);
		vi.mocked(resolveCredentials).mockResolvedValueOnce({
			mockedNodeNames: ['OpenAI Chat Model'],
			mockedCredentialTypes: [],
			mockedCredentialsByNode: {},
			heldForNewCredentialTypes: [],
			resolvedCredentialsByNode: {
				'OpenAI Chat Model': [
					{ type: 'openAiApi', id: null, name: 'n8n Connect', __aiGatewayManaged: true },
				],
			},
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			filePath,
		});

		expect(result.success).toBe(true);
		expect((result.warnings ?? []).join('\n')).not.toContain('chat_model_provider_mismatch');
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
			blocking: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
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
			blocking: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
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
			blocking: validationResult.warnings,
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
