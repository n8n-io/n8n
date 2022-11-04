import { ActionContext, Module } from 'vuex';
import {
	ITag,
	ITagsState,
	IRootState,
} from '../Interface';
import { createTag, deleteTag, getTags, updateTag } from '../api/tags';
import Vue from 'vue';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';

const module: Module<ITagsState, IRootState> = {
	namespaced: true,
	state: {
		tags: {},
		isLoading: false,
		fetchedAll: false,
		fetchedUsageCount: false,
	},
	mutations: {
		setLoading: (state: ITagsState, isLoading: boolean) => {
			state.isLoading = isLoading;
		},
		setAllTags: (state: ITagsState, tags: ITag[]) => {
			state.tags = tags
				.reduce((accu: { [id: string]: ITag }, tag: ITag) => {
					accu[tag.id] = tag;

					return accu;
				}, {});
			state.fetchedAll = true;
		},
		upsertTags(state: ITagsState, tags: ITag[]) {
			tags.forEach((tag) => {
				const tagId = tag.id;
				const currentTag = state.tags[tagId];
				if (currentTag) {
					const newTag = {
						...currentTag,
						...tag,
					};
					Vue.set(state.tags, tagId, newTag);
				}
				else {
					Vue.set(state.tags, tagId, tag);
				}
			});
		},
		deleteTag(state: ITagsState, id: string) {
			Vue.delete(state.tags, id);
		},
	},
	getters: {
		allTags(state: ITagsState): ITag[] {
			return Object.values(state.tags)
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		isLoading: (state: ITagsState): boolean => {
			return state.isLoading;
		},
		hasTags: (state: ITagsState): boolean => {
			return Object.keys(state.tags).length > 0;
		},
		getTagById: (state: ITagsState) => {
			return (id: string) => state.tags[id];
		},
	},
	actions: {
		fetchAll: async (context: ActionContext<ITagsState, IRootState>, params?: { force?: boolean, withUsageCount?: boolean }): Promise<ITag[]> => {
			const { force = false, withUsageCount = false } = params || {};
			if (!force && context.state.fetchedAll && context.state.fetchedUsageCount === withUsageCount) {
				return Object.values(context.state.tags);
			}

			context.commit('setLoading', true);
			const rootStore = useRootStore();
			const tags = await getTags(rootStore.getRestApiContext, Boolean(withUsageCount));
			context.commit('setAllTags', tags);
			context.commit('setLoading', false);

			return tags;
		},
		create: async (context: ActionContext<ITagsState, IRootState>, name: string): Promise<ITag> => {
			const rootStore = useRootStore();
			const tag = await createTag(rootStore.getRestApiContext, { name });
			context.commit('upsertTags', [tag]);

			return tag;
		},
		rename: async (context: ActionContext<ITagsState, IRootState>, { id, name }: { id: string, name: string }) => {
			const rootStore = useRootStore();
			const tag = await updateTag(rootStore.getRestApiContext, id, { name });
			context.commit('upsertTags', [tag]);

			return tag;
		},
		delete: async (context: ActionContext<ITagsState, IRootState>, id: string) => {
			const rootStore = useRootStore();
			const deleted = await deleteTag(rootStore.getRestApiContext, id);

			if (deleted) {
				context.commit('deleteTag', id);
				const workflowsStore = useWorkflowsStore();
				workflowsStore.removeWorkflowTagId(id);
			}

			return deleted;
		},
	},
};

export default module;
