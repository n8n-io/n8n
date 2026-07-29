import type { Plugin } from 'vue';

import * as directives from './directives';

export interface N8nPluginOptions {}

// Options are optional: `Plugin<N8nPluginOptions>` made them mandatory, so
// `app.use(N8nPlugin)` was a type error for consumers. The tuple form accepts
// both that and the `app.use(N8nPlugin, {})` call editor-ui already uses.
export const N8nPlugin: Plugin<[options?: N8nPluginOptions]> = {
	install: (app) => {
		for (const [name, directive] of Object.entries(directives)) {
			app.directive(name, directive);
		}
	},
};
