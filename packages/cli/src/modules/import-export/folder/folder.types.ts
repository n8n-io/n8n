export interface SerializedFolder {
	id: string;
	name: string;
	parentFolderId: string | null;
}

export interface ManifestFolderEntry {
	id: string;
	name: string;
	target: string;
}
