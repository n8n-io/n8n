import type { User } from '@n8n/db';

import type { PackageReader } from './package-reader';
import type { PackageWriter } from './package-writer';
import type { ManifestProjectEntry } from './project/project.types';

export type { ManifestProjectEntry } from './project/project.types';
export type { SerializedProject } from './project/project.types';
export type { ManifestCredentialEntry, SerializedCredential } from './credential/credential.types';
export type { ManifestFolderEntry, SerializedFolder } from './folder/folder.types';
export type { ManifestVariableEntry, SerializedVariable } from './variable/variable.types';
export type { ManifestWorkflowEntry, SerializedWorkflow } from './workflow/workflow.types';
export type {
	ManifestDataTableEntry,
	SerializedDataTable,
	SerializedDataTableColumn,
} from './data-table/data-table.types';

export interface PackageManifest {
	formatVersion: string;
	exportedAt: string;
	n8nVersion: string;
	source: string;
	projects: ManifestProjectEntry[];
}

export interface ExportContext {
	user: User;
	projectIds: string[];
}

export interface ProjectExportContext {
	projectId: string;
	projectTarget: string;
	/** Populated by FolderExporter. Maps folder ID → package target path. */
	folderPathMap: Map<string, string>;
	writer: PackageWriter;
}

export interface ProjectImportContext {
	user: User;
	projectId: string;
	projectEntry: ManifestProjectEntry;
	/** Populated by FolderImporter. Maps source folder ID → newly created folder ID. */
	folderIdMap: Map<string, string>;
	reader: PackageReader;
}

export interface ImportResult {
	projects: Array<{ sourceId: string; id: string; name: string }>;
}
