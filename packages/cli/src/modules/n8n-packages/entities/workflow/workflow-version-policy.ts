import { WorkflowEntity } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

import { ExportVersionPolicy } from '../../n8n-packages.types';
import { PackageExportBlockedError } from '../package-export.errors';

export function needsActiveVersion(policy: ExportVersionPolicy): boolean {
	return policy !== ExportVersionPolicy.Latest;
}

/** Only nodes and connections are overlaid, so name, description, settings and tags stay at their draft values. */
function atPublishedVersion(workflow: WorkflowEntity): WorkflowEntity {
	const { activeVersion } = workflow;

	if (!activeVersion) {
		throw new UnexpectedError('Published version was not loaded for workflow', {
			extra: { workflowId: workflow.id, activeVersionId: workflow.activeVersionId },
		});
	}

	// A spread would drop the entity's inherited TypeORM lifecycle hooks.
	return Object.assign(new WorkflowEntity(), workflow, {
		versionId: activeVersion.versionId,
		nodes: activeVersion.nodes,
		connections: activeVersion.connections,
	});
}

const isPublished = (workflow: WorkflowEntity) => workflow.activeVersionId !== null;

function assertEveryWorkflowPublished(workflows: WorkflowEntity[]): void {
	const unpublished = workflows.filter((workflow) => !isPublished(workflow));
	if (unpublished.length === 0) return;

	const displayed = unpublished.slice(0, 20);
	const omittedCount = unpublished.length - displayed.length;

	throw new PackageExportBlockedError(
		`${unpublished.length} workflow(s) have no published version. Export aborted.`,
		{
			description: `Unpublished workflow IDs: ${displayed.map(({ id }) => id).join(', ')}${
				omittedCount > 0 ? `, and ${omittedCount} more` : ''
			}`,
		},
	);
}

const WORKFLOW_VERSION_POLICIES: Record<
	ExportVersionPolicy,
	(workflows: WorkflowEntity[]) => WorkflowEntity[]
> = {
	[ExportVersionPolicy.Latest]: (workflows) => workflows,
	[ExportVersionPolicy.PublishedStrict]: (workflows) => {
		assertEveryWorkflowPublished(workflows);
		return workflows.map(atPublishedVersion);
	},
	[ExportVersionPolicy.PreferPublished]: (workflows) =>
		workflows.map((workflow) => (isPublished(workflow) ? atPublishedVersion(workflow) : workflow)),
	[ExportVersionPolicy.IgnoreUnpublished]: (workflows) =>
		workflows.filter(isPublished).map(atPublishedVersion),
};

/**
 * Archived workflows have no published version, so the policy only applies to the active ones.
 * Archived workflows always export at their latest version.
 */
export function applyWorkflowVersionPolicy(
	workflows: WorkflowEntity[],
	policy: ExportVersionPolicy,
): WorkflowEntity[] {
	const archived = workflows.filter((workflow) => workflow.isArchived);
	const active = workflows.filter((workflow) => !workflow.isArchived);
	return [...WORKFLOW_VERSION_POLICIES[policy](active), ...archived];
}
