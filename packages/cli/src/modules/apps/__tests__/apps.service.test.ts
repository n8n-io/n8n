import type { AppBinding } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, User, WorkflowEntity } from '@n8n/db';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type IDataObject, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import type { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AppVersion } from '../app-version.entity';
import type { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import { AppsService } from '../apps.service';
import { AppNotFoundError } from '../errors/app-not-found.error';
import { AppQuotaExceededError } from '../errors/app-quota-exceeded.error';
import { BindingIncompatibleError } from '../errors/binding-incompatible.error';
import { BindingNotFoundError } from '../errors/binding-not-found.error';
import { BindingProjectMismatchError } from '../errors/binding-project-mismatch.error';
import { BindingWorkflowNotFoundError } from '../errors/binding-workflow-not-found.error';
import { InvalidBindingsError } from '../errors/invalid-bindings.error';
import type { PageRepository } from '../page.repository';

describe('AppsService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let globalConfig: GlobalConfig;
	let service: AppsService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		appVersionService = mock<AppVersionService>();
		globalConfig = mock<GlobalConfig>({ apps: { maxAppsPerProject: 20 } });
		service = new AppsService(
			appRepository,
			mock<PageRepository>(),
			mock<WorkflowFinderService>(),
			appVersionService,
			globalConfig,
			mock<WorkflowToolWorkflowLoader>(),
			mock<ExecutionPersistence>(),
		);
	});

	describe('createApp', () => {
		it('throws AppQuotaExceededError when the project already has maxAppsPerProject apps', async () => {
			appRepository.countByProjectId.mockResolvedValue(20);

			await expect(
				service.createApp('project-1', { name: 'App', namespace: 'app' }),
			).rejects.toThrow(AppQuotaExceededError);

			expect(appRepository.createApp).not.toHaveBeenCalled();
		});

		it('creates the app when under quota', async () => {
			appRepository.countByProjectId.mockResolvedValue(19);

			await service.createApp('project-1', { name: 'App', namespace: 'app' });

			expect(appRepository.createApp).toHaveBeenCalledWith('project-1', 'App', 'app');
		});
	});

	describe('createVersion', () => {
		it('throws AppNotFoundError before touching appVersionService.create when the app does not exist', async () => {
			appRepository.findOneBy.mockResolvedValue(null);

			await expect(
				service.createVersion('missing-app', Buffer.from(''), Buffer.from('')),
			).rejects.toThrow(AppNotFoundError);

			expect(appVersionService.create).not.toHaveBeenCalled();
		});

		it('passes the app projectId through to appVersionService.create', async () => {
			const app = mock<App>({ id: 'app-1', projectId: 'project-1' });
			appRepository.findOneBy.mockResolvedValue(app);
			appVersionService.create.mockResolvedValue(mock<AppVersion>({ id: 'v-1' }));
			const source = Buffer.from('source');
			const dist = Buffer.from('dist');

			await service.createVersion('app-1', source, dist);

			expect(appVersionService.create).toHaveBeenCalledWith('app-1', 'project-1', source, dist);
			expect(appVersionService.toResponse).toHaveBeenCalledWith(expect.anything(), 'v-1');
		});
	});
});

const user = mock<User>({ id: 'user-1' });

const triggerNode = (parameters: INode['parameters'] = {}): INode => ({
	id: 'trigger',
	name: 'When Executed by Another Workflow',
	type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	typeVersion: 1.1,
	position: [0, 0],
	parameters,
});

const workflow = (overrides: Partial<WorkflowEntity> = {}): WorkflowEntity =>
	({
		id: 'wf-1',
		name: 'Echo',
		nodes: [triggerNode({ workflowInputs: { values: [{ name: 'message', type: 'string' }] } })],
		connections: {},
		activeVersionId: 'v-1',
		shared: [{ role: 'workflow:owner', projectId: 'proj-1' }],
		...overrides,
	}) as WorkflowEntity;

const binding = (key = 'submit', workflowId = 'wf-1'): AppBinding => ({
	key,
	kind: 'workflow',
	workflowId,
});

const notPublished = () => new WorkflowToolUnavailableError('not_published', 'not published');

const successfulExecution = (items: IDataObject[]): IExecutionResponse =>
	({
		id: '42',
		workflowId: 'wf-1',
		startedAt: new Date('2026-09-09T10:00:00.000Z'),
		stoppedAt: new Date('2026-09-09T10:00:01.000Z'),
		data: {
			resultData: {
				lastNodeExecuted: 'Reply',
				runData: { Reply: [{ data: { main: [items.map((json) => ({ json }))] } }] },
			},
		},
	}) as unknown as IExecutionResponse;

/** What `zod-to-json-schema` emits for one declared string field: nullable, optional, labelled. */
const stringField = (name: string) => ({ type: ['string', 'null'], description: name });

const inputOf = (properties: Record<string, unknown>) => ({
	type: 'object',
	properties,
	additionalProperties: false,
});

const typedOutput = {
	output: {
		type: 'array',
		items: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] },
	},
	outputSource: { kind: 'execution', executionId: '42', at: '2026-09-09T10:00:01.000Z' },
};

describe('AppsService bindings', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let workflowFinderService: ReturnType<typeof mock<WorkflowFinderService>>;
	let workflowLoader: ReturnType<typeof mock<WorkflowToolWorkflowLoader>>;
	let executionPersistence: ReturnType<typeof mock<ExecutionPersistence>>;
	let service: AppsService;
	let app: App;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		workflowFinderService = mock<WorkflowFinderService>();
		workflowLoader = mock<WorkflowToolWorkflowLoader>();
		executionPersistence = mock<ExecutionPersistence>();
		executionPersistence.findMultipleExecutions.mockResolvedValue([
			successfulExecution([{ reply: 'hi' }]),
		]);
		service = new AppsService(
			appRepository,
			mock<PageRepository>(),
			workflowFinderService,
			mock<AppVersionService>(),
			mock<GlobalConfig>({ executions: { maxDisplaySize: 1024 } }),
			workflowLoader,
			executionPersistence,
		);
		app = { id: 'app-1', projectId: 'proj-1', bindings: [] } as unknown as App;
		appRepository.findOneBy.mockResolvedValue(app);
		appRepository.updateBindings.mockImplementation(async (target, bindings) =>
			Object.assign(target, { bindings }),
		);
	});

	describe('setBindings', () => {
		it('rejects a workflow the user cannot execute', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

			await expect(service.setBindings('app-1', [binding()], user)).rejects.toBeInstanceOf(
				BindingWorkflowNotFoundError,
			);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
				'workflow:execute',
			]);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects a workflow owned by another project', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				workflow({ shared: [{ role: 'workflow:owner', projectId: 'proj-2' }] } as never),
			);

			await expect(service.setBindings('app-1', [binding()], user)).rejects.toBeInstanceOf(
				BindingProjectMismatchError,
			);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects a workflow without a supported trigger', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				workflow({ nodes: [{ ...triggerNode(), type: 'n8n-nodes-base.manualTrigger' }] }),
			);

			await expect(service.setBindings('app-1', [binding()], user)).rejects.toBeInstanceOf(
				BindingIncompatibleError,
			);
		});

		it('rejects duplicate keys before touching any workflow', async () => {
			await expect(
				service.setBindings('app-1', [binding('submit'), binding('submit', 'wf-2')], user),
			).rejects.toBeInstanceOf(InvalidBindingsError);
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		});

		it('rejects a malformed key', async () => {
			await expect(service.setBindings('app-1', [binding('Submit')], user)).rejects.toBeInstanceOf(
				InvalidBindingsError,
			);
		});

		it('binds an unpublished workflow and reports it as a warning', async () => {
			const unpublished = workflow({ activeVersionId: null });
			workflowFinderService.findWorkflowForUser.mockResolvedValue(unpublished);
			workflowLoader.loadWorkflow.mockImplementation(async (_projectId, _reference, options) => {
				if (options?.usePublishedVersion) throw notPublished();
				return unpublished;
			});

			const result = await service.setBindings('app-1', [binding()], user);

			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [binding()]);
			expect(result.bindings).toEqual([
				{
					key: 'submit',
					kind: 'workflow',
					workflowId: 'wf-1',
					name: 'Echo',
					published: false,
					input: inputOf({ message: stringField('message') }),
					...typedOutput,
				},
			]);
			expect(result.warnings).toEqual([expect.stringContaining('not published')]);
		});

		it('replaces the whole list', async () => {
			app.bindings = [binding('old', 'wf-0')];
			const wf = workflow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(wf);
			workflowLoader.loadWorkflow.mockResolvedValue(wf);

			const result = await service.setBindings('app-1', [binding()], user);

			expect(app.bindings).toEqual([binding()]);
			expect(result.bindings.map((b) => b.key)).toEqual(['submit']);
			expect(result.warnings).toEqual([]);
		});
	});

	describe('removeBinding', () => {
		it('drops the key, saves the rest and describes them', async () => {
			app.bindings = [binding(), binding('notify', 'wf-2')];
			workflowLoader.loadWorkflow.mockResolvedValue(workflow({ id: 'wf-2', name: 'Notify' }));

			const result = await service.removeBinding('app-1', 'submit');

			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [binding('notify', 'wf-2')]);
			expect(result.bindings.map((b) => b.key)).toEqual(['notify']);
		});

		it('throws BindingNotFoundError for an unbound key without saving', async () => {
			app.bindings = [binding()];

			await expect(service.removeBinding('app-1', 'nope')).rejects.toThrow(BindingNotFoundError);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});
	});

	describe('describeBindings', () => {
		const declaredTrigger = (values: Array<{ name: string; type: string }>) =>
			triggerNode({ inputSource: 'workflowInputs', workflowInputs: { values } });

		it('lists the declared workflowInputs fields of the published version', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({
					nodes: [
						declaredTrigger([
							{ name: 'message', type: 'string' },
							{ name: 'count', type: 'number' },
						]),
					],
				}),
			);

			const result = await service.describeBindings(app);

			expect(workflowLoader.loadWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowLoader.loadWorkflow).toHaveBeenCalledWith(
				'proj-1',
				{ workflowId: 'wf-1', workflowName: '' },
				{ usePublishedVersion: true },
			);
			expect(result.bindings[0]).toMatchObject({
				published: true,
				input: inputOf({
					message: stringField('message'),
					count: { type: ['number', 'null'], description: 'count' },
				}),
			});
			expect(result.warnings).toEqual([]);
		});

		it('falls back to the draft with a warning while the workflow is not published', async () => {
			app.bindings = [binding()];
			const draft = workflow({
				activeVersionId: null,
				nodes: [declaredTrigger([{ name: 'email', type: 'string' }])],
			});
			workflowLoader.loadWorkflow.mockImplementation(async (_projectId, _reference, options) => {
				if (options?.usePublishedVersion) throw notPublished();
				return draft;
			});

			const result = await service.describeBindings(app);

			expect(workflowLoader.loadWorkflow).toHaveBeenLastCalledWith('proj-1', {
				workflowId: 'wf-1',
				workflowName: '',
			});
			expect(result.bindings[0]).toMatchObject({
				published: false,
				input: inputOf({ email: stringField('email') }),
			});
			expect(result.warnings).toEqual([
				expect.stringContaining('Types for "submit" come from the unpublished draft'),
			]);
		});

		it('reads the declared fields of a trigger the editor saved without inputSource', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({
					nodes: [
						triggerNode({ workflowInputs: { values: [{ name: 'message', type: 'string' }] } }),
					],
				}),
			);

			const result = await service.describeBindings(app);

			expect(result.bindings[0].input).toEqual(inputOf({ message: stringField('message') }));
			expect(result.warnings).toEqual([]);
		});

		it('reports passthrough triggers', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({ nodes: [triggerNode({ inputSource: 'passthrough' })] }),
			);

			const result = await service.describeBindings(app);

			expect(result.bindings[0].input).toEqual({ type: 'object', additionalProperties: true });
			expect(result.warnings).toEqual([
				'Binding \'submit\': workflow "Echo" accepts any input (trigger has no declared fields): the app cannot type-check its input and the server does not validate it. Declare fields on the trigger to get typed input.',
			]);
		});

		it('leaves out a binding whose workflow no longer exists and warns', async () => {
			app.bindings = [binding('gone', 'wf-gone'), binding()];
			workflowLoader.loadWorkflow.mockImplementation(async (_projectId, reference) =>
				reference.workflowId === 'wf-1' ? workflow() : null,
			);

			const result = await service.describeBindings(app);

			expect(result.bindings.map((b) => b.key)).toEqual(['submit']);
			expect(result.warnings).toEqual([expect.stringContaining("'gone'")]);
		});

		it('types the output from the latest successful execution of the workflow', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(workflow());
			executionPersistence.findMultipleExecutions.mockResolvedValue([
				successfulExecution([
					{ reply: 'a', count: 1 },
					{ reply: 'b', count: null },
				]),
			]);

			const result = await service.describeBindings(app);

			expect(executionPersistence.findMultipleExecutions).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { workflowId: 'wf-1', status: 'success' },
					order: { id: 'DESC' },
					take: 1,
				}),
				{ includeData: true, unflattenData: true, maxDataSizeBytes: 1024 },
			);
			expect(result.bindings[0]).toMatchObject({
				output: {
					type: 'array',
					items: {
						type: 'object',
						properties: { reply: { type: 'string' }, count: { type: ['number', 'null'] } },
						required: ['reply', 'count'],
					},
				},
				outputSource: { kind: 'execution', executionId: '42', at: '2026-09-09T10:00:01.000Z' },
			});
			expect(result.warnings).toEqual([]);
		});

		it('reports unknown output with a warning while the workflow has no successful execution', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(workflow());
			executionPersistence.findMultipleExecutions.mockResolvedValue([]);

			const result = await service.describeBindings(app);

			expect(result.bindings[0]).toMatchObject({
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
				outputSource: { kind: 'unknown' },
			});
			expect(result.warnings).toEqual([
				"Binding 'submit': output is untyped. Run the workflow once (executions run) and call `apps bindings` to type it from the result.",
			]);
		});

		it('reports unknown output when the execution produced no items', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(workflow());
			executionPersistence.findMultipleExecutions.mockResolvedValue([successfulExecution([])]);

			const result = await service.describeBindings(app);

			expect(result.bindings[0]).toMatchObject({
				output: { type: 'array', items: { type: 'object', additionalProperties: true } },
				outputSource: { kind: 'unknown' },
			});
			expect(result.warnings).toEqual([expect.stringContaining('is untyped')]);
		});
	});
});
