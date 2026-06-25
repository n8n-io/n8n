import type { SourceControlledFile } from '@n8n/api-types';
import type { TupleToUnion } from '@/app/utils/typeHelpers';

export type SshKeyTypes = ['ed25519', 'rsa'];

// The endpoint returns a subset of these fields depending on the caller's access:
// - Any authenticated user: SourceControlPublicPreferences
// - Project admin (sourceControl:push on a team project): SourceControlProjectPreferences
// - Global admin (sourceControl:manage): SourceControlPreferences (full)
export type SourceControlPublicPreferences = {
	branchReadOnly: boolean;
};

export type SourceControlProjectPreferences = SourceControlPublicPreferences & {
	connected: boolean;
	branchName: string;
	branchColor: string;
};

export type SourceControlPreferences = SourceControlProjectPreferences & {
	repositoryUrl: string;
	branches: string[];
	publicKey?: string;
	keyGeneratorType?: TupleToUnion<SshKeyTypes>;
	currentBranch?: string;
	connectionType?: 'ssh' | 'https';
};

export type SourceControlTreeRow<T extends SourceControlledFile = SourceControlledFile> =
	| { id: string; type: 'folder'; name: string; depth: number }
	| { id: string; type: 'file'; depth: number; file: T };

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
