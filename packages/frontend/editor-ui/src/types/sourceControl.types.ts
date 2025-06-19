import type { TupleToUnion } from '@/utils/typeHelpers';

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
