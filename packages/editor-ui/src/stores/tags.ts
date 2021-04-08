
import {
    ITag
} from '../Interface';

// const MOCK_TAG = {
//     id: '123',
//     name: 'mytag',
//     usageCount: 3
// };

const module = {
    namespaced: true,
	state: {
        tags: [] as ITag[]
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