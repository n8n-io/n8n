import { createRequire as __cjs_createRequire } from "node:module";
const __cjs_require = __cjs_createRequire(import.meta.url);
import { a as globalLogger, c as debounce, d as noop, f as pkgExists, g as toArray, h as slash, i as generateColor, l as importWithError, m as resolveRegex, n as LogLevels, o as prettyFormat, p as resolveComma, r as createLogger, s as prettyName, t as version, u as matchPattern } from "./package-B-bDWI0Z.mjs";
import { builtinModules, isBuiltin } from "node:module";
import path, { dirname, join, normalize, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { blue, bold, dim, green, underline } from "ansis";
import { VERSION, build } from "rolldown";
import { exec } from "tinyexec";
const treeKill = __cjs_require("tree-kill");
import { access, chmod, cp, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createDebug } from "obug";
import { createConfigCoreLoader } from "unconfig-core";
import { glob, isDynamicPattern } from "tinyglobby";
import { RE_CSS, RE_DTS, RE_JS, RE_NODE_MODULES } from "rolldown-plugin-dts/filename";
const minVersion = __cjs_require("semver/ranges/min-version.js");
import { up } from "empathic/find";
import { up as up$1 } from "empathic/package";
import { tmpdir } from "node:os";
const coerce = __cjs_require("semver/functions/coerce.js");
const satisfies = __cjs_require("semver/functions/satisfies.js");
import { createHooks } from "hookable";
import util, { promisify } from "node:util";
import { importGlobPlugin } from "rolldown/experimental";
import { Buffer } from "node:buffer";
import { brotliCompress, gzip } from "node:zlib";
import readline from "node:readline";
import { globalContext, invalidateContextFile } from "rolldown-plugin-dts/tsc-context";

//#region src/utils/fs.ts
function fsExists(path$1) {
	return access(path$1).then(() => true, () => false);
}
function fsStat(path$1) {
	return stat(path$1).catch(() => null);
}
function fsRemove(path$1) {
	return rm(path$1, {
		force: true,
		recursive: true
	}).catch(() => {});
}
function fsCopy(from, to) {
	return cp(from, to, {
		recursive: true,
		force: true
	});
}
function lowestCommonAncestor(...filepaths) {
	if (filepaths.length === 0) return "";
	if (filepaths.length === 1) return dirname(filepaths[0]);
	filepaths = filepaths.map(normalize);
	const [first, ...rest] = filepaths;
	let ancestor = first.split(sep);
	for (const filepath of rest) {
		const directories = filepath.split(sep, ancestor.length);
		let index = 0;
		for (const directory of directories) if (directory === ancestor[index]) index += 1;
		else {
			ancestor = ancestor.slice(0, index);
			break;
		}
		ancestor = ancestor.slice(0, index);
	}
	return ancestor.length <= 1 && ancestor[0] === "" ? sep + ancestor[0] : ancestor.join(sep);
}

//#endregion
//#region src/config/config.ts
const debug$8 = createDebug("tsdown:config");
async function loadViteConfig(prefix, cwd, configLoader) {
	const loader = resolveConfigLoader(configLoader);
	debug$8("Loading Vite config via loader: ", loader);
	const parser = createParser(loader);
	const [result] = await createConfigCoreLoader({
		sources: [{
			files: [`${prefix}.config`],
			extensions: [
				"ts",
				"mts",
				"cts",
				"js",
				"mjs",
				"cjs",
				"json",
				""
			],
			parser
		}],
		cwd
	}).load();
	if (!result) return;
	const { config, source } = result;
	globalLogger.info(`Using Vite config: ${underline(source)}`);
	const resolved = await config;
	if (typeof resolved === "function") return resolved({
		command: "build",
		mode: "production"
	});
	return resolved;
}
const configPrefix = "tsdown.config";
let isWatch = false;
function setWatch() {
	isWatch = true;
}
async function loadConfigFile(inlineConfig, workspace) {
	let cwd = inlineConfig.cwd || process.cwd();
	let overrideConfig = false;
	let { config: filePath } = inlineConfig;
	if (filePath === false) return { configs: [{}] };
	if (typeof filePath === "string") {
		const stats = await fsStat(filePath);
		if (stats) {
			const resolved = path.resolve(filePath);
			if (stats.isFile()) {
				overrideConfig = true;
				filePath = resolved;
				cwd = path.dirname(filePath);
			} else if (stats.isDirectory()) cwd = resolved;
		}
	}
	const loader = resolveConfigLoader(inlineConfig.configLoader);
	debug$8("Using config loader:", loader);
	const parser = createParser(loader);
	const [result] = await createConfigCoreLoader({
		sources: overrideConfig ? [{
			files: [filePath],
			extensions: [],
			parser
		}] : [{
			files: [configPrefix],
			extensions: [
				"ts",
				"mts",
				"cts",
				"js",
				"mjs",
				"cjs",
				"json",
				""
			],
			parser
		}, {
			files: ["package.json"],
			parser
		}],
		cwd,
		stopAt: workspace && path.dirname(workspace)
	}).load(isWatch);
	let exported = [];
	let file;
	if (result) {
		({config: exported, source: file} = result);
		globalLogger.info(`Using tsdown config: ${underline(file)}`);
		exported = await exported;
		if (typeof exported === "function") exported = await exported(inlineConfig);
	}
	exported = toArray(exported);
	if (exported.length === 0) exported.push({});
	return {
		configs: exported,
		file
	};
}
function resolveConfigLoader(configLoader = "auto") {
	if (isWatch) return "unrun";
	else if (configLoader === "auto") return !!(process.features.typescript || process.versions.bun || process.versions.deno) ? "native" : "unrun";
	else return configLoader === "native" ? "native" : "unrun";
}
function createParser(loader) {
	return async (filepath) => {
		const basename = path.basename(filepath);
		const isPkgJson = basename === "package.json";
		if (basename === configPrefix || isPkgJson || basename.endsWith(".json")) {
			const contents = await readFile(filepath, "utf8");
			const parsed = JSON.parse(contents);
			if (isPkgJson) return parsed?.tsdown;
			return parsed;
		}
		if (loader === "native") return nativeImport(filepath);
		return unrunImport(filepath);
	};
}
async function nativeImport(id) {
	const mod = await import(pathToFileURL(id).href).catch((error) => {
		if (error?.message?.includes?.("Cannot find module")) throw new Error(`Failed to load the config file. Try setting the --config-loader CLI flag to \`unrun\`.\n\n${error.message}`, { cause: error });
		else throw error;
	});
	return mod.default || mod;
}
async function unrunImport(id) {
	const { unrun } = await import("unrun");
	const { module: module$1 } = await unrun({ path: pathToFileURL(id).href });
	return module$1;
}

//#endregion
//#region src/features/clean.ts
const debug$7 = createDebug("tsdown:clean");
const RE_LAST_SLASH = /[/\\]$/;
async function cleanOutDir(configs) {
	const removes = /* @__PURE__ */ new Set();
	for (const config of configs) {
		if (config.debug && (config.debug.clean ?? true)) config.clean.push(".rolldown");
		if (!config.clean.length) continue;
		const files = await glob(config.clean, {
			cwd: config.cwd,
			absolute: true,
			onlyFiles: false
		});
		const normalizedOutDir = config.outDir.replace(RE_LAST_SLASH, "");
		for (const file of files) if (file.replace(RE_LAST_SLASH, "") !== normalizedOutDir) removes.add(file);
	}
	if (!removes.size) return;
	globalLogger.info(`Cleaning ${removes.size} files`);
	await Promise.all([...removes].map(async (file) => {
		debug$7("Removing", file);
		await fsRemove(file);
	}));
	debug$7("Removed %d files", removes.size);
}
function resolveClean(clean, outDir, cwd) {
	if (clean === true) clean = [slash(outDir)];
	else if (!clean) clean = [];
	if (clean.some((item) => path.resolve(item) === cwd)) throw new Error("Cannot clean the current working directory. Please specify a different path to clean option.");
	return clean;
}

//#endregion
//#region src/features/entry.ts
async function resolveEntry(logger, entry, cwd, name) {
	const nameLabel = name ? `[${name}] ` : "";
	if (!entry || Object.keys(entry).length === 0) {
		const defaultEntry = path.resolve(cwd, "src/index.ts");
		if (await fsExists(defaultEntry)) entry = { index: defaultEntry };
		else throw new Error(`${nameLabel}No input files, try "tsdown <your-file>" or create src/index.ts`);
	}
	const entryMap = await toObjectEntry(entry, cwd);
	const entries = Object.values(entryMap);
	if (entries.length === 0) throw new Error(`${nameLabel}Cannot find entry: ${JSON.stringify(entry)}`);
	logger.info(prettyName(name), `entry: ${generateColor(name)(entries.map((entry$1) => path.relative(cwd, entry$1)).join(", "))}`);
	return entryMap;
}
async function toObjectEntry(entry, cwd) {
	if (typeof entry === "string") entry = [entry];
	if (!Array.isArray(entry)) return entry;
	const isGlob = entry.some((e) => isDynamicPattern(e));
	let resolvedEntry;
	if (isGlob) resolvedEntry = (await glob(entry, {
		cwd,
		expandDirectories: false,
		absolute: true
	})).map((file) => path.resolve(file));
	else resolvedEntry = entry;
	const base = lowestCommonAncestor(...resolvedEntry);
	return Object.fromEntries(resolvedEntry.map((file) => {
		const relative = path.relative(base, file);
		return [slash(relative.slice(0, relative.length - path.extname(relative).length)), file];
	}));
}

//#endregion
//#region src/features/exports.ts
async function writeExports(options, chunks) {
	if (!options.exports) return;
	const { outDir, pkg } = options;
	if (!pkg) throw new Error("`package.json` not found, cannot write exports");
	const { publishExports, ...generated } = await generateExports(pkg, outDir, chunks, options.exports);
	const updatedPkg = {
		...pkg,
		...generated,
		packageJsonPath: void 0
	};
	if (publishExports) {
		updatedPkg.publishConfig ||= {};
		updatedPkg.publishConfig.exports = publishExports;
	}
	const original = await readFile(pkg.packageJsonPath, "utf8");
	let contents = JSON.stringify(updatedPkg, null, detectIndent(original));
	if (original.endsWith("\n")) contents += "\n";
	if (contents !== original) await writeFile(pkg.packageJsonPath, contents, "utf8");
}
function detectIndent(jsonText) {
	const lines = jsonText.split(/\r?\n/);
	for (const line of lines) {
		const match = line.match(/^(\s+)\S/);
		if (!match) continue;
		if (match[1].includes("	")) return "	";
		return match[1].length;
	}
	return 2;
}
async function generateExports(pkg, outDir, chunks, { devExports, all, customExports }) {
	const pkgJsonPath = pkg.packageJsonPath;
	const pkgRoot$1 = path.dirname(pkgJsonPath);
	const outDirRelative = slash(path.relative(pkgRoot$1, outDir));
	let main, module$1, cjsTypes, esmTypes;
	const exportsMap = /* @__PURE__ */ new Map();
	for (const [format, chunksByFormat] of Object.entries(chunks)) {
		if (format !== "es" && format !== "cjs") continue;
		const onlyOneEntry = chunksByFormat.filter((chunk) => chunk.type === "chunk" && chunk.isEntry && !RE_DTS.test(chunk.fileName)).length === 1;
		for (const chunk of chunksByFormat) {
			if (chunk.type !== "chunk" || !chunk.isEntry) continue;
			const normalizedName = slash(chunk.fileName);
			const ext = path.extname(chunk.fileName);
			let name = normalizedName.slice(0, -ext.length);
			const isDts = name.endsWith(".d");
			if (isDts) name = name.slice(0, -2);
			const isIndex = onlyOneEntry || name === "index";
			const distFile = `${outDirRelative ? `./${outDirRelative}` : "."}/${normalizedName}`;
			if (isIndex) {
				name = ".";
				if (format === "cjs") if (isDts) cjsTypes = distFile;
				else main = distFile;
				else if (format === "es") if (isDts) esmTypes = distFile;
				else module$1 = distFile;
			} else if (name.endsWith("/index")) name = `./${name.slice(0, -6)}`;
			else name = `./${name}`;
			let subExport = exportsMap.get(name);
			if (!subExport) {
				subExport = {};
				exportsMap.set(name, subExport);
			}
			if (!isDts) {
				subExport[format] = distFile;
				if (chunk.facadeModuleId && !subExport.src) subExport.src = `./${slash(path.relative(pkgRoot$1, chunk.facadeModuleId))}`;
			}
		}
	}
	const sortedExportsMap = Array.from(exportsMap.entries()).toSorted(([a], [b]) => {
		if (a === "index") return -1;
		return a.localeCompare(b);
	});
	let exports = Object.fromEntries(sortedExportsMap.map(([name, subExport]) => [name, genSubExport(devExports, subExport)]));
	exportMeta(exports, all);
	if (customExports) exports = await customExports(exports, {
		pkg,
		outDir,
		chunks,
		isPublish: false
	});
	let publishExports;
	if (devExports) {
		publishExports = Object.fromEntries(sortedExportsMap.map(([name, subExport]) => [name, genSubExport(false, subExport)]));
		exportMeta(publishExports, all);
		if (customExports) publishExports = await customExports(publishExports, {
			pkg,
			outDir,
			chunks,
			isPublish: true
		});
	}
	return {
		main: main || module$1 || pkg.main,
		module: module$1 || pkg.module,
		types: cjsTypes || esmTypes || pkg.types,
		exports,
		publishExports
	};
}
function genSubExport(devExports, { src, es, cjs }) {
	if (devExports === true) return src;
	let value;
	const dualFormat = es && cjs;
	if (!dualFormat && !devExports) value = cjs || es;
	else {
		value = {};
		if (typeof devExports === "string") value[devExports] = src;
		if (es) value[dualFormat ? "import" : "default"] = es;
		if (cjs) value[dualFormat ? "require" : "default"] = cjs;
	}
	return value;
}
function exportMeta(exports, all) {
	if (all) exports["./*"] = "./*";
	else exports["./package.json"] = "./package.json";
}
function hasExportsTypes(pkg) {
	const exports = pkg?.exports;
	if (!exports) return false;
	if (typeof exports === "object" && exports !== null && !Array.isArray(exports)) {
		if ("types" in exports) return true;
		if ("." in exports) {
			const mainExport = exports["."];
			if (typeof mainExport === "object" && mainExport !== null && "types" in mainExport) return true;
		}
	}
	return false;
}

//#endregion
//#region src/features/target.ts
function resolveTarget(logger, target, pkg, name) {
	if (target === false) return;
	if (target == null) {
		const pkgTarget = resolvePackageTarget(pkg);
		if (pkgTarget) target = pkgTarget;
		else return;
	}
	if (typeof target === "number") throw new TypeError(`Invalid target: ${target}`);
	const targets = resolveComma(toArray(target));
	if (targets.length) logger.info(prettyName(name), `target${targets.length > 1 ? "s" : ""}: ${generateColor(name)(targets.join(", "))}`);
	return targets;
}
function resolvePackageTarget(pkg) {
	const nodeVersion = pkg?.engines?.node;
	if (!nodeVersion) return;
	const nodeMinVersion = minVersion(nodeVersion);
	if (!nodeMinVersion) return;
	if (nodeMinVersion.version === "0.0.0") return;
	return `node${nodeMinVersion.version}`;
}

//#endregion
//#region src/features/tsconfig.ts
function findTsconfig(cwd, name = "tsconfig.json") {
	return up(name, { cwd }) || false;
}
async function resolveTsconfig(logger, tsconfig, cwd, name) {
	const original = tsconfig;
	if (tsconfig !== false) {
		if (tsconfig === true || tsconfig == null) {
			tsconfig = findTsconfig(cwd);
			if (original && !tsconfig) logger.warn(`No tsconfig found in ${blue(cwd)}`);
		} else {
			const tsconfigPath = path.resolve(cwd, tsconfig);
			const stat$1 = await fsStat(tsconfigPath);
			if (stat$1?.isFile()) tsconfig = tsconfigPath;
			else if (stat$1?.isDirectory()) {
				tsconfig = findTsconfig(tsconfigPath);
				if (!tsconfig) logger.warn(`No tsconfig found in ${blue(tsconfigPath)}`);
			} else {
				tsconfig = findTsconfig(cwd, tsconfig);
				if (!tsconfig) logger.warn(`tsconfig ${blue(original)} doesn't exist`);
			}
		}
		if (tsconfig) logger.info(prettyName(name), `tsconfig: ${generateColor(name)(path.relative(cwd, tsconfig))}`);
	}
	return tsconfig;
}

//#endregion
//#region src/utils/package.ts
const debug$6 = createDebug("tsdown:package");
async function readPackageJson(dir) {
	const packageJsonPath = up$1({ cwd: dir });
	if (!packageJsonPath) return;
	debug$6("Reading package.json:", packageJsonPath);
	const contents = await readFile(packageJsonPath, "utf8");
	return {
		...JSON.parse(contents),
		packageJsonPath
	};
}
function getPackageType(pkg) {
	if (pkg?.type) {
		if (!["module", "commonjs"].includes(pkg.type)) throw new Error(`Invalid package.json type: ${pkg.type}`);
		return pkg.type;
	}
}
function normalizeFormat(format) {
	return resolveComma(toArray(format, "es")).map((format$1) => {
		switch (format$1) {
			case "es":
			case "esm":
			case "module": return "es";
			case "cjs":
			case "commonjs": return "cjs";
			default: return format$1;
		}
	});
}

//#endregion
//#region src/config/index.ts
const debug$5 = createDebug("tsdown:options");
const DEFAULT_EXCLUDE_WORKSPACE = [
	"**/node_modules/**",
	"**/dist/**",
	"**/test?(s)/**",
	"**/t?(e)mp/**"
];
async function resolveConfig(inlineConfig) {
	debug$5("inline config %O", inlineConfig);
	const { configs: rootConfigs, file } = await loadConfigFile(inlineConfig);
	const files = [];
	if (file) {
		files.push(file);
		debug$5("loaded root user config file %s", file);
		debug$5("root user configs %O", rootConfigs);
	} else debug$5("no root user config file found");
	const configs = (await Promise.all(rootConfigs.map(async (rootConfig) => {
		const { configs: workspaceConfigs, files: workspaceFiles } = await resolveWorkspace(rootConfig, inlineConfig);
		if (workspaceFiles) files.push(...workspaceFiles);
		return Promise.all(workspaceConfigs.filter((config) => !config.workspace || config.entry).map((config) => resolveUserConfig(config, inlineConfig)));
	}))).flat();
	debug$5("resolved configs %O", configs);
	return {
		configs,
		files
	};
}
async function resolveWorkspace(config, inlineConfig) {
	const normalized = {
		...config,
		...inlineConfig
	};
	const rootCwd = normalized.cwd || process.cwd();
	let { workspace } = normalized;
	if (!workspace) return {
		configs: [normalized],
		files: []
	};
	if (workspace === true) workspace = {};
	else if (typeof workspace === "string" || Array.isArray(workspace)) workspace = { include: workspace };
	let { include: packages = "auto", exclude = DEFAULT_EXCLUDE_WORKSPACE, config: workspaceConfig } = workspace;
	if (packages === "auto") packages = (await glob("**/package.json", {
		ignore: exclude,
		cwd: rootCwd,
		expandDirectories: false
	})).filter((file) => file !== "package.json").map((file) => slash(path.resolve(rootCwd, file, "..")));
	else packages = (await glob(packages, {
		ignore: exclude,
		cwd: rootCwd,
		onlyDirectories: true,
		absolute: true,
		expandDirectories: false
	})).map((file) => slash(path.resolve(file)));
	if (packages.length === 0) throw new Error("No workspace packages found, please check your config");
	if (inlineConfig.filter) {
		inlineConfig.filter = resolveRegex(inlineConfig.filter);
		packages = packages.filter((path$1) => {
			return typeof inlineConfig.filter === "string" ? path$1.includes(inlineConfig.filter) : Array.isArray(inlineConfig.filter) ? inlineConfig.filter.some((filter) => path$1.includes(filter)) : inlineConfig.filter.test(path$1);
		});
		if (packages.length === 0) throw new Error("No packages matched the filters");
	}
	const files = [];
	return {
		configs: (await Promise.all(packages.map(async (cwd) => {
			debug$5("loading workspace config %s", cwd);
			const { configs, file } = await loadConfigFile({
				...inlineConfig,
				config: workspaceConfig,
				cwd
			}, cwd);
			if (file) {
				debug$5("loaded workspace config file %s", file);
				files.push(file);
			} else debug$5("no workspace config file found in %s", cwd);
			return configs.map((config$1) => ({
				...normalized,
				cwd,
				...config$1
			}));
		}))).flat(),
		files
	};
}
async function resolveUserConfig(userConfig, inlineConfig) {
	let { entry, format = ["es"], plugins = [], clean = true, silent = false, logLevel = silent ? "silent" : "info", failOnWarn = false, customLogger, treeshake = true, platform = "node", outDir = "dist", sourcemap = false, dts, unused = false, watch = false, ignoreWatch, shims = false, skipNodeModulesBundle = false, publint: publint$1 = false, attw: attw$1 = false, fromVite, alias, tsconfig, report = true, target, env = {}, copy: copy$1, publicDir, hash, cwd = process.cwd(), name, workspace, external, noExternal, exports = false, bundle, unbundle = typeof bundle === "boolean" ? !bundle : false, removeNodeProtocol, nodeProtocol, cjsDefault = true, globImport = true, inlineOnly, fixedExtension = platform === "node", debug: debug$9 = false } = userConfig;
	const logger = createLogger(logLevel, {
		customLogger,
		failOnWarn
	});
	if (typeof bundle === "boolean") logger.warn("`bundle` option is deprecated. Use `unbundle` instead.");
	if (removeNodeProtocol && nodeProtocol) throw new TypeError("`removeNodeProtocol` is deprecated. Please only use `nodeProtocol` instead.");
	nodeProtocol = nodeProtocol ?? (removeNodeProtocol ? "strip" : false);
	outDir = path.resolve(cwd, outDir);
	clean = resolveClean(clean, outDir, cwd);
	const pkg = await readPackageJson(cwd);
	if (workspace) name ||= pkg?.name;
	entry = await resolveEntry(logger, entry, cwd, name);
	if (dts == null) dts = !!(pkg?.types || pkg?.typings || hasExportsTypes(pkg));
	target = resolveTarget(logger, target, pkg, name);
	tsconfig = await resolveTsconfig(logger, tsconfig, cwd, name);
	if (typeof external === "string") external = resolveRegex(external);
	if (typeof noExternal === "string") noExternal = resolveRegex(noExternal);
	if (publint$1 === true) publint$1 = {};
	if (attw$1 === true) attw$1 = {};
	if (exports === true) exports = {};
	if (publicDir) if (copy$1) throw new TypeError("`publicDir` is deprecated. Cannot be used with `copy`");
	else logger.warn(`${blue`publicDir`} is deprecated. Use ${blue`copy`} instead.`);
	if (fromVite) {
		const viteUserConfig = await loadViteConfig(fromVite === true ? "vite" : fromVite, cwd, inlineConfig.configLoader);
		if (viteUserConfig) {
			const viteAlias = viteUserConfig.resolve?.alias;
			if (Array.isArray(viteAlias)) throw new TypeError("Unsupported resolve.alias in Vite config. Use object instead of array");
			if (viteAlias) alias = {
				...alias,
				...viteAlias
			};
			if (viteUserConfig.plugins) plugins = [viteUserConfig.plugins, plugins];
		}
	}
	ignoreWatch = toArray(ignoreWatch).map((ignore) => {
		ignore = resolveRegex(ignore);
		if (typeof ignore === "string") return path.resolve(cwd, ignore);
		return ignore;
	});
	if (noExternal != null && typeof noExternal !== "function") {
		const noExternalPatterns = toArray(noExternal);
		noExternal = (id) => matchPattern(id, noExternalPatterns);
	}
	if (inlineOnly != null) inlineOnly = toArray(inlineOnly);
	if (debug$9) {
		if (debug$9 === true) debug$9 = {};
		debug$9.devtools ??= !!pkgExists("@vitejs/devtools/cli");
	}
	return {
		...userConfig,
		entry,
		plugins,
		format: normalizeFormat(format),
		target,
		outDir,
		clean,
		logger,
		treeshake,
		platform,
		sourcemap,
		dts: dts === true ? {} : dts,
		report: report === true ? {} : report,
		unused,
		watch,
		ignoreWatch,
		shims,
		skipNodeModulesBundle,
		publint: publint$1,
		attw: attw$1,
		alias,
		tsconfig,
		cwd,
		env,
		pkg,
		copy: publicDir || copy$1,
		hash: hash ?? true,
		name,
		external,
		noExternal,
		exports,
		unbundle,
		nodeProtocol,
		cjsDefault,
		globImport,
		inlineOnly,
		fixedExtension,
		debug: debug$9
	};
}
async function mergeUserOptions(defaults, user, args) {
	const userOutputOptions = typeof user === "function" ? await user(defaults, ...args) : user;
	return {
		...defaults,
		...userOutputOptions
	};
}

//#endregion
//#region src/features/attw.ts
const debug$4 = createDebug("tsdown:attw");
/**
* ATTW profiles.
* Defines the resolution modes to ignore for each profile.
*
* @see https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md#profiles
*/
const profiles = {
	strict: [],
	node16: ["node10"],
	esmOnly: ["node10", "node16-cjs"]
};
/**
* Format an ATTW problem for display
*/
function formatProblem(problem) {
	const resolutionKind = "resolutionKind" in problem ? ` (${problem.resolutionKind})` : "";
	const entrypoint = "entrypoint" in problem ? ` at ${problem.entrypoint}` : "";
	switch (problem.kind) {
		case "NoResolution": return `  ❌ No resolution${resolutionKind}${entrypoint}`;
		case "UntypedResolution": return `  ⚠️  Untyped resolution${resolutionKind}${entrypoint}`;
		case "FalseESM": return `  🔄 False ESM: Types indicate ESM (${problem.typesModuleKind}) but implementation is CJS (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "FalseCJS": return `  🔄 False CJS: Types indicate CJS (${problem.typesModuleKind}) but implementation is ESM (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "CJSResolvesToESM": return `  ⚡ CJS resolves to ESM${resolutionKind}${entrypoint}`;
		case "NamedExports": {
			const missingExports = problem.missing?.length > 0 ? ` Missing: ${problem.missing.join(", ")}` : "";
			return `  📤 Named exports problem${problem.isMissingAllNamed ? " (all named exports missing)" : ""}${missingExports}\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		}
		case "FallbackCondition": return `  🎯 Fallback condition used${resolutionKind}${entrypoint}`;
		case "FalseExportDefault": return `  🎭 False export default\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "MissingExportEquals": return `  📝 Missing export equals\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`;
		case "InternalResolutionError": return `  💥 Internal resolution error in ${problem.fileName} (${problem.resolutionOption})\n     Module: ${problem.moduleSpecifier} | Mode: ${problem.resolutionMode}`;
		case "UnexpectedModuleSyntax": return `  📋 Unexpected module syntax in ${problem.fileName}\n     Expected: ${problem.moduleKind} | Found: ${problem.syntax === 99 ? "ESM" : "CJS"}`;
		case "CJSOnlyExportsDefault": return `  🏷️  CJS only exports default in ${problem.fileName}`;
		default: return `  ❓ Unknown problem: ${JSON.stringify(problem)}`;
	}
}
async function attw(options) {
	if (!options.attw) return;
	if (!options.pkg) {
		options.logger.warn("attw is enabled but package.json is not found");
		return;
	}
	const { profile = "strict", level = "warn", ...attwOptions } = options.attw === true ? {} : options.attw;
	const t = performance.now();
	debug$4("Running attw check");
	const tempDir = await mkdtemp(path.join(tmpdir(), "tsdown-attw-"));
	const attwCore = await importWithError("@arethetypeswrong/core");
	try {
		const { stdout: tarballInfo } = await exec("npm", [
			"pack",
			"--json",
			"--pack-destination",
			tempDir
		], { nodeOptions: { cwd: options.cwd } });
		const parsed = JSON.parse(tarballInfo);
		if (!Array.isArray(parsed) || !parsed[0]?.filename) throw new Error("Invalid npm pack output format");
		const tarball = await readFile(path.join(tempDir, parsed[0].filename));
		const pkg = attwCore.createPackageFromTarballData(tarball);
		const checkResult = await attwCore.checkPackage(pkg, attwOptions);
		if (checkResult.types !== false && checkResult.problems.length) {
			const problems = checkResult.problems.filter((problem) => {
				if ("resolutionKind" in problem) return !profiles[profile]?.includes(problem.resolutionKind);
				return true;
			});
			if (problems.length) {
				const problemMessage = `Are the types wrong problems found:\n${problems.map(formatProblem).join("\n")}`;
				if (level === "error") throw new Error(problemMessage);
				options.logger.warn(prettyName(options.name), problemMessage);
			}
		} else options.logger.success(prettyName(options.name), `No Are the types wrong problems found`, dim`(${Math.round(performance.now() - t)}ms)`);
	} catch (error) {
		options.logger.error("ATTW check failed:", error);
		debug$4("Found errors, setting exit code to 1");
		process.exitCode = 1;
	} finally {
		await fsRemove(tempDir);
	}
}

//#endregion
//#region src/features/cjs.ts
/**
* If the config includes the `cjs` format and
* one of its target >= node 23.0.0 / 22.12.0,
* warn the user about the deprecation of CommonJS.
*/
function warnLegacyCJS(config) {
	if (!config.format.includes("cjs") || !config.target) return;
	if (config.target.some((t) => {
		const version$1 = coerce(t.split("node")[1]);
		return version$1 && satisfies(version$1, ">=23.0.0 || >=22.12.0");
	})) config.logger.warnOnce("We recommend using the ESM format instead of CommonJS.\nThe ESM format is compatible with modern platforms and runtimes, and most new libraries are now distributed only in ESM format.\nLearn more at https://nodejs.org/en/learn/modules/publishing-a-package#how-did-we-get-here");
}

//#endregion
//#region src/features/copy.ts
async function copy(options) {
	if (!options.copy) return;
	const copy$1 = typeof options.copy === "function" ? await options.copy(options) : options.copy;
	await Promise.all(toArray(copy$1).map((dir) => {
		const from = typeof dir === "string" ? dir : dir.from;
		const to = typeof dir === "string" ? path.resolve(options.outDir, path.basename(from)) : dir.to;
		return cp$1(options.cwd, from, to);
	}));
}
function cp$1(cwd, from, to) {
	return fsCopy(path.resolve(cwd, from), path.resolve(cwd, to));
}

//#endregion
//#region src/features/hooks.ts
async function createHooks$1(options) {
	const hooks = createHooks();
	if (typeof options.hooks === "object") hooks.addHooks(options.hooks);
	else if (typeof options.hooks === "function") await options.hooks(hooks);
	return {
		hooks,
		context: {
			options,
			hooks
		}
	};
}

//#endregion
//#region src/features/publint.ts
const debug$3 = createDebug("tsdown:publint");
async function publint(options) {
	if (!options.publint) return;
	if (!options.pkg) {
		options.logger.warn(prettyName(options.name), "publint is enabled but package.json is not found");
		return;
	}
	const t = performance.now();
	debug$3("Running publint");
	const { publint: publint$1 } = await importWithError("publint");
	const { formatMessage } = await import("publint/utils");
	const { messages } = await publint$1({
		...options.publint === true ? {} : options.publint,
		pkgDir: path.dirname(options.pkg.packageJsonPath)
	});
	debug$3("Found %d issues", messages.length);
	if (!messages.length) {
		options.logger.success(prettyName(options.name), `No publint issues found`, dim`(${Math.round(performance.now() - t)}ms)`);
		return;
	}
	let hasError = false;
	for (const message of messages) {
		hasError ||= message.type === "error";
		const formattedMessage = formatMessage(message, options.pkg);
		const logType = {
			error: "error",
			warning: "warn",
			suggestion: "info"
		}[message.type];
		options.logger[logType](prettyName(options.name), formattedMessage);
	}
	if (hasError) {
		debug$3("Found errors, setting exit code to 1");
		process.exitCode = 1;
	}
}

//#endregion
//#region src/features/external.ts
const debug$2 = createDebug("tsdown:external");
function ExternalPlugin({ pkg, noExternal, inlineOnly, skipNodeModulesBundle }) {
	const deps = pkg && Array.from(getProductionDeps(pkg));
	return {
		name: "tsdown:external",
		async resolveId(id, importer, extraOptions) {
			if (extraOptions.isEntry || !importer) return;
			const shouldExternal = await externalStrategy(this, id, importer, extraOptions);
			const nodeBuiltinModule = isBuiltin(id);
			debug$2("shouldExternal: %s = %s", id, shouldExternal);
			if (shouldExternal === true || shouldExternal === "absolute") return {
				id,
				external: shouldExternal,
				moduleSideEffects: nodeBuiltinModule ? false : void 0
			};
			if (inlineOnly && !RE_DTS.test(importer) && !nodeBuiltinModule && id[0] !== "." && !path.isAbsolute(id)) {
				const shouldInline = shouldExternal === "no-external" || matchPattern(id, inlineOnly);
				debug$2("shouldInline: %s = %s", id, shouldInline);
				if (shouldInline) return;
				const resolved = await this.resolve(id, importer, extraOptions);
				if (!resolved) return;
				if (RE_NODE_MODULES.test(resolved.id)) throw new Error(`${underline(id)} is located in node_modules but is not included in ${blue`inlineOnly`} option.
To fix this, either add it to ${blue`inlineOnly`}, declare it as a production or peer dependency in your package.json, or externalize it manually.
Imported by ${underline(importer)}`);
			}
		}
	};
	/**
	* - `true`: always external
	* - `false`: skip, let other plugins handle it
	* - `'absolute'`: external as absolute path
	* - `'no-external'`: skip, but mark as non-external for inlineOnly check
	*/
	async function externalStrategy(context, id, importer, extraOptions) {
		if (id === shimFile) return false;
		if (noExternal?.(id, importer)) return "no-external";
		if (skipNodeModulesBundle) {
			const resolved = await context.resolve(id, importer, extraOptions);
			if (!resolved) return false;
			return resolved.external || RE_NODE_MODULES.test(resolved.id);
		}
		if (deps) return deps.some((dep) => id === dep || id.startsWith(`${dep}/`));
		return false;
	}
}
function getProductionDeps(pkg) {
	return new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]);
}

//#endregion
//#region src/utils/lightningcss.ts
/**
* Converts esbuild target [^1] (which is also used by Rolldown [^2]) to Lightning CSS targets [^3].
*
* [^1]: https://esbuild.github.io/api/#target
* [^2]: https://github.com/rolldown/rolldown/blob/v1.0.0-beta.8/packages/rolldown/src/binding.d.ts#L1429-L1431
* [^3]: https://lightningcss.dev/transpilation.html
*/
function esbuildTargetToLightningCSS(target) {
	let targets;
	const matches = [...target.join(" ").toLowerCase().matchAll(TARGET_REGEX)];
	for (const match of matches) {
		const browser = ESBUILD_LIGHTNINGCSS_MAPPING[match[1]];
		if (!browser) continue;
		const version$1 = match[2];
		const versionInt = parseVersion(version$1);
		if (versionInt == null) continue;
		targets = targets || {};
		targets[browser] = versionInt;
	}
	return targets;
}
const TARGET_REGEX = /([a-z]+)(\d+(?:\.\d+)*)/g;
const ESBUILD_LIGHTNINGCSS_MAPPING = {
	chrome: "chrome",
	edge: "edge",
	firefox: "firefox",
	ie: "ie",
	ios: "ios_saf",
	opera: "opera",
	safari: "safari"
};
function parseVersion(version$1) {
	const [major, minor = 0, patch = 0] = version$1.split("-")[0].split(".").map((v) => Number.parseInt(v, 10));
	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) return null;
	return major << 16 | minor << 8 | patch;
}

//#endregion
//#region src/features/lightningcss.ts
async function LightningCSSPlugin(options) {
	const LightningCSS = await import("unplugin-lightningcss/rolldown").catch(() => void 0);
	if (!LightningCSS) return;
	const targets = options.target && esbuildTargetToLightningCSS(options.target);
	if (!targets) return;
	return LightningCSS.default({ options: { targets } });
}

//#endregion
//#region src/features/node-protocol.ts
const modulesWithoutProtocol = builtinModules.filter((mod) => !mod.startsWith("node:"));
/**
* The `node:` protocol was added in Node.js v14.18.0.
* @see https://nodejs.org/api/esm.html#node-imports
*/
function NodeProtocolPlugin(nodeProtocolOption) {
	if (nodeProtocolOption === "strip") return {
		name: "tsdown:node-protocol:strip",
		resolveId: {
			order: "pre",
			filter: { id: /* @__PURE__ */ new RegExp(`^node:(${modulesWithoutProtocol.join("|")})$`) },
			handler(id) {
				return {
					id: id.slice(5),
					external: true,
					moduleSideEffects: false
				};
			}
		}
	};
	return {
		name: "tsdown:node-protocol:add",
		resolveId: {
			order: "pre",
			filter: { id: /* @__PURE__ */ new RegExp(`^(${modulesWithoutProtocol.join("|")})$`) },
			handler(id) {
				return {
					id: `node:${id}`,
					external: true,
					moduleSideEffects: false
				};
			}
		}
	};
}

//#endregion
//#region src/features/output.ts
function resolveJsOutputExtension(packageType, format, fixedExtension) {
	switch (format) {
		case "es": return !fixedExtension && packageType === "module" ? "js" : "mjs";
		case "cjs": return fixedExtension || packageType === "module" ? "cjs" : "js";
		default: return "js";
	}
}
function resolveChunkFilename({ outExtensions, fixedExtension, pkg, hash }, inputOptions, format) {
	const packageType = getPackageType(pkg);
	let jsExtension;
	let dtsExtension;
	if (outExtensions) {
		const { js, dts } = outExtensions({
			options: inputOptions,
			format,
			pkgType: packageType
		}) || {};
		jsExtension = js;
		dtsExtension = dts;
	}
	jsExtension ??= `.${resolveJsOutputExtension(packageType, format, fixedExtension)}`;
	const suffix = format === "iife" || format === "umd" ? `.${format}` : "";
	return [createChunkFilename(`[name]${suffix}`, jsExtension, dtsExtension), createChunkFilename(`[name]${suffix}${hash ? "-[hash]" : ""}`, jsExtension, dtsExtension)];
}
function createChunkFilename(basename, jsExtension, dtsExtension) {
	if (dtsExtension === void 0) return `${basename}${jsExtension}`;
	return (chunk) => {
		return `${basename}${chunk.name.endsWith(".d") ? dtsExtension : jsExtension}`;
	};
}
function resolveChunkAddon(chunkAddon, format, dts) {
	if (!chunkAddon) return;
	return (chunk) => {
		if (!dts && RE_DTS.test(chunk.fileName)) return "";
		if (typeof chunkAddon === "function") chunkAddon = chunkAddon({
			format,
			fileName: chunk.fileName
		});
		if (typeof chunkAddon === "string") return chunkAddon;
		switch (true) {
			case RE_JS.test(chunk.fileName): return chunkAddon?.js || "";
			case RE_CSS.test(chunk.fileName): return chunkAddon?.css || "";
			case RE_DTS.test(chunk.fileName): return chunkAddon?.dts || "";
			default: return "";
		}
	};
}

//#endregion
//#region src/utils/format.ts
function formatBytes(bytes) {
	if (bytes === Infinity) return void 0;
	return `${(bytes / 1e3).toFixed(2)} kB`;
}

//#endregion
//#region src/features/report.ts
const debug$1 = createDebug("tsdown:report");
const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const defaultOptions = {
	gzip: true,
	brotli: false,
	maxCompressSize: 1e6
};
function ReportPlugin(userOptions, logger, cwd, cjsDts, name, isMultiFormat) {
	const options = {
		...defaultOptions,
		...userOptions
	};
	return {
		name: "tsdown:report",
		async writeBundle(outputOptions, bundle) {
			const outDir = path.relative(cwd, outputOptions.file ? path.resolve(cwd, outputOptions.file, "..") : path.resolve(cwd, outputOptions.dir));
			const sizes = [];
			for (const chunk of Object.values(bundle)) {
				const size = await calcSize(options, chunk);
				sizes.push(size);
			}
			const filenameLength = Math.max(...sizes.map((size) => size.filename.length));
			const rawTextLength = Math.max(...sizes.map((size) => size.rawText.length));
			const gzipTextLength = Math.max(...sizes.map((size) => size.gzipText == null ? 0 : size.gzipText.length));
			const brotliTextLength = Math.max(...sizes.map((size) => size.brotliText == null ? 0 : size.brotliText.length));
			let totalRaw = 0;
			for (const size of sizes) {
				size.rawText = size.rawText.padStart(rawTextLength);
				size.gzipText = size.gzipText?.padStart(gzipTextLength);
				size.brotliText = size.brotliText?.padStart(brotliTextLength);
				totalRaw += size.raw;
			}
			sizes.sort((a, b) => {
				if (a.dts !== b.dts) return a.dts ? 1 : -1;
				if (a.isEntry !== b.isEntry) return a.isEntry ? -1 : 1;
				return b.raw - a.raw;
			});
			const nameLabel = prettyName(name);
			const formatLabel = isMultiFormat && prettyFormat(cjsDts ? "cjs" : outputOptions.format);
			for (const size of sizes) {
				const filenameColor = size.dts ? green : noop;
				logger.info(nameLabel, formatLabel, dim(outDir + path.sep) + filenameColor((size.isEntry ? bold : noop)(size.filename)), ` `.repeat(filenameLength - size.filename.length), dim(size.rawText), options.gzip && size.gzipText && dim`│ gzip: ${size.gzipText}`, options.brotli && size.brotliText && dim`│ brotli: ${size.brotliText}`);
			}
			const totalSizeText = formatBytes(totalRaw);
			logger.info(nameLabel, formatLabel, `${sizes.length} files, total: ${totalSizeText}`);
		}
	};
}
async function calcSize(options, chunk) {
	debug$1(`Calculating size for`, chunk.fileName);
	const content = chunk.type === "chunk" ? chunk.code : chunk.source;
	const raw = Buffer.byteLength(content, "utf8");
	debug$1("[size]", chunk.fileName, raw);
	let gzip$1 = Infinity;
	let brotli = Infinity;
	if (raw > options.maxCompressSize) debug$1(chunk.fileName, "file size exceeds limit, skip gzip/brotli");
	else {
		if (options.gzip) {
			gzip$1 = (await gzipAsync(content)).length;
			debug$1("[gzip]", chunk.fileName, gzip$1);
		}
		if (options.brotli) {
			brotli = (await brotliCompressAsync(content)).length;
			debug$1("[brotli]", chunk.fileName, brotli);
		}
	}
	return {
		filename: chunk.fileName,
		dts: RE_DTS.test(chunk.fileName),
		isEntry: chunk.type === "chunk" && chunk.isEntry,
		raw,
		rawText: formatBytes(raw),
		gzip: gzip$1,
		gzipText: formatBytes(gzip$1),
		brotli,
		brotliText: formatBytes(brotli)
	};
}

//#endregion
//#region src/features/shebang.ts
const RE_SHEBANG = /^#!.*/;
function ShebangPlugin(logger, cwd, name, isMultiFormat) {
	return {
		name: "tsdown:shebang",
		async writeBundle(options, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== "chunk" || !chunk.isEntry) continue;
				if (!RE_SHEBANG.test(chunk.code)) continue;
				const filepath = path.resolve(cwd, options.file || path.join(options.dir, chunk.fileName));
				if (await fsExists(filepath)) {
					logger.info(prettyName(name), isMultiFormat && prettyFormat(options.format), `Granting execute permission to ${underline(path.relative(cwd, filepath))}`);
					await chmod(filepath, 493);
				}
			}
		}
	};
}

//#endregion
//#region src/features/shims.ts
function getShimsInject(format, platform) {
	if (format === "es" && platform === "node") return {
		__dirname: [shimFile, "__dirname"],
		__filename: [shimFile, "__filename"]
	};
}

//#endregion
//#region src/features/rolldown.ts
const debug = createDebug("tsdown:rolldown");
async function getBuildOptions(config, format, isMultiFormat, cjsDts = false) {
	const inputOptions = await resolveInputOptions(config, format, cjsDts, isMultiFormat);
	const outputOptions = await resolveOutputOptions(inputOptions, config, format, cjsDts);
	const rolldownConfig = {
		...inputOptions,
		output: outputOptions
	};
	debug("rolldown config with format \"%s\" %O", cjsDts ? "cjs dts" : format, rolldownConfig);
	return rolldownConfig;
}
async function resolveInputOptions(config, format, cjsDts, isMultiFormat) {
	const { entry, external, plugins: userPlugins, platform, alias, treeshake, dts, unused, target, shims, tsconfig, cwd, report, env, nodeProtocol, loader, name, logger, cjsDefault, banner, footer, globImport, debug: debug$9 } = config;
	const plugins = [];
	if (nodeProtocol) plugins.push(NodeProtocolPlugin(nodeProtocol));
	if (config.pkg || config.skipNodeModulesBundle) plugins.push(ExternalPlugin(config));
	if (dts) {
		const { dts: dtsPlugin } = await import("rolldown-plugin-dts");
		const options = {
			tsconfig,
			banner: resolveChunkAddon(banner, format, true),
			footer: resolveChunkAddon(footer, format, true),
			...dts
		};
		if (format === "es") plugins.push(dtsPlugin(options));
		else if (cjsDts) plugins.push(dtsPlugin({
			...options,
			emitDtsOnly: true,
			cjsDefault
		}));
	}
	if (!cjsDts) {
		if (unused) {
			const { Unused } = await importWithError("unplugin-unused");
			plugins.push(Unused.rolldown({
				root: cwd,
				...unused === true ? {} : unused
			}));
		}
		if (target) plugins.push(await LightningCSSPlugin({ target }));
		plugins.push(ShebangPlugin(logger, cwd, name, isMultiFormat));
		if (globImport) plugins.push(importGlobPlugin());
	}
	if (report && LogLevels[logger.level] >= 3) plugins.push(ReportPlugin(report, logger, cwd, cjsDts, name, isMultiFormat));
	if (!cjsDts) plugins.push(userPlugins);
	const define = {
		...config.define,
		...Object.keys(env).reduce((acc, key) => {
			const value = JSON.stringify(env[key]);
			acc[`process.env.${key}`] = value;
			acc[`import.meta.env.${key}`] = value;
			return acc;
		}, Object.create(null))
	};
	const inject = shims && !cjsDts ? getShimsInject(format, platform) : void 0;
	return await mergeUserOptions({
		input: entry,
		cwd,
		external,
		resolve: { alias },
		tsconfig: tsconfig || void 0,
		treeshake,
		platform: cjsDts || format === "cjs" ? "node" : platform,
		transform: {
			target,
			define,
			inject
		},
		plugins,
		moduleTypes: loader,
		logLevel: logger.level === "error" ? "silent" : logger.level,
		onLog: cjsDefault ? (level, log, defaultHandler) => {
			if (log.code === "MIXED_EXPORT") return;
			defaultHandler(level, log);
		} : void 0,
		debug: debug$9 || void 0
	}, config.inputOptions, [format, { cjsDts }]);
}
async function resolveOutputOptions(inputOptions, config, format, cjsDts) {
	const { entry, outDir, sourcemap, minify, unbundle, banner, footer, cjsDefault } = config;
	const [entryFileNames, chunkFileNames] = resolveChunkFilename(config, inputOptions, format);
	return await mergeUserOptions({
		format: cjsDts ? "es" : format,
		name: config.globalName,
		sourcemap,
		dir: outDir,
		exports: cjsDefault ? "auto" : "named",
		minify: !cjsDts && minify,
		entryFileNames,
		chunkFileNames,
		preserveModules: unbundle,
		preserveModulesRoot: unbundle ? lowestCommonAncestor(...Object.values(entry)) : void 0,
		banner: resolveChunkAddon(banner, format),
		footer: resolveChunkAddon(footer, format)
	}, config.outputOptions, [format, { cjsDts }]);
}
async function getDebugRolldownDir() {
	if (!debug.enabled) return;
	return await mkdtemp(join(tmpdir(), "tsdown-config-"));
}
async function debugBuildOptions(dir, name, format, buildOptions) {
	const outFile = join(dir, `tsdown.config.${format}.js`);
	handlePluginInspect(buildOptions.plugins);
	const serialized = util.formatWithOptions({
		depth: null,
		maxArrayLength: null,
		maxStringLength: null
	}, buildOptions);
	await writeFile(outFile, `/*
Auto-generated rolldown config for tsdown debug purposes
tsdown v${version}, rolldown v${VERSION}
Generated on ${(/* @__PURE__ */ new Date()).toISOString()}
Package name: ${name || "not specified"}
*/

export default ${serialized}\n`);
	debug("Wrote debug rolldown config for \"%s\" (%s) -> %s", name || "default name", format, outFile);
}
function handlePluginInspect(plugins) {
	if (Array.isArray(plugins)) for (const plugin of plugins) handlePluginInspect(plugin);
	else if (typeof plugins === "object" && plugins !== null && "name" in plugins) plugins[util.inspect.custom] = function(depth, options, inspect) {
		if ("_options" in plugins) return inspect({
			name: plugins.name,
			options: plugins._options
		}, options);
		else return `"rolldown plugin: ${plugins.name}"`;
	};
}

//#endregion
//#region src/features/shortcuts.ts
function shortcuts(restart) {
	let actionRunning = false;
	async function onInput(input) {
		if (actionRunning) return;
		const SHORTCUTS = [
			{
				key: "r",
				description: "reload config and rebuild",
				action() {
					restart();
				}
			},
			{
				key: "c",
				description: "clear console",
				action() {
					console.clear();
				}
			},
			{
				key: "q",
				description: "quit",
				action() {
					process.exit(0);
				}
			}
		];
		if (input === "h") {
			const loggedKeys = /* @__PURE__ */ new Set();
			globalLogger.info("  Shortcuts");
			for (const shortcut$1 of SHORTCUTS) {
				if (loggedKeys.has(shortcut$1.key)) continue;
				loggedKeys.add(shortcut$1.key);
				if (shortcut$1.action == null) continue;
				globalLogger.info(dim`  press ` + bold`${shortcut$1.key} + enter` + dim` to ${shortcut$1.description}`);
			}
			return;
		}
		const shortcut = SHORTCUTS.find((shortcut$1) => shortcut$1.key === input);
		if (!shortcut) return;
		actionRunning = true;
		await shortcut.action();
		actionRunning = false;
	}
	const rl = readline.createInterface({ input: process.stdin });
	rl.on("line", onInput);
	return () => rl.close();
}

//#endregion
//#region src/features/watch.ts
const endsWithConfig = /[\\/](?:(?:package|tsconfig)\.json|pnpm-(?:workspace|lock)\.yaml|tsdown\.config.*)$/;
async function watchBuild(options, configFiles, rebuild, restart) {
	if (typeof options.watch === "boolean" && options.outDir === options.cwd) throw new Error(`Watch is enabled, but output directory is the same as the current working directory.Please specify a different watch directory using ${blue`watch`} option,or set ${blue`outDir`} to a different directory.`);
	const files = toArray(typeof options.watch === "boolean" ? options.cwd : options.watch);
	options.logger.info(`Watching for changes in ${files.join(", ")}`);
	files.push(...configFiles);
	const { watch } = await import("chokidar");
	const debouncedOnChange = debounce(onChange, 100);
	const watcher = watch(files, {
		cwd: options.cwd,
		ignoreInitial: true,
		ignorePermissionErrors: true,
		ignored: [
			/[\\/]\.git[\\/]/,
			RE_NODE_MODULES,
			options.outDir,
			...options.ignoreWatch
		]
	});
	let pending = [];
	let pendingPromise;
	watcher.on("all", (type, file) => {
		pending.push(path.resolve(options.cwd, file));
		debouncedOnChange();
	});
	return watcher;
	async function onChange() {
		await pendingPromise;
		if (!pending.length) return;
		for (const file of pending) invalidateContextFile(globalContext, file);
		if (pending.some((file) => configFiles.includes(file) || endsWithConfig.test(file))) {
			options.logger.info(`Restarting due to config change...`);
			pendingPromise = restart();
		} else {
			options.logger.info(`Change detected: ${pending.join(", ")}`);
			pendingPromise = rebuild();
		}
		pending = [];
		await pendingPromise;
	}
}

//#endregion
//#region src/index.ts
/**
* Build with tsdown.
*/
async function build$1(userOptions = {}) {
	globalLogger.level = userOptions.logLevel || (userOptions.silent ? "error" : "info");
	const { configs, files: configFiles } = await resolveConfig(userOptions);
	let cleanPromise;
	const clean = () => {
		if (cleanPromise) return cleanPromise;
		return cleanPromise = cleanOutDir(configs);
	};
	globalLogger.info("Build start");
	const rebuilds = await Promise.all(configs.map((options) => buildSingle(options, clean)));
	const disposeCbs = [];
	for (const [i, config] of configs.entries()) {
		const rebuild = rebuilds[i];
		if (!rebuild) continue;
		setWatch();
		const watcher = await watchBuild(config, configFiles, rebuild, restart);
		disposeCbs.push(() => watcher.close());
	}
	let firstDevtoolsConfig = configs.find((config) => config.debug && config.debug.devtools);
	if (disposeCbs.length && firstDevtoolsConfig) {
		globalLogger.warn("Devtools is not supported in watch mode, disabling it.");
		firstDevtoolsConfig = void 0;
	}
	if (firstDevtoolsConfig) {
		const { start } = await importWithError("@vitejs/devtools/cli-commands");
		const devtoolsOptions = firstDevtoolsConfig.debug.devtools;
		await start({
			host: "127.0.0.1",
			open: true,
			...typeof devtoolsOptions === "object" ? devtoolsOptions : {}
		});
	}
	if (disposeCbs.length) disposeCbs.push(shortcuts(restart));
	async function restart() {
		for (const dispose of disposeCbs) await dispose();
		build$1(userOptions);
	}
}
const dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(dirname$1, "..");
/** @internal */
const shimFile = path.resolve(pkgRoot, "esm-shims.js");
/**
* Build a single configuration, without watch and shortcuts features.
*
* Internal API, not for public use
*
* @private
* @param config Resolved options
*/
async function buildSingle(config, clean) {
	const { format: formats, dts, watch, onSuccess, logger } = config;
	let ab;
	const { hooks, context } = await createHooks$1(config);
	warnLegacyCJS(config);
	await rebuild(true);
	if (watch) return () => rebuild();
	async function rebuild(first) {
		const startTime = performance.now();
		await hooks.callHook("build:prepare", context);
		ab?.abort();
		if (first) await clean();
		else await cleanOutDir([config]);
		let hasErrors = false;
		const isMultiFormat = formats.length > 1;
		const chunks = {};
		const debugRolldownDir = await getDebugRolldownDir();
		await Promise.all(formats.map(async (format) => {
			try {
				const buildOptions = await getBuildOptions(config, format, isMultiFormat, false);
				await hooks.callHook("build:before", {
					...context,
					buildOptions
				});
				if (debugRolldownDir) await debugBuildOptions(debugRolldownDir, config.name, format, buildOptions);
				const { output } = await build(buildOptions);
				chunks[format] = output;
				if (format === "cjs" && dts) {
					const { output: output$1 } = await build(await getBuildOptions(config, format, isMultiFormat, true));
					chunks[format].push(...output$1);
				}
			} catch (error) {
				if (watch) {
					logger.error(error);
					hasErrors = true;
					return;
				}
				throw error;
			}
		}));
		if (hasErrors) return;
		await Promise.all([writeExports(config, chunks), copy(config)]);
		await Promise.all([publint(config), attw(config)]);
		await hooks.callHook("build:done", context);
		logger.success(prettyName(config.name), `${first ? "Build" : "Rebuild"} complete in ${green(`${Math.round(performance.now() - startTime)}ms`)}`);
		ab = new AbortController();
		if (typeof onSuccess === "string") {
			const p = exec(onSuccess, [], { nodeOptions: {
				shell: true,
				stdio: "inherit"
			} });
			p.then(({ exitCode }) => {
				if (exitCode) process.exitCode = exitCode;
			});
			ab.signal.addEventListener("abort", () => {
				if (typeof p.pid === "number") treeKill(p.pid);
			});
		} else await onSuccess?.(config, ab.signal);
	}
}

//#endregion
export { ReportPlugin as a, ShebangPlugin as i, buildSingle as n, NodeProtocolPlugin as o, shimFile as r, ExternalPlugin as s, build$1 as t };