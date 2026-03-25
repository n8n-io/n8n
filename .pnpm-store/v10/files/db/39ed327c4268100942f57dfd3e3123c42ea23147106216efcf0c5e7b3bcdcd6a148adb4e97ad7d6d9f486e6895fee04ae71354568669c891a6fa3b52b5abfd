import builtinModules from 'builtin-modules';

let moduleSet;
export default function isBuiltinModule(moduleName) {
	if (typeof moduleName !== 'string') {
		throw new TypeError('Expected a string');
	}

	moduleSet ??= new Set(builtinModules);

	return moduleSet.has(moduleName);
}
