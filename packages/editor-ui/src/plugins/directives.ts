import type { PluginObject } from 'vue';
import Vue2TouchEvents from 'vue2-touch-events';
// @ts-ignore
import vClickOutside from 'v-click-outside';

export const GlobalDirectivesPlugin: PluginObject<{}> = {
	install(app) {
		app.use(Vue2TouchEvents);
		app.use(vClickOutside);
	},
};
