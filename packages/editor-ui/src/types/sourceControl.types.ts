import type { TupleToUnion } from '@/utils/typeHelpers';

export const SOURCE_CONTROL_FILE_STATUS = {
	NEW: 'new',
	MODIFIED: 'modified',
	DELETED: 'deleted',
	CREATED: 'created',
	RENAMED: 'renamed',
	CONFLICTED: 'conflicted',
	IGNORED: 'ignored',
	STAGED: 'staged',
	UNKNOWN: 'unknown',
} as const;

export const SOURCE_CONTROL_FILE_LOCATION = {
	LOCAL: 'local',
	REMOTE: 'remote',
} as const;

export const SOURCE_CONTROL_FILE_TYPE = {
	CREDENTIAL: 'credential',
	WORKFLOW: 'workflow',
	TAGS: 'tags',
	VARIABLES: 'variables',
	FILE: 'file',
} as const;

export type SourceControlledFileStatus =
	(typeof SOURCE_CONTROL_FILE_STATUS)[keyof typeof SOURCE_CONTROL_FILE_STATUS];
export type SourceControlledFileLocation =
	(typeof SOURCE_CONTROL_FILE_LOCATION)[keyof typeof SOURCE_CONTROL_FILE_LOCATION];
export type SourceControlledFileType =
	(typeof SOURCE_CONTROL_FILE_TYPE)[keyof typeof SOURCE_CONTROL_FILE_TYPE];

export type SshKeyTypes = ['ed25519', 'rsa'];

export type SourceControlPreferences = {
	connected: boolean;
	repositoryUrl: string;
	branchName: string;
	branches: string[];
	branchReadOnly: boolean;
	branchColor: string;
	publicKey?: string;
	keyGeneratorType?: TupleToUnion<SshKeyTypes>;
	currentBranch?: string;
};

export interface SourceControlStatus {
	ahead: number;
	behind: number;
	conflicted: string[];
	created: string[];
	current: string;
	deleted: string[];
	detached: boolean;
	files: Array<{
		path: string;
		index: string;
		working_dir: string;
	}>;
	modified: string[];
	not_added: string[];
	renamed: string[];
	staged: string[];
	tracking: null;
}

export interface SourceControlAggregatedFile {
	conflict: boolean;
	file: string;
	id: string;
	location: SourceControlledFileLocation;
	name: string;
	status: SourceControlledFileStatus;
	type: SourceControlledFileType;
	updatedAt?: string;
}
