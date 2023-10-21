import { createFolder, deleteFolder, getFolders, updateFolder } from '@/api/folders';
import { STORES } from '@/constants';
import type { IFolder, IFoldersState } from '@/Interface';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRoot.store';
import { useWorkflowsStore } from './workflows.store';

export const useFoldersStore = defineStore(STORES.FOLDERS, {
	state: (): IFoldersState => ({
		folders: {},
		loading: false,
		fetchedAll: false,
		fetchedUsageCount: false,
	}),
	getters: {
		allFolders(): IFolder[] {
			return Object.values(this.folders).sort((a, b) => a.name.localeCompare(b.name));
		},
		isLoading(): boolean {
			return this.loading;
		},
		hasfolders(): boolean {
			return Object.keys(this.folders).length > 0;
		},
		getfolderById() {
			return (id: string) => this.folders[id];
		},
	},
	actions: {
		setAllFolders(folders: IFolder[]): void {
			this.folders = folders.reduce((accu: { [id: string]: IFolder }, folder: IFolder) => {
				accu[folder.id] = folder;

				return accu;
			}, {});
			this.fetchedAll = true;
		},
		upsertfolders(folders: IFolder[]): void {
			folders.forEach((folder) => {
				const folderId = folder.id;
				const currentfolder = this.folders[folderId];
				if (currentfolder) {
					const newfolder = {
						...currentfolder,
						...folder,
					};
					this.folders = {
						...this.folders,
						[folderId]: newfolder,
					};
				} else {
					this.folders = {
						...this.folders,
						[folderId]: folder,
					};
				}
			});
		},
		deleteFolder(id: string): void {
			const { [id]: deleted, ...rest } = this.folders;
			this.folders = rest;
		},

		async fetchAll(params?: { force?: boolean }): Promise<IFolder[]> {
			const { force = false } = params || {};
			if (!force && this.fetchedAll) {
				return Object.values(this.folders);
			}

			this.loading = true;
			const rootStore = useRootStore();
			const folders = await getFolders(rootStore.getRestApiContext);
			this.setAllFolders(folders);
			this.loading = false;

			return folders;
		},
		async create(name: string): Promise<IFolder> {
			const rootStore = useRootStore();
			const folder = await createFolder(rootStore.getRestApiContext, { name });
			this.upsertfolders([folder]);

			return folder;
		},
		async rename({ id, name }: { id: string; name: string }) {
			const rootStore = useRootStore();
			const folder = await updateFolder(rootStore.getRestApiContext, id, { name });
			this.upsertfolders([folder]);

			return folder;
		},
		async delete(id: string) {
			const rootStore = useRootStore();
			const deleted = await deleteFolder(rootStore.getRestApiContext, id);

			if (deleted) {
				this.deleteFolder(id);
				const workflowsStore = useWorkflowsStore();
				workflowsStore.removeWorkflowFolderId(id);
			}

			return deleted;
		},
	},
});
