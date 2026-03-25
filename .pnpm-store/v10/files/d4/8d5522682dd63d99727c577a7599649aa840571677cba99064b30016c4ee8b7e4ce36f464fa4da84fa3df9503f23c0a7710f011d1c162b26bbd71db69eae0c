import { t as parse } from "./context-Csj9j3eN.js";
import { resolve } from "node:path";
import { Buffer } from "node:buffer";

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
			compilation.fileDependencies.add(resolve(cwd, file));
		},
		getWatchFiles() {
			return Array.from(compilation.fileDependencies);
		},
		parse,
		emitFile(emittedFile) {
			const outFileName = emittedFile.fileName || emittedFile.name;
			if (emittedFile.source && outFileName) {
				const { sources } = compilation.compiler.webpack;
				compilation.emitAsset(outFileName, new sources.RawSource(typeof emittedFile.source === "string" ? emittedFile.source : Buffer.from(emittedFile.source)));
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
export { createContext as n, normalizeMessage as r, createBuildContext as t };