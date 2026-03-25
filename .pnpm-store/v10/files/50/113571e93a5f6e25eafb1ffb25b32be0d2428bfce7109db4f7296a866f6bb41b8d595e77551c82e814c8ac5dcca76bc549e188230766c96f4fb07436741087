/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

const defineExport = (name, fn) => {
	let value;
	Object.defineProperty(exports, name, {
		get: () => {
			if (fn !== undefined) {
				value = fn();
				fn = undefined;
			}
			return value;
		},
		configurable: true
	});
};

defineExport("Source", () => require("./Source"));

defineExport("RawSource", () => require("./RawSource"));
defineExport("OriginalSource", () => require("./OriginalSource"));
defineExport("SourceMapSource", () => require("./SourceMapSource"));
defineExport("CachedSource", () => require("./CachedSource"));
defineExport("ConcatSource", () => require("./ConcatSource"));
defineExport("ReplaceSource", () => require("./ReplaceSource"));
defineExport("PrefixSource", () => require("./PrefixSource"));
defineExport("SizeOnlySource", () => require("./SizeOnlySource"));
defineExport("CompatSource", () => require("./CompatSource"));
