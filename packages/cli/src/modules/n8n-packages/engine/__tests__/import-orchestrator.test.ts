import { mock } from 'vitest-mock-extended';

import type { VariableImporter } from '../../entities/variable/variable-importer';
import type { VariableCreation } from '../../entities/variable/variable.types';
import type { BlockingIssue } from '../../n8n-packages.types';
import { ImportOrchestrator, type ImportPlan } from '../import-orchestrator';

const variableUnresolved = (name: string): BlockingIssue => ({
	type: 'variable-unresolved',
	name,
	usedByWorkflows: ['wf-1'],
});

/**
 * One project's worth of planned work — a project package plans one of these per project it
 * contains, a workflow package exactly one. Carries only the two fields the gate reads.
 */
const planWith = (options: {
	blockingIssues?: BlockingIssue[];
	creations?: VariableCreation[];
}): ImportPlan =>
	({
		blockingIssues: options.blockingIssues ?? [],
		variablePlan: { matched: [], missing: [], creations: options.creations ?? [] },
	}) as unknown as ImportPlan;

const issuesOf = (error: unknown) => (error as { meta: { issues: BlockingIssue[] } }).meta.issues;

describe('ImportOrchestrator', () => {
	describe('assertNotBlocked', () => {
		let variableImporter: ReturnType<typeof mock<VariableImporter>>;
		let orchestrator: ImportOrchestrator;

		beforeEach(() => {
			variableImporter = mock<VariableImporter>();
			variableImporter.quotaFailure.mockResolvedValue(undefined);
			orchestrator = new ImportOrchestrator(
				mock(),
				mock(),
				variableImporter,
				mock(),
				mock(),
				mock(),
				mock(),
			);
		});

		it('lets an import through when nothing is blocked and the quota fits', async () => {
			await expect(
				orchestrator.assertNotBlocked([planWith({}), planWith({})]),
			).resolves.toBeUndefined();
		});

		it('gathers the issues of every planned project into one error', async () => {
			const error = await orchestrator
				.assertNotBlocked([
					planWith({ blockingIssues: [variableUnresolved('API_KEY')] }),
					planWith({ blockingIssues: [variableUnresolved('API_URL')] }),
				])
				.catch((caught: unknown) => caught);

			expect(issuesOf(error)).toEqual([
				variableUnresolved('API_KEY'),
				variableUnresolved('API_URL'),
			]);
		});

		it('weighs the quota against the variables all planned projects create together', async () => {
			await orchestrator.assertNotBlocked([
				planWith({ creations: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }] }),
				planWith({ creations: [{ name: 'API_URL', usedByWorkflows: ['wf-2'] }] }),
			]);

			expect(variableImporter.quotaFailure).toHaveBeenCalledWith([
				{ name: 'API_KEY', usedByWorkflows: ['wf-1'] },
				{ name: 'API_URL', usedByWorkflows: ['wf-2'] },
			]);
		});

		it('blocks on the quota alone, when no project had an issue of its own', async () => {
			variableImporter.quotaFailure.mockResolvedValue({
				limit: 1,
				remaining: 0,
				requested: 1,
				names: ['API_KEY'],
				usedByWorkflows: ['wf-1'],
			});

			const error = await orchestrator
				.assertNotBlocked([
					planWith({ creations: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }] }),
				])
				.catch((caught: unknown) => caught);

			expect(issuesOf(error)).toEqual([
				{
					type: 'variable-limit-exceeded',
					limit: 1,
					remaining: 0,
					requested: 1,
					names: ['API_KEY'],
					usedByWorkflows: ['wf-1'],
				},
			]);
		});

		it('reports a quota overrun alongside the issues already found', async () => {
			variableImporter.quotaFailure.mockResolvedValue({
				limit: 1,
				remaining: 0,
				requested: 1,
				names: ['API_KEY'],
				usedByWorkflows: ['wf-1'],
			});

			const error = await orchestrator
				.assertNotBlocked([planWith({ blockingIssues: [variableUnresolved('API_URL')] })])
				.catch((caught: unknown) => caught);

			expect(issuesOf(error)).toHaveLength(2);
			expect(issuesOf(error)[1]).toMatchObject({ type: 'variable-limit-exceeded' });
		});
	});
});
