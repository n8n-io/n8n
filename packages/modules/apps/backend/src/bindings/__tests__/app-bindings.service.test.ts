import type { AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionRepository } from '../../versions/app-version.repository';
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

const DRAFT_ID = '0190a8d6-4a2e-7000-8000-0000000000d1';

function setup({ bindings = [], ...app }: Partial<App> & { bindings?: AppBinding[] } = {}) {
	const apps = mock<AppRepository>();
	const stored = {
		id: APP_ID,
		projectId: 'p1',
		visibility: 'project',
		draftVersionId: DRAFT_ID,
		publishedVersionId: null,
		...app,
	} as App;
	apps.findInProject.mockResolvedValue(stored);
	const versions = mock<AppVersionRepository>();
	// Plain objects: `mock()` does not keep arrays such as `bindings`.
	versions.findVersionById.mockResolvedValue({
		id: DRAFT_ID,
		appId: APP_ID,
		bindings,
	} as AppVersion);
	versions.setDraftBindings.mockImplementation(
		async (_a, versionId, next) => ({ id: versionId, appId: APP_ID, bindings: next }) as AppVersion,
	);
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
	const service = new AppBindingsService(
		apps,
		versions,
		dataTables,
		workflows,
		agents,
		mock<Logger>(),
	);
	return { service, apps, versions, dataTables, workflows, agents };
}

describe('AppBindingsService', () => {
	it('checks every binding with the acting user before it saves the draft version', async () => {
		const { service, versions, dataTables, workflows } = setup();

		const result = await service.setBindings(user, 'p1', APP_ID, [tableRead, workflow]);

		expect(dataTables.assertCanBind).toHaveBeenCalledWith(user, 'p1', tableRead);
		expect(workflows.assertCanBind).toHaveBeenCalledWith(user, 'p1', workflow);
		expect(versions.setDraftBindings).toHaveBeenCalledWith(APP_ID, DRAFT_ID, [tableRead, workflow]);
		expect(result.versionId).toBe(DRAFT_ID);
	});

	it('does not save when the user cannot grant a binding', async () => {
		const { service, versions, workflows } = setup();
		workflows.assertCanBind.mockRejectedValue(new Error('no access'));

		await expect(service.setBindings(user, 'p1', APP_ID, [workflow])).rejects.toThrow('no access');
		expect(versions.setDraftBindings).not.toHaveBeenCalled();
	});

	it('keeps the bindings of a published version', async () => {
		const { service, versions } = setup({ publishedVersionId: DRAFT_ID });

		await expect(service.setBindings(user, 'p1', APP_ID, [workflow])).rejects.toThrow(
			ConflictError,
		);
		expect(versions.setDraftBindings).not.toHaveBeenCalled();
	});

	it('needs a saved version before it stores bindings', async () => {
		const { service, versions } = setup({ draftVersionId: null });

		await expect(service.setBindings(user, 'p1', APP_ID, [workflow])).rejects.toThrow(
			ConflictError,
		);
		expect(versions.setDraftBindings).not.toHaveBeenCalled();
	});

	it('refuses when the draft changed while the bindings were checked', async () => {
		const { service, versions } = setup();
		versions.setDraftBindings.mockResolvedValue(null);

		await expect(service.setBindings(user, 'p1', APP_ID, [workflow])).rejects.toThrow(
			ConflictError,
		);
	});

	it('reads the bindings of the draft version', async () => {
		const { service, versions } = setup({ bindings: [workflow] });

		const result = await service.getBindings('p1', APP_ID);

		expect(versions.findVersionById).toHaveBeenCalledWith(DRAFT_ID);
		expect(result).toMatchObject({ versionId: DRAFT_ID, bindings: [{ key: 'submit' }] });
	});

	it('reads no bindings before the first source save', async () => {
		const { service, versions } = setup({ draftVersionId: null });

		expect(await service.getBindings('p1', APP_ID)).toEqual({
			versionId: null,
			bindings: [],
			warnings: [],
		});
		expect(versions.findVersionById).not.toHaveBeenCalled();
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
		const { service, agents, versions } = setup({ bindings: [agentChat] });

		await service.setBindings(user, 'p1', APP_ID, [agentChat]);
		expect(agents.assertCanBind).toHaveBeenCalledWith(user, 'p1', agentChat);
		expect(versions.setDraftBindings).toHaveBeenCalledWith(APP_ID, DRAFT_ID, [agentChat]);

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
