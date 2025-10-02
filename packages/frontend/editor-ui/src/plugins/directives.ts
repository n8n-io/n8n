import type { Plugin } from 'vue';
import VueTouchEvents from 'vue3-touch-events';
import { n8nTruncate, n8nHtml } from '@n8n/design-system/directives';

export const GlobalDirectivesPlugin: Plugin = {
	install(app) {
		app.use(VueTouchEvents);
		app.directive('n8nTruncate', n8nTruncate);
		app.directive('n8nHtml', n8nHtml);
	},
};
