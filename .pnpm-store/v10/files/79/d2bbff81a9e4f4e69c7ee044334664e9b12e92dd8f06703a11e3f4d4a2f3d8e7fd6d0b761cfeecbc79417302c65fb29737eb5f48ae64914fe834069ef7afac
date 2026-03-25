import { t as parse } from "./context-Csj9j3eN.js";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { Buffer } from "node:buffer";
import process from "node:process";

//#region src/webpack/context.ts
function contextOptionsFromCompilation(compilation) {
	return {
		addWatchFile(file) {
			(compilation.fileDependencies ?? compilation.compilationDependencies).add(file);
		},
		getWatchFiles() {
			return Array.from(compilation.fileDependencies ?? compilation.compilationDependencies);
		}
	};
}
const require = createRequire(import.meta.url);
function getSource(fileSource) {
	return new (require("webpack")).sources.RawSource(typeof fileSource === "string" ? fileSource : Buffer.from(fileSource.buffer));
}
function createBuildContext(options, compiler, compilation, loaderContext, inputSourceMap) {
	return {
		parse,
		addWatchFile(id) {
			options.addWatchFile(resolve(process.cwd(), id));
		},
		emitFile(emittedFile) {
			const outFileName = emittedFile.fileName || emittedFile.name;
			if (emittedFile.source && outFileName) {
				if (!compilation) throw new Error("unplugin/webpack: emitFile outside supported hooks  (buildStart, buildEnd, load, transform, watchChange)");
				compilation.emitAsset(outFileName, getSource(emittedFile.source));
			}
		},
		getWatchFiles() {
			return options.getWatchFiles();
		},
		getNativeBuildContext() {
			return {
				framework: "webpack",
				compiler,
				compilation,
				loaderContext,
				inputSourceMap
			};
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
export { normalizeMessage as i, createBuildContext as n, createContext as r, contextOptionsFromCompilation as t };