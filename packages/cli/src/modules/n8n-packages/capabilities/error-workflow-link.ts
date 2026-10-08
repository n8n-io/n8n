import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import {
	ErrorWorkflowValidationService,
	staticErrorWorkflowId,
} from '@/workflows/error-workflow-validation.service';
import { createWorkflowEntityFromPayload } from '@/workflows/workflow-entity-mapper';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	errorWorkflowProblemText,
	planErrorWorkflowLink,
	removedErrorWorkflowWarning,
	uncheckedErrorWorkflowRemovedWarning,
	uncheckedErrorWorkflowWarning,
} from './import-outcome';
import { reasonForClient } from './package-tool-error';
import { logPostImportFailure } from './post-import-step';

/**
 * A rule of the surface for the error workflow of a copy, for example MCP access. Gives why the
 * copy must not use the error workflow, as the end of a sentence, or undefined.
 */
export type ErrorWorkflowRule = (
	user: User,
	errorWorkflowId: string,
) => Promise<string | undefined>;

export type ErrorWorkflowLinkInput = {
	user: User;
	copyId: string;
	created: boolean;
	/** `settings.errorWorkflow` of the copy after the import: as stored, else as in the package. */
	imported: string | undefined;
	/** `settings.errorWorkflow` of the copy before a re-import. */
	previous: string | undefined;
	/** The ids of the workflow of the package: on this instance and on the source instance. */
	packageWorkflowIds: readonly string[];
	/** Names a workflow that the package refers to, for example "Alert the team" (wf-1). */
	workflowLabel: (workflowId: string) => string;
	rule?: ErrorWorkflowRule;
};

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

/** Why the copy must not use the error workflow: the rules of a user who sets the link, then the surface. */
async function linkProblem(
	input: ErrorWorkflowLinkInput,
	errorWorkflowId: string,
): Promise<string | undefined> {
	const problem = await Container.get(ErrorWorkflowValidationService).findProblem({
		errorWorkflowId,
		parentWorkflowId: input.copyId,
		user: input.user,
	});
	if (problem !== undefined) return errorWorkflowProblemText(problem.reason);
	return await input.rule?.(input.user, errorWorkflowId);
}

async function settleLink(input: ErrorWorkflowLinkInput): Promise<string[]> {
	const plan = planErrorWorkflowLink({
		created: input.created,
		imported: input.imported,
		importedId: staticErrorWorkflowId(input.imported),
		previous: input.previous,
		packageWorkflowIds: input.packageWorkflowIds,
	});
	if (plan.action === 'keep') return [];
	if (plan.action === 'restore') {
		await setErrorWorkflow(input.user, input.copyId, plan.errorWorkflow);
		return [];
	}
	const because = await linkProblem(input, plan.errorWorkflowId);
	if (because === undefined) return [];
	await setErrorWorkflow(input.user, input.copyId, undefined);
	return [removedErrorWorkflowWarning(input.workflowLabel(plan.errorWorkflowId), because)];
}

/** Removes a link that the import could not check. Says so, or that the link stays unchecked. */
async function removeUncheckedLink(input: ErrorWorkflowLinkInput, reason: string) {
	try {
		await setErrorWorkflow(input.user, input.copyId, undefined);
		return uncheckedErrorWorkflowRemovedWarning(reason);
	} catch (error) {
		logPostImportFailure(input.copyId, error);
		return uncheckedErrorWorkflowWarning(reason);
	}
}

/**
 * The package service writes `settings.errorWorkflow` of the package without a check, because it
 * rebinds references between the workflows of a package. A one-workflow package never holds the
 * error workflow, so this step applies the rules that a user meets when setting the link. It
 * fails closed: when a step fails, it removes the link that it could not check.
 */
export async function settleErrorWorkflowLink(input: ErrorWorkflowLinkInput): Promise<string[]> {
	try {
		return await settleLink(input);
	} catch (error) {
		logPostImportFailure(input.copyId, error);
		return [await removeUncheckedLink(input, reasonForClient(error))];
	}
}
