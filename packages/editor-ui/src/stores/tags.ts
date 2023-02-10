import { createTag, deleteTag, getTags, updateTag } from '@/api/tags';
import { STORES } from '@/constants';
import { ITag, ITagsState } from '@/Interface';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useRootStore } from './n8nRootStore';
import { useWorkflowsStore } from './workflows';

export const useTagsStore = defineStore(STORES.TAGS, {
	state: (): ITagsState => ({
		tags: {},
		loading: false,
		fetchedAll: false,
		fetchedUsageCount: false,
	}),
	getters: {
		allTags(): ITag[] {
			return Object.values(this.tags).sort((a, b) => a.name.localeCompare(b.name));
		},
		isLoading(): boolean {
			return this.loading;
		},
		hasTags(): boolean {
			return Object.keys(this.tags).length > 0;
		},
		getTagById() {
			return (id: string) => this.tags[id];
		},
	},
	actions: {
		setAllTags(tags: ITag[]): void {
			this.tags = tags.reduce((accu: { [id: string]: ITag }, tag: ITag) => {
				accu[tag.id] = tag;

				return accu;
			}, {});
			this.fetchedAll = true;
		},
		upsertTags(tags: ITag[]): void {
			tags.forEach((tag) => {
				const tagId = tag.id;
				const currentTag = this.tags[tagId];
				if (currentTag) {
					const newTag = {
						...currentTag,
						...tag,
					};
					Vue.set(this.tags, tagId, newTag);
				} else {
					Vue.set(this.tags, tagId, tag);
				}
			});
		},
		deleteTag(id: string): void {
			Vue.delete(this.tags, id);
		},

		async fetchAll(params?: { force?: boolean; withUsageCount?: boolean }): Promise<ITag[]> {
			const { force = false, withUsageCount = false } = params || {};
			if (!force && this.fetchedAll && this.fetchedUsageCount === withUsageCount) {
				return Object.values(this.tags);
			}

			this.loading = true;
			const rootStore = useRootStore();
			const tags = await getTags(rootStore.getRestApiContext, Boolean(withUsageCount));
			this.setAllTags(tags);
			this.loading = false;

			return tags;
		},
		async create(name: string): Promise<ITag> {
			const rootStore = useRootStore();
			const tag = await createTag(rootStore.getRestApiContext, { name });
			this.upsertTags([tag]);

			return tag;
		},
		async rename({ id, name }: { id: string; name: string }) {
			const rootStore = useRootStore();
			const tag = await updateTag(rootStore.getRestApiContext, id, { name });
			this.upsertTags([tag]);

			return tag;
		},
		async delete(id: string) {
			const rootStore = useRootStore();
			const deleted = await deleteTag(rootStore.getRestApiContext, id);

			if (deleted) {
				this.deleteTag(id);
				const workflowsStore = useWorkflowsStore();
				workflowsStore.removeWorkflowTagId(id);
			}

			return deleted;
		},
	},
});
