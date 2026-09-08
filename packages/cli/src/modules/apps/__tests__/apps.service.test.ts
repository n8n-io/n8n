import type { AppBinding } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import { AppsService } from '../apps.service';
import { AppNotFoundError } from '../errors/app-not-found.error';
import { AppQuotaExceededError } from '../errors/app-quota-exceeded.error';
import { BindingIncompatibleError } from '../errors/binding-incompatible.error';
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
			mock<WorkflowRepository>(),
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
			const source = Buffer.from('source');
			const dist = Buffer.from('dist');

			await service.createVersion('app-1', source, dist);

			expect(appVersionService.create).toHaveBeenCalledWith('app-1', 'project-1', source, dist);
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
		nodes: [triggerNode()],
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

describe('AppsService bindings', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let workflowFinderService: ReturnType<typeof mock<WorkflowFinderService>>;
	let workflowRepository: ReturnType<typeof mock<WorkflowRepository>>;
	let service: AppsService;
	let app: App;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		workflowFinderService = mock<WorkflowFinderService>();
		workflowRepository = mock<WorkflowRepository>();
		service = new AppsService(
			appRepository,
			mock<PageRepository>(),
			workflowFinderService,
			mock<AppVersionService>(),
			mock<GlobalConfig>(),
			workflowRepository,
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
			workflowRepository.findByIds.mockResolvedValue([unpublished]);

			const result = await service.setBindings('app-1', [binding()], user);

			expect(appRepository.updateBindings).toHaveBeenCalledWith(app, [binding()]);
			expect(result.bindings).toEqual([
				{
					key: 'submit',
					kind: 'workflow',
					workflowId: 'wf-1',
					name: 'Echo',
					published: false,
					input: 'passthrough',
				},
			]);
			expect(result.warnings).toEqual([expect.stringContaining('not published')]);
		});

		it('replaces the whole list', async () => {
			app.bindings = [binding('old', 'wf-0')];
			const wf = workflow();
			workflowFinderService.findWorkflowForUser.mockResolvedValue(wf);
			workflowRepository.findByIds.mockResolvedValue([wf]);

			const result = await service.setBindings('app-1', [binding()], user);

			expect(app.bindings).toEqual([binding()]);
			expect(result.bindings.map((b) => b.key)).toEqual(['submit']);
			expect(result.warnings).toEqual([]);
		});
	});

	describe('describeBindings', () => {
		it('lists declared workflowInputs fields', async () => {
			app.bindings = [binding()];
			workflowRepository.findByIds.mockResolvedValue([
				workflow({
					nodes: [
						triggerNode({
							inputSource: 'workflowInputs',
							workflowInputs: {
								values: [
									{ name: 'message', type: 'string' },
									{ name: 'count', type: 'number' },
								],
							},
						}),
					],
				}),
			]);

			const result = await service.describeBindings(app);

			expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf-1'], {
				fields: ['name', 'nodes', 'connections', 'activeVersionId'],
			});
			expect(result.bindings[0]).toMatchObject({
				published: true,
				input: [
					{ name: 'message', type: 'string' },
					{ name: 'count', type: 'number' },
				],
			});
			expect(result.warnings).toEqual([]);
		});

		it('reports passthrough triggers', async () => {
			app.bindings = [binding()];
			workflowRepository.findByIds.mockResolvedValue([
				workflow({ nodes: [triggerNode({ inputSource: 'passthrough' })] }),
			]);

			const result = await service.describeBindings(app);

			expect(result.bindings[0].input).toBe('passthrough');
		});

		it('leaves out a binding whose workflow no longer exists and warns', async () => {
			app.bindings = [binding('gone', 'wf-gone'), binding()];
			workflowRepository.findByIds.mockResolvedValue([workflow()]);

			const result = await service.describeBindings(app);

			expect(result.bindings.map((b) => b.key)).toEqual(['submit']);
			expect(result.warnings).toEqual([expect.stringContaining("'gone'")]);
		});
	});
});
