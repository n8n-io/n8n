type Callable = (...args: never[]) => unknown;
type Constructable = new (...args: never[]) => unknown;

const call = (value: unknown) => (value as Callable)();
const construct = (value: unknown) => new (value as Constructable)();

vi.mock('../tracing/langsmith-tracing', () => ({
	appendGeneratedWorkflowIdToRootMetadata: () => 'appendGeneratedWorkflowIdToRootMetadata',
	appendRootRunMetadata: () => 'appendRootRunMetadata',
	createInstanceAiTraceContext: () => 'createInstanceAiTraceContext',
	createInternalOperationTraceContext: () => 'createInternalOperationTraceContext',
	createTraceReplayOnlyContext: () => 'createTraceReplayOnlyContext',
	continueInstanceAiTraceContext: () => 'continueInstanceAiTraceContext',
	releaseTraceClient: () => 'releaseTraceClient',
	submitLangsmithUserFeedback: () => 'submitLangsmithUserFeedback',
	withCurrentTraceSpan: () => 'withCurrentTraceSpan',
}));

vi.mock('../tracing/trace-replay', () => {
	class IdRemapper {
		remapInput(input: unknown) {
			return input;
		}
	}
	class TraceIndex {}
	class TraceWriter {}
	return {
		IdRemapper,
		TraceIndex,
		TraceWriter,
		parseTraceJsonl: () => [],
		PURE_REPLAY_TOOLS: new Set(['web-search']),
	};
});

vi.mock('../agent/instance-agent', () => ({ createInstanceAgent: () => 'instance-agent' }));
vi.mock('../domain-access', () => ({
	createDomainAccessTracker: () => ({ type: 'domain-access-tracker' }),
}));
vi.mock('../agent/sub-agent-factory', () => ({ createSubAgent: () => 'sub-agent' }));
vi.mock('../tools/web-research/sanitize-web-content', () => ({
	wrapUntrustedData: (content: string, source: string) =>
		`<untrusted_data source="${source}">${content}</untrusted_data>`,
}));
vi.mock('../tools/orchestration/delegate.tool', () => ({
	startDetachedDelegateTask: () => 'delegate-task',
}));
vi.mock('../tools', () => ({
	createAllTools: () => ['all-tools'],
	createOrchestrationTools: () => ['orchestration-tools'],
}));
vi.mock('../tools/orchestration/agent-persistence', () => ({
	SUB_AGENT_RESOURCE_PREFIX: 'instance-ai-subagent',
	createSubAgentResourceId: (threadId: string, kind: string) =>
		`instance-ai-subagent:${threadId}:${kind.toLowerCase().replace(/\s+/g, '-')}`,
	createSubAgentResourceIdPrefix: (threadId: string) => `instance-ai-subagent:${threadId}:`,
}));
vi.mock('../memory/title-utils', () => ({
	truncateToTitle: (title: string) => title,
	generateTitleForRun: () => 'generated-title',
}));
vi.mock('../mcp/mcp-client-manager', () => ({ McpClientManager: class McpClientManager {} }));
vi.mock('../utils/stream-helpers', () => ({
	isRecord: (value: unknown) =>
		value !== null && typeof value === 'object' && !Array.isArray(value),
	parseSuspension: () => ({
		toolCallId: 'tool-call-1',
		requestId: 'request-1',
		suspendPayload: { requestId: 'request-1' },
	}),
	asResumable: (agent: unknown) => agent,
}));
vi.mock('../storage', () => ({
	iterationEntrySchema: { safeParse: () => ({ success: true }) },
	formatPreviousAttempts: () => 'previous attempts',
	ThreadIterationLogStorage: class ThreadIterationLogStorage {},
	ThreadTaskStorage: class ThreadTaskStorage {},
	PlannedTaskStorage: class PlannedTaskStorage {},
	getThread: () => ({ id: 'thread-1' }),
	TerminalOutcomeStorage: class TerminalOutcomeStorage {},
	patchThread: () => ({ id: 'thread-1' }),
	WorkflowLoopStorage: class WorkflowLoopStorage {},
}));
vi.mock('../stream/map-chunk', () => ({ mapAgentChunkToEvent: () => ({ type: 'event' }) }));
vi.mock('../skills/runtime-skills', () => ({
	INSTANCE_AI_SKILLS_DIR: '/instance-ai-skills',
	hasRuntimeSkills: () => true,
	loadInstanceAiRuntimeSkillSource: () => 'runtime-skill-source',
}));
vi.mock('../skills/materialize-runtime-skills', () => ({
	SANDBOX_RUNTIME_SKILLS_DIR: '/sandbox-skills',
	SANDBOX_RUNTIME_SKILL_REGISTRY_FILE: 'registry.json',
	RUNTIME_SKILL_MANIFEST_FILE: 'manifest.json',
	RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION: 1,
	N8N_SKILLS_DIR_ENV: 'N8N_SKILLS_DIR',
	N8N_SKILL_DIR_ENV: 'N8N_SKILL_DIR',
	N8N_WORKSPACE_DIR_ENV: 'N8N_WORKSPACE_DIR',
	createLazyWorkspaceRuntimeSkillSource: () => 'lazy-skill-source',
	buildRuntimeSkillWorkspaceBundle: () => ({ manifest: [] }),
	materializeRuntimeSkillsIntoWorkspace: () => undefined,
	loadPrebakedRuntimeSkillsBundle: () => ({ manifest: [] }),
}));
vi.mock('../utils/eval-agents', () => ({
	SONNET_MODEL: 'sonnet',
	HAIKU_MODEL: 'haiku',
	createEvalAgent: () => 'eval-agent',
	extractText: () => 'text',
	Tool: class Tool {},
}));
vi.mock('../utils/agent-tree', () => ({
	buildAgentTreeFromEvents: () => ({ agentId: 'root', children: [] }),
	findAgentNodeInTree: () => ({ agentId: 'root', children: [] }),
}));
vi.mock('../workspace/builder-templates-service', () => ({
	BuilderTemplatesService: class BuilderTemplatesService {},
	builderTemplatesOptionsFromEnv: () => ({ enabled: true }),
}));
vi.mock('../workspace/create-workspace', () => ({
	createSandbox: () => ({ type: 'sandbox' }),
	createWorkspace: () => ({ type: 'workspace' }),
}));
vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: () => '/workspace',
	getPromptWorkspaceRoot: () => '/home/daytona/workspace',
}));
vi.mock('../workspace/lazy-runtime-workspace', () => ({
	createLazyRuntimeWorkspace: () => ({ type: 'lazy-workspace' }),
}));
vi.mock('../workspace/sandbox-setup', () => ({
	setupSandboxWorkspace: () => undefined,
}));
vi.mock('../workspace/snapshot-manager', () => ({ SnapshotManager: class SnapshotManager {} }));
vi.mock('../runtime/background-task-manager', () => ({
	BackgroundTaskManager: class BackgroundTaskManager {},
	enrichMessageWithRunningTasks: () => ({ content: 'message' }),
}));
vi.mock('../runtime/run-state-registry', () => ({ RunStateRegistry: class RunStateRegistry {} }));
vi.mock('../runtime/terminal-response-guard', () => ({
	InstanceAiTerminalResponseGuard: class InstanceAiTerminalResponseGuard {},
}));
vi.mock('../runtime/resumable-stream-executor', () => ({
	executeResumableStream: () => ({ status: 'done' }),
}));
vi.mock('../runtime/stream-runner', () => ({
	resumeAgentRun: () => ({ status: 'resumed' }),
	streamAgentRun: () => ({ status: 'streamed' }),
}));
vi.mock('../runtime/liveness-policy', () => {
	const INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG = {
		confirmationTimeoutMs: 1,
		backgroundTaskIdleTimeoutMs: 1,
		backgroundTaskMaxLifetimeMs: 1,
		activeRunIdleTimeoutMs: 0,
		activeRunMaxLifetimeMs: 1,
	};
	class InstanceAiLivenessPolicy {
		hasEnabledTimeouts() {
			return true;
		}
	}
	return {
		INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
		createInstanceAiLivenessPolicyConfig: () => INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
		InstanceAiLivenessPolicy,
	};
});
vi.mock('../workflow-loop', () => ({
	workflowBuildOutcomeSchema: { safeParse: () => ({ success: true }) },
	attemptRecordSchema: { safeParse: () => ({ success: false }) },
	workflowLoopStateSchema: { parse: (value: unknown) => value },
	verificationResultSchema: { safeParse: () => ({ success: true }) },
	createWorkItem: () => ({ workItemId: 'work-item-1' }),
	formatWorkflowLoopGuidance: () => 'guidance',
	handleBuildOutcome: () => ({ action: { type: 'verify' } }),
	handleVerificationVerdict: () => ({ action: { type: 'done' } }),
	formatAttemptHistory: () => 'attempt history',
	WorkflowTaskCoordinator: class WorkflowTaskCoordinator {},
}));
vi.mock('../workflow-loop/runtime', () => ({
	WorkflowLoopRuntime: class WorkflowLoopRuntime {},
}));
vi.mock('../planned-tasks/planned-task-service', () => ({
	PlannedTaskCoordinator: class PlannedTaskCoordinator {},
}));
vi.mock('../planned-tasks/planned-task-permissions', () => ({
	PLANNED_TASK_PERMISSION_OVERRIDES: { checkpoint: { runWorkflow: 'always_allow' } },
	applyPlannedTaskPermissions: (context: { permissions: Record<string, unknown> }) => ({
		...context,
		permissions: { ...context.permissions, runWorkflow: 'always_allow' },
	}),
}));
vi.mock('../parsers/structured-file-parser', () => ({
	classifyAttachments: () => [{ index: 0, parseable: true, format: 'csv' }],
	buildAttachmentManifest: () => '[ATTACHMENTS] parse-file [/ATTACHMENTS]',
	isStructuredAttachment: () => true,
	isParseableAttachment: () => true,
}));
vi.mock('../parsers/validate-attachments', () => {
	class UnsupportedAttachmentError extends Error {}
	return {
		getParseableAttachmentMimeTypes: () => ['text/csv'],
		getSupportedAttachmentMimeTypes: () => ['text/csv', 'image/*'],
		isSupportedAttachmentMimeType: (mimeType: string) =>
			mimeType === 'text/csv' || mimeType.startsWith('image/'),
		validateAttachmentMimeTypes: () => {
			throw new UnsupportedAttachmentError();
		},
		UnsupportedAttachmentError,
	};
});

describe('@n8n/instance-ai public entrypoint', () => {
	it('exposes representative lazy exports without invoking them', async () => {
		const entrypoint = await import('../index');

		expect(entrypoint.MAX_STEPS.ORCHESTRATOR).toBeGreaterThan(0);
		expect(entrypoint.createAllTools).toEqual(expect.any(Function));
		expect(entrypoint.createInstanceAgent).toEqual(expect.any(Function));
		expect(entrypoint.createLazyRuntimeWorkspace).toEqual(expect.any(Function));
		expect(entrypoint.createWorkItem).toEqual(expect.any(Function));
		expect(entrypoint.getParseableAttachmentMimeTypes).toEqual(expect.any(Function));
		expect(entrypoint.mapAgentChunkToEvent).toEqual(expect.any(Function));
		expect(entrypoint.parseTraceJsonl).toEqual(expect.any(Function));
		expect(entrypoint.wrapUntrustedData).toEqual(expect.any(Function));
		expect(entrypoint.BackgroundTaskManager).toEqual(expect.any(Function));
		expect(entrypoint.IdRemapper).toEqual(expect.any(Function));
		expect(entrypoint.McpClientManager).toEqual(expect.any(Function));
		expect(entrypoint.UnsupportedAttachmentError).toEqual(expect.any(Function));
		expect(entrypoint.WorkflowLoopRuntime).toEqual(expect.any(Function));
	});

	it('loads lazy functions, classes, and getters through the public barrel', async () => {
		const entrypoint = await import('../index');

		expect(call(entrypoint.appendGeneratedWorkflowIdToRootMetadata)).toBe(
			'appendGeneratedWorkflowIdToRootMetadata',
		);
		expect(call(entrypoint.appendRootRunMetadata)).toBe('appendRootRunMetadata');
		expect(call(entrypoint.createInstanceAiTraceContext)).toBe('createInstanceAiTraceContext');
		expect(call(entrypoint.createInternalOperationTraceContext)).toBe(
			'createInternalOperationTraceContext',
		);
		expect(call(entrypoint.createTraceReplayOnlyContext)).toBe('createTraceReplayOnlyContext');
		expect(call(entrypoint.continueInstanceAiTraceContext)).toBe('continueInstanceAiTraceContext');
		expect(call(entrypoint.releaseTraceClient)).toBe('releaseTraceClient');
		expect(call(entrypoint.submitLangsmithUserFeedback)).toBe('submitLangsmithUserFeedback');
		expect(call(entrypoint.withCurrentTraceSpan)).toBe('withCurrentTraceSpan');

		expect(call(entrypoint.createInstanceAgent)).toBe('instance-agent');
		expect(call(entrypoint.createDomainAccessTracker)).toEqual({ type: 'domain-access-tracker' });
		expect(call(entrypoint.createSubAgent)).toBe('sub-agent');
		expect(entrypoint.wrapUntrustedData('hello', 'https://example.com')).toContain(
			'<untrusted_data source="https://example.com">',
		);
		expect(call(entrypoint.startDetachedDelegateTask)).toBe('delegate-task');
		expect(call(entrypoint.createAllTools)).toEqual(['all-tools']);
		expect(call(entrypoint.createOrchestrationTools)).toEqual(['orchestration-tools']);

		expect(entrypoint.PURE_REPLAY_TOOLS.has('web-search')).toBe(true);
		expect(entrypoint.createSubAgentResourceId('thread-1', 'Research Agent')).toBe(
			'instance-ai-subagent:thread-1:research-agent',
		);
		expect(entrypoint.createSubAgentResourceIdPrefix('thread-1')).toBe(
			'instance-ai-subagent:thread-1:',
		);
		expect(entrypoint.SUB_AGENT_RESOURCE_PREFIX).toBe('instance-ai-subagent');

		const remapper = new entrypoint.IdRemapper();
		expect(remapper.remapInput({ id: 'old-id' })).toEqual({ id: 'old-id' });
		expect(remapper).toBeInstanceOf(entrypoint.IdRemapper);
		expect(construct(entrypoint.TraceIndex)).toBeInstanceOf(entrypoint.TraceIndex);
		expect(construct(entrypoint.TraceWriter)).toBeInstanceOf(entrypoint.TraceWriter);
		expect(call(entrypoint.parseTraceJsonl)).toEqual([]);

		expect(call(entrypoint.hasRuntimeSkills)).toBe(true);
		expect(call(entrypoint.loadInstanceAiRuntimeSkillSource)).toBe('runtime-skill-source');
		expect(call(entrypoint.createLazyWorkspaceRuntimeSkillSource)).toBe('lazy-skill-source');
		expect(call(entrypoint.buildRuntimeSkillWorkspaceBundle)).toEqual({ manifest: [] });
		expect(call(entrypoint.materializeRuntimeSkillsIntoWorkspace)).toBeUndefined();
		expect(call(entrypoint.loadPrebakedRuntimeSkillsBundle)).toEqual({ manifest: [] });
		expect(entrypoint.INSTANCE_AI_SKILLS_DIR).toBe('/instance-ai-skills');
		expect(entrypoint.SANDBOX_RUNTIME_SKILLS_DIR).toBe('/sandbox-skills');
		expect(entrypoint.SANDBOX_RUNTIME_SKILL_REGISTRY_FILE).toBe('registry.json');
		expect(entrypoint.RUNTIME_SKILL_MANIFEST_FILE).toBe('manifest.json');
		expect(entrypoint.RUNTIME_SKILL_MANIFEST_SCHEMA_VERSION).toBe(1);
		expect(entrypoint.N8N_SKILLS_DIR_ENV).toBe('N8N_SKILLS_DIR');
		expect(entrypoint.N8N_SKILL_DIR_ENV).toBe('N8N_SKILL_DIR');
		expect(entrypoint.N8N_WORKSPACE_DIR_ENV).toBe('N8N_WORKSPACE_DIR');

		expect(call(entrypoint.formatPreviousAttempts)).toBe('previous attempts');
		expect(construct(entrypoint.ThreadIterationLogStorage)).toBeInstanceOf(
			entrypoint.ThreadIterationLogStorage,
		);
		expect(construct(entrypoint.ThreadTaskStorage)).toBeInstanceOf(entrypoint.ThreadTaskStorage);
		expect(construct(entrypoint.PlannedTaskStorage)).toBeInstanceOf(entrypoint.PlannedTaskStorage);
		expect(call(entrypoint.getThread)).toEqual({ id: 'thread-1' });
		expect(construct(entrypoint.TerminalOutcomeStorage)).toBeInstanceOf(
			entrypoint.TerminalOutcomeStorage,
		);
		expect(call(entrypoint.patchThread)).toEqual({ id: 'thread-1' });
		expect(construct(entrypoint.WorkflowLoopStorage)).toBeInstanceOf(
			entrypoint.WorkflowLoopStorage,
		);
		expect(entrypoint.iterationEntrySchema.safeParse({}).success).toBe(true);

		expect(call(entrypoint.truncateToTitle)).toBeUndefined();
		expect(call(entrypoint.generateTitleForRun)).toBe('generated-title');
		expect(construct(entrypoint.McpClientManager)).toBeInstanceOf(entrypoint.McpClientManager);
		expect(call(entrypoint.mapAgentChunkToEvent)).toEqual({ type: 'event' });
		expect(entrypoint.isRecord({ ok: true })).toBe(true);
		expect(entrypoint.parseSuspension({})).toEqual({
			toolCallId: 'tool-call-1',
			requestId: 'request-1',
			suspendPayload: { requestId: 'request-1' },
		});
		expect(entrypoint.asResumable({ resume: true })).toEqual({ resume: true });

		expect(call(entrypoint.createEvalAgent)).toBe('eval-agent');
		expect(call(entrypoint.extractText)).toBe('text');
		expect(construct(entrypoint.Tool)).toBeInstanceOf(entrypoint.Tool);
		expect(entrypoint.SONNET_MODEL).toBe('sonnet');
		expect(entrypoint.HAIKU_MODEL).toBe('haiku');
		expect(call(entrypoint.buildAgentTreeFromEvents)).toEqual({ agentId: 'root', children: [] });
		expect(call(entrypoint.findAgentNodeInTree)).toEqual({ agentId: 'root', children: [] });

		expect(call(entrypoint.createLazyRuntimeWorkspace)).toEqual({ type: 'lazy-workspace' });
		expect(call(entrypoint.getWorkspaceRoot)).toBe('/workspace');
		expect(entrypoint.getPromptWorkspaceRoot('daytona')).toBe('/home/daytona/workspace');
		expect(call(entrypoint.setupSandboxWorkspace)).toBeUndefined();
		expect(construct(entrypoint.BuilderTemplatesService)).toBeInstanceOf(
			entrypoint.BuilderTemplatesService,
		);
		expect(call(entrypoint.builderTemplatesOptionsFromEnv)).toEqual({ enabled: true });
		expect(call(entrypoint.createSandbox)).toEqual({ type: 'sandbox' });
		expect(call(entrypoint.createWorkspace)).toEqual({ type: 'workspace' });
		expect(construct(entrypoint.SnapshotManager)).toBeInstanceOf(entrypoint.SnapshotManager);

		expect(construct(entrypoint.BackgroundTaskManager)).toBeInstanceOf(
			entrypoint.BackgroundTaskManager,
		);
		expect(call(entrypoint.enrichMessageWithRunningTasks)).toEqual({ content: 'message' });
		expect(call(entrypoint.enrichMessageWithBackgroundTasks)).toEqual({ content: 'message' });
		expect(construct(entrypoint.RunStateRegistry)).toBeInstanceOf(entrypoint.RunStateRegistry);
		expect(construct(entrypoint.InstanceAiTerminalResponseGuard)).toBeInstanceOf(
			entrypoint.InstanceAiTerminalResponseGuard,
		);
		expect(call(entrypoint.executeResumableStream)).toEqual({ status: 'done' });
		expect(call(entrypoint.resumeAgentRun)).toEqual({ status: 'resumed' });
		expect(call(entrypoint.streamAgentRun)).toEqual({ status: 'streamed' });

		expect(call(entrypoint.createInstanceAiLivenessPolicyConfig)).toEqual(
			entrypoint.INSTANCE_AI_DEFAULT_LIVENESS_POLICY_CONFIG,
		);
		expect(construct(entrypoint.InstanceAiLivenessPolicy)).toBeInstanceOf(
			entrypoint.InstanceAiLivenessPolicy,
		);
		expect(call(entrypoint.createWorkItem)).toEqual({ workItemId: 'work-item-1' });
		expect(call(entrypoint.formatWorkflowLoopGuidance)).toBe('guidance');
		expect(call(entrypoint.handleBuildOutcome)).toEqual({ action: { type: 'verify' } });
		expect(call(entrypoint.handleVerificationVerdict)).toEqual({ action: { type: 'done' } });
		expect(call(entrypoint.formatAttemptHistory)).toBe('attempt history');
		expect(construct(entrypoint.WorkflowTaskCoordinator)).toBeInstanceOf(
			entrypoint.WorkflowTaskCoordinator,
		);
		expect(entrypoint.workflowBuildOutcomeSchema.safeParse({}).success).toBe(true);
		expect(entrypoint.attemptRecordSchema.safeParse({}).success).toBe(false);
		expect(entrypoint.workflowLoopStateSchema.parse({ workItemId: 'work-item-1' })).toEqual({
			workItemId: 'work-item-1',
		});
		expect(entrypoint.verificationResultSchema.safeParse({}).success).toBe(true);
		expect(construct(entrypoint.WorkflowLoopRuntime)).toBeInstanceOf(
			entrypoint.WorkflowLoopRuntime,
		);
		expect(construct(entrypoint.PlannedTaskCoordinator)).toBeInstanceOf(
			entrypoint.PlannedTaskCoordinator,
		);
		expect(
			entrypoint.applyPlannedTaskPermissions({ permissions: {} } as never, 'checkpoint')
				.permissions!.runWorkflow,
		).toBe('always_allow');
		expect(entrypoint.PLANNED_TASK_PERMISSION_OVERRIDES.checkpoint!.runWorkflow).toBe(
			'always_allow',
		);

		const classified = entrypoint.classifyAttachments([]);
		expect(classified[0]).toMatchObject({ index: 0, parseable: true, format: 'csv' });
		expect(entrypoint.buildAttachmentManifest(classified)).toContain('parse-file');
		expect(entrypoint.isStructuredAttachment({} as never)).toBe(true);
		expect(entrypoint.isParseableAttachment({} as never)).toBe(true);
		expect(entrypoint.getParseableAttachmentMimeTypes()).toContain('text/csv');
		expect(entrypoint.getSupportedAttachmentMimeTypes()).toContain('image/*');
		expect(entrypoint.isSupportedAttachmentMimeType('image/png')).toBe(true);
		expect(() => entrypoint.validateAttachmentMimeTypes([])).toThrow(
			entrypoint.UnsupportedAttachmentError,
		);
	});
});
