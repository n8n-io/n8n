import type { ProjectSharingData } from './projects.types';

export type Folder = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	workflowCount: number;
	parentFolderId?: string;
	homeProject: ProjectSharingData;
};
