import { mock } from 'vitest-mock-extended';

import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';

import type { CredentialImporter } from '../../entities/credential/credential-importer';
import type { DataTableImporter } from '../../entities/data-table/data-table-importer';
import type { FolderImporter } from '../../entities/folder/folder-importer';
import type { VariableImporter } from '../../entities/variable/variable-importer';
import type { VariableCreation } from '../../entities/variable/variable.types';
import type { WorkflowImporter } from '../../entities/workflow/workflow-importer';
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

	describe('apply', () => {
		it('writes nothing else when stub creation fails, because variables are applied first', async () => {
			const credentialImporter = mock<CredentialImporter>();
			const dataTableImporter = mock<DataTableImporter>();
			const variableImporter = mock<VariableImporter>();
			const folderImporter = mock<FolderImporter>();
			const workflowImporter = mock<WorkflowImporter>();
			const orchestrator = new ImportOrchestrator(
				credentialImporter,
				dataTableImporter,
				variableImporter,
				folderImporter,
				workflowImporter,
				mock(),
				mock(),
			);
			// The quota preflight passed, but a concurrent writer consumed the last slot since.
			variableImporter.apply.mockRejectedValue(
				new VariableCountLimitReachedError('Variables limit reached'),
			);
			const plan = {
				input: {
					context: { user: mock(), projectId: 'proj-1', folderId: null },
					credentialRequest: { requirements: [] },
					options: {},
				},
				variablePlan: {
					matched: [],
					missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
					creations: [{ name: 'API_KEY', projectId: 'proj-1', usedByWorkflows: ['wf-1'] }],
				},
			} as unknown as ImportPlan;

			await expect(orchestrator.apply(plan)).rejects.toThrow('Variables limit reached');

			expect(folderImporter.apply).not.toHaveBeenCalled();
			expect(credentialImporter.apply).not.toHaveBeenCalled();
			expect(dataTableImporter.apply).not.toHaveBeenCalled();
			expect(workflowImporter.apply).not.toHaveBeenCalled();
		});
	});
});
