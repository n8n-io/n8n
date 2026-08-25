import type { Plugin } from 'vue';

import * as directives from './directives';

export interface N8nPluginOptions {}

/**
 * `Plugin<Options>` reads a non-array `Options` as a single required argument, so
 * `Plugin<N8nPluginOptions>` forces every caller to write `app.use(N8nPlugin, {})`.
 * The tuple form makes the argument optional, which is what `app.use(N8nPlugin)`
 * needs.
 */
export const N8nPlugin: Plugin<[options?: N8nPluginOptions]> = {
	install: (app) => {
		for (const [name, directive] of Object.entries(directives)) {
			app.directive(name, directive);
		}
	},
};
