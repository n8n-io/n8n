import {
	createTeamProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { generateNanoId, ProjectRepository, VariablesRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { createMember, createOwner } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';
import type { UnpackedEntry } from './utils/tar-support';
import { buildWorkflowReferencingVariables } from './utils/test-builders';

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
		'Variables',
		'ProjectRelation',
		'Project',
	]);
	// The variables cache outlives the truncate above.
	await Container.get(VariablesService).updateCache();
});

function variableFiles(entries: UnpackedEntry[]) {
	return entries.filter((entry) => entry.name.endsWith('/variable.json'));
}

describe('workflow package export — with variables', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('bundles a referenced variable, catalogs it in the manifest and lists it in requirements.variables', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const variable = await createVariable('API_URL', 'https://api.example.com');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Workflow with vars',
			project,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'API_URL',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [
				{
					name: 'API_URL',
					value: 'https://api.example.com',
					usedByWorkflows: [workflow.id],
				},
			],
		});

		const files = variableFiles(entries);
		expect(files).toHaveLength(1);
		// The catalog target points at the bundled variable's directory.
		expect(files[0].name).toBe(`${manifest.variables![0].target}/variable.json`);
		const parsed = jsonParse<Record<string, unknown>>(files[0].content.toString());
		expect(parsed).toEqual({
			name: 'API_URL',
			type: 'string',
			value: 'https://api.example.com',
		});
		// No id, key, or projectId (global variable) may appear on disk.
		expect(Object.keys(parsed).sort()).toEqual(['name', 'type', 'value']);
	});

	it('with includeVariableValues=false bundles value-less stub files and lists no values', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const variable = await createVariable('API_URL', 'https://api.example.com');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Workflow with vars',
			project,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [workflow.id],
			includeVariableValues: false,
		});
		const { manifest, entries } = await readExport(stream);

		// The variable itself still travels, just without its value.
		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'API_URL',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'API_URL', usedByWorkflows: [workflow.id] }],
		});
		expect(manifest.requirements!.variables![0]).not.toHaveProperty('value');

		const files = variableFiles(entries);
		expect(files).toHaveLength(1);
		const parsed = jsonParse<Record<string, unknown>>(files[0].content.toString());
		expect(parsed).toEqual({ name: 'API_URL', type: 'string' });
	});

	it('bundles global variables referenced from a member personal-project workflow', async () => {
		const member = await createMember();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		const variable = await createVariable('API_URL', 'https://api.example.com');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Personal workflow with vars',
			project: personalProject,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({ user: member, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'API_URL',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [
				{
					name: 'API_URL',
					value: 'https://api.example.com',
					usedByWorkflows: [workflow.id],
				},
			],
		});
		expect(variableFiles(entries)).toHaveLength(1);
	});

	it('does not fall back to global when an inaccessible project variable shadows it in a personal project', async () => {
		const member = await createMember();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			member.id,
		);
		await createVariable('API_URL', 'https://global.example.com');
		// An admin can plant a project-scoped variable in any project, including
		// personal ones — runtime would shadow the global even though the member
		// cannot list project variables for their personal project.
		await Container.get(VariablesRepository).save({
			id: generateNanoId(),
			key: 'API_URL',
			value: 'https://shadow.example.com',
			project: personalProject,
		});
		await Container.get(VariablesService).updateCache();
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Personal workflow with shadowed var',
			project: personalProject,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({ user: member, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest).not.toHaveProperty('variables');
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'API_URL', usedByWorkflows: [workflow.id] }],
		});
		expect(manifest.requirements!.variables![0]).not.toHaveProperty('value');
		expect(variableFiles(entries)).toEqual([]);
		expect(JSON.stringify(manifest)).not.toContain('example.com');
	});

	it('prefers the project-scoped variable over a global one with the same name', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		await createVariable('API_URL', 'https://global.example.com');
		const projectVariable = await createProjectVariable(
			'API_URL',
			'https://project.example.com',
			project,
		);
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Workflow with vars',
			project,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		// The catalog carries the project-scoped variable's id, not the global one's.
		expect(manifest.variables).toEqual([
			{
				id: projectVariable.id,
				name: 'API_URL',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(manifest.requirements!.variables).toEqual([
			{
				name: 'API_URL',
				value: 'https://project.example.com',
				usedByWorkflows: [workflow.id],
			},
		]);

		const files = variableFiles(entries);
		expect(files).toHaveLength(1);
		expect(jsonParse<Record<string, unknown>>(files[0].content.toString())).toEqual({
			name: 'API_URL',
			type: 'string',
			value: 'https://project.example.com',
		});
	});

	it('dedupes a variable referenced by two workflows in a single export', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		await createVariable('SHARED_VAR', 'shared-value');
		const wfA = await buildWorkflowReferencingVariables({
			name: 'Workflow A',
			project,
			variableNames: ['SHARED_VAR'],
		});
		const wfB = await buildWorkflowReferencingVariables({
			name: 'Workflow B',
			project,
			variableNames: ['SHARED_VAR'],
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [wfA.id, wfB.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.variables).toHaveLength(1);
		expect(manifest.requirements!.variables).toHaveLength(1);
		expect(manifest.requirements!.variables![0].usedByWorkflows.sort()).toEqual(
			[wfA.id, wfB.id].sort(),
		);
		expect(variableFiles(entries)).toHaveLength(1);
	});

	it('exports a legacy-format key referenced via bracket notation', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const variable = await createVariable('legacy-key', 'legacy-value');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Workflow with legacy var',
			project,
			variableNames: ['legacy-key'],
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'legacy-key',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'legacy-key', value: 'legacy-value', usedByWorkflows: [workflow.id] }],
		});
		expect(variableFiles(entries)).toHaveLength(1);
	});

	it('lists an unknown variable name in requirements without a value or file', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Workflow with orphan var',
			project,
			variableNames: ['DOES_NOT_EXIST'],
		});

		const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest).not.toHaveProperty('variables');
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'DOES_NOT_EXIST', usedByWorkflows: [workflow.id] }],
		});
		expect(variableFiles(entries)).toEqual([]);
	});

	it('does not fall back to an accessible global when the project scope is hidden', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Owner Project', owner);
		await createProjectVariable('API_URL', 'https://project.example.com', project);
		// Visible to the sharee, but it may be shadowed by the hidden project
		// variable above — so no value may be exported at all.
		await createVariable('API_URL', 'https://global.example.com');
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Shared workflow with shadowed var',
			project,
			variableNames: ['API_URL'],
		});

		const sharee = await createMember();
		await shareWorkflowWithUsers(workflow, [sharee]);

		const stream = await service.exportPackage({ user: sharee, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest).not.toHaveProperty('variables');
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'API_URL', usedByWorkflows: [workflow.id] }],
		});
		expect(variableFiles(entries)).toEqual([]);
		expect(JSON.stringify(manifest)).not.toContain('example.com');
	});

	it('blocks the export when workflows in different projects resolve the same name to different values', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('Project A', owner);
		const projectB = await createTeamProject('Project B', owner);
		await createProjectVariable('API_URL', 'https://a.example.com', projectA);
		await createProjectVariable('API_URL', 'https://b.example.com', projectB);
		const wfA = await buildWorkflowReferencingVariables({
			name: 'Workflow A',
			project: projectA,
			variableNames: ['API_URL'],
		});
		const wfB = await buildWorkflowReferencingVariables({
			name: 'Workflow B',
			project: projectB,
			variableNames: ['API_URL'],
		});

		await expect(
			service.exportPackage({ user: owner, workflowIds: [wfA.id, wfB.id] }),
		).rejects.toThrow(/would collide in the package/);
	});

	it('omits the value when any referencing workflow cannot resolve the name', async () => {
		const owner = await createOwner();
		const projectA = await createTeamProject('Project A', owner);
		const projectB = await createTeamProject('Project B', owner);
		const variable = await createProjectVariable('PROJECT_ONLY', 'a-value', projectA);
		const wfA = await buildWorkflowReferencingVariables({
			name: 'Workflow A',
			project: projectA,
			variableNames: ['PROJECT_ONLY'],
		});
		const wfB = await buildWorkflowReferencingVariables({
			name: 'Workflow B',
			project: projectB,
			variableNames: ['PROJECT_ONLY'],
		});

		const stream = await service.exportPackage({
			user: owner,
			workflowIds: [wfA.id, wfB.id],
		});
		const { manifest, entries } = await readExport(stream);

		// Workflow B resolves nothing, so no single value is trustworthy…
		expect(manifest.requirements!.variables).toHaveLength(1);
		expect(manifest.requirements!.variables![0]).not.toHaveProperty('value');
		// …but the variable workflow A resolved is still bundled for import.
		expect(manifest.variables).toEqual([
			{
				id: variable.id,
				name: 'PROJECT_ONLY',
				target: expect.stringMatching(/^variables\//) as string,
			},
		]);
		expect(variableFiles(entries)).toHaveLength(1);
	});

	it('namespaces a project-owned variable inside an exported project directory', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('team-ligo', owner);
		const variable = await createProjectVariable('API_URL', 'https://team.example.com', project);
		await buildWorkflowReferencingVariables({
			name: 'Project workflow',
			project,
			variableNames: ['API_URL'],
		});

		const stream = await service.exportPackage({ user: owner, projectIds: [project.id] });
		const { manifest, entries } = await readExport(stream);

		const projectEntry = manifest.projects!.find((entry) => entry.id === project.id)!;
		expect(manifest.variables).toHaveLength(1);
		expect(manifest.variables![0].id).toBe(variable.id);
		expect(manifest.variables![0].target).toMatch(
			new RegExp(`^${projectEntry.target}/variables/[^/]+$`),
		);
		expect(
			entries.find((entry) => entry.name === `${manifest.variables![0].target}/variable.json`),
		).toBeDefined();
	});

	it('treats a variable the caller cannot access like an unknown name', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Owner Project', owner);
		await createProjectVariable('PRIVATE_VAR', 'private-value', project);
		const workflow = await buildWorkflowReferencingVariables({
			name: 'Shared workflow with private var',
			project,
			variableNames: ['PRIVATE_VAR'],
		});

		const sharee = await createMember();
		await shareWorkflowWithUsers(workflow, [sharee]);

		// The sharee can reach the workflow via the direct share, but has no
		// access to the owner project's variables. The export must still succeed
		// with a requirements-only entry carrying no value.
		const stream = await service.exportPackage({ user: sharee, workflowIds: [workflow.id] });
		const { manifest, entries } = await readExport(stream);

		expect(manifest).not.toHaveProperty('variables');
		expect(manifest.requirements).toEqual({
			nodeTypes: expect.any(Array),
			variables: [{ name: 'PRIVATE_VAR', usedByWorkflows: [workflow.id] }],
		});
		expect(variableFiles(entries)).toEqual([]);
	});

	describe('variable value read permission (canExportVariableValues)', () => {
		it('rejects a valued export when variables are referenced but the caller may not read values', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			await createVariable('API_URL', 'https://api.example.com');
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project,
				variableNames: ['API_URL'],
			});

			await expect(
				service.exportPackage({
					user: owner,
					workflowIds: [workflow.id],
					canExportVariableValues: false,
				}),
			).rejects.toThrow(/variable:list/);
		});

		it('exports a workflow that references no variables even when the caller may not read values', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow without vars',
				project,
				variableNames: [],
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [workflow.id],
				canExportVariableValues: false,
			});
			const { manifest } = await readExport(stream);

			expect(manifest).not.toHaveProperty('variables');
			expect(manifest.requirements).toEqual({ nodeTypes: expect.any(Array) });
		});

		it('allows a value-less export of referenced variables when values are excluded', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			await createVariable('API_URL', 'https://api.example.com');
			const workflow = await buildWorkflowReferencingVariables({
				name: 'Workflow with vars',
				project,
				variableNames: ['API_URL'],
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [workflow.id],
				includeVariableValues: false,
				canExportVariableValues: false,
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements).toEqual({
				nodeTypes: expect.any(Array),
				variables: [{ name: 'API_URL', usedByWorkflows: [workflow.id] }],
			});
			// Stubs still travel (name/type only) — the scope gate is value-only.
			const files = variableFiles(entries);
			expect(files).toHaveLength(1);
			const parsed = jsonParse<Record<string, unknown>>(files[0].content.toString());
			expect(parsed).toEqual({ name: 'API_URL', type: 'string' });
		});
	});

	describe('telemetry event', () => {
		it('counts only bundled variable files, not referenced names', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			await createVariable('BUNDLED_VAR', 'bundled-value');
			// Two workflows share one resolvable variable; one also references an orphan.
			const wfA = await buildWorkflowReferencingVariables({
				name: 'WF A',
				project,
				variableNames: ['BUNDLED_VAR'],
			});
			const wfB = await buildWorkflowReferencingVariables({
				name: 'WF B',
				project,
				variableNames: ['BUNDLED_VAR', 'ORPHAN_VAR'],
			});

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			try {
				await service.exportPackage({ user: owner, workflowIds: [wfA.id, wfB.id] });

				const exportedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-exported',
				);
				expect(exportedEvents).toHaveLength(1);

				const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
				expect(payload.counts.workflows).toBe(2);
				expect(payload.counts.variables).toBe(1);
			} finally {
				emitSpy.mockRestore();
			}
		});
	});
});
