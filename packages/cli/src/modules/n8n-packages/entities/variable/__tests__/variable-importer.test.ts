import type { Variables } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import { VariableImporter } from '../variable-importer';
import type { VariableImportPlan } from '../variable.types';
import type { ImportContext } from '../../../n8n-packages.types';

const context: ImportContext = {
	user: mock(),
	projectId: 'proj-target',
	folderId: null,
};

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

function makeImporter() {
	const variablesService = mock<VariablesService>();
	const importer = new VariableImporter(variablesService);
	return { importer, variablesService };
}

describe('VariableImporter', () => {
	describe('plan', () => {
		it('returns an empty plan and skips the service when there are no requirements', async () => {
			const { importer, variablesService } = makeImporter();

			const plan = await importer.plan(context, {
				requirements: undefined,
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: [], missing: [] });
			expect(variablesService.getAllCached).not.toHaveBeenCalled();
		});

		it('returns an empty plan for an empty requirements list', async () => {
			const { importer, variablesService } = makeImporter();

			const plan = await importer.plan(context, {
				requirements: [],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: [], missing: [] });
			expect(variablesService.getAllCached).not.toHaveBeenCalled();
		});

		it('reports an unresolved requirement when no variable resolves in the project or globally', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
			});
		});

		it('dedupes and sorts usedByWorkflows on unresolved requirements', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-2', 'wf-1', 'wf-2'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1', 'wf-2'] }],
			});
		});

		it('matches a project-scoped variable in the target project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({
					id: 'var-project',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [] });
		});

		it('falls back to a global variable when none exists in the target project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([makeVariable({ id: 'var-global' })]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [] });
		});

		it('matches the project-scoped variable when it shadows a same-key global', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({ id: 'var-global', value: 'https://global.example.com' }),
				makeVariable({
					id: 'var-project',
					value: 'https://project.example.com',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [] });
		});

		it('does not match a project-scoped variable from a different project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({
					id: 'var-other',
					project: { id: 'proj-other' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
			});
		});

		it('classifies each requirement independently', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({ id: 'var-url', key: 'API_URL' }),
			]);

			const plan = await importer.plan(context, {
				requirements: [
					{ name: 'API_URL', usedByWorkflows: ['wf-1'] },
					{ name: 'API_KEY', usedByWorkflows: ['wf-1'] },
				],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: ['API_URL'],
				missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
			});
		});
	});

	describe('blockingFailures', () => {
		const plan: VariableImportPlan = {
			matched: ['API_URL'],
			missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
		};

		describe('do-nothing missing mode', () => {
			it('never blocks, even with unresolved requirements', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures({ requirements: undefined, missingMode: 'do-nothing' }, plan),
				).toEqual([]);
			});
		});

		describe('must-preexist missing mode', () => {
			it('blocks on every unresolved requirement', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures(
						{ requirements: undefined, missingMode: 'must-preexist' },
						plan,
					),
				).toEqual([{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }]);
			});

			it('does not block when every requirement resolves', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures(
						{ requirements: undefined, missingMode: 'must-preexist' },
						{ matched: ['API_URL'], missing: [] },
					),
				).toEqual([]);
			});
		});
	});
});
