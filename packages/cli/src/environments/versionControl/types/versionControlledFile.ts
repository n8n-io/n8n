export type VersionControlledFileStatus =
	| 'new'
	| 'modified'
	| 'deleted'
	| 'created'
	| 'renamed'
	| 'conflicted'
	| 'unknown';
export type VersionControlledFileLocation = 'local' | 'remote';
export type VersionControlledFileType = 'credential' | 'workflow' | 'tags' | 'variables' | 'file';
export type VersionControlledFile = {
	file: string;
	id: string;
	name: string;
	type: VersionControlledFileType;
	status: VersionControlledFileStatus;
	location: VersionControlledFileLocation;
	conflict: boolean;
};
