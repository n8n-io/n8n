import type { ManifestCredentialEntry } from '../credential/credential.types';
import type { ManifestDataTableEntry } from '../data-table/data-table.types';
import type { ManifestFolderEntry } from '../folder/folder.types';
import type { ManifestVariableEntry } from '../variable/variable.types';
import type { ManifestWorkflowEntry } from '../workflow/workflow.types';

export interface ManifestProjectEntry {
	id: string;
	name: string;
	target: string;
	folders: ManifestFolderEntry[];
	workflows: ManifestWorkflowEntry[];
	credentials: ManifestCredentialEntry[];
	variables: ManifestVariableEntry[];
	dataTables: ManifestDataTableEntry[];
}

export interface SerializedProject {
	id: string;
	name: string;
	description?: string;
	icon?: { type: 'emoji' | 'icon'; value: string };
}
