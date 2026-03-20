export type PublishTimelineEvent = {
	id: number;
	workflowId: string;
	versionId: string;
	event: 'activated' | 'deactivated';
	createdAt: string;
	userId: string | null;
	user: { firstName: string; lastName: string } | null;
};
