import type { Plugin } from 'vue';
import Vue2TouchEvents from 'vue2-touch-events';
// @ts-ignore
import vClickOutside from 'v-click-outside';

export const GlobalDirectivesPlugin: Plugin<{}> = {
	install(app) {
		app.use(Vue2TouchEvents);
		app.use(vClickOutside);
	},
};
