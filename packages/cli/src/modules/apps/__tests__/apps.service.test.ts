import type { AppBinding } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, ProjectRelationRepository, User, WorkflowEntity } from '@n8n/db';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type IDataObject, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { AgentsService } from '@/modules/agents/agents.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import type { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AppVersion } from '../app-version.entity';
import type { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import { AppsService } from '../apps.service';
import { AppNotFoundError } from '../errors/app-not-found.error';
import { AppQuotaExceededError } from '../errors/app-quota-exceeded.error';
import { BindingAgentNotFoundError } from '../errors/binding-agent-not-found.error';
import { BindingDataTableNotFoundError } from '../errors/binding-data-table-not-found.error';
import { BindingIncompatibleError } from '../errors/binding-incompatible.error';
import { BindingNotFoundError } from '../errors/binding-not-found.error';
import { BindingProjectMismatchError } from '../errors/binding-project-mismatch.error';
import { BindingWorkflowNotFoundError } from '../errors/binding-workflow-not-found.error';
import { InvalidBindingsError } from '../errors/invalid-bindings.error';

describe('AppsService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let projectRelationRepository: ReturnType<typeof mock<ProjectRelationRepository>>;
	let globalConfig: GlobalConfig;
	let service: AppsService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		appVersionService = mock<AppVersionService>();
		projectRelationRepository = mock<ProjectRelationRepository>();
		globalConfig = mock<GlobalConfig>({ apps: { maxAppsPerProject: 20 } });
		service = new AppsService(
			appRepository,
			mock<WorkflowFinderService>(),
			appVersionService,
			globalConfig,
			mock<WorkflowToolWorkflowLoader>(),
			mock<ExecutionPersistence>(),
			mock<DataTableService>(),
			mock<AgentsService>(),
			mock<ModuleRegistry>(),
			projectRelationRepository,
		);
	});

	describe('listApps', () => {
		const query = { skip: 0, take: 10 };
		const app = { id: 'app-1', projectId: 'project-1' } as App;

		it('pages one project and marks each app with its publish state', async () => {
			appRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 3, data: [app] });
			appVersionService.hasUnpublishedChanges.mockResolvedValue(true);

			const result = await service.listApps('project-1', query);

			expect(appRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(['project-1'], query);
			expect(result).toEqual({ count: 3, data: [{ ...app, hasUnpublishedChanges: true }] });
		});

		it('pages across every project the user belongs to', async () => {
			projectRelationRepository.findAllByUser.mockResolvedValue([
				{ projectId: 'project-1' },
				{ projectId: 'project-2' },
			] as never);
			appRepository.findByProjectIdsPaginated.mockResolvedValue({ count: 0, data: [] });

			await service.listAppsForUser('user-1', query);

			expect(appRepository.findByProjectIdsPaginated).toHaveBeenCalledWith(
				['project-1', 'project-2'],
				query,
			);
		});
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

const tableBinding = (
	permissions: Array<'read' | 'write'> = ['read', 'write'],
	key = 'tasks',
): AppBinding => ({ key, kind: 'dataTable', dataTableId: 'dt-1', permissions });

const table = (overrides: Partial<DataTable> = {}): DataTable =>
	({ id: 'dt-1', name: 'Tasks', projectId: 'proj-1', ...overrides }) as DataTable;

const agentBinding = (
	permissions: Array<'chat' | 'history'> = ['chat', 'history'],
	key = 'support',
): AppBinding => ({ key, kind: 'agent', agentId: 'agent-1', permissions });

const agent = (overrides: Partial<Agent> = {}): Agent =>
	({
		id: 'agent-1',
		name: 'Support',
		projectId: 'proj-1',
		activeVersionId: 'v-1',
		...overrides,
	}) as Agent;

const column = (name: string, type: DataTableColumn['type']) =>
	({ name, type, dataTableId: 'dt-1' }) as DataTableColumn;

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
	let dataTableService: ReturnType<typeof mock<DataTableService>>;
	let agentsService: ReturnType<typeof mock<AgentsService>>;
	let moduleRegistry: ReturnType<typeof mock<ModuleRegistry>>;
	let service: AppsService;
	let app: App;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		workflowFinderService = mock<WorkflowFinderService>();
		workflowLoader = mock<WorkflowToolWorkflowLoader>();
		executionPersistence = mock<ExecutionPersistence>();
		dataTableService = mock<DataTableService>();
		agentsService = mock<AgentsService>();
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		executionPersistence.findMultipleExecutions.mockResolvedValue([
			successfulExecution([{ reply: 'hi' }]),
		]);
		service = new AppsService(
			appRepository,
			workflowFinderService,
			mock<AppVersionService>(),
			mock<GlobalConfig>({ executions: { maxDisplaySize: 1024 } }),
			workflowLoader,
			executionPersistence,
			dataTableService,
			agentsService,
			moduleRegistry,
			mock<ProjectRelationRepository>(),
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

		it('rejects a data table the user cannot read', async () => {
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([]);

			await expect(
				service.setBindings('app-1', [tableBinding(['read'])], user),
			).rejects.toBeInstanceOf(BindingDataTableNotFoundError);
			expect(dataTableService.findDataTablesByIdsForUser).toHaveBeenCalledWith(['dt-1'], user, [
				'dataTable:readRow',
			]);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('requires the write scope for a write binding', async () => {
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([]);

			await expect(service.setBindings('app-1', [tableBinding()], user)).rejects.toBeInstanceOf(
				BindingDataTableNotFoundError,
			);
			expect(dataTableService.findDataTablesByIdsForUser).toHaveBeenCalledWith(['dt-1'], user, [
				'dataTable:readRow',
				'dataTable:writeRow',
			]);
		});

		it('rejects a data table owned by another project', async () => {
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				table({ projectId: 'proj-2' }),
			]);

			await expect(service.setBindings('app-1', [tableBinding()], user)).rejects.toThrow(
				'Binding \'tasks\': data table "Tasks" belongs to another project.',
			);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects a data table binding without permissions', async () => {
			await expect(service.setBindings('app-1', [tableBinding([])], user)).rejects.toBeInstanceOf(
				InvalidBindingsError,
			);
			expect(dataTableService.findDataTablesByIdsForUser).not.toHaveBeenCalled();
		});

		it('binds a data table and describes its columns', async () => {
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([table()]);
			dataTableService.validateDataTableExists.mockResolvedValue(table());
			dataTableService.getColumns.mockResolvedValue([column('title', 'string')]);

			const result = await service.setBindings('app-1', [tableBinding(['read'])], user);

			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [tableBinding(['read'])]);
			expect(result.bindings).toEqual([
				expect.objectContaining({
					key: 'tasks',
					kind: 'dataTable',
					name: 'Tasks',
					permissions: ['read'],
					columns: [{ name: 'title', type: 'string' }],
				}),
			]);
			expect(result.warnings).toEqual([]);
		});

		it('rejects an agent that is not in the app project', async () => {
			agentsService.findById.mockResolvedValue(null);

			await expect(service.setBindings('app-1', [agentBinding()], user)).rejects.toBeInstanceOf(
				BindingAgentNotFoundError,
			);
			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'proj-1');
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects an agent binding with 400 while the agents module is inactive', async () => {
			moduleRegistry.isActive.mockReturnValue(false);

			const error: unknown = await service
				.setBindings('app-1', [agentBinding()], user)
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect(error).toMatchObject({ message: 'Agents are not enabled on this instance.' });
			expect(moduleRegistry.isActive).toHaveBeenCalledWith('agents');
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('rejects an agent binding without permissions', async () => {
			await expect(service.setBindings('app-1', [agentBinding([])], user)).rejects.toBeInstanceOf(
				InvalidBindingsError,
			);
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('binds an unpublished agent and reports it as a warning', async () => {
			agentsService.findById.mockResolvedValue(agent({ activeVersionId: null }));

			const result = await service.setBindings('app-1', [agentBinding(['chat'])], user);

			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [agentBinding(['chat'])]);
			expect(result.bindings).toEqual([
				{
					key: 'support',
					kind: 'agent',
					agentId: 'agent-1',
					name: 'Support',
					permissions: ['chat'],
					published: false,
				},
			]);
			expect(result.warnings).toEqual([
				'Binding \'support\': agent "Support" is not published. The app gets an error until it is published.',
			]);
		});
	});

	describe('updateBinding', () => {
		it('replaces the permissions of the key and re-checks the list', async () => {
			app.bindings = [binding(), tableBinding(['read'])];
			const wf = workflow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(wf);
			workflowLoader.loadWorkflow.mockResolvedValue(wf);
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([table()]);
			dataTableService.validateDataTableExists.mockResolvedValue(table());
			dataTableService.getColumns.mockResolvedValue([]);

			const result = await service.updateBinding(
				'app-1',
				'tasks',
				{ permissions: ['read', 'write'] },
				user,
			);

			expect(dataTableService.findDataTablesByIdsForUser).toHaveBeenCalledWith(['dt-1'], user, [
				'dataTable:readRow',
				'dataTable:writeRow',
			]);
			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [
				binding(),
				tableBinding(['read', 'write']),
			]);
			expect(result.bindings).toEqual([
				expect.objectContaining({ key: 'submit' }),
				expect.objectContaining({ key: 'tasks', permissions: ['read', 'write'] }),
			]);
		});

		it('throws BindingNotFoundError for an unbound key without saving', async () => {
			app.bindings = [tableBinding()];

			await expect(
				service.updateBinding('app-1', 'nope', { permissions: ['read'] }, user),
			).rejects.toThrow(BindingNotFoundError);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects a workflow binding, which has no permissions', async () => {
			app.bindings = [binding()];

			await expect(
				service.updateBinding('app-1', 'submit', { permissions: ['read'] }, user),
			).rejects.toBeInstanceOf(InvalidBindingsError);
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
		});

		it('rejects a permission the binding kind does not know', async () => {
			app.bindings = [tableBinding()];

			await expect(
				service.updateBinding('app-1', 'tasks', { permissions: ['admin'] }, user),
			).rejects.toBeInstanceOf(InvalidBindingsError);
			expect(dataTableService.findDataTablesByIdsForUser).not.toHaveBeenCalled();
			expect(appRepository.updateBindings).not.toHaveBeenCalled();
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

			expect(result.bindings[0]).toMatchObject({
				input: inputOf({ message: stringField('message') }),
			});
			expect(result.warnings).toEqual([]);
		});

		it('reports passthrough triggers', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({ nodes: [triggerNode({ inputSource: 'passthrough' })] }),
			);

			const result = await service.describeBindings(app);

			expect(result.bindings[0]).toMatchObject({
				input: { type: 'object', additionalProperties: true },
			});
			expect(result.warnings).toEqual([
				'Binding \'submit\': workflow "Echo" accepts any input (trigger has no declared fields): the app cannot type-check its input and the server does not validate it. Declare fields on the trigger to get typed input.',
			]);
		});

		it('keeps a binding whose workflow no longer exists as missing and warns', async () => {
			app.bindings = [binding('gone', 'wf-gone'), binding()];
			workflowLoader.loadWorkflow.mockImplementation(async (_projectId, reference) =>
				reference.workflowId === 'wf-1' ? workflow() : null,
			);

			const result = await service.describeBindings(app);

			expect(result.bindings).toEqual([
				{ key: 'gone', kind: 'workflow', name: 'gone', missing: true },
				expect.objectContaining({ key: 'submit', workflowId: 'wf-1' }),
			]);
			expect(result.warnings).toEqual([
				"Binding 'gone': workflow 'wf-gone' no longer exists in the app's project.",
			]);
		});

		it('keeps a binding whose workflow lost its trigger as missing and warns', async () => {
			app.bindings = [binding()];
			workflowLoader.loadWorkflow.mockResolvedValue(
				workflow({ nodes: [{ ...triggerNode(), type: 'n8n-nodes-base.manualTrigger' }] }),
			);

			const result = await service.describeBindings(app);

			expect(result.bindings).toEqual([
				{ key: 'submit', kind: 'workflow', name: 'submit', missing: true },
			]);
			expect(result.warnings).toEqual([expect.stringContaining('no longer starts with')]);
		});

		it('describes a data table binding with its columns and a nullable row schema', async () => {
			app.bindings = [tableBinding()];
			dataTableService.validateDataTableExists.mockResolvedValue(table());
			dataTableService.getColumns.mockResolvedValue([
				column('title', 'string'),
				column('points', 'number'),
				column('done', 'boolean'),
				column('due', 'date'),
			]);

			const result = await service.describeBindings(app);

			expect(dataTableService.validateDataTableExists).toHaveBeenCalledWith('dt-1', 'proj-1');
			expect(dataTableService.getColumns).toHaveBeenCalledWith('dt-1', 'proj-1');
			expect(result.bindings).toEqual([
				{
					key: 'tasks',
					kind: 'dataTable',
					dataTableId: 'dt-1',
					name: 'Tasks',
					permissions: ['read', 'write'],
					columns: [
						{ name: 'title', type: 'string' },
						{ name: 'points', type: 'number' },
						{ name: 'done', type: 'boolean' },
						{ name: 'due', type: 'date' },
					],
					row: {
						type: 'object',
						properties: {
							id: { type: 'number' },
							createdAt: { type: 'string', format: 'date-time' },
							updatedAt: { type: 'string', format: 'date-time' },
							title: { type: ['string', 'null'] },
							points: { type: ['number', 'null'] },
							done: { type: ['boolean', 'null'] },
							due: { type: ['string', 'null'], format: 'date-time' },
						},
						required: ['id', 'createdAt', 'updatedAt', 'title', 'points', 'done', 'due'],
						additionalProperties: false,
					},
				},
			]);
			expect(result.warnings).toEqual([]);
		});

		it('keeps a binding whose data table no longer exists as missing and warns', async () => {
			app.bindings = [tableBinding()];
			dataTableService.validateDataTableExists.mockRejectedValue(
				new DataTableNotFoundError('dt-1'),
			);

			const result = await service.describeBindings(app);

			expect(result.bindings).toEqual([
				{ key: 'tasks', kind: 'dataTable', name: 'tasks', missing: true },
			]);
			expect(result.warnings).toEqual([
				"Binding 'tasks': data table 'dt-1' no longer exists in the app's project.",
			]);
		});

		it('describes a published agent binding without warnings', async () => {
			app.bindings = [agentBinding()];
			agentsService.findById.mockResolvedValue(agent());

			const result = await service.describeBindings(app);

			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'proj-1');
			expect(result.bindings).toEqual([
				{
					key: 'support',
					kind: 'agent',
					agentId: 'agent-1',
					name: 'Support',
					permissions: ['chat', 'history'],
					published: true,
				},
			]);
			expect(result.warnings).toEqual([]);
		});

		it('keeps a binding whose agent no longer exists as missing and warns', async () => {
			app.bindings = [agentBinding()];
			agentsService.findById.mockResolvedValue(null);

			const result = await service.describeBindings(app);

			expect(result.bindings).toEqual([
				{ key: 'support', kind: 'agent', name: 'support', missing: true },
			]);
			expect(result.warnings).toEqual([
				"Binding 'support': agent 'agent-1' no longer exists in the app's project.",
			]);
		});

		it('keeps an agent binding as missing and warns while the agents module is inactive', async () => {
			app.bindings = [agentBinding()];
			moduleRegistry.isActive.mockReturnValue(false);

			const result = await service.describeBindings(app);

			expect(agentsService.findById).not.toHaveBeenCalled();
			expect(result.bindings).toEqual([
				{ key: 'support', kind: 'agent', name: 'support', missing: true },
			]);
			expect(result.warnings).toEqual([
				"Binding 'support': Agents are not enabled on this instance.",
			]);
		});

		it('rethrows a data table failure that is not a missing table', async () => {
			app.bindings = [tableBinding()];
			dataTableService.validateDataTableExists.mockRejectedValue(new Error('db down'));

			await expect(service.describeBindings(app)).rejects.toThrow('db down');
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
