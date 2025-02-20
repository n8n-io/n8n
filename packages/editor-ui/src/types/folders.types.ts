import type { ITag } from '@/Interface';
import type { ProjectSharingData } from './projects.types';

export type FolderShortInfo = {
	id: string;
	name: string;
};

export type Folder = {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	workflowCount: number;
	homeProject: ProjectSharingData;
	parentFolder?: FolderShortInfo;
	tags?: ITag[];
};
