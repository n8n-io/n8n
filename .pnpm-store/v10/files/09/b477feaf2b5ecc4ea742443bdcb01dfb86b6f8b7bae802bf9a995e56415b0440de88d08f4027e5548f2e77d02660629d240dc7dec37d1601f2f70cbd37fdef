'use strict';
const lazy = (importedModule, importFn, moduleId) =>
	importedModule === undefined ? importFn(moduleId) : importedModule;

module.exports = importFn => {
	return moduleId => {
		let importedModule;

		const handler = {
			get: (target, property) => {
				importedModule = lazy(importedModule, importFn, moduleId);
				return Reflect.get(importedModule, property);
			},
			apply: (target, thisArgument, argumentsList) => {
				importedModule = lazy(importedModule, importFn, moduleId);
				return Reflect.apply(importedModule, thisArgument, argumentsList);
			},
			construct: (target, argumentsList) => {
				importedModule = lazy(importedModule, importFn, moduleId);
				return Reflect.construct(importedModule, argumentsList);
			}
		};

		// eslint-disable-next-line prefer-arrow-callback
		return new Proxy(function () {}, handler);
	};
};
