import * as components from './components';
import Vue, { VueConstructor } from "vue";
import {ComponentOptions} from "vue/types/options";

declare module 'vue/types/vue' {
	interface Vue {
		$style: Record<string, string>;
	}
}

// @TODO Define proper plugin that loads all components
// tslint:disable-next-line:forin
for (const key in components) {
	const component = (components as Record<string, ComponentOptions<Vue>>)[key];

	(component as { install: (app: VueConstructor) => void }).install = (app: VueConstructor) => {
		app.component((component as { name: string }).name, component);
	};
}

export * from './components';
