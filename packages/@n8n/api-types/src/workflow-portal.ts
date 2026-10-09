export interface WorkflowPortalResponse {
	count: number;
	data: Array<{
		id: string;
		name: string;
		published: boolean;
		updatedAt: string | null;
	}>;
}
