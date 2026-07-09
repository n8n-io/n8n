import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { ITag } from '@n8n/rest-api-client';
import type { ProjectSharingData } from 'n8n-workflow';
import type { BaseResource } from '@/Interface';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { ResourceType } from '@/features/collaboration/projects/projects.utils';

export type DragTarget = {
	type: 'folder' | 'workflow';
	id: string;
	name: string;
};

export type DropTarget = {
	type: 'folder' | 'project';
	id: string;
	name: string;
};

export type FolderShortInfo = {
	id: string;
	name: string;
	parentFolder?: string;
};

export type BaseFolderItem = BaseResource & {
	createdAt: string;
	updatedAt: string;
	workflowCount: number;
	subFolderCount: number;
	parentFolder?: ResourceParentFolder;
	homeProject?: ProjectSharingData;
	tags?: ITag[];
};

export type ResourceParentFolder = {
	id: string;
	name: string;
	parentFolderId: string | null;
};

export interface FolderListItem extends BaseFolderItem {
	resource: 'folder';
}

export interface ChangeLocationSearchResponseItem extends BaseFolderItem {
	path: string[];
}

export type FolderPathItem = PathItem & { parentFolder?: string };

export interface ChangeLocationSearchResult extends ChangeLocationSearchResponseItem {
	resource: 'folder' | 'project';
}

export type FolderCreateResponse = Omit<
	FolderListItem,
	'workflowCount' | 'tags' | 'sharedWithProjects' | 'homeProject'
>;

export type FolderTreeResponseItem = {
	id: string;
	name: string;
	children: FolderTreeResponseItem[];
};

export type TransferToastData = {
	targetProject: ProjectListItem;
	targetProjectName: string;
	shareUsedCredentials: boolean;
	areAllUsedCredentialsShareable: boolean;
};

export type WorkflowListEventMap = {
	'resource-moved': {
		resourceId: string;
		resourceType: ResourceType;
		targetProjectId: string;
	};
	'workflow-duplicated': undefined;
	'folder-deleted': {
		folderId: string;
		workflowCount: number;
		folderCount: number;
	};
	'folder-moved': {
		folder: { id: string; name: string };
		newParent: { id: string; name: string; type: 'folder' | 'project' };
		options?: { skipFetch?: boolean; skipNavigation?: boolean; skipApiCall?: boolean };
	};
	'folder-transferred': {
		source: {
			projectId?: string;
			folder: { id: string; name: string };
		};
		destination: {
			projectId: string;
			parentFolder: { id: string | undefined; name: string };
			canAccess: boolean;
		};
	};
	'workflow-moved': {
		workflow: { id: string; name: string; oldParentId?: string };
		newParent: { id: string; name: string; type: 'folder' | 'project' };
		options?: { skipFetch?: boolean; skipApiCall?: boolean };
	};
	'workflow-transferred': {
		source: {
			projectId?: string;
			workflow: { id: string; name: string };
		};
		destination: {
			projectId: string;
			parentFolder: { id: string | undefined; name: string };
			canAccess: boolean;
		};
		toast: TransferToastData;
	};
};
