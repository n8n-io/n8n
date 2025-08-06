import type { Plugin } from 'vue';

import * as directives from './directives';

export interface N8nPluginOptions {}

export const N8nPlugin: Plugin<N8nPluginOptions> = {
	install: (app) => {
		for (const [name, directive] of Object.entries(directives)) {
			app.directive(name, directive);
		}
	},
};
