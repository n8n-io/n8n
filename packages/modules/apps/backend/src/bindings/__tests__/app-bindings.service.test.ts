import type { AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionRepository } from '../../versions/app-version.repository';
import type { AppChangeService } from '../../versions/app-change.service';
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
	changes.saveBindings.mockImplementation(
		async (_p, _a, _v, next) => ({ id: NEW_ID, appId: APP_ID, bindings: next }) as AppVersion,
	);
	const service = new AppBindingsService(
		apps,
		versions,
		changes,
		dataTables,
		workflows,
		agents,
		mock<Logger>(),
	);
	return { service, apps, versions, changes, dataTables, workflows, agents };
}

describe('AppBindingsService', () => {
	it('checks every binding with the acting user, then saves them as a new version', async () => {
		const { service, changes, dataTables, workflows } = setup();

		const result = await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [tableRead, workflow]);

		expect(dataTables.assertCanBind).toHaveBeenCalledWith(user, 'p1', tableRead);
		expect(workflows.assertCanBind).toHaveBeenCalledWith(user, 'p1', workflow);
		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, DRAFT_ID, [
			tableRead,
			workflow,
		]);
		expect(result.versionId).toBe(NEW_ID);
		expect(result.bindings.map(({ key }) => key)).toEqual(['tasks', 'submit']);
	});

	it('saves the bindings of a published draft the same way', async () => {
		const { service, changes } = setup({ publishedVersionId: DRAFT_ID });

		const result = await service.setBindings(user, 'p1', APP_ID, DRAFT_ID, [workflow]);

		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, DRAFT_ID, [workflow]);
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

		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, null, [workflow]);
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
		expect(changes.saveBindings).toHaveBeenCalledWith('p1', APP_ID, DRAFT_ID, [agentChat]);

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

	describe('restoreVersion', () => {
		const OLD_ID = '0190a8d6-4a2e-7000-8000-0000000000d0';

		function setupRestore(source: Partial<AppVersion> = {}) {
			const context = setup();
			context.versions.findVersionById.mockResolvedValue({
				id: OLD_ID,
				appId: APP_ID,
				bindings: [tableRead, workflow],
				...source,
			} as AppVersion);
			context.changes.startRestore.mockResolvedValue({ id: NEW_ID } as AppVersion);
			return context;
		}

		it('checks every restored binding with the acting user, then restores the version', async () => {
			const { service, changes, dataTables, workflows } = setupRestore();

			const version = await service.restoreVersion(user, 'p1', APP_ID, OLD_ID, DRAFT_ID);

			expect(version.id).toBe(NEW_ID);
			expect(dataTables.assertCanBind).toHaveBeenCalledWith(user, 'p1', tableRead);
			expect(workflows.assertCanBind).toHaveBeenCalledWith(user, 'p1', workflow);
			expect(changes.startRestore).toHaveBeenCalledWith('p1', APP_ID, OLD_ID, DRAFT_ID);
		});

		it('does not restore when the user cannot use a restored binding', async () => {
			const { service, changes, workflows } = setupRestore();
			workflows.assertCanBind.mockRejectedValue(new Error('no access'));

			await expect(service.restoreVersion(user, 'p1', APP_ID, OLD_ID, DRAFT_ID)).rejects.toThrow(
				'no access',
			);
			expect(changes.startRestore).not.toHaveBeenCalled();
		});

		it('rejects a version id that is not a UUID before it reads the database', async () => {
			const { service, versions, changes } = setupRestore();

			await expect(service.restoreVersion(user, 'p1', APP_ID, 'foo', DRAFT_ID)).rejects.toThrow(
				NotFoundError,
			);
			expect(versions.findVersionById).not.toHaveBeenCalled();
			expect(changes.startRestore).not.toHaveBeenCalled();
		});

		it.each([
			['a version of another app', { appId: '0190a8d6-4a2e-7000-8000-000000000002' }],
			['a missing version', null],
		])('rejects %s', async (_case, source) => {
			const { service, versions, changes } = setupRestore();
			versions.findVersionById.mockResolvedValue(
				source === null ? null : ({ id: OLD_ID, bindings: [], ...source } as unknown as AppVersion),
			);

			await expect(service.restoreVersion(user, 'p1', APP_ID, OLD_ID, DRAFT_ID)).rejects.toThrow(
				NotFoundError,
			);
			expect(changes.startRestore).not.toHaveBeenCalled();
		});
	});
});
