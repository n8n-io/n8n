import type { AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppAgentPort, AppDataTablePort, AppWorkflowPort } from '../app-binding-ports';
import { AppBindingsService } from '../app-bindings.service';

const APP_ID = '0190a8d6-4a2e-7000-8000-000000000001';
const user = mock<User>();

const tableRead: AppBinding = {
	key: 'tasks',
	kind: 'dataTable',
	dataTableId: 't1',
	permissions: ['read'],
};
const tableWrite: AppBinding = { ...tableRead, key: 'notes', permissions: ['read', 'insert'] };
const workflow: AppBinding = { key: 'submit', kind: 'workflow', workflowId: 'w1' };
const agentChat: AppBinding = {
	key: 'support',
	kind: 'agent',
	agentId: 'a1',
	permissions: ['chat', 'history'],
};
const agentHistory: AppBinding = { ...agentChat, key: 'archive', permissions: ['history'] };

function setup(app: Partial<App> = {}) {
	const apps = mock<AppRepository>();
	const stored = {
		id: APP_ID,
		projectId: 'p1',
		visibility: 'project',
		bindings: [],
		...app,
	} as App;
	apps.findInProject.mockResolvedValue(stored);
	apps.setBindings.mockImplementation(async (_p, _a, bindings) => ({ ...stored, bindings }));
	const dataTables = mock<AppDataTablePort>();
	dataTables.describe.mockImplementation(async (_p, binding) => ({
		...binding,
		name: 'Table',
		columns: [],
		row: {},
	}));
	const workflows = mock<AppWorkflowPort>();
	workflows.describe.mockImplementation(async (_p, binding) => ({
		...binding,
		name: 'Flow',
		published: true,
		input: {},
		output: {},
	}));
	const agents = mock<AppAgentPort>();
	agents.describe.mockImplementation(async (_p, binding) => ({
		...binding,
		name: 'Support',
		published: true,
	}));
	const service = new AppBindingsService(apps, dataTables, workflows, agents, mock<Logger>());
	return { service, apps, dataTables, workflows, agents };
}

describe('AppBindingsService', () => {
	it('checks every binding with the acting user before it saves the list', async () => {
		const { service, apps, dataTables, workflows } = setup();

		await service.setBindings(user, 'p1', APP_ID, [tableRead, workflow]);

		expect(dataTables.assertCanBind).toHaveBeenCalledWith(user, 'p1', tableRead);
		expect(workflows.assertCanBind).toHaveBeenCalledWith(user, 'p1', workflow);
		expect(apps.setBindings).toHaveBeenCalledWith('p1', APP_ID, [tableRead, workflow]);
	});

	it('does not save when the user cannot grant a binding', async () => {
		const { service, apps, workflows } = setup();
		workflows.assertCanBind.mockRejectedValue(new Error('no access'));

		await expect(service.setBindings(user, 'p1', APP_ID, [workflow])).rejects.toThrow('no access');
		expect(apps.setBindings).not.toHaveBeenCalled();
	});

	it('rejects an app from another project', async () => {
		const { service, apps } = setup();
		apps.findInProject.mockResolvedValue(null);

		await expect(service.getBindings('p2', APP_ID)).rejects.toThrow('App not found');
	});

	it('warns about write access on a public app only', async () => {
		const publicApp = setup({ visibility: 'public', bindings: [tableRead, tableWrite, workflow] });
		const { warnings } = await publicApp.service.getBindings('p1', APP_ID);
		expect(warnings.filter((w) => w.code === 'public_write_access').map((w) => w.key)).toEqual([
			'notes',
			'submit',
		]);

		const projectApp = setup({ bindings: [tableWrite] });
		expect((await projectApp.service.getBindings('p1', APP_ID)).warnings).toEqual([]);
	});

	it('keeps a binding whose resource left the project and marks it missing', async () => {
		const { service, dataTables } = setup({ bindings: [tableRead] });
		dataTables.describe.mockResolvedValue(null);

		const { bindings, warnings } = await service.getBindings('p1', APP_ID);

		expect(bindings).toEqual([{ ...tableRead, name: 'tasks', missing: true }]);
		expect(warnings).toEqual([expect.objectContaining({ key: 'tasks', code: 'resource_missing' })]);
	});

	it('checks and describes an agent binding through the agent port', async () => {
		const { service, agents, apps } = setup({ bindings: [agentChat] });

		await service.setBindings(user, 'p1', APP_ID, [agentChat]);
		expect(agents.assertCanBind).toHaveBeenCalledWith(user, 'p1', agentChat);
		expect(apps.setBindings).toHaveBeenCalledWith('p1', APP_ID, [agentChat]);

		const { bindings } = await service.getBindings('p1', APP_ID);
		expect(agents.describe).toHaveBeenCalledWith('p1', agentChat);
		expect(bindings).toEqual([expect.objectContaining({ key: 'support', name: 'Support' })]);
	});

	it('warns about agent chat on a public app, but not about history only', async () => {
		const { service } = setup({ visibility: 'public', bindings: [agentChat, agentHistory] });

		const { warnings } = await service.getBindings('p1', APP_ID);

		expect(warnings.filter((w) => w.code === 'public_write_access').map((w) => w.key)).toEqual([
			'support',
		]);
	});

	it('warns about an unpublished workflow', async () => {
		const { service, workflows } = setup({ bindings: [workflow] });
		workflows.describe.mockResolvedValue({
			...workflow,
			kind: 'workflow',
			workflowId: 'w1',
			name: 'Flow',
			published: false,
			input: {},
			output: {},
		});

		const { warnings } = await service.getBindings('p1', APP_ID);

		expect(warnings).toEqual([expect.objectContaining({ code: 'resource_unpublished' })]);
	});
});
