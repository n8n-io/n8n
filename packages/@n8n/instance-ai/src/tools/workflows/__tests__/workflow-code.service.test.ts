import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import type * as WorkflowCodeParserModule from '../../../workflow-builder';
import { parseAndValidate } from '../../../workflow-builder';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import {
	createWorkflowCodeService,
	workflowCodeUpdateActionSchema,
} from '../workflow-code.service';

jest.mock('../../../workflow-builder', () => {
	const actual = jest.requireActual<typeof WorkflowCodeParserModule>('../../../workflow-builder');
	return {
		...actual,
		parseAndValidate: jest.fn(),
	};
});

describe('workflowCodeUpdateActionSchema.patches coercion', () => {
	const patch = { old_str: 'foo', new_str: 'bar' };

	it('accepts a native array of patches', () => {
		const parsed = workflowCodeUpdateActionSchema.parse({
			action: 'update',
			workflowId: 'wf-1',
			patches: [patch],
		});
		expect(parsed.patches).toEqual([patch]);
	});

	it('accepts a JSON-stringified array of patches', () => {
		const parsed = workflowCodeUpdateActionSchema.parse({
			action: 'update',
			workflowId: 'wf-1',
			patches: JSON.stringify([patch]),
		});
		expect(parsed.patches).toEqual([patch]);
	});

	it('rejects a non-JSON string with a helpful array-expected error', () => {
		const result = workflowCodeUpdateActionSchema.safeParse({
			action: 'update',
			workflowId: 'wf-1',
			patches: 'not-json',
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['patches']);
		}
	});

	it('rejects a stringified object (not an array)', () => {
		const result = workflowCodeUpdateActionSchema.safeParse({
			action: 'update',
			workflowId: 'wf-1',
			patches: JSON.stringify(patch),
		});
		expect(result.success).toBe(false);
	});

	it('leaves patches undefined when not provided', () => {
		const parsed = workflowCodeUpdateActionSchema.parse({
			action: 'update',
			workflowId: 'wf-1',
		});
		expect(parsed.patches).toBeUndefined();
	});
});

describe('workflow code create/update approval flow', () => {
	type WorkflowCodeService = ReturnType<typeof createWorkflowCodeService>;
	type WorkflowCodeToolContext = Parameters<WorkflowCodeService['create']>[1];
	type Permissions = NonNullable<InstanceAiContext['permissions']>;

	const validCode = "export default workflow('wf-1', 'Lead intake');";
	const validWorkflow = { name: 'Lead intake', nodes: [], connections: {} };
	const mockedParseAndValidate = jest.mocked(parseAndValidate);

	function makeContext(
		permissions: Partial<Permissions>,
		overrides: Partial<InstanceAiContext> = {},
	): InstanceAiContext {
		const context = mock<InstanceAiContext>();
		context.userId = 'user-1';
		context.permissions = permissions as Permissions;
		context.loadedSkills = undefined;
		context.plannedBuildTask = undefined;
		context.allowedUpdateWorkflowIds = undefined;
		context.aiCreatedWorkflowIds = undefined;
		context.workflowService.createFromWorkflowJSON = jest
			.fn()
			.mockResolvedValue({ id: 'created-wf' });
		context.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue({ id: 'wf-1' });
		context.workflowService.getAsWorkflowJSON = jest.fn().mockResolvedValue(validWorkflow);
		context.workflowService.clearAiTemporary = jest.fn().mockResolvedValue(undefined);
		context.credentialService.list = jest.fn().mockResolvedValue([]);
		Object.assign(context, overrides);
		return context;
	}

	function makeToolContext(resumeData?: { approved: boolean }): {
		context: WorkflowCodeToolContext;
		suspend: jest.Mock;
	} {
		const suspend = jest.fn().mockResolvedValue({ suspended: true } as never);
		return {
			context: { resumeData, suspend } as WorkflowCodeToolContext,
			suspend,
		};
	}

	type PlannedBuildTaskFixture = Omit<
		NonNullable<InstanceAiContext['plannedBuildTask']>,
		'workflowTaskService'
	> & {
		workflowTaskService: NonNullable<
			NonNullable<InstanceAiContext['plannedBuildTask']>['workflowTaskService']
		>;
	};

	function makePlannedBuildTask(overrides: Record<string, unknown> = {}): PlannedBuildTaskFixture {
		const plannedBuildTask = mock<PlannedBuildTaskFixture>();
		plannedBuildTask.threadId = 'thread-1';
		plannedBuildTask.taskId = 'task-1';
		plannedBuildTask.workItemId = 'wi-1';
		plannedBuildTask.title = 'Build workflow';
		plannedBuildTask.spec = 'Build it';
		plannedBuildTask.workflowId = undefined;
		plannedBuildTask.onSavedWorkflowBuildOutcome = undefined;
		plannedBuildTask.plannedTaskService.getGraph = jest.fn().mockResolvedValue({
			tasks: [{ id: 'task-1', status: 'running' }],
		});
		plannedBuildTask.plannedTaskService.markSucceeded = jest.fn().mockResolvedValue(undefined);
		plannedBuildTask.plannedTaskService.markFailed = jest.fn().mockResolvedValue(undefined);
		plannedBuildTask.workflowTaskService.reportBuildOutcome = jest
			.fn()
			.mockResolvedValue({ type: 'continue_building' });
		Object.assign(plannedBuildTask, overrides);
		return plannedBuildTask;
	}

	beforeEach(() => {
		jest.clearAllMocks();
		mockedParseAndValidate.mockReturnValue({
			workflow: { ...validWorkflow },
			warnings: [],
		});
	});

	it('suspends for approval after validating a workflow create', async () => {
		const service = createWorkflowCodeService(makeContext({}));
		const { context, suspend } = makeToolContext();

		await service.create({ action: 'create', code: validCode, name: 'Lead intake' }, context);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Create workflow Lead intake',
				severity: 'info',
			}),
		);
	});

	it('suspends for approval after validating a workflow update', async () => {
		const service = createWorkflowCodeService(makeContext({}));
		const { context, suspend } = makeToolContext();

		await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-1', name: 'Lead intake' },
			context,
		);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Update workflow Lead intake (ID: wf-1)',
				severity: 'info',
				workflowId: 'wf-1',
			}),
		);
	});

	it('uses the parsed workflow name in update approval when the input omits name', async () => {
		const service = createWorkflowCodeService(makeContext({}));
		const { context, suspend } = makeToolContext();

		await service.update({ action: 'update', code: validCode, workflowId: 'wf-1' }, context);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Update workflow Lead intake (ID: wf-1)',
				severity: 'info',
				workflowId: 'wf-1',
			}),
		);
	});

	it('returns a denied result when the user denies approval', async () => {
		const service = createWorkflowCodeService(makeContext({}));
		const { context } = makeToolContext({ approved: false });

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
	});

	it('returns a blocked result when admin policy blocks the save', async () => {
		const service = createWorkflowCodeService(makeContext({ createWorkflow: 'blocked' }));
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: 'invalid', name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
	});

	it('does not suspend or save when validation fails', async () => {
		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Failed to parse workflow code: syntax error');
		});
		const ctx = makeContext({});
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		await service.create({ action: 'create', code: 'invalid', name: 'Lead intake' }, context);

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('reports planned build pre-save failures so the retry budget advances', async () => {
		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Failed to parse workflow code: syntax error');
		});
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'continue_building' }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'continue_building' });
		const plannedBuildTask = makePlannedBuildTask({
			workflowTaskService: {
				reportBuildOutcome,
			},
		});
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				runId: 'run-1',
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: 'invalid', name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: ['Failed to parse workflow code: syntax error'],
		});
		expect(reportBuildOutcome).toHaveBeenCalledTimes(1);
		const outcome = reportBuildOutcome.mock.calls[0][0];
		expect(outcome).toMatchObject({
			workItemId: 'wi-1',
			taskId: 'task-1',
			runId: 'run-1',
			submitted: false,
			needsUserInput: false,
		});
		expect(outcome.failureSignature).toContain('parse_failed:');
		expect(outcome.remediation).toMatchObject({
			category: 'code_fixable',
			shouldEdit: true,
		});
	});

	it('surfaces the repair guard when the pre-save budget is exhausted', async () => {
		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Failed to parse workflow code: syntax error');
		});
		const plannedBuildTask = makePlannedBuildTask({
			workflowTaskService: {
				reportBuildOutcome: jest.fn().mockResolvedValue({
					type: 'blocked',
					reason: 'The workflow could not be saved after three submit attempts.',
				}),
			},
		});
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: 'invalid', name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Failed to parse workflow code: syntax error',
				'Repair guard stopped automatic edits: The workflow could not be saved after three submit attempts.',
			],
		});
	});

	it('keeps blocked guidance when terminal task marking fails', async () => {
		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Failed to parse workflow code: syntax error');
		});
		const logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() };
		const markFailed = jest.fn().mockRejectedValue(new Error('state write unavailable'));
		const plannedBuildTask = makePlannedBuildTask({
			plannedTaskService: {
				getGraph: jest.fn().mockResolvedValue({ tasks: [{ id: 'task-1', status: 'running' }] }),
				markFailed,
			},
			workflowTaskService: {
				reportBuildOutcome: jest.fn().mockResolvedValue({
					type: 'blocked',
					reason: 'The workflow could not be saved after three submit attempts.',
				}),
			},
		});
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				logger,
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: 'invalid', name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Failed to parse workflow code: syntax error',
				'Repair guard stopped automatic edits: The workflow could not be saved after three submit attempts.',
			],
		});
		expect(markFailed).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to mark planned build task failed after terminal failure',
			expect.objectContaining({
				threadId: 'thread-1',
				taskId: 'task-1',
				error: 'state write unavailable',
			}),
		);
	});

	it('reports planned build denial as a blocked user_denied outcome', async () => {
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'blocked'; reason: string }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'blocked', reason: 'User denied the action' });
		const markFailed = jest.fn().mockResolvedValue(undefined);
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.plannedTaskService.markFailed = markFailed;
		const ctx = makeContext(
			{},
			{
				runId: 'run-1',
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext({ approved: false });

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
		expect(ctx.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(reportBuildOutcome).toHaveBeenCalledTimes(1);
		const outcome = reportBuildOutcome.mock.calls[0][0];
		expect(outcome).toMatchObject({
			workItemId: 'wi-1',
			taskId: 'task-1',
			runId: 'run-1',
			submitted: false,
			needsUserInput: true,
			blockingReason: 'User denied the action',
			failureSignature: 'user_denied',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'user_denied',
			},
		});
		expect(markFailed).toHaveBeenCalledWith('thread-1', 'task-1', {
			error: 'User denied the action',
		});
	});

	it('classifies planned save failures as blocked instead of editable code fixes', async () => {
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'blocked'; reason: string }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'blocked', reason: 'Workflow save failed: storage unavailable' });
		const markFailed = jest.fn().mockResolvedValue(undefined);
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.plannedTaskService.markFailed = markFailed;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		jest
			.mocked(ctx.workflowService.createFromWorkflowJSON)
			.mockRejectedValueOnce(new Error('storage unavailable'));
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Workflow save failed: storage unavailable',
				'Repair guard stopped automatic edits: Workflow save failed: storage unavailable',
			],
		});
		const outcome = reportBuildOutcome.mock.calls[0][0];
		expect(outcome).toMatchObject({
			submitted: false,
			needsUserInput: false,
			failureSignature: 'save_failed:Workflow save failed: storage unavailable',
			remediation: {
				category: 'blocked',
				shouldEdit: false,
				reason: 'save_failed',
			},
		});
		expect(markFailed).toHaveBeenCalledWith('thread-1', 'task-1', {
			error: 'Workflow save failed: storage unavailable',
		});
	});

	it('classifies missing credential pre-save failures as setup blockers', async () => {
		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Missing credential Slack API credential not found');
		});
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'blocked'; reason: string }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'blocked', reason: 'Set up Slack credentials' });
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Missing credential Slack API credential not found',
				'Repair guard stopped automatic edits: Set up Slack credentials',
			],
		});
		expect(reportBuildOutcome.mock.calls[0][0]).toMatchObject({
			submitted: false,
			needsUserInput: true,
			remediation: {
				category: 'needs_setup',
				shouldEdit: false,
				reason: 'missing_credential',
			},
		});
	});

	it('classifies missing existing workflow patch bases as code-fixable', async () => {
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'continue_building' }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'continue_building' });
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.workflowId = 'wf-1';
		plannedBuildTask.workflowTaskService.reportBuildOutcome =
			reportBuildOutcome as unknown as typeof plannedBuildTask.workflowTaskService.reportBuildOutcome;
		const ctx = makeContext(
			{ updateWorkflow: 'always_allow' },
			{
				plannedBuildTask,
				allowedUpdateWorkflowIds: new Set(['wf-1']),
			},
		);
		jest
			.mocked(ctx.workflowService.getAsWorkflowJSON)
			.mockRejectedValueOnce(new Error('Workflow not found'));
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.update(
			{
				action: 'update',
				workflowId: 'wf-1',
				patches: [{ old_str: 'Lead intake', new_str: 'Updated intake' }],
			},
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: ['Patch mode: could not fetch workflow. Send full code instead.'],
		});
		expect(reportBuildOutcome.mock.calls[0][0]).toMatchObject({
			submitted: false,
			failureSignature: 'patch_fetch_failed',
			remediation: {
				category: 'code_fixable',
				shouldEdit: true,
			},
		});
	});

	it('adds expression-prefix guidance to validation errors', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: { ...validWorkflow },
			warnings: [
				{
					code: 'MISSING_EXPRESSION_PREFIX',
					nodeName: 'HTML',
					message: 'Field "parameters.html": Must be an n8n expression (={{...}})',
				},
			],
		});
		const plannedBuildTask = makePlannedBuildTask();
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [expect.stringContaining('Use expr')],
			warnings: undefined,
		});
		expect(plannedBuildTask.workflowTaskService?.reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining({
				submitted: false,
				failureSignature: 'validation_failed:MISSING_EXPRESSION_PREFIX:HTML',
			}),
		);
	});

	it('requires the workflow-builder skill when runtime skill tracking is active', async () => {
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{ loadedSkills: new Set<string>() },
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Load the workflow-builder skill with load_skill before calling workflows(action="create"|"update").',
			],
		});
		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('does not suspend when the save is always allowed', async () => {
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalled();
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Lead intake' }),
			{},
		);
		expect(ctx.workflowService.clearAiTemporary).not.toHaveBeenCalled();
		expect(ctx.aiCreatedWorkflowIds?.has('created-wf')).toBeUndefined();
		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			workflowName: 'Lead intake',
		});
	});

	it('deduplicates concurrent ad-hoc creates for the same workflow name', async () => {
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		let resolveCreate!: (value: { id: string }) => void;
		jest.mocked(ctx.workflowService.createFromWorkflowJSON).mockReturnValue(
			new Promise((resolve) => {
				resolveCreate = resolve as (value: { id: string }) => void;
			}),
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const first = service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);
		const second = service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
		resolveCreate({ id: 'created-wf' });
		const results = await Promise.all([first, second]);

		expect(results).toEqual([
			expect.objectContaining({ success: true, workflowId: 'created-wf' }),
			expect.objectContaining({ success: true, workflowId: 'created-wf' }),
		]);
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('deduplicates planned create failure reporting for concurrent creates', async () => {
		const reportBuildOutcome = jest
			.fn<Promise<{ type: 'blocked'; reason: string }>, [WorkflowBuildOutcome]>()
			.mockResolvedValue({ type: 'blocked', reason: 'Workflow save failed: storage unavailable' });
		const markFailed = jest.fn().mockResolvedValue(undefined);
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.plannedTaskService.markFailed = markFailed;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		let rejectCreate!: (error: Error) => void;
		jest.mocked(ctx.workflowService.createFromWorkflowJSON).mockReturnValue(
			new Promise((_resolve, reject) => {
				rejectCreate = reject;
			}),
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const first = service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);
		const second = service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
		rejectCreate(new Error('storage unavailable'));
		const results = await Promise.all([first, second]);

		expect(results).toEqual([
			{
				success: false,
				errors: [
					'Workflow save failed: storage unavailable',
					'Repair guard stopped automatic edits: Workflow save failed: storage unavailable',
				],
			},
			{
				success: false,
				errors: [
					'Workflow save failed: storage unavailable',
					'Repair guard stopped automatic edits: Workflow save failed: storage unavailable',
				],
			},
		]);
		expect(reportBuildOutcome).toHaveBeenCalledTimes(1);
		expect(markFailed).toHaveBeenCalledTimes(1);
	});

	it('returns direct save routing metadata for setup and verification', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'Lead intake',
				nodes: [
					{
						id: 'webhook',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 2,
						position: [0, 0],
						parameters: { path: '<__PLACEHOLDER_VALUE__webhook-path__>' },
					},
				],
				connections: {},
			},
			warnings: [],
		});
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
			hasUnresolvedPlaceholders: true,
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'required', reason: 'unresolved-placeholders' },
		});
	});

	it('re-arms a previously failed planned build task when the save finally succeeds', async () => {
		const recoverWorkflowBuildSuccess = jest.fn().mockResolvedValue(undefined);
		const markSucceeded = jest.fn().mockResolvedValue(undefined);
		const plannedBuildTask = makePlannedBuildTask({
			plannedTaskService: {
				getGraph: jest.fn().mockResolvedValue({
					tasks: [
						{ id: 'task-1', kind: 'build-workflow', status: 'failed', deps: [] },
						{ id: 'verify-1', kind: 'checkpoint', status: 'cancelled', deps: ['task-1'] },
					],
				}),
				recoverWorkflowBuildSuccess,
				markSucceeded,
			},
		});
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{ runId: 'run-1', plannedBuildTask },
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'created-wf' });
		expect(recoverWorkflowBuildSuccess).toHaveBeenCalledTimes(1);
		const recoverCall = recoverWorkflowBuildSuccess.mock.calls[0] as [
			string,
			string,
			{ result: string; outcome: { workflowId: string } },
		];
		expect(recoverCall[0]).toBe('thread-1');
		expect(recoverCall[1]).toBe('task-1');
		expect(recoverCall[2].result).toContain('Workflow built');
		expect(recoverCall[2].outcome).toMatchObject({ workflowId: 'created-wf' });
		expect(markSucceeded).not.toHaveBeenCalled();
	});

	it('normalizes non-object node parameters before credential resolution and save', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'Lead intake',
				nodes: [
					{
						id: 'manual',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: null,
					},
					{
						id: 'set',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [100, 0],
						parameters: [],
					},
				],
				connections: {},
			},
			warnings: [],
		} as unknown as ReturnType<typeof parseAndValidate>);
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		await service.create({ action: 'create', code: validCode, name: 'Lead intake' }, context);

		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({
				nodes: [
					expect.objectContaining({ name: 'Manual Trigger', parameters: {} }),
					expect.objectContaining({ name: 'Set', parameters: {} }),
				],
			}),
			{},
		);
	});

	it('treats Manual Trigger workflows as internally verifiable', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'Manual verification',
				nodes: [
					{
						id: 'manual',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			},
			warnings: [],
		});
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Manual verification' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			triggerNodes: [{ nodeName: 'Manual Trigger', nodeType: 'n8n-nodes-base.manualTrigger' }],
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'not_required' },
		});
	});

	it('does not keep mocked credential metadata for stale credentials stripped before save', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'HTTP without auth',
				nodes: [
					{
						id: 'manual',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'http',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [100, 0],
						parameters: { authentication: 'none' },
						credentials: {
							httpHeaderAuth: undefined as unknown as { id: string; name: string },
						},
					},
				],
				connections: {},
			},
			warnings: [],
		});
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				nodeService: {
					listAvailable: jest.fn().mockResolvedValue([]),
					getDescription: jest.fn().mockResolvedValue({ credentials: [], inputs: [], outputs: [] }),
					listSearchable: jest.fn().mockResolvedValue([]),
					getNodeCredentialTypes: jest.fn().mockResolvedValue([]),
				},
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'HTTP without auth' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			setupRequirement: { status: 'not_required' },
		});
		expect('mockedCredentialTypes' in result).toBe(false);
		expect('mockedCredentialsByNode' in result).toBe(false);
		expect('verificationPinData' in result).toBe(false);
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({
				nodes: [
					expect.objectContaining({ name: 'Manual Trigger' }),
					expect.objectContaining({ name: 'HTTP Request', credentials: undefined }),
				],
			}),
			{},
		);
	});

	it('keeps mocked outbound credentials verifiable before setup when the trigger is mockable', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'Mocked Slack verification',
				nodes: [
					{
						id: 'manual',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'slack',
						name: 'Post Slack Message',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.5,
						position: [100, 0],
						parameters: {
							resource: 'message',
							operation: 'post',
							channelId: '<__PLACEHOLDER_VALUE__Slack channel ID__>',
							text: 'Hello from n8n',
						},
						credentials: {
							slackApi: undefined as unknown as { id: string; name: string },
						},
					},
				],
				connections: {},
			},
			warnings: [],
		});
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Mocked Slack verification' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			triggerNodes: [{ nodeName: 'Manual Trigger', nodeType: 'n8n-nodes-base.manualTrigger' }],
			mockedNodeNames: ['Post Slack Message'],
			mockedCredentialTypes: ['slackApi'],
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'required', reason: 'unresolved-placeholders' },
		});
	});

	it('keeps mocked credential workflows verifiable before setup when pin data is available', async () => {
		mockedParseAndValidate.mockReturnValueOnce({
			workflow: {
				name: 'Slack intake',
				nodes: [
					{
						id: 'slack',
						name: 'Slack Trigger',
						type: 'n8n-nodes-base.slackTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							trigger: ['message'],
							channelId: '<__PLACEHOLDER_VALUE__Select Slack channel__>',
						},
						credentials: {
							slackApi: undefined as unknown as { id: string; name: string },
						},
					},
				],
				connections: {},
			},
			warnings: [],
		});
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Slack intake' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			triggerNodes: [{ nodeName: 'Slack Trigger', nodeType: 'n8n-nodes-base.slackTrigger' }],
			mockedNodeNames: ['Slack Trigger'],
			mockedCredentialTypes: ['slackApi'],
			verificationPinData: {
				'Slack Trigger': [{ _mockedCredential: 'slackApi' }],
			},
			hasUnresolvedPlaceholders: true,
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'required', reason: 'unresolved-placeholders' },
		});
	});

	it('keeps explicit temporary create outputs eligible for cleanup', async () => {
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake', temporary: true },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			workflowName: 'Lead intake',
			temporary: true,
		});
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Lead intake' }),
			{ markAsAiTemporary: true },
		);
		expect(ctx.aiCreatedWorkflowIds?.has('created-wf')).toBe(true);
		expect(ctx.workflowService.clearAiTemporary).not.toHaveBeenCalled();
	});

	it('rejects temporary creates for planned build tasks before saving', async () => {
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask: makePlannedBuildTask(),
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake', temporary: true },
			context,
		);

		expect(ctx.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(mockedParseAndValidate).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			errors: [
				'Do not set temporary: true for planned build tasks. Omit temporary for final planned workflow deliverables.',
			],
		});
	});

	it('does not reuse previous create code for a later patch-mode create', async () => {
		const ctx = makeContext({ createWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		await service.create({ action: 'create', code: validCode, name: 'Workflow A' }, context);

		const result = await service.create(
			{
				action: 'create',
				name: 'Workflow B',
				patches: [{ old_str: 'Lead intake', new_str: 'Workflow B' }],
			},
			context,
		);

		expect(result).toEqual({
			success: false,
			errors: [
				'Patch mode requires either previous workflow code in this turn or a workflowId to fetch from.',
			],
		});
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('honors scoped update approval for pre-approved checkpoint workflow repairs', async () => {
		const ctx = makeContext(
			{ updateWorkflow: 'always_allow' },
			{ allowedUpdateWorkflowIds: new Set(['wf-1']) },
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-1', name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.workflowService.updateFromWorkflowJSON).toHaveBeenCalled();
		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
	});

	it('requires approval when an always-allow update is outside the scoped workflow set', async () => {
		const ctx = makeContext(
			{ updateWorkflow: 'always_allow' },
			{ allowedUpdateWorkflowIds: new Set(['wf-allowed']) },
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-other', name: 'Lead intake' },
			context,
		);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Update workflow Lead intake (ID: wf-other)',
				severity: 'info',
			}),
		);
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result).toEqual({ suspended: true });
	});

	it('rejects update calls for planned create tasks before asking for approval', async () => {
		const ctx = makeContext(
			{ createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
			{
				plannedBuildTask: makePlannedBuildTask(),
				allowedUpdateWorkflowIds: new Set(),
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.update(
			{ action: 'update', code: validCode, workflowId: 'wi-1', name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(mockedParseAndValidate).not.toHaveBeenCalled();
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			errors: [
				'This planned build task creates a new workflow. The workItemId is tracking metadata, not a workflow ID. Call workflows(action="create") without workflowId.',
			],
		});
	});

	it('rejects create calls for planned update tasks before asking for approval', async () => {
		const ctx = makeContext(
			{ createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
			{
				plannedBuildTask: makePlannedBuildTask({
					title: 'Update workflow',
					spec: 'Update it',
					workflowId: 'wf-1',
				}),
				allowedUpdateWorkflowIds: new Set(['wf-1']),
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(mockedParseAndValidate).not.toHaveBeenCalled();
		expect(ctx.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			errors: [
				'This planned build task targets existing workflow wf-1. Call workflows(action="update") with that workflowId instead of creating a new workflow.',
			],
		});
	});

	it('rejects wrong workflow IDs for planned update tasks before asking for approval', async () => {
		const ctx = makeContext(
			{ createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
			{
				plannedBuildTask: makePlannedBuildTask({
					title: 'Update workflow',
					spec: 'Update it',
					workflowId: 'wf-1',
				}),
				allowedUpdateWorkflowIds: new Set(['wf-1']),
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const result = await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-other', name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(mockedParseAndValidate).not.toHaveBeenCalled();
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result).toEqual({
			success: false,
			errors: [
				'This planned build task targets workflow wf-1, so it cannot update workflow wf-other. Use the planned workflowId from the build task.',
			],
		});
	});

	it('adopts a planned-created workflow so a later update in the same turn is allowed without re-approval', async () => {
		const plannedBuildTask = makePlannedBuildTask();
		const ctx = makeContext(
			{ createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
			{ plannedBuildTask, allowedUpdateWorkflowIds: new Set() },
		);
		const service = createWorkflowCodeService(ctx);
		const { context, suspend } = makeToolContext();

		const created = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(created).toMatchObject({ success: true, workflowId: 'created-wf' });
		expect(ctx.plannedBuildTask?.workflowId).toBe('created-wf');
		expect(ctx.allowedUpdateWorkflowIds?.has('created-wf')).toBe(true);

		const updated = await service.update(
			{ action: 'update', code: validCode, workflowId: 'created-wf', name: 'Lead intake' },
			context,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'created-wf',
			expect.anything(),
			undefined,
		);
		expect(updated).toMatchObject({ success: true });
	});

	it('blocks re-creating after a planned create and points the model to update', async () => {
		const plannedBuildTask = makePlannedBuildTask();
		const ctx = makeContext(
			{ createWorkflow: 'always_allow', updateWorkflow: 'always_allow' },
			{ plannedBuildTask, allowedUpdateWorkflowIds: new Set() },
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		await service.create({ action: 'create', code: validCode, name: 'Lead intake' }, context);

		const second = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(second).toEqual({
			success: false,
			errors: [
				'This planned build task targets existing workflow created-wf. Call workflows(action="update") with that workflowId instead of creating a new workflow.',
			],
		});
		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('returns a successful save with warning when planned build reporting fails after save', async () => {
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.plannedTaskService.markSucceeded = jest
			.fn()
			.mockRejectedValue(new Error('storage unavailable'));
		plannedBuildTask.workflowTaskService.reportBuildOutcome = jest
			.fn()
			.mockResolvedValue({ type: 'done' });
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(ctx.workflowService.createFromWorkflowJSON).toHaveBeenCalled();
		expect(ctx.workflowService.clearAiTemporary).not.toHaveBeenCalled();
		expect(ctx.aiCreatedWorkflowIds?.has('created-wf')).toBeUndefined();
		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			workflowName: 'Lead intake',
			warnings: ['Workflow was saved, but planned task state update failed: storage unavailable'],
		});
	});

	it('does not cache recovered success when build outcome reporting fails', async () => {
		const onSavedWorkflowBuildOutcome = jest.fn();
		const markSucceeded = jest.fn();
		const reportBuildOutcome = jest.fn().mockRejectedValue(new Error('loop storage unavailable'));
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.plannedTaskService.markSucceeded = markSucceeded;
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.onSavedWorkflowBuildOutcome = onSavedWorkflowBuildOutcome;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'created-wf',
			warnings: [
				'Workflow was saved, but planned task state update failed: loop storage unavailable',
			],
		});
		expect(reportBuildOutcome).toHaveBeenCalled();
		expect(onSavedWorkflowBuildOutcome).not.toHaveBeenCalled();
		expect(markSucceeded).not.toHaveBeenCalled();
	});

	it('reports planned build success after the workflow save succeeds', async () => {
		const markSucceeded = jest.fn().mockResolvedValue(undefined);
		const reportBuildOutcome = jest.fn().mockResolvedValue({ type: 'done' });
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.plannedTaskService.markSucceeded = markSucceeded;
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'created-wf' });
		expect(ctx.workflowService.clearAiTemporary).not.toHaveBeenCalled();
		expect(reportBuildOutcome).toHaveBeenCalled();
		expect(markSucceeded).toHaveBeenCalled();
	});

	it('re-records planned build success when re-saving an already-succeeded task in the same turn', async () => {
		const markSucceeded = jest.fn();
		const reportBuildOutcome = jest.fn().mockResolvedValue({ type: 'continue_building' });
		const onSavedWorkflowBuildOutcome = jest.fn();
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.plannedTaskService.getGraph = jest.fn().mockResolvedValue({
			tasks: [
				{
					id: 'task-1',
					status: 'succeeded',
					outcome: { workflowId: 'wf-a' },
				},
			],
		});
		plannedBuildTask.plannedTaskService.markSucceeded = markSucceeded;
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.onSavedWorkflowBuildOutcome = onSavedWorkflowBuildOutcome;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'created-wf' });
		expect(reportBuildOutcome).toHaveBeenCalledTimes(1);
		expect(onSavedWorkflowBuildOutcome).toHaveBeenCalledTimes(1);
		expect(markSucceeded).toHaveBeenCalledTimes(1);
	});

	it('does not report planned build success when the task is missing from the graph', async () => {
		const markSucceeded = jest.fn();
		const recoverWorkflowBuildSuccess = jest.fn();
		const reportBuildOutcome = jest.fn();
		const onSavedWorkflowBuildOutcome = jest.fn();
		const plannedBuildTask = makePlannedBuildTask();
		plannedBuildTask.plannedTaskService.getGraph = jest.fn().mockResolvedValue({
			tasks: [{ id: 'other-task', status: 'running' }],
		});
		plannedBuildTask.plannedTaskService.markSucceeded = markSucceeded;
		plannedBuildTask.plannedTaskService.recoverWorkflowBuildSuccess = recoverWorkflowBuildSuccess;
		plannedBuildTask.workflowTaskService.reportBuildOutcome = reportBuildOutcome;
		plannedBuildTask.onSavedWorkflowBuildOutcome = onSavedWorkflowBuildOutcome;
		const ctx = makeContext(
			{ createWorkflow: 'always_allow' },
			{
				plannedBuildTask,
			},
		);
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		const result = await service.create(
			{ action: 'create', code: validCode, name: 'Lead intake' },
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'created-wf' });
		expect(reportBuildOutcome).not.toHaveBeenCalled();
		expect(onSavedWorkflowBuildOutcome).not.toHaveBeenCalled();
		expect(markSucceeded).not.toHaveBeenCalled();
		expect(recoverWorkflowBuildSuccess).not.toHaveBeenCalled();
	});

	it('does not apply the same patch twice when approval resumes', async () => {
		const ctx = makeContext({});
		const service = createWorkflowCodeService(ctx);
		const input = {
			action: 'update' as const,
			workflowId: 'wf-1',
			patches: [{ old_str: 'Lead intake', new_str: 'Updated intake' }],
		};

		const { context: firstContext } = makeToolContext();
		const suspendResult = await service.update(input, firstContext);

		expect(suspendResult).toEqual({ suspended: true });
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();

		const result = await service.update(input, {
			resumeData: { approved: true },
			suspend: jest.fn(),
		} as WorkflowCodeToolContext);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(ctx.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('does not reuse cached patch code across workflow IDs', async () => {
		const ctx = makeContext({ updateWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-a', name: 'Lead intake' },
			context,
		);
		(ctx.workflowService.getAsWorkflowJSON as jest.Mock).mockClear();

		const result = await service.update(
			{
				action: 'update',
				workflowId: 'wf-b',
				patches: [{ old_str: 'Lead intake', new_str: 'Other intake' }],
			},
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(ctx.workflowService.getAsWorkflowJSON).toHaveBeenCalledWith('wf-b');
	});

	it('does not cache invalid existing-workflow code as the next patch base', async () => {
		const ctx = makeContext({ updateWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		mockedParseAndValidate.mockImplementationOnce(() => {
			throw new Error('Failed to parse workflow code: syntax error');
		});

		await service.update(
			{
				action: 'update',
				code: "export default workflow('wf-1', 'Broken intake')",
				workflowId: 'wf-1',
			},
			context,
		);

		(ctx.workflowService.getAsWorkflowJSON as jest.Mock).mockClear();

		const result = await service.update(
			{
				action: 'update',
				workflowId: 'wf-1',
				patches: [{ old_str: 'Lead intake', new_str: 'Recovered intake' }],
			},
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(ctx.workflowService.getAsWorkflowJSON).toHaveBeenCalledWith('wf-1');
	});

	it('refetches workflow code after an external mutation invalidates the cache', async () => {
		const ctx = makeContext({ updateWorkflow: 'always_allow' });
		const service = createWorkflowCodeService(ctx);
		const { context } = makeToolContext();

		await service.update(
			{ action: 'update', code: validCode, workflowId: 'wf-1', name: 'Lead intake' },
			context,
		);
		service.invalidate('wf-1');
		(ctx.workflowService.getAsWorkflowJSON as jest.Mock).mockClear();

		const result = await service.update(
			{
				action: 'update',
				workflowId: 'wf-1',
				patches: [{ old_str: 'Lead intake', new_str: 'Refetched intake' }],
			},
			context,
		);

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(ctx.workflowService.getAsWorkflowJSON).toHaveBeenCalledWith('wf-1');
	});
});
