import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { CredentialsFinderService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { CredentialsEntity, User } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';

import {
	credentialsWithoutValue,
	newCopyPlan,
	planReimport,
	type ReimportPlanInput,
} from '../workflow-package-reimport';

const user = Object.assign(new User(), { id: 'user-1' });

const httpNode = (credentialId: string): INode => ({
	id: 'http-1',
	name: 'Call Stripe',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	credentials: { httpHeaderAuth: { id: credentialId, name: 'Stripe' } },
});

const tableNode = (dataTableId: string): INode => ({
	id: 'table-1',
	name: 'Find customer',
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1,
	position: [0, 0],
	parameters: { dataTableId: { __rl: true, mode: 'list', value: dataTableId } },
});

const input = (overrides: Partial<ReimportPlanInput> = {}): ReimportPlanInput => ({
	user,
	projectId: 'project-1',
	packageNodes: [httpNode('src-stripe'), tableNode('dt-source')],
	copyNodes: [httpNode('own-stripe'), tableNode('dt-own')],
	requirements: {
		credentials: [
			{ id: 'src-stripe', name: 'Stripe', type: 'httpHeaderAuth', usedByWorkflows: ['wf-1'] },
		],
		dataTables: [{ id: 'dt-source', name: 'Customers', usedByWorkflows: ['wf-1'] }],
	},
	...overrides,
});

let credentials: ReturnType<typeof mockInstance<CredentialsService>>;
let dataTables: ReturnType<typeof mockInstance<DataTableService>>;
let modules: ReturnType<typeof mockInstance<ModuleRegistry>>;

beforeEach(() => {
	credentials = mockInstance(CredentialsService);
	dataTables = mockInstance(DataTableService);
	modules = mockInstance(ModuleRegistry, { isActive: vi.fn().mockReturnValue(true) });
	credentials.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
		{ id: 'own-stripe', type: 'httpHeaderAuth' },
	] as Awaited<ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>>);
	dataTables.findDataTablesByIds.mockResolvedValue([]);
});

describe('planReimport', () => {
	it('keeps the usable credential and the data table that the copy chose', async () => {
		const plan = await planReimport(input());

		expect(plan.credentialBindings).toEqual(new Map([['src-stripe', 'own-stripe']]));
		expect(plan.conflictingCredentialSourceIds).toEqual([]);
		expect(plan.dataTables.replacedTables).toEqual([
			{ id: 'dt-source', name: 'Customers', usedByWorkflows: ['wf-1'] },
		]);
		expect(credentials.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'project-1',
		});
		expect(dataTables.findDataTablesByIds).toHaveBeenCalledWith(['dt-source']);
	});

	it('keeps no data table that the target project has', async () => {
		dataTables.findDataTablesByIds.mockResolvedValue([
			{ id: 'dt-source', projectId: 'project-1' } as DataTable,
		]);

		expect((await planReimport(input())).dataTables.replacedTables).toEqual([]);
	});

	it('keeps the selection for a data table of the package that is in another project', async () => {
		dataTables.findDataTablesByIds.mockResolvedValue([
			{ id: 'dt-source', projectId: 'other-project' } as DataTable,
		]);

		expect((await planReimport(input())).dataTables.selections).toEqual(
			new Map([['table-1', { __rl: true, mode: 'list', value: 'dt-own' }]]),
		);
	});

	it('does not look up data tables while the data table module is off', async () => {
		modules.isActive.mockReturnValue(false);

		const plan = await planReimport(input());

		expect(modules.isActive).toHaveBeenCalledWith('data-table');
		expect(dataTables.findDataTablesByIds).not.toHaveBeenCalled();
		expect(plan.dataTables.replacedTables).toEqual([]);
	});

	it('looks up nothing when the copy chose nothing and the package needs no data tables', async () => {
		const plan = await planReimport(
			input({ copyNodes: [], requirements: { credentials: [], dataTables: [] } }),
		);

		expect(plan).toEqual(newCopyPlan());
		expect(credentials.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
		expect(dataTables.findDataTablesByIds).not.toHaveBeenCalled();
	});

	it('binds no credential that the user cannot use', async () => {
		credentials.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		expect((await planReimport(input({ requirements: undefined }))).credentialBindings).toEqual(
			new Map(),
		);
	});
});

describe('credentialsWithoutValue', () => {
	let finder: ReturnType<typeof mockInstance<CredentialsFinderService>>;
	let logger: ReturnType<typeof mockInstance<Logger>>;

	const credential = (id: string) => Object.assign(new CredentialsEntity(), { id });

	beforeEach(() => {
		finder = mockInstance(CredentialsFinderService);
		logger = mockInstance(Logger);
		finder.findCredentialForUser.mockImplementation(async (id) =>
			id === 'unreadable' ? null : credential(id),
		);
		credentials.decrypt.mockImplementation(async ({ id }) =>
			id === 'filled' ? { value: 'set' } : {},
		);
	});

	it('gives the readable credentials that hold no value, once each', async () => {
		const empty = await credentialsWithoutValue(user, ['stub', 'filled', 'unreadable', 'stub']);

		expect(empty).toEqual(new Set(['stub']));
		expect(finder.findCredentialForUser).toHaveBeenCalledTimes(3);
		expect(finder.findCredentialForUser).toHaveBeenCalledWith('stub', user, ['credential:read']);
		expect(credentials.decrypt).toHaveBeenCalledWith(expect.objectContaining({ id: 'stub' }), true);
	});

	it('leaves out a credential that it cannot check, and logs why', async () => {
		credentials.decrypt.mockRejectedValueOnce(new Error('Bad key'));

		const empty = await credentialsWithoutValue(user, ['broken', 'stub']);

		expect(empty).toEqual(new Set(['stub']));
		expect(logger.warn).toHaveBeenCalledWith('Could not check whether a credential holds a value', {
			credentialId: 'broken',
			error: 'Bad key',
		});
	});
});
