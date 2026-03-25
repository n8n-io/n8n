const require_context = require('./context-CQfDPcdE.cjs');
let node_path = require("node:path");
node_path = require_context.__toESM(node_path);
let node_buffer = require("node:buffer");
node_buffer = require_context.__toESM(node_buffer);

//#region src/rspack/context.ts
function createBuildContext(compiler, compilation, loaderContext, inputSourceMap) {
	return {
		getNativeBuildContext() {
			return {
				framework: "rspack",
				compiler,
				compilation,
				loaderContext,
				inputSourceMap
			};
		},
		addWatchFile(file) {
			const cwd = process.cwd();
			compilation.fileDependencies.add((0, node_path.resolve)(cwd, file));
		},
		getWatchFiles() {
			return Array.from(compilation.fileDependencies);
		},
		parse: require_context.parse,
		emitFile(emittedFile) {
			const outFileName = emittedFile.fileName || emittedFile.name;
			if (emittedFile.source && outFileName) {
				const { sources } = compilation.compiler.webpack;
				compilation.emitAsset(outFileName, new sources.RawSource(typeof emittedFile.source === "string" ? emittedFile.source : node_buffer.Buffer.from(emittedFile.source)));
			}
		}
	};
}
function createContext(loader) {
	return {
		error: (error) => loader.emitError(normalizeMessage(error)),
		warn: (message) => loader.emitWarning(normalizeMessage(message))
	};
}
function normalizeMessage(error) {
	const err = new Error(typeof error === "string" ? error : error.message);
	if (typeof error === "object") {
		err.stack = error.stack;
		err.cause = error.meta;
	}
	return err;
}

//#endregion
Object.defineProperty(exports, 'createBuildContext', {
  enumerable: true,
  get: function () {
    return createBuildContext;
  }
});
Object.defineProperty(exports, 'createContext', {
  enumerable: true,
  get: function () {
    return createContext;
  }
});
Object.defineProperty(exports, 'normalizeMessage', {
  enumerable: true,
  get: function () {
    return normalizeMessage;
  }
});