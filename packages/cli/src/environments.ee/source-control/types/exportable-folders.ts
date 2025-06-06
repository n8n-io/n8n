export type ExportableFolder = {
	id: string;
	name: string;
	parentFolderId: string | null;
	homeProjectId: string;
	createdAt: string;
	updatedAt: string;
};

export type ExportedFolders = {
	folders: ExportableFolder[];
};
