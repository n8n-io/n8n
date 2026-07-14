import type { Project, SharedWorkflow, SharedWorkflowRepository, User, Variables } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import type { ProjectService } from '@/services/project.service.ee';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { VariableExporter } from '../variable.exporter';
import { VariableSerializer } from '../variable.serializer';
import type { WorkflowVariableRequirement } from '../variable.types';

const user = mock<User>({ id: 'user-1' });

function makeVariable(overrides: Partial<Variables> = {}): Variables {
	return {
		id: 'var-1',
		key: 'API_URL',
		type: 'string',
		value: 'https://api.example.com',
		project: null,
		...overrides,
	} as unknown as Variables;
}

function projectVariable(projectId: string, overrides: Partial<Variables> = {}): Variables {
	return makeVariable({ project: { id: projectId } as Variables['project'], ...overrides });
}

function req(workflowId: string, variableName: string): WorkflowVariableRequirement {
	return { workflowId, variableName };
}

function makeExporter() {
	const variablesService = mock<VariablesService>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectService = mock<ProjectService>();
	const exporter = new VariableExporter(
		variablesService,
		sharedWorkflowRepository,
		projectService,
		new VariableSerializer(),
	);
	return { exporter, variablesService, sharedWorkflowRepository, projectService };
}

/**
 * Wires the project lookups the exporter performs: which project each workflow
 * belongs to (via the batched owner lookup), which of those projects the caller
 * may list variables for, and the caller's personal project (always visible).
 */
function wireProjects(
	deps: Pick<ReturnType<typeof makeExporter>, 'sharedWorkflowRepository' | 'projectService'>,
	opts: {
		workflowProjects: Array<[workflowId: string, projectId: string]>;
		listableProjectIds?: string[];
		personalProjectId?: string | null;
	},
) {
	deps.sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue(
		opts.workflowProjects.map(([workflowId, projectId]) =>
			mock<SharedWorkflow>({ workflowId, project: { id: projectId } as Project }),
		),
	);
	deps.projectService.getProjectIdsWithScope.mockResolvedValue(opts.listableProjectIds ?? []);
	deps.projectService.getPersonalProject.mockResolvedValue(
		opts.personalProjectId ? ({ id: opts.personalProjectId } as Project) : null,
	);
}

describe('VariableExporter', () => {
	describe('empty input', () => {
		it('returns an empty result and touches no service when given no requirements', async () => {
			const { exporter, variablesService, sharedWorkflowRepository } = makeExporter();
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [],
				writer,
				includeVariableValues: true,
			});

			expect(result).toEqual({ entries: [], requirements: [] });
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);

			expect(variablesService.getAllCached).not.toHaveBeenCalled();
			expect(sharedWorkflowRepository.findByWorkflowIds).not.toHaveBeenCalled();
		});
	});

	describe('happy path', () => {
		it('bundles a resolvable global variable and emits a catalog entry plus a valued requirement', async () => {
			const deps = makeExporter();
			const variable = makeVariable({ id: 'var-url' });
			deps.variablesService.getAllCached.mockResolvedValue([variable]);
			deps.variablesService.getAllForUser.mockResolvedValue([variable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-personal']],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-url', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'https://api.example.com', usedByWorkflows: ['wf-1'] },
			]);
			expect(writer.directories).toEqual(['variables/apiurl']);
			expect(writer.files).toHaveLength(1);
			expect(writer.files[0].path).toBe('variables/apiurl/variable.json');
			expect(jsonParse(writer.files[0].content)).toEqual({
				name: 'API_URL',
				type: 'string',
				value: 'https://api.example.com',
			});
		});

		it('namespaces a project-scoped variable under its project target directory', async () => {
			const deps = makeExporter();
			const variable = projectVariable('proj-billing', { id: 'var-p', value: 'scoped-value' });
			deps.variablesService.getAllCached.mockResolvedValue([variable]);
			deps.variablesService.getAllForUser.mockResolvedValue([variable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-billing']],
				listableProjectIds: ['proj-billing'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
				projectTargetsById: new Map([['proj-billing', 'projects/billing']]),
			});

			expect(result.entries).toEqual([
				{ id: 'var-p', name: 'API_URL', target: 'projects/billing/variables/apiurl' },
			]);
			expect(writer.files[0].path).toBe('projects/billing/variables/apiurl/variable.json');
			expect(jsonParse(writer.files[0].content)).toEqual({
				name: 'API_URL',
				type: 'string',
				value: 'scoped-value',
				projectId: 'proj-billing',
			});
		});

		it('prefers the workflow project-scoped variable over a global of the same name', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g', value: 'global-value' });
			const scopedVariable = projectVariable('proj-x', { id: 'var-p', value: 'scoped-value' });
			deps.variablesService.getAllCached.mockResolvedValue([globalVariable, scopedVariable]);
			deps.variablesService.getAllForUser.mockResolvedValue([globalVariable, scopedVariable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-x']],
				listableProjectIds: ['proj-x'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-p', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'scoped-value', usedByWorkflows: ['wf-1'] },
			]);
		});
	});

	describe('conservative RBAC', () => {
		it('skips resolution and emits a name-only requirement when the workflow project is not listable', async () => {
			const deps = makeExporter();
			// An accessible global of the same name exists, but must NOT be used as a
			// fallback because the caller cannot inspect the workflow's project scope.
			const globalVariable = makeVariable({ id: 'var-g' });
			deps.variablesService.getAllCached.mockResolvedValue([globalVariable]);
			deps.variablesService.getAllForUser.mockResolvedValue([globalVariable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-secret']],
				listableProjectIds: [],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-1'] }]);
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('treats the caller personal project as visible even when the scope list omits it', async () => {
			const deps = makeExporter();
			const variable = projectVariable('proj-personal', { id: 'var-pp', value: 'personal-value' });
			deps.variablesService.getAllCached.mockResolvedValue([variable]);
			deps.variablesService.getAllForUser.mockResolvedValue([variable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-personal']],
				listableProjectIds: [],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-pp', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'personal-value', usedByWorkflows: ['wf-1'] },
			]);
		});
	});

	describe('shadow detection', () => {
		it('returns nothing for a global shadowed by an inaccessible project-scoped variable of the same name', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g' });
			const hiddenScoped = projectVariable('proj-x', { id: 'var-hidden' });
			// Caller can list the project (canInspect === true) and can see the global,
			// but the project-scoped row that runtime would actually pick is invisible
			// to them — so we must not export the misleading global.
			deps.variablesService.getAllForUser.mockResolvedValue([globalVariable]);
			deps.variablesService.getAllCached.mockResolvedValue([globalVariable, hiddenScoped]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-x']],
				listableProjectIds: ['proj-x'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-1'] }]);
			expect(writer.files).toEqual([]);
		});
	});

	describe('strict aggregate value', () => {
		it('omits the requirement value when workflows resolve the name to different values', async () => {
			const deps = makeExporter();
			const variableA = projectVariable('proj-a', { id: 'var-a', value: 'A' });
			const variableB = projectVariable('proj-b', { id: 'var-b', value: 'B' });
			deps.variablesService.getAllCached.mockResolvedValue([variableA, variableB]);
			deps.variablesService.getAllForUser.mockResolvedValue([variableA, variableB]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
				listableProjectIds: ['proj-a', 'proj-b'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: true,
				projectTargetsById: new Map([
					['proj-a', 'projects/a'],
					['proj-b', 'projects/b'],
				]),
			});

			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-a', 'wf-b'] }]);
			// Two distinct variables still get bundled, each under its own project dir.
			expect(result.entries.map((e) => e.id).sort()).toEqual(['var-a', 'var-b']);

			expect(writer.files).toHaveLength(2);
			expect(writer.files[0].path).toBe('projects/a/variables/apiurl/variable.json');
			expect(jsonParse(writer.files[0].content)).toEqual({
				name: 'API_URL',
				type: 'string',
				value: 'A',
				projectId: 'proj-a',
			});
			expect(writer.files[1].path).toBe('projects/b/variables/apiurl/variable.json');
			expect(jsonParse(writer.files[1].content)).toEqual({
				name: 'API_URL',
				type: 'string',
				value: 'B',
				projectId: 'proj-b',
			});
		});

		it('keeps the value and bundles once when every workflow resolves to the same variable', async () => {
			const deps = makeExporter();
			const shared = makeVariable({ id: 'var-shared', value: 'shared-value' });
			deps.variablesService.getAllCached.mockResolvedValue([shared]);
			deps.variablesService.getAllForUser.mockResolvedValue([shared]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-personal'],
				],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'shared-value', usedByWorkflows: ['wf-a', 'wf-b'] },
			]);
			expect(result.entries).toEqual([
				{ id: 'var-shared', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(writer.files).toHaveLength(1);
		});

		it('omits the value when one referencing workflow cannot resolve the variable', async () => {
			const deps = makeExporter();
			const shared = makeVariable({ id: 'var-shared', value: 'shared-value' });
			deps.variablesService.getAllCached.mockResolvedValue([shared]);
			deps.variablesService.getAllForUser.mockResolvedValue([shared]);
			// wf-a is in a visible personal project; wf-b is in a project the caller
			// cannot list, so it cannot contribute to the aggregate value.
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-secret'],
				],
				listableProjectIds: [],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-a', 'wf-b'] }]);
			// The value still travels bundled from the workflow that could resolve it.
			expect(result.entries).toEqual([
				{ id: 'var-shared', name: 'API_URL', target: 'variables/apiurl' },
			]);
		});
	});

	describe('includeVariableValues = false', () => {
		it('lists names only and bundles nothing even when values are resolvable', async () => {
			const deps = makeExporter();
			const variable = makeVariable({ id: 'var-url' });
			deps.variablesService.getAllCached.mockResolvedValue([variable]);
			deps.variablesService.getAllForUser.mockResolvedValue([variable]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-personal']],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: false,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-1'] }]);
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});
	});

	describe('non-string types', () => {
		it('skips a resolved non-string variable: no bundle, no value, name-only requirement', async () => {
			const deps = makeExporter();
			const secret = makeVariable({ id: 'var-secret', type: 'secret', value: 'must-not-leak' });
			deps.variablesService.getAllCached.mockResolvedValue([secret]);
			deps.variablesService.getAllForUser.mockResolvedValue([secret]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-personal']],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-1'] }]);
			expect(writer.files).toEqual([]);
		});
	});

	describe('filename allocation', () => {
		it('disambiguates targets when two distinct variable names slug to the same base', async () => {
			const deps = makeExporter();
			const first = makeVariable({ id: 'var-1', key: 'Region EU', value: 'a' });
			const second = makeVariable({ id: 'var-2', key: 'Region-EU', value: 'b' });
			deps.variablesService.getAllCached.mockResolvedValue([first, second]);
			deps.variablesService.getAllForUser.mockResolvedValue([first, second]);
			wireProjects(deps, {
				workflowProjects: [['wf-1', 'proj-personal']],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'Region EU'), req('wf-1', 'Region-EU')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries.map((e) => e.target)).toEqual([
				'variables/region-eu',
				'variables/region-eu-2',
			]);
		});

		it('allocates independently per base directory so a global and project variable do not collide', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g', key: 'API_URL', value: 'global' });
			const scopedVariable = projectVariable('proj-x', {
				id: 'var-p',
				key: 'API_URL',
				value: 'scoped',
			});
			deps.variablesService.getAllCached.mockResolvedValue([globalVariable, scopedVariable]);
			deps.variablesService.getAllForUser.mockResolvedValue([globalVariable, scopedVariable]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-global', 'proj-personal'],
					['wf-scoped', 'proj-x'],
				],
				listableProjectIds: ['proj-x'],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-global', 'API_URL'), req('wf-scoped', 'API_URL')],
				writer,
				includeVariableValues: true,
				projectTargetsById: new Map([['proj-x', 'projects/x']]),
			});

			expect(result.entries.map((e) => e.target).sort()).toEqual([
				'projects/x/variables/apiurl',
				'variables/apiurl',
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', usedByWorkflows: ['wf-global', 'wf-scoped'] },
			]);
		});
	});

	describe('cross-project name collision', () => {
		it('fails a workflow/folder export when one name resolves to two different variables', async () => {
			const deps = makeExporter();
			const variableA = projectVariable('proj-a', { id: 'var-a', value: 'A' });
			const variableB = projectVariable('proj-b', { id: 'var-b', value: 'B' });
			deps.variablesService.getAllCached.mockResolvedValue([variableA, variableB]);
			deps.variablesService.getAllForUser.mockResolvedValue([variableA, variableB]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
				listableProjectIds: ['proj-a', 'proj-b'],
			});
			const writer = new CapturingWriter();

			await expect(
				deps.exporter.export({
					user,
					requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
					writer,
					includeVariableValues: true,
					// No projectTargetsById: this is a workflow/folder export.
				}),
			).rejects.toThrow(/would collide in the package/);

			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('allows the same collision for a project export, namespacing each variable', async () => {
			const deps = makeExporter();
			const variableA = projectVariable('proj-a', { id: 'var-a', value: 'A' });
			const variableB = projectVariable('proj-b', { id: 'var-b', value: 'B' });
			deps.variablesService.getAllCached.mockResolvedValue([variableA, variableB]);
			deps.variablesService.getAllForUser.mockResolvedValue([variableA, variableB]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
				listableProjectIds: ['proj-a', 'proj-b'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: true,
				projectTargetsById: new Map([
					['proj-a', 'projects/a'],
					['proj-b', 'projects/b'],
				]),
			});

			expect(result.entries.map((e) => e.id).sort()).toEqual(['var-a', 'var-b']);
		});

		it('fails a mixed export when unexported-project variables collide at the top level', async () => {
			const deps = makeExporter();
			// proj-1 is exported (namespaced). proj-2 and proj-3 are only reached
			// via loose workflows, so their same-named vars both funnel into the
			// shared top-level variables/ dir and would suffix-collide there.
			const variableB = projectVariable('proj-2', { id: 'var-b', value: 'B' });
			const variableC = projectVariable('proj-3', { id: 'var-c', value: 'C' });
			deps.variablesService.getAllCached.mockResolvedValue([variableB, variableC]);
			deps.variablesService.getAllForUser.mockResolvedValue([variableB, variableC]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-b', 'proj-2'],
					['wf-c', 'proj-3'],
				],
				listableProjectIds: ['proj-2', 'proj-3'],
			});
			const writer = new CapturingWriter();

			await expect(
				deps.exporter.export({
					user,
					requirements: [req('wf-b', 'API_URL'), req('wf-c', 'API_URL')],
					writer,
					includeVariableValues: true,
					// A project target exists, but these workflows are outside it.
					projectTargetsById: new Map([['proj-1', 'projects/p1']]),
				}),
			).rejects.toThrow(/would collide in the package/);

			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('allows the collision in a workflow/folder export when values are excluded', async () => {
			const deps = makeExporter();
			const variableA = projectVariable('proj-a', { id: 'var-a', value: 'A' });
			const variableB = projectVariable('proj-b', { id: 'var-b', value: 'B' });
			deps.variablesService.getAllCached.mockResolvedValue([variableA, variableB]);
			deps.variablesService.getAllForUser.mockResolvedValue([variableA, variableB]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
				listableProjectIds: ['proj-a', 'proj-b'],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: false,
			});

			expect(result.entries).toEqual([]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-a', 'wf-b'] }]);
			expect(writer.files).toEqual([]);
		});

		it('does not fail when the shared name resolves to a single variable across workflows', async () => {
			const deps = makeExporter();
			const shared = makeVariable({ id: 'var-shared', value: 'shared-value' });
			deps.variablesService.getAllCached.mockResolvedValue([shared]);
			deps.variablesService.getAllForUser.mockResolvedValue([shared]);
			wireProjects(deps, {
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-personal'],
				],
				personalProjectId: 'proj-personal',
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-shared', name: 'API_URL', target: 'variables/apiurl' },
			]);
		});
	});
});
