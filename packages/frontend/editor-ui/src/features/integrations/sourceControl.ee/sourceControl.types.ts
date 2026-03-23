import type { SourceControlledFile } from '@n8n/api-types';
import type { TupleToUnion } from '@/app/utils/typeHelpers';

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
