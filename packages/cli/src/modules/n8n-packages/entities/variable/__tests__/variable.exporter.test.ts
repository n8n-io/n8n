import type { Project, SharedWorkflow, SharedWorkflowRepository, User, Variables } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';

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
	const exporter = new VariableExporter(
		variablesService,
		sharedWorkflowRepository,
		new VariableSerializer(),
	);
	return { exporter, variablesService, sharedWorkflowRepository };
}

/**
 * Wires the lookups the exporter performs: every variable on the instance
 * (what runtime resolves against), the subset the caller may list (what may
 * be bundled), and which project each workflow belongs to.
 */
function wireVariables(
	deps: Pick<ReturnType<typeof makeExporter>, 'variablesService' | 'sharedWorkflowRepository'>,
	opts: {
		all: Variables[];
		accessible?: Variables[];
		workflowProjects: Array<[workflowId: string, projectId: string]>;
	},
) {
	deps.variablesService.getAllCached.mockResolvedValue(opts.all);
	deps.variablesService.getAllForUser.mockResolvedValue(opts.accessible ?? opts.all);
	deps.sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue(
		opts.workflowProjects.map(([workflowId, projectId]) =>
			mock<SharedWorkflow>({ workflowId, project: { id: projectId } as Project }),
		),
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
			wireVariables(deps, {
				all: [variable],
				workflowProjects: [['wf-1', 'proj-personal']],
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
			wireVariables(deps, {
				all: [variable],
				workflowProjects: [['wf-1', 'proj-billing']],
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
			});
		});

		it('prefers the workflow project-scoped variable over a global of the same name', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g', value: 'global-value' });
			const scopedVariable = projectVariable('proj-x', { id: 'var-p', value: 'scoped-value' });
			wireVariables(deps, {
				all: [globalVariable, scopedVariable],
				workflowProjects: [['wf-1', 'proj-x']],
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

		it('bundles a global referenced from a member personal-project workflow', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g', value: 'global-value' });
			wireVariables(deps, {
				all: [globalVariable],
				workflowProjects: [['wf-1', 'proj-personal']],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-g', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'global-value', usedByWorkflows: ['wf-1'] },
			]);
		});
	});

	describe('runtime parity', () => {
		it('bundles an accessible global for a workflow whose project the caller cannot list', async () => {
			const deps = makeExporter();
			// The caller cannot list proj-secret's variables, but that project has no
			// variable named API_URL — runtime would resolve the global, so export
			// bundles it too instead of dropping a real dependency.
			const globalVariable = makeVariable({ id: 'var-g' });
			wireVariables(deps, {
				all: [globalVariable],
				accessible: [globalVariable],
				workflowProjects: [['wf-1', 'proj-secret']],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.entries).toEqual([
				{ id: 'var-g', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'https://api.example.com', usedByWorkflows: ['wf-1'] },
			]);
		});
	});

	describe('shadow detection', () => {
		it('returns nothing for a global shadowed by an inaccessible project-scoped variable of the same name', async () => {
			const deps = makeExporter();
			const globalVariable = makeVariable({ id: 'var-g' });
			const hiddenScoped = projectVariable('proj-x', { id: 'var-hidden' });
			// Runtime would pick the project-scoped row, which the caller cannot
			// see — so we must not export the misleading global in its place.
			wireVariables(deps, {
				all: [globalVariable, hiddenScoped],
				accessible: [globalVariable],
				workflowProjects: [['wf-1', 'proj-x']],
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
			wireVariables(deps, {
				all: [variableA, variableB],
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
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
			});
			expect(writer.files[1].path).toBe('projects/b/variables/apiurl/variable.json');
			expect(jsonParse(writer.files[1].content)).toEqual({
				name: 'API_URL',
				type: 'string',
				value: 'B',
			});
		});

		it('keeps the value and bundles once when every workflow resolves to the same variable', async () => {
			const deps = makeExporter();
			const shared = makeVariable({ id: 'var-shared', value: 'shared-value' });
			wireVariables(deps, {
				all: [shared],
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-personal'],
				],
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
			// wf-b's project holds a hidden variable that shadows the global, so
			// wf-b resolves nothing and cannot vouch for the aggregate value.
			const hiddenScoped = projectVariable('proj-secret', { id: 'var-hidden' });
			wireVariables(deps, {
				all: [shared, hiddenScoped],
				accessible: [shared],
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-secret'],
				],
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
		it('bundles a value-less stub file and emits a valueless requirement', async () => {
			const deps = makeExporter();
			const variable = makeVariable({ id: 'var-url' });
			wireVariables(deps, {
				all: [variable],
				workflowProjects: [['wf-1', 'proj-personal']],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: false,
			});

			expect(result.entries).toEqual([
				{ id: 'var-url', name: 'API_URL', target: 'variables/apiurl' },
			]);
			expect(result.requirements).toEqual([{ name: 'API_URL', usedByWorkflows: ['wf-1'] }]);
			expect(writer.files).toHaveLength(1);
			expect(writer.files[0].path).toBe('variables/apiurl/variable.json');
			expect(jsonParse(writer.files[0].content)).toEqual({ name: 'API_URL', type: 'string' });
		});
	});

	describe('requirement grouping', () => {
		it('collapses duplicate (workflow, name) requirements into a single usedByWorkflows entry', async () => {
			const deps = makeExporter();
			const variable = makeVariable({ id: 'var-url' });
			wireVariables(deps, {
				all: [variable],
				workflowProjects: [['wf-1', 'proj-personal']],
			});
			const writer = new CapturingWriter();

			const result = await deps.exporter.export({
				user,
				requirements: [req('wf-1', 'API_URL'), req('wf-1', 'API_URL')],
				writer,
				includeVariableValues: true,
			});

			expect(result.requirements).toEqual([
				{ name: 'API_URL', value: 'https://api.example.com', usedByWorkflows: ['wf-1'] },
			]);
			expect(result.entries).toHaveLength(1);
			expect(writer.files).toHaveLength(1);
		});
	});

	describe('filename allocation', () => {
		it('disambiguates targets when two distinct variable names slug to the same base', async () => {
			const deps = makeExporter();
			const first = makeVariable({ id: 'var-1', key: 'Region EU', value: 'a' });
			const second = makeVariable({ id: 'var-2', key: 'Region-EU', value: 'b' });
			wireVariables(deps, {
				all: [first, second],
				workflowProjects: [['wf-1', 'proj-personal']],
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
			wireVariables(deps, {
				all: [globalVariable, scopedVariable],
				workflowProjects: [
					['wf-global', 'proj-personal'],
					['wf-scoped', 'proj-x'],
				],
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
			wireVariables(deps, {
				all: [variableA, variableB],
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
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
			wireVariables(deps, {
				all: [variableA, variableB],
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
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
			wireVariables(deps, {
				all: [variableB, variableC],
				workflowProjects: [
					['wf-b', 'proj-2'],
					['wf-c', 'proj-3'],
				],
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

		it('fails the workflow/folder export even when values are excluded', async () => {
			const deps = makeExporter();
			const variableA = projectVariable('proj-a', { id: 'var-a', value: 'A' });
			const variableB = projectVariable('proj-b', { id: 'var-b', value: 'B' });
			wireVariables(deps, {
				all: [variableA, variableB],
				workflowProjects: [
					['wf-a', 'proj-a'],
					['wf-b', 'proj-b'],
				],
			});
			const writer = new CapturingWriter();

			await expect(
				deps.exporter.export({
					user,
					requirements: [req('wf-a', 'API_URL'), req('wf-b', 'API_URL')],
					writer,
					includeVariableValues: false,
				}),
			).rejects.toThrow(/would collide in the package/);

			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('does not fail when the shared name resolves to a single variable across workflows', async () => {
			const deps = makeExporter();
			const shared = makeVariable({ id: 'var-shared', value: 'shared-value' });
			wireVariables(deps, {
				all: [shared],
				workflowProjects: [
					['wf-a', 'proj-personal'],
					['wf-b', 'proj-personal'],
				],
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
