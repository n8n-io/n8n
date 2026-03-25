import { createRequire } from "node:module";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { build, normalizePath } from "vite";
import MagicString from "magic-string";
import browserslist from "browserslist";

//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
	return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
//#region ../../node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js
var require_picocolors = /* @__PURE__ */ __commonJS({ "../../node_modules/.pnpm/picocolors@1.1.1/node_modules/picocolors/picocolors.js": ((exports, module) => {
	let p = process || {}, argv = p.argv || [], env = p.env || {};
	let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
	let formatter = (open, close, replace = open) => (input) => {
		let string = "" + input, index = string.indexOf(close, open.length);
		return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
	};
	let replaceClose = (string, close, replace, index) => {
		let result = "", cursor = 0;
		do {
			result += string.substring(cursor, index) + replace;
			cursor = index + close.length;
			index = string.indexOf(close, cursor);
		} while (~index);
		return result + string.substring(cursor);
	};
	let createColors = (enabled = isColorSupported) => {
		let f = enabled ? formatter : () => String;
		return {
			isColorSupported: enabled,
			reset: f("\x1B[0m", "\x1B[0m"),
			bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
			dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
			italic: f("\x1B[3m", "\x1B[23m"),
			underline: f("\x1B[4m", "\x1B[24m"),
			inverse: f("\x1B[7m", "\x1B[27m"),
			hidden: f("\x1B[8m", "\x1B[28m"),
			strikethrough: f("\x1B[9m", "\x1B[29m"),
			black: f("\x1B[30m", "\x1B[39m"),
			red: f("\x1B[31m", "\x1B[39m"),
			green: f("\x1B[32m", "\x1B[39m"),
			yellow: f("\x1B[33m", "\x1B[39m"),
			blue: f("\x1B[34m", "\x1B[39m"),
			magenta: f("\x1B[35m", "\x1B[39m"),
			cyan: f("\x1B[36m", "\x1B[39m"),
			white: f("\x1B[37m", "\x1B[39m"),
			gray: f("\x1B[90m", "\x1B[39m"),
			bgBlack: f("\x1B[40m", "\x1B[49m"),
			bgRed: f("\x1B[41m", "\x1B[49m"),
			bgGreen: f("\x1B[42m", "\x1B[49m"),
			bgYellow: f("\x1B[43m", "\x1B[49m"),
			bgBlue: f("\x1B[44m", "\x1B[49m"),
			bgMagenta: f("\x1B[45m", "\x1B[49m"),
			bgCyan: f("\x1B[46m", "\x1B[49m"),
			bgWhite: f("\x1B[47m", "\x1B[49m"),
			blackBright: f("\x1B[90m", "\x1B[39m"),
			redBright: f("\x1B[91m", "\x1B[39m"),
			greenBright: f("\x1B[92m", "\x1B[39m"),
			yellowBright: f("\x1B[93m", "\x1B[39m"),
			blueBright: f("\x1B[94m", "\x1B[39m"),
			magentaBright: f("\x1B[95m", "\x1B[39m"),
			cyanBright: f("\x1B[96m", "\x1B[39m"),
			whiteBright: f("\x1B[97m", "\x1B[39m"),
			bgBlackBright: f("\x1B[100m", "\x1B[49m"),
			bgRedBright: f("\x1B[101m", "\x1B[49m"),
			bgGreenBright: f("\x1B[102m", "\x1B[49m"),
			bgYellowBright: f("\x1B[103m", "\x1B[49m"),
			bgBlueBright: f("\x1B[104m", "\x1B[49m"),
			bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
			bgCyanBright: f("\x1B[106m", "\x1B[49m"),
			bgWhiteBright: f("\x1B[107m", "\x1B[49m")
		};
	};
	module.exports = createColors();
	module.exports.createColors = createColors;
}) });

//#endregion
//#region src/snippets.ts
const safari10NoModuleFix = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`;
const legacyPolyfillId = "vite-legacy-polyfill";
const legacyEntryId = "vite-legacy-entry";
const systemJSInlineCode = `System.import(document.getElementById('${legacyEntryId}').getAttribute('data-src'))`;
const detectModernBrowserVarName = "__vite_is_modern_browser";
const detectModernBrowserDetector = `import.meta.url;import("_").catch(()=>1);(async function*(){})().next()`;
const detectModernBrowserCode = `${detectModernBrowserDetector};window.${detectModernBrowserVarName}=true`;
const dynamicFallbackInlineCode = `!function(){if(window.${detectModernBrowserVarName})return;console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("${legacyPolyfillId}"),n=document.createElement("script");n.src=e.src,n.onload=function(){${systemJSInlineCode}},document.body.appendChild(n)}();`;
const modernChunkLegacyGuard = `export function __vite_legacy_guard(){${detectModernBrowserDetector}};`;

//#endregion
//#region src/index.ts
var import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
let babel;
async function loadBabel() {
	return babel ??= import("@babel/core");
}
const { loadConfig: browserslistLoadConfig } = browserslist;
function toOutputFilePathInHtml(filename, type, hostId, hostType, config, toRelative) {
	const { renderBuiltUrl } = config.experimental;
	let relative = config.base === "" || config.base === "./";
	if (renderBuiltUrl) {
		const result = renderBuiltUrl(filename, {
			hostId,
			hostType,
			type,
			ssr: !!config.build.ssr
		});
		if (typeof result === "object") {
			if (result.runtime) throw new Error(`{ runtime: "${result.runtime}" } is not supported for assets in ${hostType} files: ${filename}`);
			if (typeof result.relative === "boolean") relative = result.relative;
		} else if (result) return result;
	}
	if (relative && !config.build.ssr) return toRelative(filename, hostId);
	else return joinUrlSegments(config.decodedBase, filename);
}
function getBaseInHTML(urlRelativePath, config) {
	return config.base === "./" || config.base === "" ? path.posix.join(path.posix.relative(urlRelativePath, "").slice(0, -2), "./") : config.base;
}
function joinUrlSegments(a, b) {
	if (!a || !b) return a || b || "";
	if (a.endsWith("/")) a = a.substring(0, a.length - 1);
	if (b[0] !== "/") b = "/" + b;
	return a + b;
}
function toAssetPathFromHtml(filename, htmlPath, config) {
	const relativeUrlPath = normalizePath(path.relative(config.root, htmlPath));
	const toRelative = (filename$1, _hostId) => getBaseInHTML(relativeUrlPath, config) + filename$1;
	return toOutputFilePathInHtml(filename, "asset", htmlPath, "html", config, toRelative);
}
const legacyEnvVarMarker = `__VITE_IS_LEGACY__`;
const _require = createRequire(import.meta.url);
const nonLeadingHashInFileNameRE = /[^/]+\[hash(?::\d+)?\]/;
const prefixedHashInFileNameRE = /\W?\[hash(?::\d+)?\]/;
const modernTargetsEsbuild = [
	"es2020",
	"edge79",
	"firefox67",
	"chrome64",
	"safari12"
];
const modernTargetsBabel = "edge>=79, firefox>=67, chrome>=64, safari>=12, chromeAndroid>=64, iOS>=12";
const outputOptionsForLegacyChunks = /* @__PURE__ */ new WeakSet();
function viteLegacyPlugin(options = {}) {
	let config;
	let targets;
	const modernTargets = options.modernTargets || modernTargetsBabel;
	const genLegacy = options.renderLegacyChunks !== false;
	const genModern = options.renderModernChunks !== false;
	if (!genLegacy && !genModern) throw new Error("`renderLegacyChunks` and `renderModernChunks` cannot be both false");
	const debugFlags = (process.env.DEBUG || "").split(",");
	const isDebug = debugFlags.includes("vite:*") || debugFlags.includes("vite:legacy");
	const assumptions = options.assumptions || {};
	const facadeToLegacyChunkMap = /* @__PURE__ */ new Map();
	const facadeToLegacyPolyfillMap = /* @__PURE__ */ new Map();
	const facadeToModernPolyfillMap = /* @__PURE__ */ new Map();
	const modernPolyfills = /* @__PURE__ */ new Set();
	const legacyPolyfills = /* @__PURE__ */ new Set();
	const outputToChunkFileNameToPolyfills = /* @__PURE__ */ new WeakMap();
	if (Array.isArray(options.modernPolyfills) && genModern) options.modernPolyfills.forEach((i) => {
		modernPolyfills.add(i.includes("/") ? `core-js/${i}` : `core-js/modules/${i}.js`);
	});
	if (Array.isArray(options.additionalModernPolyfills)) options.additionalModernPolyfills.forEach((i) => {
		modernPolyfills.add(i);
	});
	if (Array.isArray(options.polyfills)) options.polyfills.forEach((i) => {
		if (i.startsWith(`regenerator`)) legacyPolyfills.add(`regenerator-runtime/runtime.js`);
		else legacyPolyfills.add(i.includes("/") ? `core-js/${i}` : `core-js/modules/${i}.js`);
	});
	if (Array.isArray(options.additionalLegacyPolyfills)) options.additionalLegacyPolyfills.forEach((i) => {
		legacyPolyfills.add(i);
	});
	let overriddenBuildTarget = false;
	let overriddenBuildTargetOnlyModern = false;
	let overriddenDefaultModernTargets = false;
	const legacyConfigPlugin = {
		name: "vite:legacy-config",
		async config(config$1, env$1) {
			if (env$1.command === "build" && !config$1.build?.ssr) {
				if (!config$1.build) config$1.build = {};
				if (genLegacy && !config$1.build.cssTarget) config$1.build.cssTarget = "chrome61";
				if (genLegacy) {
					overriddenBuildTarget = config$1.build.target !== void 0;
					overriddenDefaultModernTargets = options.modernTargets !== void 0;
				} else overriddenBuildTargetOnlyModern = config$1.build.target !== void 0;
				if (options.modernTargets) {
					const { default: browserslistToEsbuild } = await import("browserslist-to-esbuild");
					config$1.build.target = browserslistToEsbuild(options.modernTargets);
				} else config$1.build.target = modernTargetsEsbuild;
			}
			return { define: { "import.meta.env.LEGACY": env$1.command === "serve" || config$1.build?.ssr ? false : legacyEnvVarMarker } };
		},
		configResolved(config$1) {
			if (overriddenBuildTarget) config$1.logger.warn(import_picocolors.default.yellow(`plugin-legacy overrode 'build.target'. You should pass 'targets' as an option to this plugin with the list of legacy browsers to support instead.`));
			if (overriddenBuildTargetOnlyModern) config$1.logger.warn(import_picocolors.default.yellow(`plugin-legacy overrode 'build.target'. You should pass 'modernTargets' as an option to this plugin with the list of browsers to support instead.`));
			if (overriddenDefaultModernTargets) config$1.logger.warn(import_picocolors.default.yellow(`plugin-legacy 'modernTargets' option overrode the builtin targets of modern chunks. Some versions of browsers between legacy and modern may not be supported.`));
			if (config$1.isWorker) config$1.logger.warn(import_picocolors.default.yellow(`plugin-legacy should not be passed to 'worker.plugins'. Pass to 'plugins' instead. Note that generating legacy chunks for workers are not supported by plugin-legacy.`));
		}
	};
	const legacyGenerateBundlePlugin = {
		name: "vite:legacy-generate-polyfill-chunk",
		apply: "build",
		async generateBundle(opts, bundle) {
			if (config.build.ssr) return;
			const chunkFileNameToPolyfills = outputToChunkFileNameToPolyfills.get(opts);
			if (chunkFileNameToPolyfills == null) throw new Error("Internal @vitejs/plugin-legacy error: discovered polyfills should exist");
			if (!isLegacyBundle(bundle)) {
				for (const { modern } of chunkFileNameToPolyfills.values()) modern.forEach((p$1) => modernPolyfills.add(p$1));
				if (!modernPolyfills.size) return;
				if (isDebug) console.log(`[@vitejs/plugin-legacy] modern polyfills:`, modernPolyfills);
				await buildPolyfillChunk(this, config.mode, modernPolyfills, bundle, facadeToModernPolyfillMap, config.build, "es", opts, true, genLegacy);
				return;
			}
			if (!genLegacy) return;
			for (const { legacy } of chunkFileNameToPolyfills.values()) legacy.forEach((p$1) => legacyPolyfills.add(p$1));
			if (options.polyfills !== false) await detectPolyfills(`Promise.resolve(); Promise.all();`, targets, assumptions, legacyPolyfills);
			if (legacyPolyfills.size || !options.externalSystemJS) {
				if (isDebug) console.log(`[@vitejs/plugin-legacy] legacy polyfills:`, legacyPolyfills);
				await buildPolyfillChunk(this, config.mode, legacyPolyfills, bundle, facadeToLegacyPolyfillMap, config.build, "iife", opts, options.externalSystemJS);
			}
		}
	};
	const legacyPostPlugin = {
		name: "vite:legacy-post-process",
		enforce: "post",
		apply: "build",
		renderStart(opts) {
			outputToChunkFileNameToPolyfills.set(opts, null);
		},
		configResolved(_config) {
			if (_config.build.lib) throw new Error("@vitejs/plugin-legacy does not support library mode.");
			config = _config;
			if (isDebug) console.log(`[@vitejs/plugin-legacy] modernTargets:`, modernTargets);
			if (!genLegacy || config.build.ssr) return;
			targets = options.targets || browserslistLoadConfig({ path: config.root }) || "last 2 versions and not dead, > 0.3%, Firefox ESR";
			if (isDebug) console.log(`[@vitejs/plugin-legacy] targets:`, targets);
			const getLegacyOutputFileName = (fileNames, defaultFileName = "[name]-legacy-[hash].js") => {
				if (!fileNames) return path.posix.join(config.build.assetsDir, defaultFileName);
				return (chunkInfo) => {
					let fileName = typeof fileNames === "function" ? fileNames(chunkInfo) : fileNames;
					if (fileName.includes("[name]")) fileName = fileName.replace("[name]", "[name]-legacy");
					else if (nonLeadingHashInFileNameRE.test(fileName)) fileName = fileName.replace(prefixedHashInFileNameRE, "-legacy$&");
					else fileName = fileName.replace(/(.+?)\.(.+)/, "$1-legacy.$2");
					return fileName;
				};
			};
			const createLegacyOutput = (options$1 = {}) => {
				return {
					...options$1,
					format: "esm",
					entryFileNames: getLegacyOutputFileName(options$1.entryFileNames),
					chunkFileNames: getLegacyOutputFileName(options$1.chunkFileNames),
					minify: false
				};
			};
			const { rollupOptions } = config.build;
			const { output } = rollupOptions;
			if (Array.isArray(output)) rollupOptions.output = [...output.map(createLegacyOutput), ...genModern ? output : []];
			else rollupOptions.output = [createLegacyOutput(output), ...genModern ? [output || {}] : []];
			_config.isOutputOptionsForLegacyChunks = (opts) => outputOptionsForLegacyChunks.has(opts);
		},
		async renderChunk(raw, chunk, opts, { chunks }) {
			if (config.build.ssr) return null;
			let chunkFileNameToPolyfills = outputToChunkFileNameToPolyfills.get(opts);
			if (chunkFileNameToPolyfills == null) {
				chunkFileNameToPolyfills = /* @__PURE__ */ new Map();
				for (const fileName in chunks) chunkFileNameToPolyfills.set(fileName, {
					modern: /* @__PURE__ */ new Set(),
					legacy: /* @__PURE__ */ new Set()
				});
				outputToChunkFileNameToPolyfills.set(opts, chunkFileNameToPolyfills);
			}
			const polyfillsDiscovered = chunkFileNameToPolyfills.get(chunk.fileName);
			if (polyfillsDiscovered == null) throw new Error(`Internal @vitejs/plugin-legacy error: discovered polyfills for ${chunk.fileName} should exist`);
			if (!isLegacyChunk(chunk)) {
				if (options.modernPolyfills && !Array.isArray(options.modernPolyfills) && genModern) await detectPolyfills(raw, modernTargets, assumptions, polyfillsDiscovered.modern);
				const ms = new MagicString(raw);
				if (genLegacy && chunk.isEntry) ms.prepend(modernChunkLegacyGuard);
				if (raw.includes(legacyEnvVarMarker)) {
					const re = new RegExp(legacyEnvVarMarker, "g");
					let match;
					while (match = re.exec(raw)) ms.overwrite(match.index, match.index + legacyEnvVarMarker.length, `false`);
				}
				if (config.build.sourcemap) return {
					code: ms.toString(),
					map: ms.generateMap({ hires: "boundary" })
				};
				return { code: ms.toString() };
			}
			if (!genLegacy) return null;
			outputOptionsForLegacyChunks.add(opts);
			const needPolyfills = options.polyfills !== false && !Array.isArray(options.polyfills);
			const sourceMaps = !!config.build.sourcemap;
			const babel$1 = await loadBabel();
			const resultSystem = babel$1.transform(raw, {
				babelrc: false,
				configFile: false,
				ast: true,
				code: false,
				sourceMaps,
				plugins: [(await import("@babel/plugin-transform-dynamic-import")).default, (await import("@babel/plugin-transform-modules-systemjs")).default]
			});
			const babelTransformOptions = {
				babelrc: false,
				configFile: false,
				cloneInputAst: false,
				compact: !!config.build.minify,
				sourceMaps,
				inputSourceMap: void 0,
				targets,
				assumptions,
				browserslistConfigFile: false,
				presets: [[() => ({ plugins: [
					recordAndRemovePolyfillBabelPlugin(polyfillsDiscovered.legacy),
					replaceLegacyEnvBabelPlugin(),
					wrapIIFEBabelPlugin()
				] })], [(await import("@babel/preset-env")).default, {
					bugfixes: true,
					modules: false,
					useBuiltIns: needPolyfills ? "usage" : false,
					corejs: needPolyfills ? {
						version: _require("core-js/package.json").version,
						proposals: false
					} : void 0,
					shippedProposals: true
				}]]
			};
			let result;
			if (resultSystem) result = babel$1.transformFromAstSync(resultSystem.ast, void 0, babelTransformOptions);
			else result = babel$1.transform(raw, babelTransformOptions);
			if (result) return {
				code: result.code,
				map: result.map
			};
			return null;
		},
		transformIndexHtml(html, { chunk }) {
			if (config.build.ssr) return;
			if (!chunk) return;
			if (chunk.fileName.includes("-legacy")) {
				facadeToLegacyChunkMap.set(chunk.facadeModuleId, chunk.fileName);
				if (genModern) return;
			}
			if (!genModern) html = html.replace(/<script type="module".*?<\/script>/g, "");
			const tags = [];
			const htmlFilename = chunk.facadeModuleId?.replace(/\?.*$/, "");
			if (genModern) {
				const modernPolyfillFilename = facadeToModernPolyfillMap.get(chunk.facadeModuleId);
				if (modernPolyfillFilename) tags.push({
					tag: "script",
					attrs: {
						type: "module",
						crossorigin: true,
						src: toAssetPathFromHtml(modernPolyfillFilename, chunk.facadeModuleId, config)
					}
				});
				else if (modernPolyfills.size) throw new Error(`No corresponding modern polyfill chunk found for ${htmlFilename}`);
			}
			if (!genLegacy) return {
				html,
				tags
			};
			if (genModern) tags.push({
				tag: "script",
				attrs: { nomodule: genModern },
				children: safari10NoModuleFix,
				injectTo: "body"
			});
			const legacyPolyfillFilename = facadeToLegacyPolyfillMap.get(chunk.facadeModuleId);
			if (legacyPolyfillFilename) tags.push({
				tag: "script",
				attrs: {
					nomodule: genModern,
					crossorigin: true,
					id: legacyPolyfillId,
					src: toAssetPathFromHtml(legacyPolyfillFilename, chunk.facadeModuleId, config)
				},
				injectTo: "body"
			});
			else if (legacyPolyfills.size) throw new Error(`No corresponding legacy polyfill chunk found for ${htmlFilename}`);
			const legacyEntryFilename = facadeToLegacyChunkMap.get(chunk.facadeModuleId);
			if (legacyEntryFilename) tags.push({
				tag: "script",
				attrs: {
					nomodule: genModern,
					crossorigin: true,
					id: legacyEntryId,
					"data-src": toAssetPathFromHtml(legacyEntryFilename, chunk.facadeModuleId, config)
				},
				children: systemJSInlineCode,
				injectTo: "body"
			});
			else throw new Error(`No corresponding legacy entry chunk found for ${htmlFilename}`);
			if (legacyPolyfillFilename && legacyEntryFilename && genModern) {
				tags.push({
					tag: "script",
					attrs: { type: "module" },
					children: detectModernBrowserCode,
					injectTo: "head"
				});
				tags.push({
					tag: "script",
					attrs: { type: "module" },
					children: dynamicFallbackInlineCode,
					injectTo: "head"
				});
			}
			return {
				html,
				tags
			};
		},
		generateBundle(_opts, bundle) {
			if (config.build.ssr) return;
			if (isLegacyBundle(bundle) && genModern) {
				for (const name in bundle) if (bundle[name].type === "asset" && !name.endsWith(".map") && !name.includes("-legacy")) delete bundle[name];
			}
		}
	};
	return [
		legacyConfigPlugin,
		legacyGenerateBundlePlugin,
		legacyPostPlugin
	];
}
async function detectPolyfills(code, targets, assumptions, list) {
	const babel$1 = await loadBabel();
	const result = babel$1.transform(code, {
		ast: true,
		code: false,
		babelrc: false,
		configFile: false,
		compact: false,
		targets,
		assumptions,
		browserslistConfigFile: false,
		plugins: [[(await import("babel-plugin-polyfill-corejs3")).default, {
			method: "usage-global",
			version: _require("core-js/package.json").version,
			shippedProposals: true
		}], [(await import("babel-plugin-polyfill-regenerator")).default, { method: "usage-global" }]]
	});
	for (const node of result.ast.program.body) if (node.type === "ImportDeclaration") {
		const source = node.source.value;
		if (source.startsWith("core-js/") || source.startsWith("regenerator-runtime/")) list.add(source);
	}
}
async function buildPolyfillChunk(ctx, mode, imports, bundle, facadeToChunkMap, buildOptions, format, rollupOutputOptions, excludeSystemJS, prependModenChunkLegacyGuard) {
	let { minify, assetsDir, sourcemap } = buildOptions;
	minify = minify ? "terser" : false;
	const res = await build({
		mode,
		root: path.dirname(fileURLToPath(import.meta.url)),
		configFile: false,
		logLevel: "error",
		plugins: [polyfillsPlugin(imports, excludeSystemJS), prependModenChunkLegacyGuard && prependModenChunkLegacyGuardPlugin()],
		build: {
			write: false,
			minify,
			assetsDir,
			sourcemap,
			rollupOptions: {
				input: { polyfills: polyfillId },
				output: {
					format,
					hashCharacters: rollupOutputOptions.hashCharacters,
					entryFileNames: rollupOutputOptions.entryFileNames
				}
			}
		},
		esbuild: false,
		optimizeDeps: { esbuildOptions: { target: "es5" } }
	});
	const _polyfillChunk = Array.isArray(res) ? res[0] : res;
	if (!("output" in _polyfillChunk)) return;
	const polyfillChunk = _polyfillChunk.output.find((chunk) => chunk.type === "chunk" && chunk.isEntry);
	for (const key in bundle) {
		const chunk = bundle[key];
		if (chunk.type === "chunk" && chunk.facadeModuleId) facadeToChunkMap.set(chunk.facadeModuleId, polyfillChunk.fileName);
	}
	ctx.emitFile({
		type: "asset",
		fileName: polyfillChunk.fileName,
		source: polyfillChunk.code
	});
	if (polyfillChunk.sourcemapFileName) {
		const polyfillChunkMapAsset = _polyfillChunk.output.find((chunk) => chunk.type === "asset" && chunk.fileName === polyfillChunk.sourcemapFileName);
		if (polyfillChunkMapAsset) ctx.emitFile({
			type: "asset",
			fileName: polyfillChunkMapAsset.fileName,
			source: polyfillChunkMapAsset.source
		});
	}
}
const polyfillId = "\0vite/legacy-polyfills";
function polyfillsPlugin(imports, excludeSystemJS) {
	return {
		name: "vite:legacy-polyfills",
		resolveId(id) {
			if (id === polyfillId) return id;
		},
		load(id) {
			if (id === polyfillId) return [...imports].map((i) => `import ${JSON.stringify(i)};`).join("") + (excludeSystemJS ? "" : `import "systemjs/dist/s.min.js";`);
		}
	};
}
function prependModenChunkLegacyGuardPlugin() {
	let sourceMapEnabled;
	return {
		name: "vite:legacy-prepend-moden-chunk-legacy-guard",
		configResolved(config) {
			sourceMapEnabled = !!config.build.sourcemap;
		},
		renderChunk(code) {
			if (!sourceMapEnabled) return modernChunkLegacyGuard + code;
			const ms = new MagicString(code);
			ms.prepend(modernChunkLegacyGuard);
			return {
				code: ms.toString(),
				map: ms.generateMap({ hires: "boundary" })
			};
		}
	};
}
function isLegacyChunk(chunk) {
	return chunk.fileName.includes("-legacy");
}
function isLegacyBundle(bundle) {
	const entryChunk = Object.values(bundle).find((output) => output.type === "chunk" && output.isEntry);
	return !!entryChunk && entryChunk.fileName.includes("-legacy");
}
function recordAndRemovePolyfillBabelPlugin(polyfills) {
	return ({ types: t }) => ({
		name: "vite-remove-polyfill-import",
		post({ path: path$1 }) {
			path$1.get("body").forEach((p$1) => {
				if (t.isImportDeclaration(p$1.node)) {
					polyfills.add(p$1.node.source.value);
					p$1.remove();
				}
			});
		}
	});
}
function replaceLegacyEnvBabelPlugin() {
	return ({ types: t }) => ({
		name: "vite-replace-env-legacy",
		visitor: { Identifier(path$1) {
			if (path$1.node.name === legacyEnvVarMarker) path$1.replaceWith(t.booleanLiteral(true));
		} }
	});
}
function wrapIIFEBabelPlugin() {
	return ({ types: t, template }) => {
		const buildIIFE = template(";(function(){%%body%%})();");
		return {
			name: "vite-wrap-iife",
			post({ path: path$1 }) {
				if (!this.isWrapped) {
					this.isWrapped = true;
					path$1.replaceWith(t.program(buildIIFE({ body: path$1.node.body })));
				}
			}
		};
	};
}
const cspHashes = [
	safari10NoModuleFix,
	systemJSInlineCode,
	detectModernBrowserCode,
	dynamicFallbackInlineCode
].map((i) => crypto.hash("sha256", i, "base64"));
var src_default = viteLegacyPlugin;
function viteLegacyPluginCjs(options) {
	return viteLegacyPlugin.call(this, options);
}
Object.assign(viteLegacyPluginCjs, {
	cspHashes,
	default: viteLegacyPluginCjs,
	detectPolyfills
});

//#endregion
export { cspHashes, src_default as default, detectPolyfills, viteLegacyPluginCjs as "module.exports" };