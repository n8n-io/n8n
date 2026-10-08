import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { DataTableChoices } from './copy-choices';
import { type ErrorWorkflowRule, settleErrorWorkflowLink } from './error-workflow-link';
import { dataTablesNotKeptWarning, publishingWarning } from './import-outcome';
import type { ImportedWorkflowPackage, ImportSummary } from './import-summary';
import { logPostImportFailure, warnOnFailure } from './post-import-step';
import { keepDataTableSelections, type KeptDataTables } from './workflow-package-reimport';

/** The workflow that a re-import updates, as it was before the import. */
export type PreviousCopy = Pick<WorkflowEntity, 'activeVersionId' | 'settings' | 'nodes'>;

/** Runs after a successful import. Gives warnings for the result. */
export type AfterImportStep = (user: User, workflowId: string) => Promise<string[]>;

export type PostImportInput = {
	user: User;
	summary: ImportSummary;
	/** Undefined when the import created the workflow. */
	previous: PreviousCopy | undefined;
	/** The workflow of the package: its source id and its error workflow link. */
	packageWorkflow: { id: string; errorWorkflow: string | undefined };
	/** Names a workflow that the package refers to, for example "Alert the team" (wf-1). */
	workflowLabel: (workflowId: string) => string;
	/** The data table selections of the copy that a re-import keeps. */
	dataTables?: DataTableChoices;
	afterImport?: AfterImportStep;
	/** A rule of the surface for the error workflow of a new copy. */
	errorWorkflowRule?: ErrorWorkflowRule;
};

/** The copy as stored after the import, or null when it cannot be read. */
async function readCopy({ user, summary }: PostImportInput): Promise<WorkflowEntity | null> {
	try {
		return await Container.get(WorkflowFinderService).findWorkflowForUser(
			summary.workflowId,
			user,
			['workflow:read'],
		);
	} catch (error) {
		logPostImportFailure(summary.workflowId, error);
		return null;
	}
}

async function keptDataTables(
	input: PostImportInput,
	copy: WorkflowEntity | null,
): Promise<KeptDataTables> {
	const replacedTables = input.dataTables?.replacedTables ?? [];
	if (input.dataTables === undefined || replacedTables.length === 0) {
		return { copy: undefined, warnings: [] };
	}
	if (copy === null) {
		const reason = 'the workflow could not be read';
		return { copy: undefined, warnings: [dataTablesNotKeptWarning(replacedTables, reason)] };
	}
	return await keepDataTableSelections(input.user, copy, input.dataTables);
}

/** The link as stored after the import. When the copy cannot be read, the link of the package. */
async function errorWorkflowWarnings(input: PostImportInput, copy: WorkflowEntity | null) {
	const { summary, packageWorkflow } = input;
	return await settleErrorWorkflowLink({
		user: input.user,
		copyId: summary.workflowId,
		created: summary.created,
		imported: copy === null ? packageWorkflow.errorWorkflow : copy.settings?.errorWorkflow,
		previous: input.previous?.settings?.errorWorkflow,
		packageWorkflowIds: [summary.workflowId, packageWorkflow.id],
		workflowLabel: input.workflowLabel,
		rule: input.errorWorkflowRule,
	});
}

async function surfaceWarnings({ afterImport, user, summary }: PostImportInput) {
	if (afterImport === undefined) return [];
	return await warnOnFailure(
		async () => await afterImport(user, summary.workflowId),
		(reason) => `The workflow was imported, but a last step failed: ${reason}`,
		summary.workflowId,
	);
}

/**
 * The steps after a successful import of a one-workflow package: the data tables that the copy
 * keeps, the error workflow link, the publishing outcome and the rules of the surface. None of
 * them makes the import fail.
 */
export async function finishImport(input: PostImportInput): Promise<ImportedWorkflowPackage> {
	const { publishing, activeVersionId, ...result } = input.summary;
	const copy = await readCopy(input);
	const tables = await keptDataTables(input, copy);
	const linkWarnings = await errorWorkflowWarnings(input, copy);
	// The versions that the import left. A version that keeps the data tables is newer.
	const publishingNotice = copy
		? publishingWarning({
				publishing,
				copy,
				previousActiveVersionId: input.previous?.activeVersionId,
			})
		: undefined;
	const ruleWarnings = await surfaceWarnings(input);
	const stored = tables.copy ?? copy;
	return {
		...result,
		// The copy as stored after the last write. The summary is the fallback.
		published: (stored ? stored.activeVersionId : activeVersionId) !== null,
		warnings: [
			...result.warnings,
			...tables.warnings,
			...linkWarnings,
			...(publishingNotice === undefined ? [] : [publishingNotice]),
			...ruleWarnings,
		],
	};
}
