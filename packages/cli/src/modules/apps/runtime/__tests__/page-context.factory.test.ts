import type { OutboundHttp, HttpRequestClient } from '@n8n/backend-network';
import type { INode } from 'n8n-workflow';
import type { Logger } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	CredentialsRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { ActiveExecutions } from '@/active-executions';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import type { NodeTypes } from '@/node-types';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { PageContextFactory } from '../page-context.factory';
import type { DataTable } from '../../../data-table/data-table.entity';
import type { DataTableProxyService } from '../../../data-table/data-table-proxy.service';
import type { DataTableService } from '../../../data-table/data-table.service';
import type { WorkflowToolWorkflowLoader } from '../../../agents/tools/workflow-tool-workflow-loader.service';

const executeWorkflowMock = vi.fn();
vi.mock('../../../agents/tools/workflow-tool-factory', () => ({
	executeWorkflow: (...args: unknown[]) => executeWorkflowMock(...args),
}));

const app = { id: 'app-1', name: 'My App', namespace: 'my-app', projectId: 'project-1' };
const page = { id: 'page-1', route: '', path: '/apps/my-app' };

function buildFactory() {
	const dataTableProxyService = mock<DataTableProxyService>();
	const dataTableService = mock<DataTableService>();
	const workflowLoader = mock<WorkflowToolWorkflowLoader>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowRunner = mock<WorkflowRunner>();
	const subworkflowPolicyChecker = mock<SubworkflowPolicyChecker>();
	const activeExecutions = mock<ActiveExecutions>();
	const nodeTypes = mock<NodeTypes>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialsService = mock<CredentialsService>();
	const outboundHttp = mock<OutboundHttp>();
	const logger = mock<Logger>();

	const factory = new PageContextFactory(
		dataTableProxyService,
		dataTableService,
		workflowLoader,
		workflowFinderService,
		workflowRepository,
		workflowRunner,
		subworkflowPolicyChecker,
		activeExecutions,
		nodeTypes,
		credentialsRepository,
		credentialsService,
		outboundHttp,
		logger,
	);

	return {
		factory,
		dataTableProxyService,
		dataTableService,
		workflowLoader,
		credentialsRepository,
		credentialsService,
		outboundHttp,
	};
}

function buildInput(overrides: Partial<Parameters<PageContextFactory['build']>[0]> = {}) {
	return {
		app,
		page,
		actionPageId: 'page-1',
		blockId: 'block-1',
		params: {},
		query: {},
		viewer: null,
		menu: [],
		baseUrl: 'https://n8n.example.com',
		logs: [],
		...overrides,
	};
}

describe('PageContextFactory', () => {
	beforeEach(() => {
		executeWorkflowMock.mockReset();
	});

	describe('actionUrl', () => {
		it('builds a URL scoped to the given block, with no query', () => {
			const { factory } = buildFactory();
			const ctx = factory.build(buildInput());
			expect(ctx.actionUrl('submit')).toBe(
				'https://n8n.example.com/apps/my-app/_actions/page-1/block-1/submit',
			);
		});

		it('names the page that owns the block, not the page being rendered', () => {
			const { factory } = buildFactory();
			const ctx = factory.build(buildInput({ actionPageId: 'parent-page' }));
			expect(ctx.actionUrl('go')).toBe(
				'https://n8n.example.com/apps/my-app/_actions/parent-page/block-1/go',
			);
		});
	});

	describe('menu', () => {
		it('exposes the menu it was built with', () => {
			const { factory } = buildFactory();
			const menu = [{ title: 'Home', path: '/apps/my-app', current: true, children: [] }];
			expect(factory.build(buildInput({ menu })).menu).toBe(menu);
		});
	});

	describe('dataTables', () => {
		it('list() scopes the query to the app project', async () => {
			const { factory, dataTableService } = buildFactory();
			dataTableService.getManyAndCount.mockResolvedValue({
				count: 1,
				data: [mock<DataTable>({ id: 'dt-1', name: 'Clients' })],
			});
			const ctx = factory.build(buildInput());

			await expect(ctx.dataTables.list()).resolves.toEqual([{ id: 'dt-1', name: 'Clients' }]);
			expect(dataTableService.getManyAndCount).toHaveBeenCalledWith({
				filter: { projectId: 'project-1' },
			});
		});

		it('get() throws when no table matches the id or name in this project', async () => {
			const { factory, dataTableService } = buildFactory();
			dataTableService.getManyAndCount.mockResolvedValue({ count: 0, data: [] });
			const ctx = factory.build(buildInput());

			await expect(ctx.dataTables.get('missing')).rejects.toThrow(/not found/);
		});

		it('get() resolves the table id then delegates row ops to the project-scoped proxy', async () => {
			const { factory, dataTableService, dataTableProxyService } = buildFactory();
			dataTableService.getManyAndCount.mockResolvedValue({
				count: 1,
				data: [mock<DataTable>({ id: 'dt-1', name: 'Clients' })],
			});
			const ops = mock<ReturnType<DataTableProxyService['makeDataTableOperationsForProject']>>();
			ops.getManyRowsAndCount.mockResolvedValue({ count: 0, data: [] });
			dataTableProxyService.makeDataTableOperationsForProject.mockReturnValue(ops);

			const ctx = factory.build(buildInput());
			const handle = await ctx.dataTables.get('Clients');
			await handle.getManyRowsAndCount({ take: 5 });

			expect(dataTableProxyService.makeDataTableOperationsForProject).toHaveBeenCalledWith(
				'project-1',
				'dt-1',
			);
			expect(ops.getManyRowsAndCount).toHaveBeenCalledWith({ take: 5 });
		});
	});

	describe('workflows.execute', () => {
		it('returns an error result when the workflow is not found', async () => {
			const { factory, workflowLoader } = buildFactory();
			workflowLoader.loadWorkflow.mockResolvedValue(null);
			const ctx = factory.build(buildInput());

			await expect(ctx.workflows.execute('missing')).resolves.toEqual({
				status: 'error',
				error: expect.stringContaining('not found'),
			});
			expect(executeWorkflowMock).not.toHaveBeenCalled();
		});

		it('returns an error result when the workflow has no Execute Workflow Trigger', async () => {
			const { factory, workflowLoader } = buildFactory();
			workflowLoader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'No trigger', nodes: [] }),
			);
			const ctx = factory.build(buildInput());

			await expect(ctx.workflows.execute('wf-1')).resolves.toEqual({
				status: 'error',
				error: expect.stringContaining('trigger'),
			});
		});

		it('maps a successful execution to a success result', async () => {
			const { factory, workflowLoader } = buildFactory();
			const triggerNode = mock<INode>({
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				name: 'Trigger',
			});
			workflowLoader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Sub', nodes: [triggerNode] }),
			);
			executeWorkflowMock.mockResolvedValue({
				executionId: 'exec-1',
				status: 'success',
				data: { hello: 'world' },
			});

			const ctx = factory.build(buildInput());
			await expect(ctx.workflows.execute('wf-1', { a: 1 })).resolves.toEqual({
				status: 'success',
				executionId: 'exec-1',
				data: { hello: 'world' },
			});
		});

		it('maps a waiting execution to the multi-step-forms error', async () => {
			const { factory, workflowLoader } = buildFactory();
			const triggerNode = mock<INode>({
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				name: 'Trigger',
			});
			workflowLoader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Sub', nodes: [triggerNode] }),
			);
			executeWorkflowMock.mockResolvedValue({ executionId: 'exec-1', status: 'waiting' });

			const ctx = factory.build(buildInput());
			await expect(ctx.workflows.execute('wf-1')).resolves.toEqual({
				status: 'error',
				executionId: 'exec-1',
				error: expect.stringContaining('multi-step forms'),
			});
		});
	});

	describe('credentials.get', () => {
		it('throws when no credential of that name exists in the project', async () => {
			const { factory, credentialsRepository } = buildFactory();
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([]);
			const ctx = factory.build(buildInput());

			await expect(ctx.credentials.get('missing')).rejects.toThrow(/not found/);
		});

		it('throws when the name is ambiguous within the project', async () => {
			const { factory, credentialsRepository } = buildFactory();
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([
				mock<CredentialsEntity>({ id: 'c1', name: 'Shared' }),
				mock<CredentialsEntity>({ id: 'c2', name: 'Shared' }),
			]);
			const ctx = factory.build(buildInput());

			await expect(ctx.credentials.get('Shared')).rejects.toThrow(/multiple/i);
		});

		it('decrypts and returns the matching credential, logging the access', async () => {
			const { factory, credentialsRepository, credentialsService } = buildFactory();
			const credential = mock<CredentialsEntity>({ id: 'c1', name: 'My API' });
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([credential]);
			credentialsService.decrypt.mockResolvedValue({ apiKey: 'secret' });

			const ctx = factory.build(buildInput());
			await expect(ctx.credentials.get('My API')).resolves.toEqual({ apiKey: 'secret' });
			expect(credentialsService.decrypt).toHaveBeenCalledWith(credential);
		});
	});

	describe('fetch', () => {
		it('always enforces the SSRF policy, regardless of the instance setting', async () => {
			const { factory, outboundHttp } = buildFactory();
			const request = vi.fn().mockResolvedValue({
				statusCode: 200,
				headers: { 'content-type': 'text/plain' },
				body: 'hello',
			});
			outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));

			const ctx = factory.build(buildInput());
			const response = await ctx.fetch('https://example.com');

			expect(outboundHttp.requests).toHaveBeenCalledWith(
				expect.objectContaining({ useDefaultSsrfPolicy: 'enforced' }),
			);
			expect(response.status).toBe(200);
			await expect(response.text()).resolves.toBe('hello');
		});

		it('rejects a response over the 5 MB cap', async () => {
			const { factory, outboundHttp } = buildFactory();
			const request = vi.fn().mockResolvedValue({
				statusCode: 200,
				headers: {},
				body: 'x'.repeat(5 * 1024 * 1024 + 1),
			});
			outboundHttp.requests.mockReturnValue(mock<HttpRequestClient>({ request }));

			const ctx = factory.build(buildInput());
			await expect(ctx.fetch('https://example.com')).rejects.toThrow(/5 MB/);
		});
	});
});
