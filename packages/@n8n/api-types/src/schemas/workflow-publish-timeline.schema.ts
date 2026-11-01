import type { VersionedWorkflowSettings } from 'n8n-workflow';

export type PublishTimelineEvent = {
	id: number;
	workflowId: string;
	versionId: string | null;
	event: 'activated' | 'deactivated';
	createdAt: string;
	userId: string | null;
	user: { firstName: string; lastName: string } | null;
	versionName: string | null;
	/** The version-scoped settings of the version, such as its engine. */
	settings: VersionedWorkflowSettings | null;
};
