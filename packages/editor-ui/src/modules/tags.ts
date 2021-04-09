
import { ActionContext, Store } from 'vuex';
import {
	ITag,
} from '../Interface';
import { addTag, deleteTag, getTags, updateTag } from '../api/tags';

export interface ITagsState {
	tags: ITag[];
	isLoading: boolean;
}

// const MOCK_TAGS = [{
// 	id: 119,
// 	name: 'mytag',
// 	usageCount: 3,
// }, {
// 	id: 120,
// 	name: 'sup',
// 	usageCount: 0,
// },
// }];

const module = {
	namespaced: true,
	state: {
		tags: [],
		isLoading: false
	} as ITagsState,
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
		deleteTag: (state: ITagsState, id: number) => {
			state.tags = state.tags.filter((tag) => tag.id !== id);
		}
	},
	getters: {
		allTags: (state: ITagsState): ITag[] => {
			return state.tags;
		},
		loading: (state: ITagsState): boolean => {
			return state.isLoading;
		},
	},
	actions: {
		getAll: async (context: ActionContext<any, unknown>) => {
			context.commit('setLoading', true);
			const tags = await getTags(context);
			context.commit('setTags', tags);
			context.commit('setLoading', false);

			return tags;
		},
		addNew: async (context: ActionContext<any, unknown>, name: string) => {
			const tag = await addTag(context, {name});
			context.commit('addTag', tag);

			return tag;
		},
		rename: async (context: ActionContext<any, unknown>, params: {name: string, id: number}) => {
			const tag = await updateTag(context, params.id, {name: params.name});
			context.commit('updateTag', tag);
		}, 
		delete: async (context: ActionContext<any, unknown>, id: number) => {
			const deleted = await deleteTag(context, id);

			if (deleted) {
				context.commit('deleteTag', id);
			}

			return deleted;
		}, 
	}
};

export default module;