export type SourceControlledFileStatus =
	| 'new'
	| 'modified'
	| 'deleted'
	| 'created'
	| 'renamed'
	| 'conflicted'
	| 'unknown';
export type SourceControlledFileLocation = 'local' | 'remote';
export type SourceControlledFileType = 'credential' | 'workflow' | 'tags' | 'variables' | 'file';
export type SourceControlledFile = {
	file: string;
	id: string;
	name: string;
	type: SourceControlledFileType;
	status: SourceControlledFileStatus;
	location: SourceControlledFileLocation;
	conflict: boolean;
	updatedAt: string;
};
