import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import fs, { existsSync } from "node:fs";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { Buffer as Buffer$1 } from "node:buffer";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { tmpdir } from "node:os";

//#region rolldown:runtime
var __require = /* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region src/features/preset.ts
/**
* Applies preset-specific handling to the loaded module.
*/
function preset(options, module) {
	if (options.preset === "bundle-require") return module;
	if (options.preset === "jiti") {
		const ext = path.extname(options.path);
		if (module && typeof module === "object" && module[Symbol.toStringTag] === "Module" && Object.keys(module).length === 0) return ext === ".mjs" ? module : {};
	}
	if (module && typeof module === "object" && "default" in module) return module.default;
	return module;
}

//#endregion
//#region src/utils/normalize-path.ts
/**
* Normalize a path-like input to a string path.
* @param pathLike The path-like input (string or URL).
* @returns The normalized string path.
*/
function normalizePath(pathLike) {
	if (!pathLike) return "index.ts";
	if (pathLike instanceof URL) {
		if (pathLike.protocol === "file:") return fileURLToPath(pathLike);
		return pathLike.href;
	}
	if (typeof pathLike === "string") {
		if (!pathLike.startsWith("file:")) return pathLike;
		try {
			return fileURLToPath(pathLike);
		} catch {
			try {
				return fileURLToPath(new URL(pathLike));
			} catch {
				return pathLike;
			}
		}
	}
	return String(pathLike);
}

//#endregion
//#region src/options.ts
function resolveOptions(options = {}) {
	const resolvedOptions = {
		path: path.resolve(process.cwd(), normalizePath(options.path)),
		debug: options.debug || false,
		preset: options.preset || "none",
		inputOptions: options.inputOptions,
		outputOptions: options.outputOptions
	};
	if (!fs.existsSync(resolvedOptions.path)) throw new Error(`[unrun] File not found: ${resolvedOptions.path}`);
	if (!new Set([
		"none",
		"jiti",
		"bundle-require"
	]).has(resolvedOptions.preset)) throw new Error(`[unrun] Invalid preset "${resolvedOptions.preset}" (expected: none | jiti | bundle-require)`);
	return resolvedOptions;
}

//#endregion
//#region src/utils/module-resolution.ts
/**
* Precomputed set of Node.js builtin module specifiers, including both plain and `node:` prefixed forms.
*/
const BUILTIN_MODULE_SPECIFIERS = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
/**
* Returns true when `id` refers to a Node.js builtin module, accepting both plain and `node:` specifiers.
*/
function isBuiltinModuleSpecifier(id) {
	if (!id) return false;
	return BUILTIN_MODULE_SPECIFIERS.has(id) || id.startsWith("node:");
}
/**
* Removes Rollup-style query/hash suffixes from importer paths, falling back when importer is virtual or missing.
*/
function normalizeImporterPath(importer, fallback) {
	if (!importer || importer.startsWith("\0")) return fallback;
	const [withoutQuery] = importer.split("?");
	return withoutQuery || fallback;
}
/**
* Checks if `child` is inside `parent` directory.
*/
function isPathWithinDirectory(parent, child) {
	const relative = path.relative(parent, child);
	return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
}

//#endregion
//#region src/features/external.ts
/**
* Builds the rolldown external resolver used to decide which imports remain external.
* Treat bare imports from the primary node_modules as external, but inline
* nested node_modules so they keep working once executed from .unrun.
*/
function createExternalResolver(options) {
	const entryDir = path.dirname(options.path);
	const entryRequire = createRequire(options.path);
	const canResolveFromEntry = (specifier) => {
		try {
			entryRequire.resolve(specifier);
			return true;
		} catch {
			return false;
		}
	};
	return function external(id, importer) {
		if (!id || id.startsWith("\0")) return false;
		if (id.startsWith(".") || id.startsWith("#") || path.isAbsolute(id)) return false;
		if (isBuiltinModuleSpecifier(id)) return true;
		const importerPath = normalizeImporterPath(importer, options.path);
		try {
			const containingNodeModules = findContainingNodeModules(createRequire(importerPath).resolve(id));
			if (!containingNodeModules) return false;
			const ownerDir = path.dirname(containingNodeModules);
			const ownerInsideEntry = isPathWithinDirectory(entryDir, ownerDir);
			const entryInsideOwner = isPathWithinDirectory(ownerDir, entryDir);
			if (ownerInsideEntry && !entryInsideOwner) return false;
			if (!canResolveFromEntry(id)) return false;
		} catch {}
		return true;
	};
}
function findContainingNodeModules(filePath) {
	let current = path.dirname(filePath);
	const { root } = path.parse(current);
	while (true) {
		if (path.basename(current) === "node_modules") return current;
		if (current === root) break;
		current = path.dirname(current);
	}
}

//#endregion
//#region src/plugins/console-output-customizer.ts
/**
* Attach a util.inspect customizer to namespace-like module objects produced by rolldown helpers
* so console.log prints concrete values instead of [Getter], while preserving live bindings.
*
* Cleaner strategy: inject a tiny helper at the top of the chunk and minimally augment
* rolldown helpers (__export and __copyProps) right inside their definitions, before use.
*/
function createConsoleOutputCustomizer() {
	return {
		name: "unrun-console-output-customizer",
		generateBundle: { handler(_, bundle$1) {
			for (const chunk of Object.values(bundle$1)) {
				if (chunk.type !== "chunk") continue;
				if (!/__unrun__setInspect\b/.test(chunk.code)) {
					const helper = [
						"(function(){",
						"  function __unrun__fmt(names, getter, np){",
						"    var onlyDefault = names.length === 1 && names[0] === \"default\";",
						"    var o = np ? Object.create(null) : {};",
						"    for (var i = 0; i < names.length; i++) {",
						"      var n = names[i];",
						"      try { o[n] = getter(n) } catch {}",
						"    }",
						"    if (onlyDefault) {",
						"      try {",
						"        var s = JSON.stringify(o.default);",
						"        if (s !== undefined) {",
						"          s = s.replace(/\"([^\"]+)\":/g, \"$1: \").replace(/,/g, \", \").replace(/{/g, \"{ \").replace(/}/g, \" }\");",
						"          return \"[Module: null prototype] { default: \" + s + \" }\";",
						"        }",
						"      } catch {}",
						"      return \"[Module: null prototype] { default: \" + String(o.default) + \" }\";",
						"    }",
						"    return o;",
						"  }",
						"  function __unrun__setInspect(obj, names, getter, np){",
						"    try {",
						"      var __insp = Symbol.for('nodejs.util.inspect.custom')",
						"      Object.defineProperty(obj, __insp, {",
						"        value: function(){ return __unrun__fmt(names, getter, np) },",
						"        enumerable: false, configurable: true",
						"      })",
						"    } catch {}",
						"    return obj;",
						"  }",
						"  try { Object.defineProperty(globalThis, \"__unrun__setInspect\", { value: __unrun__setInspect, enumerable: false }) } catch {}",
						"})();"
					].join("\n");
					if (chunk.code.startsWith("#!")) {
						const nl = chunk.code.indexOf("\n");
						if (nl !== -1) chunk.code = `${chunk.code.slice(0, nl + 1)}${helper}\n${chunk.code.slice(nl + 1)}`;
						else chunk.code = `${helper}\n${chunk.code}`;
					} else chunk.code = `${helper}\n${chunk.code}`;
				}
				chunk.code = chunk.code.replace(/var\s+__export\s*=\s*\(all\)\s*=>\s*\{([\s\S]*?)return\s+target;\s*\}/, (_m, body) => {
					return `var __export = (all) => {\n${[
						body,
						"  try {",
						"    var __names = Object.keys(all).filter(function(n){ return n !== \"__esModule\" })",
						"    __unrun__setInspect(target, __names, function(n){ return all[n]() }, false)",
						"  } catch {}",
						"  return target;"
					].join("\n")}\n}`;
				});
				chunk.code = chunk.code.replace(/var\s+__copyProps\s*=\s*\(to,\s*from,\s*except,\s*desc\)\s*=>\s*\{([\s\S]*?)return\s+to;\s*\};/, (_m, body) => {
					return `var __copyProps = (to, from, except, desc) => {\n${[
						body,
						"  try {",
						"    var __names = Object.keys(to).filter(function(n){ return n !== \"__esModule\" })",
						"    __unrun__setInspect(to, __names, function(n){ return to[n] }, true)",
						"  } catch {}",
						"  return to;"
					].join("\n")}\n};`;
				});
			}
		} }
	};
}

//#endregion
//#region src/plugins/json-loader.ts
/**
* Minimal JSON loader to mimic jiti/Node behavior expected by tests:
* - Default export is the parsed JSON object
* - Also add a self-reference `default` property on the object (so obj.default === obj)
* - Provide named exports for top-level properties
*/
function createJsonLoader() {
	return {
		name: "unrun-json-loader",
		resolveId: { handler(source, importer) {
			if (!source.endsWith(".json")) return null;
			const basedir = importer ? path.dirname(importer) : process.cwd();
			const resolved = path.resolve(basedir, source);
			let isRequire = false;
			try {
				if (importer) {
					const src = fs.readFileSync(importer, "utf8");
					const escaped = source.replaceAll(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);
					const pattern = String.raw`\brequire\s*\(\s*['"]${escaped}['"]\s*\)`;
					isRequire = new RegExp(pattern).test(src);
				}
			} catch {}
			return { id: `${resolved}?unrun-json.${isRequire ? "cjs" : "mjs"}` };
		} },
		load: {
			filter: { id: /\?unrun-json\.(?:mjs|cjs)$/ },
			handler(id) {
				try {
					const realId = id.replace(/\?unrun-json\.(?:mjs|cjs)$/, "");
					const src = fs.readFileSync(realId, "utf8");
					const data = JSON.parse(src);
					const jsonLiteral = JSON.stringify(data);
					if (id.endsWith("?unrun-json.cjs")) return { code: `const __data = ${jsonLiteral}\ntry { Object.defineProperty(__data, 'default', { value: __data, enumerable: false, configurable: true }) } catch {}\nmodule.exports = __data\n` };
					const named = Object.keys(data).filter((k) => /^[$A-Z_]\w*$/i.test(k)).map((k) => `export const ${k} = __data[${JSON.stringify(k)}]`).join("\n");
					return { code: [
						`const __data = ${jsonLiteral}`,
						`try { Object.defineProperty(__data, 'default', { value: __data, enumerable: false, configurable: true }) } catch {}`,
						named,
						`export default __data`
					].filter(Boolean).join("\n") };
				} catch {
					return null;
				}
			}
		}
	};
}

//#endregion
//#region src/plugins/make-cjs-wrapper-async-friendly.ts
/**
* Transforms code strings containing CommonJS wrappers to be async-friendly.
*
* Rolldown may wrap CommonJS modules in a `__commonJS` function that uses
* arrow functions. If the wrapped code contains top-level `await`, this can lead
* to syntax errors since the callback function won't be marked as `async`.
* This function scans for such patterns and modifies the arrow functions to
* be `async` if they contain `await` expressions.
*/
function createMakeCjsWrapperAsyncFriendlyPlugin() {
	return {
		name: "unrun-make-cjs-wrapper-async-friendly",
		generateBundle: { handler(_outputOptions, bundle$1) {
			for (const chunk of Object.values(bundle$1)) {
				if (chunk.type !== "chunk") continue;
				let code = chunk.code;
				const marker = "__commonJS({";
				if (!code.includes(marker)) return;
				let pos = 0;
				const arrowToken = "(() => {";
				const asyncArrowToken = "(async () => {";
				while (true) {
					const markerIdx = code.indexOf(marker, pos);
					if (markerIdx === -1) break;
					const fnStart = code.indexOf(arrowToken, markerIdx);
					if (fnStart === -1) {
						pos = markerIdx + 12;
						continue;
					}
					const bodyStart = fnStart + 8;
					let i = bodyStart;
					let depth = 1;
					while (i < code.length && depth > 0) {
						const ch = code[i++];
						if (ch === "{") depth++;
						else if (ch === "}") depth--;
					}
					if (depth !== 0) break;
					const bodyEnd = i - 1;
					const body = code.slice(bodyStart, bodyEnd);
					if (/\bawait\b/.test(body) && code.slice(fnStart, fnStart + 14) !== asyncArrowToken) {
						code = `${code.slice(0, fnStart + 1)}async ${code.slice(fnStart + 1)}`;
						pos = fnStart + 1 + 6;
						continue;
					}
					pos = bodyEnd;
				}
				if (code !== chunk.code) chunk.code = code;
			}
		} }
	};
}

//#endregion
//#region src/plugins/require-resolve-fix.ts
/**
* Fix require.resolve calls to use the correct base path.
* Replace __require.resolve("./relative") with proper resolution from original file location.
*/
function createRequireResolveFix(options) {
	return {
		name: "unrun-require-resolve-fix",
		generateBundle: { handler(_, bundle$1) {
			for (const chunk of Object.values(bundle$1)) if (chunk.type === "chunk") chunk.code = chunk.code.replaceAll(/__require\.resolve\(["']([^"']+)["']\)/g, (match, id) => {
				if (id.startsWith("./") || id.startsWith("../")) try {
					const baseDir = path.dirname(options.path);
					for (const ext of [
						"",
						".ts",
						".js",
						".mts",
						".mjs",
						".cts",
						".cjs"
					]) {
						const testPath = path.resolve(baseDir, id + ext);
						if (fs.existsSync(testPath)) return JSON.stringify(testPath);
					}
					const resolvedPath = path.resolve(baseDir, id);
					return JSON.stringify(resolvedPath);
				} catch {
					return match;
				}
				return match;
			});
		} }
	};
}

//#endregion
//#region src/plugins/require-typeof-fix.ts
/**
* Ensure typeof require in ESM stays undefined to match jiti behavior.
* Replaces typeof __require with typeof require to maintain compatibility.
*/
function createRequireTypeofFix() {
	return {
		name: "unrun-require-typeof-fix",
		generateBundle: { handler(_, bundle$1) {
			for (const chunk of Object.values(bundle$1)) if (chunk.type === "chunk") chunk.code = chunk.code.replaceAll(/\btypeof\s+__require\b/g, "typeof require");
		} }
	};
}

//#endregion
//#region src/plugins/source-context-shims.ts
/**
* A rolldown plugin that injects source context shims:
* - Replaces import.meta.resolve calls with resolved file URLs
* - Injects per-module __filename/__dirname
* - Replaces import.meta.url with the source file URL
*/
function createSourceContextShimsPlugin() {
	return {
		name: "unrun-source-context-shims",
		load: {
			filter: { id: /\.(?:m?[jt]s|c?tsx?)(?:$|\?)/ },
			handler(id) {
				let code;
				try {
					code = fs.readFileSync(id, "utf8");
				} catch {
					return null;
				}
				let __MODIFIED_CODE__ = false;
				if (id.replaceAll("\\", "/").includes("/node_modules/")) return null;
				if (code.includes("import.meta.resolve")) {
					const replaced = code.replaceAll(/import\.meta\.resolve!?\s*\(\s*(["'])([^"']+)\1\s*\)/g, (_m, _q, spec) => {
						const url = pathToFileURL(path.resolve(path.dirname(id), spec)).href;
						return JSON.stringify(url);
					});
					if (replaced !== code) {
						code = replaced;
						__MODIFIED_CODE__ = true;
					}
				}
				const usesFilename = /\b__filename\b/.test(code);
				const declaresFilename = /\b(?:const|let|var)\s+__filename\b/.test(code);
				const usesDirname = /\b__dirname\b/.test(code);
				const declaresDirname = /\b(?:const|let|var)\s+__dirname\b/.test(code);
				const hasImportMetaUrl = /\bimport\s*\.\s*meta\s*\.\s*url\b/.test(code);
				const needsFilenameShim = usesFilename && !declaresFilename;
				const needsDirnameShim = usesDirname && !declaresDirname;
				if (needsFilenameShim || needsDirnameShim || hasImportMetaUrl) {
					const file = id;
					const dir = path.dirname(id);
					const url = pathToFileURL(id).href;
					const prologueLines = [];
					if (needsFilenameShim) prologueLines.push(`const __filename = ${JSON.stringify(file)}`);
					if (needsDirnameShim) prologueLines.push(`const __dirname = ${JSON.stringify(dir)}`);
					let transformedCode = code;
					if (hasImportMetaUrl) {
						const protectedStrings = [];
						transformedCode = transformedCode.replaceAll(/(["'])[^"']*import\s*\.\s*meta\s*\.\s*url[^"']*\1\s*:/g, (match) => {
							const placeholder = `__PROTECTED_STRING_${protectedStrings.length}__`;
							protectedStrings.push(match);
							return placeholder;
						});
						transformedCode = transformedCode.replaceAll(/\bimport\s*\.\s*meta\s*\.\s*url\b/g, JSON.stringify(url));
						for (const [i, protectedString] of protectedStrings.entries()) transformedCode = transformedCode.replace(`__PROTECTED_STRING_${i}__`, protectedString);
					}
					if (prologueLines.length > 0) transformedCode = `${prologueLines.join("\n")}\n${transformedCode}`;
					if (transformedCode !== code) {
						code = transformedCode;
						__MODIFIED_CODE__ = true;
					}
				}
				return __MODIFIED_CODE__ ? { code } : null;
			}
		}
	};
}

//#endregion
//#region src/utils/bundle.ts
async function bundle(options) {
	const resolvedTsconfigPath = path.resolve(process.cwd(), "tsconfig.json");
	const tsconfig = existsSync(resolvedTsconfigPath) ? resolvedTsconfigPath : void 0;
	const inputOptions = {
		input: options.path,
		platform: "node",
		external: createExternalResolver(options),
		plugins: [
			createMakeCjsWrapperAsyncFriendlyPlugin(),
			createRequireResolveFix(options),
			createSourceContextShimsPlugin(),
			...options.preset === "jiti" ? [
				createConsoleOutputCustomizer(),
				createJsonLoader(),
				createRequireTypeofFix()
			] : []
		],
		transform: { define: {
			__dirname: JSON.stringify(path.dirname(options.path)),
			__filename: JSON.stringify(options.path),
			"import.meta.url": JSON.stringify(pathToFileURL(options.path).href),
			"import.meta.filename": JSON.stringify(options.path),
			"import.meta.dirname": JSON.stringify(path.dirname(options.path)),
			"import.meta.env": "process.env"
		} },
		...options.inputOptions
	};
	if (tsconfig) inputOptions.tsconfig = tsconfig;
	const bundle$1 = await rolldown(inputOptions);
	const outputOptions = {
		format: "esm",
		inlineDynamicImports: true,
		keepNames: true,
		...options.outputOptions
	};
	const rolldownOutput = await bundle$1.generate(outputOptions);
	if (!rolldownOutput.output[0]) throw new Error("[unrun] No output chunk found");
	const files = await bundle$1.watchFiles;
	return {
		chunk: rolldownOutput.output[0],
		dependencies: files
	};
}

//#endregion
//#region src/utils/module/clean-module.ts
/**
* Clean the module file at the given URL.
* Deletes the file if it exists.
* @param moduleUrl - The URL of the module file to be cleaned.
* @param options - Resolved options.
*/
function cleanModule(moduleUrl, options) {
	if (options.debug) return;
	try {
		if (moduleUrl.startsWith("file://")) {
			const filePath = new URL(moduleUrl);
			fs.unlinkSync(filePath);
		}
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
}

//#endregion
//#region src/utils/module/exec-module.ts
/**
* Execute the module at the given URL, in a separate Node.js process.
* @param moduleUrl - The URL of the module to execute.
* @param args - Additional command-line arguments to pass to the Node.js process.
* @returns A promise that resolves when the module execution is complete.
*/
function execModule(moduleUrl, args = []) {
	return new Promise((resolve, reject) => {
		const nodePath = process.execPath;
		const spawnArgs = [];
		if (moduleUrl.startsWith("data:")) {
			const commaIndex = moduleUrl.indexOf(",");
			if (commaIndex === -1) {
				reject(/* @__PURE__ */ new Error("[unrun]: Invalid data URL for module execution"));
				return;
			}
			const metadata = moduleUrl.slice(5, commaIndex);
			const payload = moduleUrl.slice(commaIndex + 1);
			const code = metadata.endsWith(";base64") ? Buffer$1.from(payload, "base64").toString("utf8") : decodeURIComponent(payload);
			spawnArgs.push("--input-type=module", "--eval", code);
		} else {
			let modulePath = moduleUrl;
			if (moduleUrl.startsWith("file://")) try {
				modulePath = fileURLToPath(moduleUrl);
			} catch (error) {
				reject(/* @__PURE__ */ new Error(`[unrun]: Failed to resolve module URL ${moduleUrl}: ${error.message}`));
				return;
			}
			spawnArgs.push(modulePath);
		}
		const childProcess = spawn(nodePath, [...spawnArgs, ...args], { stdio: [
			"inherit",
			"inherit",
			"inherit"
		] });
		childProcess.on("close", (exitCode) => {
			resolve({ exitCode: exitCode ?? 0 });
		});
		childProcess.on("error", (error) => {
			reject(/* @__PURE__ */ new Error(`[unrun]: Failed to start child process: ${error.message}`));
		});
	});
}

//#endregion
//#region src/utils/module/write-module.ts
function sanitize(name) {
	return name.replaceAll(/[^\w.-]/g, "_");
}
/**
* Writes a module to the filesystem.
* @param code - The JavaScript code to be written as a module.
* @param options - Resolved options.
* @returns The file URL of the written module.
*/
function writeModule(code, options) {
	const filenameHint = path.basename(options.path);
	let moduleUrl = "";
	try {
		const randomKey = crypto.randomBytes(16).toString("hex");
		const fname = `${filenameHint ? `${sanitize(filenameHint)}.` : ""}${randomKey}.mjs`;
		const projectNodeModules = path.join(process.cwd(), "node_modules");
		const outDir = path.join(projectNodeModules, ".unrun");
		const outFile = path.join(outDir, fname);
		if (!fs.existsSync(outFile)) try {
			fs.mkdirSync(outDir, { recursive: true });
			fs.writeFileSync(outFile, code, "utf8");
		} catch {
			const fallbackDir = path.join(tmpdir(), "unrun-cache");
			const fallbackFile = path.join(fallbackDir, fname);
			fs.mkdirSync(fallbackDir, { recursive: true });
			fs.writeFileSync(fallbackFile, code, "utf8");
			moduleUrl = pathToFileURL(fallbackFile).href;
		}
		moduleUrl = moduleUrl || pathToFileURL(outFile).href;
	} catch {
		moduleUrl = `data:text/javascript;base64,${Buffer$1.from(code).toString("base64")}`;
	}
	return moduleUrl;
}

//#endregion
//#region src/utils/module/load-module.ts
/**
* Import a JS module from code string.
* Write ESM code to a temp file (prefer project-local node_modules/.unrun) and import it.
* @param code - The JavaScript code to be imported as a module.
* @param options - Resolved options.
* @returns The imported module.
*/
async function loadModule(code, options) {
	const moduleUrl = writeModule(code, options);
	let _module;
	try {
		_module = await import(moduleUrl);
	} finally {
		cleanModule(moduleUrl, options);
	}
	return _module;
}

//#endregion
//#region src/index.ts
/**
* Loads a module with JIT transpilation based on the provided options.
*
* @param options - The options for loading the module.
* @returns A promise that resolves to the loaded module.
*/
async function unrun(options) {
	const resolvedOptions = resolveOptions(options);
	const output = await bundle(resolvedOptions);
	let module;
	try {
		module = await loadModule(output.chunk.code, resolvedOptions);
	} catch (error) {
		throw new Error(`[unrun] Import failed (code length: ${output.chunk.code.length}): ${error.message}`);
	}
	return {
		module: preset(resolvedOptions, module),
		dependencies: output.dependencies
	};
}
/**
* Loads a module with JIT transpilation based on the provided options.
* This function runs synchronously using a worker thread.
*
* @param options - The options for loading the module.
* @returns The loaded module.
*/
function unrunSync(options) {
	const { createSyncFn } = __require("synckit");
	return createSyncFn(__require.resolve("./sync/worker.mjs"), { tsRunner: "node" })(options);
}
/**
* Runs a given module with JIT transpilation based on the provided options.
* This function does not return the module, as it simply executes it.
* Corresponds to the CLI behavior.
*
* @param options - The options for running the module.
* @param args - Additional command-line arguments to pass to the module.
*/
async function unrunCli(options, args = []) {
	const resolvedOptions = resolveOptions(options);
	const output = await bundle(resolvedOptions);
	const moduleUrl = writeModule(output.chunk.code, resolvedOptions);
	let cliResult;
	try {
		cliResult = await execModule(moduleUrl, args);
	} catch (error) {
		throw new Error(`[unrun] Run failed (code length: ${output.chunk.code.length}): ${error.message}`);
	}
	cleanModule(moduleUrl, resolvedOptions);
	return cliResult;
}

//#endregion
export { unrunCli as n, unrunSync as r, unrun as t };