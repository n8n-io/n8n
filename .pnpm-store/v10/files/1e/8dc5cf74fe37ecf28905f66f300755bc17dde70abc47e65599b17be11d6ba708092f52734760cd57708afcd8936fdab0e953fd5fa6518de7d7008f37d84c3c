const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_extname = require('./extname.cjs');
const yaml = require_rolldown_runtime.__toESM(require("yaml"));

//#region src/util/parse.ts
const loadFileContents = (contents, format) => {
	switch (format) {
		case ".json": return JSON.parse(contents);
		case ".yml":
		case ".yaml": return yaml.parse(contents);
		default: throw new Error(`Unsupported filetype ${format}`);
	}
};
const parseFileConfig = (text, path, supportedTypes) => {
	const suffix = require_extname.extname(path);
	if (![".json", ".yaml"].includes(suffix) || supportedTypes && !supportedTypes.includes(suffix)) throw new Error(`Unsupported filetype ${suffix}`);
	return loadFileContents(text, suffix);
};

//#endregion
exports.parseFileConfig = parseFileConfig;
//# sourceMappingURL=parse.cjs.map