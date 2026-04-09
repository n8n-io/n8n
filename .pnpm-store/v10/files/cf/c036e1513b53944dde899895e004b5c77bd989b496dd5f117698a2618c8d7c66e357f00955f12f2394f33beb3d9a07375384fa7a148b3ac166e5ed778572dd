import { t as require_binding } from "./binding-kg77KQCQ.mjs";
import { i as logInputHookInOutputPlugin, n as error } from "./logs-CSQ_UMWp.mjs";
import { i as unimplemented } from "./misc-CxyvWjTr.mjs";
import { C as LOG_LEVEL_INFO, S as LOG_LEVEL_ERROR, T as logLevelPriority, _ as VERSION, b as normalizeLog, c as transformToRollupOutput, d as __decorate, g as MinimalPluginContextImpl, h as PlainObjectLike, m as lazyProp, n as BuiltinPlugin, p as transformAssetSource, u as transformRenderedChunk, w as LOG_LEVEL_WARN, x as LOG_LEVEL_DEBUG } from "./normalize-string-or-regex-VlPkMWXA.mjs";
import { c as normalizeHook, i as transformModuleInfo, s as unwrapBindingResult, t as bindingifyInputOptions } from "./bindingify-input-options-6nBAYjYP.mjs";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { styleText } from "node:util";
import os from "node:os";

//#region src/log/logger.ts
function getLogger(plugins, onLog, logLevel, watchMode) {
	const minimalPriority = logLevelPriority[logLevel];
	const logger = (level, log, skipped = /* @__PURE__ */ new Set()) => {
		if (logLevelPriority[level] < minimalPriority) return;
		for (const plugin of getSortedPlugins("onLog", plugins)) {
			if (skipped.has(plugin)) continue;
			const { onLog: pluginOnLog } = plugin;
			if (pluginOnLog) {
				const getLogHandler = (level$1) => {
					if (logLevelPriority[level$1] < minimalPriority) return () => {};
					return (log$1) => logger(level$1, normalizeLog(log$1), new Set(skipped).add(plugin));
				};
				if (("handler" in pluginOnLog ? pluginOnLog.handler : pluginOnLog).call({
					debug: getLogHandler(LOG_LEVEL_DEBUG),
					error: (log$1) => error(normalizeLog(log$1)),
					info: getLogHandler(LOG_LEVEL_INFO),
					meta: {
						rollupVersion: "4.23.0",
						rolldownVersion: VERSION,
						watchMode
					},
					warn: getLogHandler(LOG_LEVEL_WARN),
					pluginName: plugin.name || "unknown"
				}, level, log) === false) return;
			}
		}
		onLog(level, log);
	};
	return logger;
}
const getOnLog = (config, logLevel, printLog = defaultPrintLog) => {
	const { onwarn, onLog } = config;
	const defaultOnLog = getDefaultOnLog(printLog, onwarn);
	if (onLog) {
		const minimalPriority = logLevelPriority[logLevel];
		return (level, log) => onLog(level, addLogToString(log), (level$1, handledLog) => {
			if (level$1 === LOG_LEVEL_ERROR) return error(normalizeLog(handledLog));
			if (logLevelPriority[level$1] >= minimalPriority) defaultOnLog(level$1, normalizeLog(handledLog));
		});
	}
	return defaultOnLog;
};
const getDefaultOnLog = (printLog, onwarn) => onwarn ? (level, log) => {
	if (level === LOG_LEVEL_WARN) onwarn(addLogToString(log), (warning) => printLog(LOG_LEVEL_WARN, normalizeLog(warning)));
	else printLog(level, log);
} : printLog;
const addLogToString = (log) => {
	Object.defineProperty(log, "toString", {
		value: () => getExtendedLogMessage(log),
		writable: true
	});
	return log;
};
const defaultPrintLog = (level, log) => {
	const message = getExtendedLogMessage(log);
	switch (level) {
		case LOG_LEVEL_WARN: return console.warn(message);
		case LOG_LEVEL_DEBUG: return console.debug(message);
		default: return console.info(message);
	}
};
const getExtendedLogMessage = (log) => {
	let prefix = "";
	if (log.plugin) prefix += `(${log.plugin} plugin) `;
	if (log.loc) prefix += `${relativeId(log.loc.file)} (${log.loc.line}:${log.loc.column}) `;
	return prefix + log.message;
};
function relativeId(id) {
	if (!path.isAbsolute(id)) return id;
	return path.relative(path.resolve(), id);
}

//#endregion
//#region src/constants/plugin.ts
const ENUMERATED_INPUT_PLUGIN_HOOK_NAMES = [
	"options",
	"buildStart",
	"resolveId",
	"load",
	"transform",
	"moduleParsed",
	"buildEnd",
	"onLog",
	"resolveDynamicImport",
	"closeBundle",
	"closeWatcher",
	"watchChange"
];
const ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES = [
	"augmentChunkHash",
	"outputOptions",
	"renderChunk",
	"renderStart",
	"renderError",
	"writeBundle",
	"generateBundle"
];
const ENUMERATED_PLUGIN_HOOK_NAMES = [
	...ENUMERATED_INPUT_PLUGIN_HOOK_NAMES,
	...ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES,
	"footer",
	"banner",
	"intro",
	"outro"
];
/**
* Names of all defined hooks. It's like
* ```js
* const DEFINED_HOOK_NAMES ={
*   options: 'options',
*   buildStart: 'buildStart',
*   ...
* }
* ```
*/
const DEFINED_HOOK_NAMES = {
	[ENUMERATED_PLUGIN_HOOK_NAMES[0]]: ENUMERATED_PLUGIN_HOOK_NAMES[0],
	[ENUMERATED_PLUGIN_HOOK_NAMES[1]]: ENUMERATED_PLUGIN_HOOK_NAMES[1],
	[ENUMERATED_PLUGIN_HOOK_NAMES[2]]: ENUMERATED_PLUGIN_HOOK_NAMES[2],
	[ENUMERATED_PLUGIN_HOOK_NAMES[3]]: ENUMERATED_PLUGIN_HOOK_NAMES[3],
	[ENUMERATED_PLUGIN_HOOK_NAMES[4]]: ENUMERATED_PLUGIN_HOOK_NAMES[4],
	[ENUMERATED_PLUGIN_HOOK_NAMES[5]]: ENUMERATED_PLUGIN_HOOK_NAMES[5],
	[ENUMERATED_PLUGIN_HOOK_NAMES[6]]: ENUMERATED_PLUGIN_HOOK_NAMES[6],
	[ENUMERATED_PLUGIN_HOOK_NAMES[7]]: ENUMERATED_PLUGIN_HOOK_NAMES[7],
	[ENUMERATED_PLUGIN_HOOK_NAMES[8]]: ENUMERATED_PLUGIN_HOOK_NAMES[8],
	[ENUMERATED_PLUGIN_HOOK_NAMES[9]]: ENUMERATED_PLUGIN_HOOK_NAMES[9],
	[ENUMERATED_PLUGIN_HOOK_NAMES[10]]: ENUMERATED_PLUGIN_HOOK_NAMES[10],
	[ENUMERATED_PLUGIN_HOOK_NAMES[11]]: ENUMERATED_PLUGIN_HOOK_NAMES[11],
	[ENUMERATED_PLUGIN_HOOK_NAMES[12]]: ENUMERATED_PLUGIN_HOOK_NAMES[12],
	[ENUMERATED_PLUGIN_HOOK_NAMES[13]]: ENUMERATED_PLUGIN_HOOK_NAMES[13],
	[ENUMERATED_PLUGIN_HOOK_NAMES[14]]: ENUMERATED_PLUGIN_HOOK_NAMES[14],
	[ENUMERATED_PLUGIN_HOOK_NAMES[15]]: ENUMERATED_PLUGIN_HOOK_NAMES[15],
	[ENUMERATED_PLUGIN_HOOK_NAMES[16]]: ENUMERATED_PLUGIN_HOOK_NAMES[16],
	[ENUMERATED_PLUGIN_HOOK_NAMES[17]]: ENUMERATED_PLUGIN_HOOK_NAMES[17],
	[ENUMERATED_PLUGIN_HOOK_NAMES[18]]: ENUMERATED_PLUGIN_HOOK_NAMES[18],
	[ENUMERATED_PLUGIN_HOOK_NAMES[19]]: ENUMERATED_PLUGIN_HOOK_NAMES[19],
	[ENUMERATED_PLUGIN_HOOK_NAMES[20]]: ENUMERATED_PLUGIN_HOOK_NAMES[20],
	[ENUMERATED_PLUGIN_HOOK_NAMES[21]]: ENUMERATED_PLUGIN_HOOK_NAMES[21],
	[ENUMERATED_PLUGIN_HOOK_NAMES[22]]: ENUMERATED_PLUGIN_HOOK_NAMES[22]
};

//#endregion
//#region src/utils/async-flatten.ts
async function asyncFlatten(array$1) {
	do
		array$1 = (await Promise.all(array$1)).flat(Infinity);
	while (array$1.some((v) => v?.then));
	return array$1;
}

//#endregion
//#region src/utils/normalize-plugin-option.ts
const normalizePluginOption = async (plugins) => (await asyncFlatten([plugins])).filter(Boolean);
function checkOutputPluginOption(plugins, onLog) {
	for (const plugin of plugins) for (const hook of ENUMERATED_INPUT_PLUGIN_HOOK_NAMES) if (hook in plugin) {
		delete plugin[hook];
		onLog(LOG_LEVEL_WARN, logInputHookInOutputPlugin(plugin.name, hook));
	}
	return plugins;
}
function normalizePlugins(plugins, anonymousPrefix) {
	for (const [index, plugin] of plugins.entries()) {
		if ("_parallel" in plugin) continue;
		if (plugin instanceof BuiltinPlugin) continue;
		if (!plugin.name) plugin.name = `${anonymousPrefix}${index + 1}`;
	}
	return plugins;
}
const ANONYMOUS_PLUGIN_PREFIX = "at position ";
const ANONYMOUS_OUTPUT_PLUGIN_PREFIX = "at output position ";

//#endregion
//#region src/plugin/plugin-driver.ts
var PluginDriver = class {
	static async callOptionsHook(inputOptions, watchMode = false) {
		const logLevel = inputOptions.logLevel || LOG_LEVEL_INFO;
		const plugins = getSortedPlugins("options", getObjectPlugins(await normalizePluginOption(inputOptions.plugins)));
		const logger = getLogger(plugins, getOnLog(inputOptions, logLevel), logLevel, watchMode);
		for (const plugin of plugins) {
			const name = plugin.name || "unknown";
			const options = plugin.options;
			if (options) {
				const { handler } = normalizeHook(options);
				const result = await handler.call(new MinimalPluginContextImpl(logger, logLevel, name, watchMode, "onLog"), inputOptions);
				if (result) inputOptions = result;
			}
		}
		return inputOptions;
	}
	static callOutputOptionsHook(rawPlugins, outputOptions, onLog, logLevel, watchMode) {
		const sortedPlugins = getSortedPlugins("outputOptions", getObjectPlugins(rawPlugins));
		for (const plugin of sortedPlugins) {
			const name = plugin.name || "unknown";
			const options = plugin.outputOptions;
			if (options) {
				const { handler } = normalizeHook(options);
				const result = handler.call(new MinimalPluginContextImpl(onLog, logLevel, name, watchMode), outputOptions);
				if (result) outputOptions = result;
			}
		}
		return outputOptions;
	}
};
function getObjectPlugins(plugins) {
	return plugins.filter((plugin) => {
		if (!plugin) return;
		if ("_parallel" in plugin) return;
		if (plugin instanceof BuiltinPlugin) return;
		return plugin;
	});
}
function getSortedPlugins(hookName, plugins) {
	const pre = [];
	const normal = [];
	const post = [];
	for (const plugin of plugins) {
		const hook = plugin[hookName];
		if (hook) {
			if (typeof hook === "object") {
				if (hook.order === "pre") {
					pre.push(plugin);
					continue;
				}
				if (hook.order === "post") {
					post.push(plugin);
					continue;
				}
			}
			normal.push(plugin);
		}
	}
	return [
		...pre,
		...normal,
		...post
	];
}

//#endregion
//#region ../../node_modules/.pnpm/valibot@1.1.0_typescript@5.9.3/node_modules/valibot/dist/index.js
var store;
/* @__NO_SIDE_EFFECTS__ */
function getGlobalConfig(config2) {
	return {
		lang: config2?.lang ?? store?.lang,
		message: config2?.message,
		abortEarly: config2?.abortEarly ?? store?.abortEarly,
		abortPipeEarly: config2?.abortPipeEarly ?? store?.abortPipeEarly
	};
}
var store2;
/* @__NO_SIDE_EFFECTS__ */
function getGlobalMessage(lang) {
	return store2?.get(lang);
}
var store3;
/* @__NO_SIDE_EFFECTS__ */
function getSchemaMessage(lang) {
	return store3?.get(lang);
}
var store4;
/* @__NO_SIDE_EFFECTS__ */
function getSpecificMessage(reference, lang) {
	return store4?.get(reference)?.get(lang);
}
/* @__NO_SIDE_EFFECTS__ */
function _stringify(input) {
	const type = typeof input;
	if (type === "string") return `"${input}"`;
	if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
	if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
	return type;
}
function _addIssue(context, label, dataset, config2, other) {
	const input = other && "input" in other ? other.input : dataset.value;
	const expected = other?.expected ?? context.expects ?? null;
	const received = other?.received ?? /* @__PURE__ */ _stringify(input);
	const issue = {
		kind: context.kind,
		type: context.type,
		input,
		expected,
		received,
		message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
		requirement: context.requirement,
		path: other?.path,
		issues: other?.issues,
		lang: config2.lang,
		abortEarly: config2.abortEarly,
		abortPipeEarly: config2.abortPipeEarly
	};
	const isSchema = context.kind === "schema";
	const message2 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config2.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
	if (message2 !== void 0) issue.message = typeof message2 === "function" ? message2(issue) : message2;
	if (isSchema) dataset.typed = false;
	if (dataset.issues) dataset.issues.push(issue);
	else dataset.issues = [issue];
}
/* @__NO_SIDE_EFFECTS__ */
function _getStandardProps(context) {
	return {
		version: 1,
		vendor: "valibot",
		validate(value2) {
			return context["~run"]({ value: value2 }, /* @__PURE__ */ getGlobalConfig());
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function _isValidObjectKey(object2, key) {
	return Object.hasOwn(object2, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
/* @__NO_SIDE_EFFECTS__ */
function _joinExpects(values2, separator) {
	const list = [...new Set(values2)];
	if (list.length > 1) return `(${list.join(` ${separator} `)})`;
	return list[0] ?? "never";
}
var ValiError = class extends Error {
	/**
	* Creates a Valibot error with useful information.
	*
	* @param issues The error issues.
	*/
	constructor(issues) {
		super(issues[0].message);
		this.name = "ValiError";
		this.issues = issues;
	}
};
/* @__NO_SIDE_EFFECTS__ */
function args(schema) {
	return {
		kind: "transformation",
		type: "args",
		reference: args,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const argsDataset = this.schema["~run"]({ value: args_ }, config2);
				if (argsDataset.issues) throw new ValiError(argsDataset.issues);
				return func(...argsDataset.value);
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function awaitAsync() {
	return {
		kind: "transformation",
		type: "await",
		reference: awaitAsync,
		async: true,
		async "~run"(dataset) {
			dataset.value = await dataset.value;
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function description(description_) {
	return {
		kind: "metadata",
		type: "description",
		reference: description,
		description: description_
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returns(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returns,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const returnsDataset = this.schema["~run"]({ value: func(...args_) }, config2);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returnsAsync(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returnsAsync,
		async: false,
		schema,
		"~run"(dataset, config2) {
			const func = dataset.value;
			dataset.value = async (...args_) => {
				const returnsDataset = await this.schema["~run"]({ value: await func(...args_) }, config2);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function getFallback(schema, dataset, config2) {
	return typeof schema.fallback === "function" ? schema.fallback(dataset, config2) : schema.fallback;
}
/* @__NO_SIDE_EFFECTS__ */
function getDefault(schema, dataset, config2) {
	return typeof schema.default === "function" ? schema.default(dataset, config2) : schema.default;
}
/* @__NO_SIDE_EFFECTS__ */
function any() {
	return {
		kind: "schema",
		type: "any",
		reference: any,
		expects: "any",
		async: false,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset) {
			dataset.typed = true;
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function array(item, message2) {
	return {
		kind: "schema",
		type: "array",
		reference: array,
		expects: "Array",
		async: false,
		item,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < input.length; key++) {
					const value2 = input[key];
					const itemDataset = this.item["~run"]({ value: value2 }, config2);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value2
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function boolean(message2) {
	return {
		kind: "schema",
		type: "boolean",
		reference: boolean,
		expects: "boolean",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "boolean") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function custom(check2, message2) {
	return {
		kind: "schema",
		type: "custom",
		reference: custom,
		expects: "unknown",
		async: false,
		check: check2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (this.check(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function function_(message2) {
	return {
		kind: "schema",
		type: "function",
		reference: function_,
		expects: "Function",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "function") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function instance(class_, message2) {
	return {
		kind: "schema",
		type: "instance",
		reference: instance,
		expects: class_.name,
		async: false,
		class: class_,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value instanceof this.class) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function literal(literal_, message2) {
	return {
		kind: "schema",
		type: "literal",
		reference: literal,
		expects: /* @__PURE__ */ _stringify(literal_),
		async: false,
		literal: literal_,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === this.literal) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function looseObject(entries2, message2) {
	return {
		kind: "schema",
		type: "loose_object",
		reference: looseObject,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
				if (!dataset.issues || !config2.abortEarly) {
					for (const key in input) if (/* @__PURE__ */ _isValidObjectKey(input, key) && !(key in this.entries)) dataset.value[key] = input[key];
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function never(message2) {
	return {
		kind: "schema",
		type: "never",
		reference: never,
		expects: "never",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			_addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function nullish(wrapped, default_) {
	return {
		kind: "schema",
		type: "nullish",
		reference: nullish,
		expects: `(${wrapped.expects} | null | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === null || dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config2);
				if (dataset.value === null || dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config2);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function number(message2) {
	return {
		kind: "schema",
		type: "number",
		reference: number,
		expects: "number",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function object(entries2, message2) {
	return {
		kind: "schema",
		type: "object",
		reference: object,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function optional(wrapped, default_) {
	return {
		kind: "schema",
		type: "optional",
		reference: optional,
		expects: `(${wrapped.expects} | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config2);
				if (dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config2);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function picklist(options, message2) {
	return {
		kind: "schema",
		type: "picklist",
		reference: picklist,
		expects: /* @__PURE__ */ _joinExpects(options.map(_stringify), "|"),
		async: false,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (this.options.includes(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function promise(message2) {
	return {
		kind: "schema",
		type: "promise",
		reference: promise,
		expects: "Promise",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value instanceof Promise) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function record(key, value2, message2) {
	return {
		kind: "schema",
		type: "record",
		reference: record,
		expects: "Object",
		async: false,
		key,
		value: value2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const entryKey in input) if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
					const entryValue = input[entryKey];
					const keyDataset = this.key["~run"]({ value: entryKey }, config2);
					if (keyDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "key",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of keyDataset.issues) {
							issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = keyDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					const valueDataset = this.value["~run"]({ value: entryValue }, config2);
					if (valueDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "value",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of valueDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = valueDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!keyDataset.typed || !valueDataset.typed) dataset.typed = false;
					if (keyDataset.typed) dataset.value[keyDataset.value] = valueDataset.value;
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function strictObject(entries2, message2) {
	return {
		kind: "schema",
		type: "strict_object",
		reference: strictObject,
		expects: "Object",
		async: false,
		entries: entries2,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value2 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value2 }, config2);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value2
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config2.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config2, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config2.abortEarly) break;
					}
				}
				if (!dataset.issues || !config2.abortEarly) {
					for (const key in input) if (!(key in this.entries)) {
						_addIssue(this, "key", dataset, config2, {
							input: key,
							expected: "never",
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						break;
					}
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function string(message2) {
	return {
		kind: "schema",
		type: "string",
		reference: string,
		expects: "string",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (typeof dataset.value === "string") dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function tuple(items, message2) {
	return {
		kind: "schema",
		type: "tuple",
		reference: tuple,
		expects: "Array",
		async: false,
		items,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < this.items.length; key++) {
					const value2 = input[key];
					const itemDataset = this.items[key]["~run"]({ value: value2 }, config2);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value2
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config2.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function undefined_(message2) {
	return {
		kind: "schema",
		type: "undefined",
		reference: undefined_,
		expects: "undefined",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function _subIssues(datasets) {
	let issues;
	if (datasets) for (const dataset of datasets) if (issues) issues.push(...dataset.issues);
	else issues = dataset.issues;
	return issues;
}
/* @__NO_SIDE_EFFECTS__ */
function union(options, message2) {
	return {
		kind: "schema",
		type: "union",
		reference: union,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: false,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = schema["~run"]({ value: dataset.value }, config2);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function unionAsync(options, message2) {
	return {
		kind: "schema",
		type: "union",
		reference: unionAsync,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: true,
		options,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config2) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = await schema["~run"]({ value: dataset.value }, config2);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config2, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function void_(message2) {
	return {
		kind: "schema",
		type: "void",
		reference: void_,
		expects: "void",
		async: false,
		message: message2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config2);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function keyof(schema, message2) {
	return /* @__PURE__ */ picklist(Object.keys(schema.entries), message2);
}
/* @__NO_SIDE_EFFECTS__ */
function omit(schema, keys) {
	const entries2 = { ...schema.entries };
	for (const key of keys) delete entries2[key];
	return {
		...schema,
		entries: entries2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function partial(schema, keys) {
	const entries2 = {};
	for (const key in schema.entries) entries2[key] = !keys || keys.includes(key) ? /* @__PURE__ */ optional(schema.entries[key]) : schema.entries[key];
	return {
		...schema,
		entries: entries2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipe(...pipe2) {
	return {
		...pipe2[0],
		pipe: pipe2,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config2) {
			for (const item of pipe2) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) dataset = item["~run"](dataset, config2);
			}
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipeAsync(...pipe2) {
	return {
		...pipe2[0],
		pipe: pipe2,
		async: true,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config2) {
			for (const item of pipe2) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) dataset = await item["~run"](dataset, config2);
			}
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function safeParse(schema, input, config2) {
	const dataset = schema["~run"]({ value: input }, /* @__PURE__ */ getGlobalConfig(config2));
	return {
		typed: dataset.typed,
		success: !dataset.issues,
		output: dataset.value,
		issues: dataset.issues
	};
}

//#endregion
//#region src/utils/flatten-valibot-schema.ts
function unwrapSchema(schema) {
	if (!schema) return schema;
	if (schema.type === "optional" && schema.wrapped) return unwrapSchema(schema.wrapped);
	if (schema.type === "nullable" && schema.wrapped) return unwrapSchema(schema.wrapped);
	if (schema.type === "nullish" && schema.wrapped) return unwrapSchema(schema.wrapped);
	return schema;
}
function getValibotSchemaType(schema) {
	if (!schema) return "any";
	if (schema.type) switch (schema.type) {
		case "string": return "string";
		case "number": return "number";
		case "boolean": return "boolean";
		case "array": return "array";
		case "object":
		case "strict_object":
		case "loose_object": return "object";
		case "union": return "union";
		case "literal": return typeof schema.literal;
		case "record": return "object";
		case "optional": return getValibotSchemaType(schema.wrapped);
		case "nullable": return getValibotSchemaType(schema.wrapped);
		case "nullish": return getValibotSchemaType(schema.wrapped);
		case "never": return "never";
		case "any": return "any";
		case "custom": return "any";
		case "function": return "never";
		case "instance": return "object";
		default: return "any";
	}
	return "any";
}
function getValibotDescription(schema) {
	if (!schema) return void 0;
	if (schema.pipe && Array.isArray(schema.pipe)) {
		for (const action of schema.pipe) if (action.type === "description" && action.description) return action.description;
	}
	if (schema.type === "optional" && schema.wrapped) return getValibotDescription(schema.wrapped);
}
function flattenValibotSchema(schema, result = {}, prefix = "") {
	if (!schema || typeof schema !== "object") return result;
	if (schema.type === "strict_object" || schema.type === "object" || schema.type === "loose_object") {
		if (schema.entries && typeof schema.entries === "object") for (const [key, value] of Object.entries(schema.entries)) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			const valueSchema = value;
			const type = getValibotSchemaType(valueSchema);
			const description$1 = getValibotDescription(valueSchema);
			if (type === "object") {
				const unwrappedSchema = unwrapSchema(valueSchema);
				if (unwrappedSchema && unwrappedSchema.entries) flattenValibotSchema(unwrappedSchema, result, fullKey);
				else result[fullKey] = {
					type,
					description: description$1
				};
			} else result[fullKey] = {
				type,
				description: description$1
			};
		}
	}
	return result;
}

//#endregion
//#region src/utils/style-text.ts
/**
* Cross-platform styleText utility that works in both Node.js and browser environments
* In Node.js, it uses the native `styleText` from `node:util`
* In browser, it provides empty styling functions for compatibility
*/
function styleText$1(...args$1) {
	return styleText(...args$1);
}

//#endregion
//#region src/utils/validator.ts
const StringOrRegExpSchema = union([string(), instance(RegExp)]);
function vFunction() {
	return function_();
}
const LogLevelSchema = union([
	literal("debug"),
	literal("info"),
	literal("warn")
]);
const LogLevelOptionSchema = union([LogLevelSchema, literal("silent")]);
const LogLevelWithErrorSchema = union([LogLevelSchema, literal("error")]);
const RollupLogSchema = any();
const RollupLogWithStringSchema = union([RollupLogSchema, string()]);
const InputOptionSchema = union([
	string(),
	array(string()),
	record(string(), string())
]);
const ExternalOptionFunctionSchema = pipe(vFunction(), args(tuple([
	string(),
	optional(string()),
	boolean()
])), returns(nullish(boolean())));
const ExternalOptionSchema = union([
	StringOrRegExpSchema,
	array(StringOrRegExpSchema),
	ExternalOptionFunctionSchema
]);
const ModuleTypesSchema = record(string(), union([
	literal("asset"),
	literal("base64"),
	literal("binary"),
	literal("css"),
	literal("dataurl"),
	literal("empty"),
	literal("js"),
	literal("json"),
	literal("jsx"),
	literal("text"),
	literal("ts"),
	literal("tsx")
]));
const JsxOptionsSchema = strictObject({
	runtime: pipe(optional(union([literal("classic"), literal("automatic")])), description("Which runtime to use")),
	development: pipe(optional(boolean()), description("Development specific information")),
	throwIfNamespace: pipe(optional(boolean()), description("Toggles whether to throw an error when a tag name uses an XML namespace")),
	importSource: pipe(optional(string()), description("Import the factory of element and fragment if mode is classic")),
	pragma: pipe(optional(string()), description("Jsx element transformation")),
	pragmaFrag: pipe(optional(string()), description("Jsx fragment transformation")),
	refresh: pipe(optional(boolean()), description("Enable react fast refresh"))
});
const HelperModeSchema = union([literal("Runtime"), literal("External")]);
const DecoratorOptionSchema = object({
	legacy: optional(boolean()),
	emitDecoratorMetadata: optional(boolean())
});
const HelpersSchema = object({ mode: optional(HelperModeSchema) });
const RewriteImportExtensionsSchema = union([
	literal("rewrite"),
	literal("remove"),
	boolean()
]);
const TypescriptSchema = object({
	jsxPragma: optional(string()),
	jsxPragmaFrag: optional(string()),
	onlyRemoveTypeImports: optional(boolean()),
	allowNamespaces: optional(boolean()),
	allowDeclareFields: optional(boolean()),
	declaration: optional(object({
		stripInternal: optional(boolean()),
		sourcemap: optional(boolean())
	})),
	rewriteImportExtensions: optional(RewriteImportExtensionsSchema)
});
const AssumptionsSchema = object({
	ignoreFunctionLength: optional(boolean()),
	noDocumentAll: optional(boolean()),
	objectRestNoSymbols: optional(boolean()),
	pureGetters: optional(boolean()),
	setPublicClassFields: optional(boolean())
});
const TransformOptionsSchema = object({
	assumptions: optional(AssumptionsSchema),
	typescript: optional(TypescriptSchema),
	helpers: optional(HelpersSchema),
	decorators: optional(DecoratorOptionSchema),
	jsx: optional(union([
		literal(false),
		literal("preserve"),
		literal("react"),
		literal("react-jsx"),
		JsxOptionsSchema
	])),
	target: pipe(optional(union([string(), array(string())])), description("The JavaScript target environment")),
	define: pipe(optional(record(string(), string())), description("Define global variables")),
	inject: pipe(optional(record(string(), union([string(), tuple([string(), string()])]))), description("Inject import statements on demand")),
	dropLabels: pipe(optional(array(string())), description("Remove labeled statements with these label names"))
});
const WatchOptionsSchema = strictObject({
	chokidar: optional(never(`The "watch.chokidar" option is deprecated, please use "watch.notify" instead of it`)),
	exclude: optional(union([StringOrRegExpSchema, array(StringOrRegExpSchema)])),
	include: optional(union([StringOrRegExpSchema, array(StringOrRegExpSchema)])),
	notify: pipe(optional(strictObject({
		compareContents: optional(boolean()),
		pollInterval: optional(number())
	})), description("Notify options")),
	skipWrite: pipe(optional(boolean()), description("Skip the bundle.write() step")),
	buildDelay: pipe(optional(number()), description("Throttle watch rebuilds")),
	clearScreen: pipe(optional(boolean()), description("Whether to clear the screen when a rebuild is triggered")),
	onInvalidate: pipe(optional(pipe(function_(), args(tuple([string()])))), description("An optional function that will be called immediately every time a module changes that is part of the build."))
});
const ChecksOptionsSchema = strictObject({
	circularDependency: pipe(optional(boolean()), description("Whether to emit warning when detecting circular dependency")),
	eval: pipe(optional(boolean()), description("Whether to emit warning when detecting eval")),
	missingGlobalName: pipe(optional(boolean()), description("Whether to emit warning when detecting missing global name")),
	missingNameOptionForIifeExport: pipe(optional(boolean()), description("Whether to emit warning when detecting missing name option for iife export")),
	mixedExport: pipe(optional(boolean()), description("Whether to emit warning when detecting mixed export")),
	unresolvedEntry: pipe(optional(boolean()), description("Whether to emit warning when detecting unresolved entry")),
	unresolvedImport: pipe(optional(boolean()), description("Whether to emit warning when detecting unresolved import")),
	filenameConflict: pipe(optional(boolean()), description("Whether to emit warning when detecting filename conflict")),
	commonJsVariableInEsm: pipe(optional(boolean()), description("Whether to emit warning when detecting common js variable in esm")),
	importIsUndefined: pipe(optional(boolean()), description("Whether to emit warning when detecting import is undefined")),
	emptyImportMeta: pipe(optional(boolean()), description("Whether to emit warning when detecting empty import meta")),
	configurationFieldConflict: pipe(optional(boolean()), description("Whether to emit warning when detecting configuration field conflict")),
	preferBuiltinFeature: pipe(optional(boolean()), description("Whether to emit warning when detecting prefer builtin feature")),
	couldNotCleanDirectory: pipe(optional(boolean()), description("Whether to emit warning when detecting could not clean directory"))
});
const CompressOptionsKeepNamesSchema = strictObject({
	function: boolean(),
	class: boolean()
});
const CompressOptionsSchema = strictObject({
	target: optional(union([
		literal("esnext"),
		literal("es2015"),
		literal("es2016"),
		literal("es2017"),
		literal("es2018"),
		literal("es2019"),
		literal("es2020"),
		literal("es2021"),
		literal("es2022"),
		literal("es2023"),
		literal("es2024")
	])),
	dropConsole: optional(boolean()),
	dropDebugger: optional(boolean()),
	keepNames: optional(CompressOptionsKeepNamesSchema),
	unused: optional(union([boolean(), literal("keep_assign")]))
});
const MangleOptionsKeepNamesSchema = strictObject({
	function: boolean(),
	class: boolean()
});
const MangleOptionsSchema = strictObject({
	toplevel: optional(boolean()),
	keepNames: optional(union([boolean(), MangleOptionsKeepNamesSchema])),
	debug: optional(boolean())
});
const CodegenOptionsSchema = strictObject({ removeWhitespace: optional(boolean()) });
const MinifyOptionsSchema = strictObject({
	compress: optional(union([boolean(), CompressOptionsSchema])),
	mangle: optional(union([boolean(), MangleOptionsSchema])),
	codegen: optional(union([boolean(), CodegenOptionsSchema]))
});
const ResolveOptionsSchema = strictObject({
	alias: optional(record(string(), union([
		literal(false),
		string(),
		array(string())
	]))),
	aliasFields: optional(array(array(string()))),
	conditionNames: optional(array(string())),
	extensionAlias: optional(record(string(), array(string()))),
	exportsFields: optional(array(array(string()))),
	extensions: optional(array(string())),
	mainFields: optional(array(string())),
	mainFiles: optional(array(string())),
	modules: optional(array(string())),
	symlinks: optional(boolean()),
	yarnPnp: optional(boolean())
});
const TreeshakingOptionsSchema = union([boolean(), looseObject({
	annotations: optional(boolean()),
	manualPureFunctions: optional(array(string())),
	unknownGlobalSideEffects: optional(boolean()),
	commonjs: optional(boolean()),
	propertyReadSideEffects: optional(union([literal(false), literal("always")])),
	propertyWriteSideEffects: optional(union([literal(false), literal("always")]))
})]);
const OptimizationOptionsSchema = strictObject({
	inlineConst: pipe(optional(union([boolean(), strictObject({
		mode: optional(union([literal("all"), literal("smart")])),
		pass: optional(number())
	})])), description("Enable crossmodule constant inlining")),
	pifeForModuleWrappers: pipe(optional(boolean()), description("Use PIFE pattern for module wrappers"))
});
const LogOrStringHandlerSchema = pipe(vFunction(), args(tuple([LogLevelWithErrorSchema, RollupLogWithStringSchema])));
const OnLogSchema = pipe(vFunction(), args(tuple([
	LogLevelSchema,
	RollupLogSchema,
	LogOrStringHandlerSchema
])));
const OnwarnSchema = pipe(vFunction(), args(tuple([RollupLogSchema, pipe(vFunction(), args(tuple([union([RollupLogWithStringSchema, pipe(vFunction(), returns(RollupLogWithStringSchema))])])))])));
const HmrSchema = union([boolean(), strictObject({
	new: optional(boolean()),
	port: optional(number()),
	host: optional(string()),
	implement: optional(string())
})]);
const InputOptionsSchema = strictObject({
	input: optional(InputOptionSchema),
	plugins: optional(custom(() => true)),
	external: optional(ExternalOptionSchema),
	makeAbsoluteExternalsRelative: optional(union([boolean(), literal("ifRelativeSource")])),
	resolve: optional(ResolveOptionsSchema),
	cwd: pipe(optional(string()), description("Current working directory")),
	platform: pipe(optional(union([
		literal("browser"),
		literal("neutral"),
		literal("node")
	])), description(`Platform for which the code should be generated (node, ${styleText$1("underline", "browser")}, neutral)`)),
	shimMissingExports: pipe(optional(boolean()), description("Create shim variables for missing exports")),
	treeshake: optional(TreeshakingOptionsSchema),
	optimization: optional(OptimizationOptionsSchema),
	logLevel: pipe(optional(LogLevelOptionSchema), description(`Log level (${styleText$1("dim", "silent")}, ${styleText$1(["underline", "gray"], "info")}, debug, ${styleText$1("yellow", "warn")})`)),
	onLog: optional(OnLogSchema),
	onwarn: optional(OnwarnSchema),
	moduleTypes: pipe(optional(ModuleTypesSchema), description("Module types for customized extensions")),
	experimental: optional(strictObject({
		disableLiveBindings: optional(boolean()),
		enableComposingJsPlugins: optional(boolean()),
		viteMode: optional(boolean()),
		resolveNewUrlToAsset: optional(boolean()),
		strictExecutionOrder: optional(boolean()),
		onDemandWrapping: optional(boolean()),
		incrementalBuild: optional(boolean()),
		hmr: optional(HmrSchema),
		attachDebugInfo: optional(union([
			literal("none"),
			literal("simple"),
			literal("full")
		])),
		chunkModulesOrder: optional(union([literal("module-id"), literal("exec-order")])),
		chunkImportMap: optional(union([boolean(), object({
			baseUrl: optional(string()),
			fileName: optional(string())
		})])),
		nativeMagicString: optional(boolean())
	})),
	transform: optional(TransformOptionsSchema),
	watch: optional(union([WatchOptionsSchema, literal(false)])),
	checks: optional(ChecksOptionsSchema),
	debug: pipe(optional(object({ sessionId: pipe(optional(string()), description("Used to name the build.")) })), description("Enable debug mode. Emit debug information to disk. This might slow down the build process significantly.")),
	preserveEntrySignatures: pipe(optional(union([
		literal("strict"),
		literal("allow-extension"),
		literal("exports-only"),
		literal(false)
	]))),
	tsconfig: pipe(optional(union([literal(true), string()])), description("Path to the tsconfig.json file."))
});
const InputCliOverrideSchema = strictObject({
	input: pipe(optional(array(string())), description("Entry file")),
	external: pipe(optional(array(string())), description("Comma-separated list of module ids to exclude from the bundle `<module-id>,...`")),
	treeshake: pipe(optional(boolean()), description("enable treeshaking")),
	makeAbsoluteExternalsRelative: pipe(optional(boolean()), description("Prevent normalization of external imports")),
	preserveEntrySignatures: pipe(optional(literal(false)), description("Avoid facade chunks for entry points")),
	context: pipe(optional(string()), description("The entity top-level `this` represents."))
});
const InputCliOptionsSchema = omit(strictObject({
	...InputOptionsSchema.entries,
	...InputCliOverrideSchema.entries
}), [
	"plugins",
	"onwarn",
	"onLog",
	"resolve",
	"experimental",
	"watch"
]);
const ModuleFormatSchema = union([
	literal("es"),
	literal("cjs"),
	literal("esm"),
	literal("module"),
	literal("commonjs"),
	literal("iife"),
	literal("umd")
]);
const AddonFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returnsAsync(unionAsync([string(), pipeAsync(promise(), awaitAsync(), string())])));
const ChunkFileNamesFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returns(string()));
const ChunkFileNamesSchema = union([string(), ChunkFileNamesFunctionSchema]);
const AssetFileNamesFunctionSchema = pipe(vFunction(), args(tuple([custom(() => true)])), returns(string()));
const AssetFileNamesSchema = union([string(), AssetFileNamesFunctionSchema]);
const SanitizeFileNameFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const SanitizeFileNameSchema = union([boolean(), SanitizeFileNameFunctionSchema]);
const GlobalsFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const PathsFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(string()));
const ManualChunksFunctionSchema = pipe(vFunction(), args(tuple([string(), object({})])), returns(nullish(string())));
const AdvancedChunksNameFunctionSchema = pipe(vFunction(), args(tuple([string(), object({})])), returns(nullish(string())));
const AdvancedChunksTestFunctionSchema = pipe(vFunction(), args(tuple([string()])), returns(union([
	boolean(),
	void_(),
	undefined_()
])));
const AdvancedChunksSchema = strictObject({
	includeDependenciesRecursively: optional(boolean()),
	minSize: optional(number()),
	maxSize: optional(number()),
	minModuleSize: optional(number()),
	maxModuleSize: optional(number()),
	minShareCount: optional(number()),
	groups: optional(array(strictObject({
		name: union([string(), AdvancedChunksNameFunctionSchema]),
		test: optional(union([StringOrRegExpSchema, AdvancedChunksTestFunctionSchema])),
		priority: optional(number()),
		minSize: optional(number()),
		minShareCount: optional(number()),
		maxSize: optional(number()),
		minModuleSize: optional(number()),
		maxModuleSize: optional(number())
	})))
});
const GeneratedCodePresetSchema = union([literal("es5"), literal("es2015")]);
const GeneratedCodeOptionsSchema = strictObject({
	symbols: pipe(optional(boolean()), description("Whether to use Symbol.toStringTag for namespace objects")),
	preset: GeneratedCodePresetSchema,
	profilerNames: pipe(optional(boolean()), description("Whether to add readable names to internal variables for profiling purposes"))
});
const OutputOptionsSchema = strictObject({
	dir: pipe(optional(string()), description("Output directory, defaults to `dist` if `file` is not set")),
	file: pipe(optional(string()), description("Single output file")),
	exports: pipe(optional(union([
		literal("auto"),
		literal("named"),
		literal("default"),
		literal("none")
	])), description(`Specify a export mode (${styleText$1("underline", "auto")}, named, default, none)`)),
	hashCharacters: pipe(optional(union([
		literal("base64"),
		literal("base36"),
		literal("hex")
	])), description("Use the specified character set for file hashes")),
	format: pipe(optional(ModuleFormatSchema), description(`Output format of the generated bundle (supports ${styleText$1("underline", "esm")}, cjs, and iife)`)),
	sourcemap: pipe(optional(union([
		boolean(),
		literal("inline"),
		literal("hidden")
	])), description(`Generate sourcemap (\`-s inline\` for inline, or ${styleText$1("bold", "pass the `-s` on the last argument if you want to generate `.map` file")})`)),
	sourcemapBaseUrl: pipe(optional(string()), description("Base URL used to prefix sourcemap paths")),
	sourcemapDebugIds: pipe(optional(boolean()), description("Inject sourcemap debug IDs")),
	sourcemapIgnoreList: optional(union([
		boolean(),
		custom(() => true),
		StringOrRegExpSchema
	])),
	sourcemapPathTransform: optional(custom(() => true)),
	banner: optional(union([string(), AddonFunctionSchema])),
	footer: optional(union([string(), AddonFunctionSchema])),
	intro: optional(union([string(), AddonFunctionSchema])),
	outro: optional(union([string(), AddonFunctionSchema])),
	extend: pipe(optional(boolean()), description("Extend global variable defined by name in IIFE / UMD formats")),
	esModule: optional(union([boolean(), literal("if-default-prop")])),
	assetFileNames: optional(AssetFileNamesSchema),
	entryFileNames: optional(ChunkFileNamesSchema),
	chunkFileNames: optional(ChunkFileNamesSchema),
	cssEntryFileNames: optional(ChunkFileNamesSchema),
	cssChunkFileNames: optional(ChunkFileNamesSchema),
	sanitizeFileName: optional(SanitizeFileNameSchema),
	minify: pipe(optional(union([
		boolean(),
		literal("dce-only"),
		MinifyOptionsSchema
	])), description("Minify the bundled file")),
	name: pipe(optional(string()), description("Name for UMD / IIFE format outputs")),
	globals: pipe(optional(union([record(string(), string()), GlobalsFunctionSchema])), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	paths: pipe(optional(union([record(string(), string()), PathsFunctionSchema])), description("Maps external module IDs to paths")),
	generatedCode: pipe(optional(partial(GeneratedCodeOptionsSchema)), description("Generated code options")),
	externalLiveBindings: pipe(optional(boolean()), description("external live bindings")),
	inlineDynamicImports: pipe(optional(boolean()), description("Inline dynamic imports")),
	manualChunks: optional(ManualChunksFunctionSchema),
	advancedChunks: optional(AdvancedChunksSchema),
	legalComments: pipe(optional(union([literal("none"), literal("inline")])), description("Control comments in the output")),
	plugins: optional(custom(() => true)),
	polyfillRequire: pipe(optional(boolean()), description("Disable require polyfill injection")),
	hoistTransitiveImports: optional(literal(false)),
	preserveModules: pipe(optional(boolean()), description("Preserve module structure")),
	preserveModulesRoot: pipe(optional(string()), description("Put preserved modules under this path at root level")),
	virtualDirname: optional(string()),
	minifyInternalExports: pipe(optional(boolean()), description("Minify internal exports")),
	topLevelVar: pipe(optional(boolean()), description("Rewrite top-level declarations to use `var`.")),
	cleanDir: pipe(optional(boolean()), description("Clean output directory before emitting output")),
	keepNames: pipe(optional(boolean()), description("Keep function and class names after bundling"))
});
const getAddonDescription = (placement, wrapper) => {
	return `Code to insert the ${styleText$1("bold", placement)} of the bundled file (${styleText$1("bold", wrapper)} the wrapper function)`;
};
const OutputCliOverrideSchema = strictObject({
	assetFileNames: pipe(optional(string()), description("Name pattern for asset files")),
	entryFileNames: pipe(optional(string()), description("Name pattern for emitted entry chunks")),
	chunkFileNames: pipe(optional(string()), description("Name pattern for emitted secondary chunks")),
	cssEntryFileNames: pipe(optional(string()), description("Name pattern for emitted css entry chunks")),
	cssChunkFileNames: pipe(optional(string()), description("Name pattern for emitted css secondary chunks")),
	sanitizeFileName: pipe(optional(boolean()), description("Sanitize file name")),
	banner: pipe(optional(string()), description(getAddonDescription("top", "outside"))),
	footer: pipe(optional(string()), description(getAddonDescription("bottom", "outside"))),
	intro: pipe(optional(string()), description(getAddonDescription("top", "inside"))),
	outro: pipe(optional(string()), description(getAddonDescription("bottom", "inside"))),
	esModule: pipe(optional(boolean()), description("Always generate `__esModule` marks in non-ESM formats, defaults to `if-default-prop` (use `--no-esModule` to always disable)")),
	globals: pipe(optional(record(string(), string())), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	advancedChunks: pipe(optional(strictObject({
		minSize: pipe(optional(number()), description("Minimum size of the chunk")),
		minShareCount: pipe(optional(number()), description("Minimum share count of the chunk"))
	})), description("Global variable of UMD / IIFE dependencies (syntax: `key=value`)")),
	minify: pipe(optional(boolean()), description("Minify the bundled file"))
});
const OutputCliOptionsSchema = omit(strictObject({
	...OutputOptionsSchema.entries,
	...OutputCliOverrideSchema.entries
}), [
	"sourcemapIgnoreList",
	"sourcemapPathTransform",
	"plugins",
	"hoistTransitiveImports"
]);
const CliOptionsSchema = strictObject({
	config: pipe(optional(union([string(), boolean()])), description("Path to the config file (default: `rolldown.config.js`)")),
	help: pipe(optional(boolean()), description("Show help")),
	environment: pipe(optional(union([string(), array(string())])), description("Pass additional settings to the config file via process.ENV.")),
	version: pipe(optional(boolean()), description("Show version number")),
	watch: pipe(optional(boolean()), description("Watch files in bundle and rebuild on changes")),
	...InputCliOptionsSchema.entries,
	...OutputCliOptionsSchema.entries
});
function validateCliOptions(options) {
	let parsed = safeParse(CliOptionsSchema, options);
	return [parsed.output, parsed.issues?.map((issue) => {
		return `Invalid value for option ${issue.path?.map((pathItem) => pathItem.key).join(" ")}: ${issue.message}`;
	})];
}
const inputHelperMsgRecord = {
	output: { ignored: true },
	"resolve.tsconfigFilename": { issueMsg: "It is deprecated. Please use the top-level `tsconfig` option instead." }
};
const outputHelperMsgRecord = {};
function validateOption(key, options) {
	if (typeof options !== "object") throw new Error(`Invalid ${key} options. Expected an Object but received ${JSON.stringify(options)}.`);
	if (globalThis.process?.env?.ROLLUP_TEST) return;
	let parsed = safeParse(key === "input" ? InputOptionsSchema : OutputOptionsSchema, options);
	if (!parsed.success) {
		const errors = parsed.issues.map((issue) => {
			let issueMsg = issue.message;
			const issuePaths = issue.path.map((path$1) => path$1.key);
			if (issue.type === "union") {
				const subIssue = issue.issues?.find((i) => !(i.type !== issue.received && i.input === issue.input));
				if (subIssue) {
					if (subIssue.path) issuePaths.push(subIssue.path.map((path$1) => path$1.key));
					issueMsg = subIssue.message;
				}
			}
			const stringPath = issuePaths.join(".");
			const helper = key === "input" ? inputHelperMsgRecord[stringPath] : outputHelperMsgRecord[stringPath];
			if (helper && helper.ignored) return "";
			return `- For the "${stringPath}". ${helper?.issueMsg || issueMsg + "."} ${helper?.help ? `\n  Help: ${helper.help}` : ""}`;
		}).filter(Boolean);
		if (errors.length) console.warn(`\x1b[33mWarning: Invalid ${key} options (${errors.length} issue${errors.length === 1 ? "" : "s"} found)\n${errors.join("\n")}\x1b[0m`);
	}
}
function getInputCliKeys() {
	return keyof(InputCliOptionsSchema).options;
}
function getOutputCliKeys() {
	return keyof(OutputCliOptionsSchema).options;
}
function getCliSchemaInfo() {
	return flattenValibotSchema(CliOptionsSchema);
}

//#endregion
//#region src/types/rolldown-output-impl.ts
var RolldownOutputImpl = class extends PlainObjectLike {
	constructor(bindingOutputs) {
		super();
		this.bindingOutputs = bindingOutputs;
	}
	get output() {
		return transformToRollupOutput(this.bindingOutputs).output;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		const results = this.output.map((item) => item.__rolldown_external_memory_handle__(keepDataAlive));
		if (!results.every((r) => r.freed)) {
			const reasons = results.filter((r) => !r.freed).map((r) => r.reason).filter(Boolean);
			return {
				freed: false,
				reason: `Failed to free ${reasons.length} item(s): ${reasons.join("; ")}`
			};
		}
		return { freed: true };
	}
};
__decorate([lazyProp], RolldownOutputImpl.prototype, "output", null);

//#endregion
//#region src/types/chunking-context.ts
var ChunkingContextImpl = class {
	constructor(context) {
		this.context = context;
	}
	getModuleInfo(moduleId) {
		const bindingInfo = this.context.getModuleInfo(moduleId);
		if (bindingInfo) return transformModuleInfo(bindingInfo, {
			moduleSideEffects: null,
			meta: {}
		});
		return null;
	}
};

//#endregion
//#region src/utils/bindingify-output-options.ts
function bindingifyOutputOptions(outputOptions) {
	const { dir, format, exports, hashCharacters, sourcemap, sourcemapBaseUrl, sourcemapDebugIds, sourcemapIgnoreList, sourcemapPathTransform, name, assetFileNames, entryFileNames, chunkFileNames, cssEntryFileNames, cssChunkFileNames, banner, footer, intro, outro, esModule, globals, paths, generatedCode, file, sanitizeFileName, preserveModules, virtualDirname, legalComments, preserveModulesRoot, manualChunks, topLevelVar, cleanDir } = outputOptions;
	const advancedChunks = bindingifyAdvancedChunks(outputOptions.advancedChunks, manualChunks);
	return {
		dir,
		file: file == null ? void 0 : file,
		format: bindingifyFormat(format),
		exports,
		hashCharacters,
		sourcemap: bindingifySourcemap(sourcemap),
		sourcemapBaseUrl,
		sourcemapDebugIds,
		sourcemapIgnoreList: sourcemapIgnoreList ?? /node_modules/,
		sourcemapPathTransform,
		banner: bindingifyAddon(banner),
		footer: bindingifyAddon(footer),
		intro: bindingifyAddon(intro),
		outro: bindingifyAddon(outro),
		extend: outputOptions.extend,
		globals,
		paths,
		generatedCode,
		esModule,
		name,
		assetFileNames: bindingifyAssetFilenames(assetFileNames),
		entryFileNames,
		chunkFileNames,
		cssEntryFileNames,
		cssChunkFileNames,
		plugins: [],
		minify: outputOptions.minify,
		externalLiveBindings: outputOptions.externalLiveBindings,
		inlineDynamicImports: outputOptions.inlineDynamicImports,
		advancedChunks,
		polyfillRequire: outputOptions.polyfillRequire,
		sanitizeFileName,
		preserveModules,
		virtualDirname,
		legalComments,
		preserveModulesRoot,
		topLevelVar,
		minifyInternalExports: outputOptions.minifyInternalExports,
		cleanDir
	};
}
function bindingifyAddon(configAddon) {
	return async (chunk) => {
		if (typeof configAddon === "function") return configAddon(transformRenderedChunk(chunk));
		return configAddon || "";
	};
}
function bindingifyFormat(format) {
	switch (format) {
		case void 0:
		case "es":
		case "esm":
		case "module": return "es";
		case "cjs":
		case "commonjs": return "cjs";
		case "iife": return "iife";
		case "umd": return "umd";
		default: unimplemented(`output.format: ${format}`);
	}
}
function bindingifySourcemap(sourcemap) {
	switch (sourcemap) {
		case true: return "file";
		case "inline": return "inline";
		case false:
		case void 0: return;
		case "hidden": return "hidden";
		default: throw new Error(`unknown sourcemap: ${sourcemap}`);
	}
}
function bindingifyAssetFilenames(assetFileNames) {
	if (typeof assetFileNames === "function") return (asset) => {
		return assetFileNames({
			name: asset.name,
			names: asset.names,
			originalFileName: asset.originalFileName,
			originalFileNames: asset.originalFileNames,
			source: transformAssetSource(asset.source),
			type: "asset"
		});
	};
	return assetFileNames;
}
function bindingifyAdvancedChunks(advancedChunks, manualChunks) {
	if (manualChunks != null && advancedChunks != null) console.warn("`manualChunks` option is ignored due to `advancedChunks` option is specified.");
	else if (manualChunks != null) advancedChunks = { groups: [{ name(moduleId, ctx) {
		return manualChunks(moduleId, { getModuleInfo: (id) => ctx.getModuleInfo(id) });
	} }] };
	if (advancedChunks == null) return;
	const { groups, ...restAdvancedChunks } = advancedChunks;
	return {
		...restAdvancedChunks,
		groups: groups?.map((group) => {
			const { name, ...restGroup } = group;
			return {
				...restGroup,
				name: typeof name === "function" ? (id, ctx) => name(id, new ChunkingContextImpl(ctx)) : name
			};
		})
	};
}

//#endregion
//#region src/utils/initialize-parallel-plugins.ts
var import_binding$1 = require_binding();
async function initializeParallelPlugins(plugins) {
	const pluginInfos = [];
	for (const [index, plugin] of plugins.entries()) if ("_parallel" in plugin) {
		const { fileUrl, options } = plugin._parallel;
		pluginInfos.push({
			index,
			fileUrl,
			options
		});
	}
	if (pluginInfos.length <= 0) return;
	const count = availableParallelism();
	const parallelJsPluginRegistry = new import_binding$1.ParallelJsPluginRegistry(count);
	const registryId = parallelJsPluginRegistry.id;
	const workers = await initializeWorkers(registryId, count, pluginInfos);
	const stopWorkers = async () => {
		await Promise.all(workers.map((worker) => worker.terminate()));
	};
	return {
		registry: parallelJsPluginRegistry,
		stopWorkers
	};
}
function initializeWorkers(registryId, count, pluginInfos) {
	return Promise.all(Array.from({ length: count }, (_, i) => initializeWorker(registryId, pluginInfos, i)));
}
async function initializeWorker(registryId, pluginInfos, threadNumber) {
	const urlString = import.meta.resolve("#parallel-plugin-worker");
	const workerData$1 = {
		registryId,
		pluginInfos,
		threadNumber
	};
	let worker;
	try {
		worker = new Worker(new URL(urlString), { workerData: workerData$1 });
		worker.unref();
		await new Promise((resolve, reject) => {
			worker.once("message", async (message) => {
				if (message.type === "error") reject(message.error);
				else resolve();
			});
		});
		return worker;
	} catch (e) {
		worker?.terminate();
		throw e;
	}
}
const availableParallelism = () => {
	let availableParallelism$1 = 1;
	try {
		availableParallelism$1 = os.availableParallelism();
	} catch {
		const cpus = os.cpus();
		if (Array.isArray(cpus) && cpus.length > 0) availableParallelism$1 = cpus.length;
	}
	return Math.min(availableParallelism$1, 8);
};

//#endregion
//#region src/utils/create-bundler-option.ts
async function createBundlerOptions(inputOptions, outputOptions, watchMode) {
	const inputPlugins = await normalizePluginOption(inputOptions.plugins);
	const outputPlugins = await normalizePluginOption(outputOptions.plugins);
	const logLevel = inputOptions.logLevel || LOG_LEVEL_INFO;
	const onLog = getLogger(getObjectPlugins(inputPlugins), getOnLog(inputOptions, logLevel), logLevel, watchMode);
	outputOptions = PluginDriver.callOutputOptionsHook([...inputPlugins, ...outputPlugins], outputOptions, onLog, logLevel, watchMode);
	const normalizedOutputPlugins = await normalizePluginOption(outputOptions.plugins);
	let plugins = [...normalizePlugins(inputPlugins, ANONYMOUS_PLUGIN_PREFIX), ...checkOutputPluginOption(normalizePlugins(normalizedOutputPlugins, ANONYMOUS_OUTPUT_PLUGIN_PREFIX), onLog)];
	const parallelPluginInitResult = await initializeParallelPlugins(plugins);
	try {
		return {
			bundlerOptions: {
				inputOptions: bindingifyInputOptions(plugins, inputOptions, outputOptions, normalizedOutputPlugins, onLog, logLevel, watchMode),
				outputOptions: bindingifyOutputOptions(outputOptions),
				parallelPluginsRegistry: parallelPluginInitResult?.registry
			},
			inputOptions,
			onLog,
			stopWorkers: parallelPluginInitResult?.stopWorkers
		};
	} catch (e) {
		await parallelPluginInitResult?.stopWorkers();
		throw e;
	}
}

//#endregion
//#region src/api/rolldown/rolldown-build.ts
var import_binding = require_binding();
Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
var RolldownBuild = class RolldownBuild {
	#inputOptions;
	#bundler;
	#stopWorkers;
	static asyncRuntimeShutdown = false;
	constructor(inputOptions) {
		this.#inputOptions = inputOptions;
		this.#bundler = new import_binding.BindingBundler();
	}
	get closed() {
		return this.#bundler.closed;
	}
	async generate(outputOptions = {}) {
		return this.#build(false, outputOptions);
	}
	async write(outputOptions = {}) {
		return this.#build(true, outputOptions);
	}
	/**
	* Close the build and free resources.
	*/
	async close() {
		await this.#stopWorkers?.();
		await this.#bundler.close();
		(0, import_binding.shutdownAsyncRuntime)();
		RolldownBuild.asyncRuntimeShutdown = true;
		this.#stopWorkers = void 0;
	}
	async [Symbol.asyncDispose]() {
		await this.close();
	}
	get watchFiles() {
		return Promise.resolve(this.#bundler.getWatchFiles());
	}
	async #build(isWrite, outputOptions) {
		validateOption("output", outputOptions);
		await this.#stopWorkers?.();
		const option = await createBundlerOptions(this.#inputOptions, outputOptions, false);
		if (RolldownBuild.asyncRuntimeShutdown) (0, import_binding.startAsyncRuntime)();
		try {
			this.#stopWorkers = option.stopWorkers;
			let output;
			if (isWrite) output = await this.#bundler.write(option.bundlerOptions);
			else output = await this.#bundler.generate(option.bundlerOptions);
			return new RolldownOutputImpl(unwrapBindingResult(output));
		} catch (e) {
			await option.stopWorkers?.();
			throw e;
		}
	}
};

//#endregion
export { getOutputCliKeys as a, styleText$1 as c, getInputCliKeys as i, PluginDriver as l, createBundlerOptions as n, validateCliOptions as o, getCliSchemaInfo as r, validateOption as s, RolldownBuild as t };