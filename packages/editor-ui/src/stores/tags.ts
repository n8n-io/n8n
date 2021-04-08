
import {
    ITag
} from '../Interface';

const MOCK_TAGS = [{
    id: '123',
    name: 'mytag',
    usageCount: 3
}, {
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'wwwwwwwwwwwwwwwwwwwwwwwwww',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
},
{
    id: '124',
    name: 'abc',
    usageCount: 0
}];

const module = {
    namespaced: true,
	state: {
        tags: MOCK_TAGS as ITag[]
    },
    mutations: {

    },
    getters: {
        allTags: (state: any): ITag[] => {
			return state.tags;
		},
    },
};

export default module;