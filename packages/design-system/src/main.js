import * as components from './components';
import * as locale from './locale';

// @TODO Define proper plugin that loads all components
// tslint:disable-next-line:forin
for (const key in components) {
	const component = components[key];

	component.install = (app) => {
		app.component(component.name, component);
	};
}

export { locale };
export * from './components';
