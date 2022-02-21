import * as components from './components';

for (const key in components) {
	const component = components[key];
	component.install = function (Vue) {
		Vue.component(component.name, component);
	};
}

export * from './components';
