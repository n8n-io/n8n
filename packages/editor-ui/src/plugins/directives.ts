import type { Plugin } from 'vue';
import VueTouchEvents from 'vue3-touch-events';
import { vOnClickOutside } from '@vueuse/components';

export const GlobalDirectivesPlugin: Plugin = {
	install(app) {
		app.use(VueTouchEvents);
		app.directive('on-click-outside', vOnClickOutside);
	},
};
