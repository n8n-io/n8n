export interface RoleProjectMember {
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	role: string;
}

export interface RoleProjectMembersResponse {
	members: RoleProjectMember[];
}
