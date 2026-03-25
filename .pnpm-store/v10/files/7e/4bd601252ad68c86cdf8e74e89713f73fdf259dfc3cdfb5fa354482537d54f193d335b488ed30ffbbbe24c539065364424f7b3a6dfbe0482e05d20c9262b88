const require_Options = require("./Options.cjs");
//#region src/utils/zod-to-json-schema/Refs.ts
const getRefs = (options) => {
	const _options = require_Options.getDefaultOptions(options);
	const currentPath = _options.name !== void 0 ? [
		..._options.basePath,
		_options.definitionPath,
		_options.name
	] : _options.basePath;
	return {
		..._options,
		flags: { hasReferencedOpenAiAnyType: false },
		currentPath,
		propertyPath: void 0,
		seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [def._def, {
			def: def._def,
			path: [
				..._options.basePath,
				_options.definitionPath,
				name
			],
			jsonSchema: void 0
		}]))
	};
};
//#endregion
exports.getRefs = getRefs;

//# sourceMappingURL=Refs.cjs.map