
import { ActionContext, GetterTree, Module } from 'vuex';
import {
	ITag,
	ITagsState,
	IRootState,
} from '../Interface';
import { addTag, deleteTag, getTags, updateTag } from '../api/tags';

const MAX_TAG_LENGTH = 24;

const module: Module<ITagsState, IRootState> = {
	namespaced: true,
	state: {
		tags: [],
		isLoading: false,
		maxLength: MAX_TAG_LENGTH,
	},
	mutations: {
		setLoading: (state: ITagsState, isLoading: boolean) => {
			state.isLoading = isLoading;
		},
		setTags: (state: ITagsState, tags: ITag[]) => {
			state.tags = tags
				.sort((a: ITag, b: ITag) => a.name.localeCompare(b.name));
		},
		addTag: (state: ITagsState, tag: ITag) => {
			state.tags = [tag].concat(state.tags);
		},
		updateTag: (state: ITagsState, updated: ITag) => {
			state.tags = state.tags.map((tag) => {
				if (tag.id === updated.id) {
					return updated;
				}

				return tag;
			});
		},
		deleteTag: (state: ITagsState, id: string) => {
			state.tags = state.tags.filter((tag) => tag.id !== id);
		},
	},
	getters: {
		allTags: (state: ITagsState): ITag[] => {
			return state.tags;
		},
		tags: (state: ITagsState, filter = ''): ITag[] => {
			return state.tags.filter((tag) => tag.name.toLowerCase().includes(filter.toLowerCase()));
		},
		loading: (state: ITagsState): boolean => {
			return state.isLoading;
		},
		hasTags: (state: ITagsState): boolean => {
			return state.tags.length > 0;
		},
		currentWorkflowTags: (state: ITagsState, getters: GetterTree<ITagsState, IRootState>, rootState: IRootState): ITag[] => {
			return rootState.workflow.tags || [];
		},
	},
	actions: {
		getAll: async (context: ActionContext<ITagsState, IRootState>) => {
			context.commit('setLoading', true);
			const tags = await getTags(context);
			context.commit('setTags', tags);
			context.commit('setLoading', false);

			return tags;
		},
		addNew: async (context: ActionContext<ITagsState, IRootState>, name: string) => {
			const tag = await addTag(context, {name});
			context.commit('addTag', tag);

			return tag;
		},
		rename: async (context: ActionContext<ITagsState, IRootState>, params: {name: string, id: string}) => {
			const tag = await updateTag(context, params.id, {name: params.name});
			context.commit('updateTag', tag);
		}, 
		delete: async (context: ActionContext<ITagsState, IRootState>, id: string) => {
			const deleted = await deleteTag(context, id);

			if (deleted) {
				context.commit('deleteTag', id);
			}

			return deleted;
		}, 
	},
};

export default module;