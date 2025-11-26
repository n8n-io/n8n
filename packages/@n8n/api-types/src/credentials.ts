import type { ProjectIcon, ProjectType } from './schemas/project.schema';

export type CredentialUsageProject = {
	id: string;
	name: string;
	type: ProjectType;
	icon: ProjectIcon | null;
};

export type CredentialUsageWorkflow = {
	id: string;
	name: string;
	active: boolean;
	isArchived: boolean;
	updatedAt: Date | string;
	currentUserHasAccess: boolean;
	homeProject: CredentialUsageProject | null;
	sharedWithProjects: CredentialUsageProject[];
};

export type CredentialUsage = {
	credentialId: string;
	usageCount: number;
	workflows: CredentialUsageWorkflow[];
};
