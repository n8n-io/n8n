export type PublishTimelineEvent = {
	id: number;
	workflowId: string;
	versionId: string | null;
	event: 'activated' | 'deactivated';
	createdAt: string;
	userId: string | null;
	user: { firstName: string; lastName: string } | null;
	versionName: string | null;
};
