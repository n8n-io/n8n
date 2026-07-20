import {
	createTeamProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';

import { saveCredential } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';
import {
	buildWorkflowCallingSubWorkflow,
	buildWorkflowReferencingCredential,
	buildWorkflowReferencingCredentialById,
} from './utils/test-builders';

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'ProjectRelation',
		'Project',
	]);
});

describe('workflow package export — with credentials', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('bundles a referenced credential and lists it in manifest.credentials + requirements', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const credential = await saveCredential(
			{
				name: 'Header credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project, role: 'credential:owner' },
		);
		const workflow = await buildWorkflowReferencingCredential({
			name: 'Workflow with creds',
			project,
			credential,
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toEqual([
			{
				id: credential.id,
				name: credential.name,
				target: expect.any(String) as string,
			},
		]);
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: credential.id,
					name: credential.name,
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const credentialFile = entries.find(
			(e) => e.name === `${manifest.credentials![0].target}/credential.json`,
		);
		expect(credentialFile).toBeDefined();
		const parsed = jsonParse<Record<string, unknown>>(credentialFile!.content.toString());
		expect(parsed).toEqual({
			id: credential.id,
			name: credential.name,
			type: 'httpHeaderAuth',
		});
		// Secret-adjacent fields must not appear on disk under any name.
		expect(Object.keys(parsed).sort()).toEqual(['id', 'name', 'type']);
	});

	it('dedupes a credential referenced by two workflows in a single export', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const credential = await saveCredential(
			{
				name: 'Shared credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project, role: 'credential:owner' },
		);

		const wfA = await buildWorkflowReferencingCredential({
			name: 'Workflow A',
			project,
			credential,
		});
		const wfB = await buildWorkflowReferencingCredential({
			name: 'Workflow B',
			project,
			credential,
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [wfA.id, wfB.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toHaveLength(1);
		expect(manifest.credentials![0].id).toBe(credential.id);

		expect(manifest.requirements?.credentials).toHaveLength(1);
		expect(manifest.requirements!.credentials![0].usedByWorkflows.sort()).toEqual(
			[wfA.id, wfB.id].sort(),
		);

		const credentialFiles = entries.filter((e) => e.name.endsWith('/credential.json'));
		expect(credentialFiles).toHaveLength(1);
	});

	it('bundles credential requirements from included sub-workflows', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const credential = await saveCredential(
			{
				name: 'Child credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project, role: 'credential:owner' },
		);
		const child = await buildWorkflowReferencingCredential({
			name: 'Child Workflow',
			project,
			credential,
		});
		const parent = await buildWorkflowCallingSubWorkflow({
			name: 'Parent Workflow',
			project,
			subWorkflowId: child.id,
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [parent.id, child.id] });
		const { manifest } = await readExport(stream);

		expect(manifest.workflows!.map(({ id }) => id).sort()).toEqual([parent.id, child.id].sort());
		expect(manifest.requirements?.credentials).toEqual([
			{
				id: credential.id,
				name: credential.name,
				type: credential.type,
				usedByWorkflows: [child.id],
			},
		]);
		expect(manifest.requirements).not.toHaveProperty('subWorkflows');
	});

	it('lists orphan credential references in requirements without writing a file', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);

		const workflow = await buildWorkflowReferencingCredentialById({
			name: 'Workflow with orphan',
			project,
			credentialId: 'does-not-exist',
			credentialName: 'Stale cred name',
			credentialType: 'httpHeaderAuth',
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toBeUndefined();
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: 'does-not-exist',
					name: 'Stale cred name',
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const credentialFiles = entries.filter((e) => e.name.endsWith('/credential.json'));
		expect(credentialFiles).toEqual([]);
	});

	it('emits a requirements-only entry when the caller can read the workflow but not its credential', async () => {
		const owner = await createOwner();
		const ownerProject = await createTeamProject('Owner Project', owner);
		const credential = await saveCredential(
			{
				name: 'Owner-only credential',
				type: 'httpHeaderAuth',
				data: { name: 'X-Auth', value: 'secret' },
			},
			{ project: ownerProject, role: 'credential:owner' },
		);
		const workflow = await buildWorkflowReferencingCredential({
			name: 'Shared workflow with private cred',
			project: ownerProject,
			credential,
		});

		const sharee = await createMember();
		await shareWorkflowWithUsers(workflow, [sharee]);

		// The sharee can reach the workflow via the direct share, but the
		// credential was never shared with them. The export must still succeed,
		// recording the credential as a requirement using the name+type carried
		// in the workflow JSON.
		const stream = await service.exportPackage({
			user: sharee,
			workflowIds: [workflow.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.credentials).toBeUndefined();
		expect(manifest.requirements).toEqual({
			credentials: [
				{
					id: credential.id,
					name: credential.name,
					type: 'httpHeaderAuth',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const credentialFiles = entries.filter((e) => e.name.endsWith('/credential.json'));
		expect(credentialFiles).toEqual([]);
	});

	describe('telemetry event', () => {
		it('emits n8n-package-exported with entity counts on a successful export', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const firstCredential = await saveCredential(
				{ name: 'First', type: 'httpHeaderAuth', data: { name: 'X-Auth', value: 'a' } },
				{ project, role: 'credential:owner' },
			);
			const secondCredential = await saveCredential(
				{ name: 'Second', type: 'httpHeaderAuth', data: { name: 'X-Auth', value: 'b' } },
				{ project, role: 'credential:owner' },
			);
			// Three workflows referencing two distinct credentials (one is shared by two workflows).
			const wfA = await buildWorkflowReferencingCredential({
				name: 'WF A',
				project,
				credential: firstCredential,
			});
			const wfB = await buildWorkflowReferencingCredential({
				name: 'WF B',
				project,
				credential: secondCredential,
			});
			const wfC = await buildWorkflowReferencingCredential({
				name: 'WF C',
				project,
				credential: firstCredential,
			});

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			try {
				await service.exportPackage({
					user: owner,
					workflowIds: [wfA.id, wfB.id, wfC.id],
					projectIds: [],
				});

				const exportedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-exported',
				);
				expect(exportedEvents).toHaveLength(1);

				const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
				expect(payload.counts.workflows).toBe(3);
				expect(payload.counts.credentials).toBe(2);
				expect(payload.user.id).toBe(owner.id);
				expect([...payload.workflowIds!].sort()).toEqual([wfA.id, wfB.id, wfC.id].sort());
				// Empty filter must be omitted entirely, not recorded as `[]`.
				expect(payload).not.toHaveProperty('projectIds');
			} finally {
				emitSpy.mockRestore();
			}
		});

		it('counts only bundled credentials, not unresolved requirements', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			// An orphan credential reference becomes a requirement but is never bundled,
			// so counts.credentials must track bundled entries (0), not requirements (1).
			const workflow = await buildWorkflowReferencingCredentialById({
				name: 'WF with orphan cred',
				project,
				credentialId: 'does-not-exist',
				credentialName: 'Stale cred',
				credentialType: 'httpHeaderAuth',
			});

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			try {
				await service.exportPackage({ user: owner, workflowIds: [workflow.id] });

				const exportedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-exported',
				);
				expect(exportedEvents).toHaveLength(1);

				const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
				expect(payload.counts.workflows).toBe(1);
				expect(payload.counts.credentials).toBe(0);
			} finally {
				emitSpy.mockRestore();
			}
		});

		it('does not emit n8n-package-exported when the export aborts', async () => {
			const owner = await createOwner();
			await createTeamProject('Project A', owner);
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			try {
				await expect(
					service.exportPackage({ user: owner, workflowIds: ['does-not-exist'] }),
				).rejects.toThrow(/not found or not accessible/i);

				const exportedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-exported',
				);
				expect(exportedEvents).toHaveLength(0);
			} finally {
				emitSpy.mockRestore();
			}
		});
	});
});
