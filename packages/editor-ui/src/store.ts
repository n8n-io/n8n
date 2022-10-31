import Vue from 'vue';
import Vuex from 'vuex';
import credentials from './modules/credentials';
import tags from './modules/tags';
import nodeCreator from './modules/nodeCreator';
import versions from './modules/versions';

Vue.use(Vuex);

const modules = {
	credentials,
	tags,
	versions,
	nodeCreator,
};

export const store = new Vuex.Store({
	strict: import.meta.env.NODE_ENV !== 'production',
	modules,
	// mutations: {
	// 	addSidebarMenuItems (state, menuItems: IMenuItem[]) {
	// 		const updated = state.sidebarMenuItems.concat(menuItems);
	// 		Vue.set(state, 'sidebarMenuItems', updated);
	// 	},
	// },
});
