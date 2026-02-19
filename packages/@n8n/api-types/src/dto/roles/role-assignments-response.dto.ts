export interface RoleProjectAssignment {
	projectId: string;
	projectName: string;
	projectIcon: { type: string; value: string } | null;
	memberCount: number;
	lastAssigned: string | null;
}

export interface RoleAssignmentsResponse {
	projects: RoleProjectAssignment[];
	totalProjects: number;
}
