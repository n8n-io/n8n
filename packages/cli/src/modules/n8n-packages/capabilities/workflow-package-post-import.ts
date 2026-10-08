import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import {
	ErrorWorkflowValidationService,
	staticErrorWorkflowId,
} from '@/workflows/error-workflow-validation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	planErrorWorkflowLink,
	publishingWarning,
	removedErrorWorkflowWarning,
} from './import-outcome';
import type { ImportedWorkflowPackage, ImportSummary } from './import-summary';

/** The workflow that a re-import updates, as it was before the import. */
export type PreviousCopy = Pick<WorkflowEntity, 'activeVersionId' | 'settings'>;

/** Runs after a successful import. Gives warnings for the result. */
export type AfterImportStep = (user: User, workflowId: string) => Promise<string[]>;

export type PostImportInput = {
	user: User;
	summary: ImportSummary;
	/** Undefined when the import created the workflow. */
	previous: PreviousCopy | undefined;
	/** Names a workflow that the package refers to, for example "Alert the team" (wf-1). */
	workflowLabel: (workflowId: string) => string;
	afterImport?: AfterImportStep;
};

function errorWorkflowOf(workflow: PreviousCopy | undefined): string | undefined {
	return workflow?.settings?.errorWorkflow;
}

/**
 * Writes the error workflow link of the copy. The link is a setting without versions, so this
 * changes neither the draft nor the live version. A restore puts back a link that the copy had,
 * so the check for a new link does not apply to it.
 */
async function setErrorWorkflow(user: User, workflowId: string, errorWorkflow: string | undefined) {
	// "DEFAULT" removes the setting, and other settings stay as they are.
	const settings = { errorWorkflow: errorWorkflow ?? 'DEFAULT' };
	await Container.get(WorkflowService).update(
		user,
		createWorkflowEntityFromPayload({ settings }),
		workflowId,
		{ source: 'import', allowUnresolvedErrorWorkflow: true },
	);
}

/**
 * The package service writes `settings.errorWorkflow` of the package without a check, because
 * it rebinds references between the workflows of a package. A one-workflow package never holds
 * the error workflow, so this step applies the rules that a user meets when setting the link.
 */
async function settleErrorWorkflowLink(
	input: PostImportInput,
	copy: WorkflowEntity,
): Promise<string[]> {
	const imported = errorWorkflowOf(copy);
	const plan = planErrorWorkflowLink({
		created: input.summary.created,
		imported,
		importedId: staticErrorWorkflowId(imported),
		previous: errorWorkflowOf(input.previous),
		packageWorkflowIds: [copy.id],
	});
	if (plan.action === 'keep') return [];
	if (plan.action === 'restore') {
		await setErrorWorkflow(input.user, copy.id, plan.errorWorkflow);
		return [];
	}
	const problem = await Container.get(ErrorWorkflowValidationService).findProblem({
		errorWorkflowId: plan.errorWorkflowId,
		parentWorkflowId: copy.id,
		user: input.user,
	});
	if (problem === undefined) return [];
	await setErrorWorkflow(input.user, copy.id, undefined);
	return [removedErrorWorkflowWarning(input.workflowLabel(plan.errorWorkflowId), problem.reason)];
}

function logFailure(workflowId: string, message: string) {
	Container.get(Logger).warn('A step after a workflow package import failed', {
		workflowId,
		error: message,
	});
}

/**
 * Runs one step after the import. The workflow is already written, so a failure becomes a
 * warning: an error result would tell the client that the import failed.
 */
async function warnOnFailure(
	run: () => Promise<string[]>,
	warning: (message: string) => string,
	workflowId: string,
): Promise<string[]> {
	try {
		return await run();
	} catch (caught) {
		const { message } = ensureError(caught);
		logFailure(workflowId, message);
		return [warning(message)];
	}
}

/** The copy as stored after the import, or null when it cannot be read. */
async function readCopy({ user, summary }: PostImportInput): Promise<WorkflowEntity | null> {
	try {
		return await Container.get(WorkflowFinderService).findWorkflowForUser(
			summary.workflowId,
			user,
			['workflow:read'],
		);
	} catch (caught) {
		logFailure(summary.workflowId, ensureError(caught).message);
		return null;
	}
}

const uncheckedErrorWorkflow = (reason: string) =>
	`The import could not check the error workflow of the copy: ${reason}. Check it in the workflow settings.`;

async function errorWorkflowWarnings(input: PostImportInput, copy: WorkflowEntity | null) {
	if (copy === null) return [uncheckedErrorWorkflow('the workflow could not be read')];
	return await warnOnFailure(
		async () => await settleErrorWorkflowLink(input, copy),
		uncheckedErrorWorkflow,
		copy.id,
	);
}

async function surfaceWarnings({ afterImport, user, summary }: PostImportInput) {
	if (afterImport === undefined) return [];
	return await warnOnFailure(
		async () => await afterImport(user, summary.workflowId),
		(message) => `The workflow was imported, but a last step failed: ${message}`,
		summary.workflowId,
	);
}

/**
 * The steps after a successful import of a one-workflow package: the error workflow link, the
 * publishing outcome and the rules of the surface. None of them makes the import fail.
 */
export async function finishImport(input: PostImportInput): Promise<ImportedWorkflowPackage> {
	const { publishing, activeVersionId, ...result } = input.summary;
	const copy = await readCopy(input);
	const linkWarnings = await errorWorkflowWarnings(input, copy);
	const publishingNotice = copy
		? publishingWarning({
				publishing,
				copy,
				previousActiveVersionId: input.previous?.activeVersionId,
			})
		: undefined;
	const ruleWarnings = await surfaceWarnings(input);
	return {
		...result,
		// The copy as stored after the publish step. The summary is the fallback.
		published: (copy ? copy.activeVersionId : activeVersionId) !== null,
		warnings: [
			...result.warnings,
			...linkWarnings,
			...(publishingNotice === undefined ? [] : [publishingNotice]),
			...ruleWarnings,
		],
	};
}
