import type { AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionRepository } from '../../versions/app-version.repository';
import type { AppChangeService } from '../../versions/app-change.service';
import type { AppAgentPort, AppDataTablePort, AppWorkflowPort } from '../app-binding-ports';
import { AppBindingsService } from '../app-bindings.service';

const APP_ID = '0190a8d6-4a2e-7000-8000-000000000001';
const user = mock<User>({ id: 'user-1' });

const tableRead: AppBinding = {
	key: 'tasks',
	kind: 'dataTable',
	dataTableId: 't1',
	permissions: ['read'],
};
const workflow: AppBinding = { key: 'submit', kind: 'workflow', workflowId: 'w1' };
const agentChat: AppBinding = {
	key: 'support',
	kind: 'agent',
	agentId: 'a1',
	permissions: ['chat', 'history'],
};

const DRAFT_ID = '0190a8d6-4a2e-7000-8000-0000000000d1';
const NEW_ID = '0190a8d6-4a2e-7000-8000-0000000000d2';

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
	const changes = mock<AppChangeService>();
	changes.saveBindings.mockImplementation(async (_p, _a, _v, next) => ({
		version: { id: NEW_ID, appId: APP_ID, bindings: next } as AppVersion,
		previousBindings: bindings,
	}));
	const events = mock<EventService>();
	const service = new AppBindingsService(
		apps,
		versions,
		changes,
		dataTables,
		workflows,
		agents,
		mock<Logger>(),
		events,
	);
	return { service, apps, versions, changes, dataTables, workflows, agents, events };
}

describe('AppBindingsService', () => {
	it('emits app-bindings-changed with counts and the change against the previous draft', async () => {
		const { service, events } = setup({ bindings: [workflow, agentChat] });

		await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [tableRead, workflow]);

		expect(events.emit).toHaveBeenCalledExactlyOnceWith('app-bindings-changed', {
			appId: APP_ID,
			projectId: 'p1',
			versionId: NEW_ID,
			userId: 'user-1',
			workflowCount: 1,
			dataTableCount: 1,
			agentCount: 0,
			addedCount: 1,
			removedCount: 1,
		});
	});

	it('counts every binding as added for an app without a version', async () => {
		const { service, events } = setup({ draftVersionId: null });

		await service.setBindings(user, 'p1', APP_ID, null, [workflow]);

		expect(events.emit).toHaveBeenCalledWith(
			'app-bindings-changed',
			expect.objectContaining({ addedCount: 1, removedCount: 0 }),
		);
	});

	it('emits nothing when the save fails', async () => {
		const { service, changes, events } = setup();
		changes.saveBindings.mockRejectedValue(new ConflictError('The app draft changed.'));

		await expect(service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow])).rejects.toThrow();

		expect(events.emit).not.toHaveBeenCalled();
	});

	it('checks every binding with the acting user, then saves them as a new version', async () => {
		const { service, changes, dataTables, workflows } = setup();

		const result = await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [tableRead, workflow]);

		expect(dataTables.assertCanBind).toHaveBeenCalledWith(user, 'p1', tableRead);
		expect(workflows.assertCanBind).toHaveBeenCalledWith(user, 'p1', workflow);
		expect(changes.saveBindings).toHaveBeenCalledWith(
			'p1',
			APP_ID,
			DRAFT_ID,
			[tableRead, workflow],
			{ userId: 'user-1' },
		);
		expect(result.versionId).toBe(NEW_ID);
		expect(result.bindings.map(({ key }) => key)).toEqual(['tasks', 'submit']);
	});

	it('saves the bindings of a published draft the same way', async () => {
		const { service, changes } = setup({ publishedVersionId: DRAFT_ID });

		const result = await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow]);

		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, DRAFT_ID, [workflow], {
			userId: 'user-1',
		});
		expect(result.versionId).toBe(NEW_ID);
	});

	it('does not save when the user cannot grant a binding', async () => {
		const { service, changes, workflows } = setup();
		workflows.assertCanBind.mockRejectedValue(new Error('no access'));

		await expect(service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow])).rejects.toThrow(
			'no access',
		);
		expect(changes.saveBindings).not.toHaveBeenCalled();
	});

	it('saves the bindings of an app without a version', async () => {
		const { service, changes } = setup({ draftVersionId: null });

		const result = await service.setBindings(user, 'p1', APP_ID, null, [workflow]);

		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, null, [workflow], {
			userId: 'user-1',
		});
		expect(result.versionId).toBe(NEW_ID);
	});

	it('refuses bindings for an app without a version after someone saved one', async () => {
		const { service, changes } = setup();

		await expect(service.setBindings(user, 'p1', APP_ID, null, [workflow])).rejects.toThrow(
			ConflictError,
		);
		expect(changes.saveBindings).not.toHaveBeenCalled();
	});

	it('refuses bindings based on an older draft before it checks them', async () => {
		const { service, changes, workflows } = setup({ draftVersionId: NEW_ID });

		await expect(service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow])).rejects.toThrow(
			ConflictError,
		);
		expect(workflows.assertCanBind).not.toHaveBeenCalled();
		expect(changes.saveBindings).not.toHaveBeenCalled();
	});

	it('refuses when the draft changed while the bindings were checked', async () => {
		const { service, changes } = setup();
		changes.saveBindings.mockRejectedValue(new ConflictError('The app draft changed.'));

		await expect(service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow])).rejects.toThrow(
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

	it('keeps a binding whose resource left the project and marks it missing', async () => {
		const { service, dataTables } = setup({ bindings: [tableRead] });
		dataTables.describe.mockResolvedValue(null);

		const { bindings, warnings } = await service.getBindings('p1', APP_ID);

		expect(bindings).toEqual([{ ...tableRead, name: 'tasks', missing: true }]);
		expect(warnings).toEqual([expect.objectContaining({ key: 'tasks', code: 'resource_missing' })]);
	});

	it('checks and describes an agent binding through the agent port', async () => {
		const { service, agents, changes } = setup({ bindings: [agentChat] });

		await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [agentChat]);
		expect(agents.assertCanBind).toHaveBeenCalledWith(user, 'p1', agentChat);
		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, DRAFT_ID, [agentChat], {
			userId: 'user-1',
		});

		const { bindings } = await service.getBindings('p1', APP_ID);
		expect(agents.describe).toHaveBeenCalledWith('p1', agentChat);
		expect(bindings).toEqual([expect.objectContaining({ key: 'support', name: 'Support' })]);
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
