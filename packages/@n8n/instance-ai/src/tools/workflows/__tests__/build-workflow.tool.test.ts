import { executeTool } from '../../../__tests__/tool-test-utils';
import {
	InMemoryWorkflowSourceArtifactStore,
	createWorkflowSourceRef,
	hashWorkflowSource,
} from '../../../storage';
import type { InstanceAiContext } from '../../../types';
import { parseAndValidate, partitionWarnings } from '../../../workflow-builder';
import type {
	WorkflowBuildOutcome,
	WorkflowSourceArtifact,
} from '../../../workflow-loop/workflow-loop-state';
import { buildWorkflowInputSchema, createBuildWorkflowTool } from '../build-workflow.tool';

vi.mock('../../../workflow-builder', () => ({
	parseAndValidate: vi.fn(() => ({
		workflow: {
			name: 'Generated workflow',
			nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} }],
			connections: {},
		},
		warnings: [],
	})),
	partitionWarnings: vi.fn((warnings: unknown[]) => ({ errors: [], informational: warnings })),
}));

vi.mock('../resolve-credentials', () => ({
	buildCredentialMap: vi.fn(async () => await Promise.resolve(new Map())),
	resolveCredentials: vi.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				verificationPinData: {},
				usesWorkflowPinDataForVerification: false,
			}),
	),
}));

vi.mock('../setup-workflow.service', () => ({
	stripStaleCredentialsFromWorkflow: vi.fn(async () => await Promise.resolve()),
}));

vi.mock('../submit-workflow.tool', () => ({
	ensureWebhookIds: vi.fn(async () => await Promise.resolve()),
}));

type BuildToolOutput = {
	success: boolean;
	sourceRef: string;
	filePath?: string;
	sourceHash?: string;
	workflowName?: string;
	workItemId?: string;
	warnings?: string[];
	errors?: string[];
	remediation?: {
		category: string;
		shouldEdit: boolean;
		reason?: string;
	};
};

function makeArtifact(
	source: string,
	overrides: Partial<WorkflowSourceArtifact> = {},
): WorkflowSourceArtifact {
	const now = '2026-06-17T00:00:00.000Z';
	const workItemId = overrides.workItemId ?? 'wi-1';

	return {
		sourceRef: overrides.sourceRef ?? createWorkflowSourceRef(workItemId),
		threadId: overrides.threadId ?? 'thread-1',
		runId: overrides.runId,
		workItemId,
		taskId: overrides.taskId,
		workflowId: overrides.workflowId,
		workflowName: overrides.workflowName,
		filePath: overrides.filePath ?? `src/workflows/${workItemId}.workflow.ts`,
		sourceHash: overrides.sourceHash ?? hashWorkflowSource(source),
		workflowVersionId: overrides.workflowVersionId,
		lastSuccessfulBuildAt: overrides.lastSuccessfulBuildAt,
		lastFailedBuildAt: overrides.lastFailedBuildAt,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	};
}

async function makeContext(input: {
	source?: string;
	artifact?: WorkflowSourceArtifact;
	overrides?: Partial<InstanceAiContext>;
}) {
	const source = input.source ?? 'workflow source';
	const artifact = input.artifact ?? makeArtifact(source);
	const files = new Map<string, string>([[artifact.filePath, source]]);
	const store = new InMemoryWorkflowSourceArtifactStore();
	const trackTelemetry = vi.fn<(eventName: string, properties: Record<string, unknown>) => void>();
	await store.upsert(artifact);

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
		workflowSourceArtifactStore: store,
		trackTelemetry,
		permissions: { createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
		logger: { warn: vi.fn(), debug: vi.fn() },
		...input.overrides,
	} as unknown as InstanceAiContext;

	return { context, files, store, artifact, trackTelemetry };
}

describe('createBuildWorkflowTool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('builds a new workflow from a registered source file', async () => {
		const source = 'workflow source from workspace';
		const { context, artifact } = await makeContext({ source });
		const tool = createBuildWorkflowTool(context);

		const result = await executeTool<BuildToolOutput>(tool, {
			sourceRef: artifact.sourceRef,
			name: 'Daily Weather to Slack',
		});

		expect(result).toMatchObject({
			success: true,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			workflowId: 'wf-1',
			workflowName: 'Daily Weather to Slack',
			workItemId: artifact.workItemId,
		});
		expect(parseAndValidate).toHaveBeenCalledWith(
			source,
			expect.objectContaining({ nodeTypesProvider: undefined }),
		);
		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Daily Weather to Slack' }),
			{ markAsAiTemporary: true },
		);
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
	});

	it('uses the current workspace file hash after source edits', async () => {
		const originalSource = 'old source';
		const editedSource = 'edited source';
		const artifact = makeArtifact(originalSource, {
			lastFailedBuildAt: '2026-06-17T01:00:00.000Z',
		});
		const { context, files, store, trackTelemetry } = await makeContext({
			source: originalSource,
			artifact,
		});
		files.set(artifact.filePath, editedSource);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});
		const updatedArtifact = await store.getBySourceRef(artifact.sourceRef);

		expect(result).toMatchObject({
			success: true,
			sourceHash: hashWorkflowSource(editedSource),
		});
		expect(updatedArtifact).toMatchObject({
			sourceHash: hashWorkflowSource(editedSource),
			workflowId: 'wf-1',
			workflowVersionId: 'v-1',
		});
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'success',
				stage: 'save',
				source_transport: 'workspace_file',
				source_ref: artifact.sourceRef,
				source_hash: hashWorkflowSource(editedSource),
				repair_after_failure: true,
				save_operation: 'create',
			}),
		);
	});

	it('escalates when the same parse failure repeats for one source artifact', async () => {
		const { context, artifact } = await makeContext({ source: 'a.join()' });
		const throwJoinError = () => {
			throw new Error("Failed to parse workflow code: Method 'join' is not an allowed SDK method.");
		};
		vi.mocked(parseAndValidate)
			.mockImplementationOnce(throwJoinError)
			.mockImplementationOnce(throwJoinError);

		const tool = createBuildWorkflowTool(context);
		const first = await executeTool<{ success: boolean; errors?: string[] }>(tool, {
			sourceRef: artifact.sourceRef,
		});
		const second = await executeTool<{ success: boolean; errors?: string[] }>(tool, {
			sourceRef: artifact.sourceRef,
		});

		expect(first.success).toBe(false);
		expect((first.errors ?? []).join('\n')).not.toContain('You already tried this');
		expect(second.success).toBe(false);
		expect((second.errors ?? []).join('\n')).toContain('You already tried this');
		expect((second.errors ?? []).join('\n')).toContain('workflow-sdk-language.md');
	});

	it('updates the workflow bound to the source artifact', async () => {
		const artifact = makeArtifact('workflow source', {
			workflowId: 'wf-bound',
			workflowVersionId: 'v-bound',
		});
		const { context, trackTelemetry } = await makeContext({ artifact });

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-bound',
		});
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-bound',
			expect.any(Object),
			undefined,
		);
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result.warnings).toBeUndefined();
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'success',
				stage: 'save',
				source_ref: artifact.sourceRef,
				identity_bound: true,
				target_workflow_id: 'wf-bound',
				workflow_id: 'wf-bound',
				save_operation: 'update',
			}),
		);
	});

	it('rejects obsolete inline build payload fields', () => {
		expect(
			buildWorkflowInputSchema.safeParse({
				sourceRef: createWorkflowSourceRef('wi-legacy'),
				workflowId: 'wf-stale',
			}).success,
		).toBe(false);
		expect(
			buildWorkflowInputSchema.safeParse({
				sourceRef: createWorkflowSourceRef('wi-legacy'),
				code: 'const workflow = new Workflow()',
			}).success,
		).toBe(false);
		expect(
			buildWorkflowInputSchema.safeParse({
				sourceRef: createWorkflowSourceRef('wi-legacy'),
				patches: [{ old: 'foo', new: 'bar' }],
			}).success,
		).toBe(false);
	});

	it('returns blocked remediation when the bound workflow no longer exists', async () => {
		const artifact = makeArtifact('workflow source', {
			workflowId: 'wf-deleted',
			workflowVersionId: 'v-deleted',
		});
		const { context } = await makeContext({ artifact });
		vi.mocked(context.workflowService.updateFromWorkflowJSON).mockRejectedValue(
			new Error('Workflow not found'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			workflowId: 'wf-deleted',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'bound_workflow_not_found',
			},
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('returns blocked remediation when create permission is blocked', async () => {
		const { context, artifact, trackTelemetry } = await makeContext({
			overrides: {
				permissions: {
					createWorkflow: 'blocked',
					updateWorkflow: 'always_allow',
				} as InstanceAiContext['permissions'],
			},
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'permission_blocked',
			},
			errors: ['Action blocked by admin'],
		});
		expect(parseAndValidate).not.toHaveBeenCalled();
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_workflow_source_build',
			expect.objectContaining({
				result: 'blocked',
				stage: 'permission',
				source_ref: artifact.sourceRef,
				remediation_category: 'blocked',
				remediation_reason: 'permission_blocked',
			}),
		);
	});

	it('classifies workflow name length save failures as code-fixable', async () => {
		const { context, artifact } = await makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.createFromWorkflowJSON).mockRejectedValue(
			new Error('Workflow name is too long. Maximum length is 128 characters.'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			sourceHash: hashWorkflowSource('workflow source'),
			workflowName: 'Generated workflow',
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_name_invalid',
			},
		});
		expect(result.errors?.[0]).toContain('Workflow save failed: Workflow name is too long');
	});

	it('routes credential save failures to setup', async () => {
		const { context, artifact } = await makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.createFromWorkflowJSON).mockRejectedValue(
			new Error('Credential "slackApi" is not accessible'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'workflow_save_credential_setup_required',
			},
		});
	});

	it('blocks read-only save failures', async () => {
		const { context, artifact } = await makeContext({ source: 'workflow source' });
		vi.mocked(context.workflowService.createFromWorkflowJSON).mockRejectedValue(
			new Error('This instance is read-only'),
		);

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'workflow_save_permission_blocked',
			},
		});
	});

	it('reports planned build outcomes with source artifact metadata', async () => {
		const reportBuildOutcome = vi.fn<
			(outcome: WorkflowBuildOutcome) => Promise<{ type: 'verify'; workflowId: string }>
		>(async () => await Promise.resolve({ type: 'verify', workflowId: 'wf-1' }));
		const markSucceeded = vi.fn(async () => await Promise.resolve(null));
		const onBuildOutcome = vi.fn<(outcome: WorkflowBuildOutcome) => void>();
		const artifact = makeArtifact('workflow source', {
			workItemId: 'wi-planned',
			taskId: 'task-1',
		});
		const { context } = await makeContext({
			artifact,
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
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-planned',
		});
		const storedOutcome = onBuildOutcome.mock.calls[0]?.[0] as WorkflowBuildOutcome | undefined;
		expect(storedOutcome).toMatchObject({
			workItemId: 'wi-planned',
			taskId: 'task-1',
			owner: { type: 'planned', taskId: 'task-1' },
			plannedTaskId: 'task-1',
		});
		expect(storedOutcome?.sourceArtifact).toMatchObject({
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			workflowId: 'wf-1',
		});

		const reportedOutcome = reportBuildOutcome.mock.calls[0]?.[0] as
			| WorkflowBuildOutcome
			| undefined;
		expect(reportedOutcome).toMatchObject({ workItemId: 'wi-planned' });
		expect(reportedOutcome?.sourceArtifact).toMatchObject({ sourceRef: artifact.sourceRef });
		expect(markSucceeded).toHaveBeenCalledWith('thread-1', 'task-1', expect.any(Object));
	});

	it('returns source metadata on validation failures', async () => {
		const { context, artifact } = await makeContext({ source: 'invalid source' });
		vi.mocked(parseAndValidate).mockReturnValueOnce({
			workflow: { name: 'Generated workflow', nodes: [], connections: {} },
			warnings: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
		});
		vi.mocked(partitionWarnings).mockReturnValueOnce({
			errors: [{ code: 'UNKNOWN_CONFIG_KEY', message: 'Unknown config key "recipient"' }],
			informational: [],
		});

		const result = await executeTool<BuildToolOutput>(createBuildWorkflowTool(context), {
			sourceRef: artifact.sourceRef,
		});

		expect(result).toMatchObject({
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			sourceHash: hashWorkflowSource('invalid source'),
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
				reason: 'workflow_source_validation_failed',
			},
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});
});
