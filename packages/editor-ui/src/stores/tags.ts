
import {
	ITag,
} from '../Interface';

export interface ITagsState {
	tags: ITag[];
}

const MOCK_TAGS = [{
	id: '123',
	name: 'mytag',
	usageCount: 3,
}, {
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'wwwwwwwwwwwwwwwwwwwwwwwwww',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
}];

const module = {
	namespaced: true,
	state: {
		tags: [],
	} as ITagsState,
	mutations: {

	},
	getters: {
		allTags: (state: ITagsState): ITag[] => {
			return state.tags;
		},
	},
};

export default module;