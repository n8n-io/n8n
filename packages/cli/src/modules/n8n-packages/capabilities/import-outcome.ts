import type { ErrorWorkflowProblem } from '@/workflows/error-workflow-validation.service';

import type {
	WorkflowPublishingBlockedReason,
	WorkflowPublishingOutcome,
} from '../entities/workflow/workflow-publishing-policy.types';

/** The draft version of the copy and the version that is live, after the import. */
export type CopyVersions = { versionId: string; activeVersionId: string | null };

type PublishingInput = {
	publishing: WorkflowPublishingOutcome;
	copy: CopyVersions;
	/** The live version of the copy before a re-import. Undefined for a new copy. */
	previousActiveVersionId: string | null | undefined;
};

const NOT_PUBLISHABLE: Record<WorkflowPublishingBlockedReason, string> = {
	'stub-credential': 'it uses credentials that are not set up',
	'missing-node-type': 'this instance does not have all the node types that it uses',
};

/** Why the import left an earlier version of a published copy live. */
function notLiveReason(publishing: WorkflowPublishingOutcome): string {
	if (publishing.state === 'failed') {
		return `the import could not publish it: ${publishing.error ?? 'unknown error'}`;
	}
	const blocked = publishing.skippedPublishReason ?? publishing.blockedReason;
	if (blocked !== undefined) return NOT_PUBLISHABLE[blocked];
	return 'the source workflow does not publish this version. Publish the workflow to make it live';
}

/**
 * Says which version of the copy runs after the import, when that is not obvious. A re-import of
 * a published copy can put the new version live, or leave an earlier version live. The tool
 * reports both, because the client cannot see it from the draft.
 */
export function publishingWarning({
	publishing,
	copy,
	previousActiveVersionId,
}: PublishingInput): string | undefined {
	if (copy.activeVersionId === null) {
		if (publishing.state === 'failed') {
			return `The import could not publish the workflow: ${publishing.error ?? 'unknown error'}.`;
		}
		return publishing.state === 'unpublished' ? 'The import unpublished the workflow.' : undefined;
	}
	if (copy.activeVersionId !== copy.versionId) {
		return `The new version is not live, because ${notLiveReason(publishing)}. An earlier version stays live.`;
	}
	if (publishing.state !== 'published' || copy.activeVersionId === previousActiveVersionId) {
		return undefined;
	}
	return previousActiveVersionId
		? 'The workflow was published, so the import published the new version. The new version is live now.'
		: 'The import published the workflow.';
}

export type ErrorWorkflowLinkInput = {
	created: boolean;
	/** `settings.errorWorkflow` of the copy after the import. */
	imported: string | undefined;
	/** The workflow id that `imported` names. Undefined for no link, "DEFAULT" or an expression. */
	importedId: string | undefined;
	/** `settings.errorWorkflow` of the copy before a re-import. */
	previous: string | undefined;
	/** The ids on this instance of the workflows that the package wrote. */
	packageWorkflowIds: readonly string[];
};

export type ErrorWorkflowLinkPlan =
	| { action: 'keep' }
	| { action: 'restore'; errorWorkflow: string | undefined }
	| { action: 'check'; errorWorkflowId: string };

const KEEP: ErrorWorkflowLinkPlan = { action: 'keep' };

/**
 * What happens to the error workflow link of the copy. A link to a workflow of the package stays.
 * A re-import keeps the link that the copy had, because the user chose it on this instance. A new
 * copy keeps the link of the package only if the importing user can use that workflow, so the
 * link is checked as if the user set it.
 */
export function planErrorWorkflowLink(input: ErrorWorkflowLinkInput): ErrorWorkflowLinkPlan {
	const { importedId } = input;
	if (importedId !== undefined && input.packageWorkflowIds.includes(importedId)) return KEEP;
	if (!input.created) {
		return input.imported === input.previous
			? KEEP
			: { action: 'restore', errorWorkflow: input.previous };
	}
	return importedId === undefined ? KEEP : { action: 'check', errorWorkflowId: importedId };
}

// `not-found` covers a missing and an unreadable workflow alike, so that the text does not show
// which workflows exist on this instance.
const UNUSABLE_ERROR_WORKFLOW: Record<ErrorWorkflowProblem['reason'], string> = {
	'not-found': 'it is not on this instance or you cannot open it',
	'not-published': 'it is not published',
	'no-error-trigger': 'its published version has no active Error Trigger node',
	'caller-policy': 'it does not let this workflow call it',
};

/** Why the user cannot link the copy to an error workflow, as the end of a sentence. */
export function errorWorkflowProblemText(reason: ErrorWorkflowProblem['reason']): string {
	return UNUSABLE_ERROR_WORKFLOW[reason];
}

/** The warning for an error workflow link that the import removed, with the reason. */
export function removedErrorWorkflowWarning(label: string, because: string): string {
	return `The import removed the link to the error workflow ${label}, because ${because}. Choose an error workflow in the workflow settings.`;
}

/** The warning for a link that the import removed, because a step to check it failed. */
export function uncheckedErrorWorkflowRemovedWarning(reason: string): string {
	return `The import removed the error workflow link of the copy, because it could not check the link: ${reason}. Choose an error workflow in the workflow settings.`;
}

/** The warning for a link that the import could neither check nor remove. */
export function uncheckedErrorWorkflowWarning(reason: string): string {
	return `The import could not check the error workflow of the copy: ${reason}. Check it in the workflow settings.`;
}

function tableNames(tables: ReadonlyArray<{ name: string }>): string {
	return [...new Set(tables.map(({ name }) => name))].sort().join(', ');
}

/** The warning for the data tables that a re-import kept in the copy. */
export function keptDataTablesWarning(replacedTables: ReadonlyArray<{ name: string }>): string {
	return `The copy keeps the data tables that it used in place of ${replacedTables.length} data table(s) of the package that this project does not have: ${tableNames(replacedTables)}.`;
}

/** The warning for the data tables of the copy that a re-import could not keep. */
export function dataTablesNotKeptWarning(
	replacedTables: ReadonlyArray<{ name: string }>,
	reason: string,
): string {
	return `The import could not keep the data tables that the copy used in place of ${replacedTables.length} data table(s) of the package that this project does not have (${tableNames(replacedTables)}), because ${reason}. Check the data tables in the workflow before it runs.`;
}
