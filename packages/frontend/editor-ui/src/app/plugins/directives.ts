import type { Plugin } from 'vue';
import VueTouchEvents from 'vue3-touch-events';

export const GlobalDirectivesPlugin: Plugin = {
	install(app) {
		app.use(VueTouchEvents);
	},
};
