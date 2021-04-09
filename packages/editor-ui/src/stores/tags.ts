
import {
	ITag,
} from '../Interface';

export interface ITagsState {
	tags: ITag[];
}

const MOCK_TAGS = [{
	id: '119',
	name: 'mytag',
	usageCount: 3,
}, {
	id: '120',
	name: 'abc',
	usageCount: 0,
},
{
	id: '121',
	name: 'wwwwwwwwwwwwwwwwwwwwwwwwww',
	usageCount: 0,
},
{
	id: '122',
	name: 'abc',
	usageCount: 0,
},
{
	id: '123',
	name: 'abc',
	usageCount: 0,
},
{
	id: '124',
	name: 'abc',
	usageCount: 0,
},
{
	id: '125',
	name: 'abc',
	usageCount: 0,
},
{
	id: '126',
	name: 'abc',
	usageCount: 0,
},
{
	id: '127',
	name: 'abc',
	usageCount: 0,
}];

const module = {
	namespaced: true,
	state: {
		tags: MOCK_TAGS,
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