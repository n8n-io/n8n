/**
 * @fileoverview Main class using flat config
 * @author Nicholas C. Zakas
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const fs = require("node:fs/promises");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { version } = require("../../package.json");
const { Linter } = require("../linter");
const { defaultConfig } = require("../config/default-config");

const {
	findFiles,
	getCacheFile,

	isNonEmptyString,
	isArrayOfNonEmptyString,

	createIgnoreResult,
	isErrorMessage,
	calculateStatsPerFile,

	processOptions,
} = require("./eslint-helpers");
const { pathToFileURL } = require("node:url");
const LintResultCache = require("../cli-engine/lint-result-cache");
const { Retrier } = require("@humanwhocodes/retry");
const { ConfigLoader, LegacyConfigLoader } = require("../config/config-loader");
const { WarningService } = require("../services/warning-service");
const { Config } = require("../config/config.js");
const {
	getShorthandName,
	getNamespaceFromTerm,
	normalizePackageName,
} = require("../shared/naming.js");
const { resolve } = require("../shared/relative-module-resolver.js");

/*
 * This is necessary to allow overwriting writeFile for testing purposes.
 * We can just use fs/promises once we drop Node.js 12 support.
 */

//------------------------------------------------------------------------------
// Typedefs
//------------------------------------------------------------------------------

// For VSCode IntelliSense
/**
 * @import { ConfigArray } from "../cli-engine/cli-engine.js";
 * @import { CLIEngineLintReport } from "./legacy-eslint.js";
 * @import { FlatConfigArray } from "../config/flat-config-array.js";
 * @import { RuleDefinition } from "@eslint/core";
 */

/** @typedef {ReturnType<ConfigArray.extractConfig>} ExtractedConfig */
/** @typedef {import("../types").Linter.Config} Config */
/** @typedef {import("../types").ESLint.DeprecatedRuleUse} DeprecatedRuleInfo */
/** @typedef {import("../types").Linter.LintMessage} LintMessage */
/** @typedef {import("../types").ESLint.LintResult} LintResult */
/** @typedef {import("../types").ESLint.Plugin} Plugin */
/** @typedef {import("../types").ESLint.ResultsMeta} ResultsMeta */

/**
 * The options with which to configure the ESLint instance.
 * @typedef {Object} ESLintOptions
 * @property {boolean} [allowInlineConfig] Enable or disable inline configuration comments.
 * @property {Config|Array<Config>} [baseConfig] Base config, extended by all configs used with this instance
 * @property {boolean} [cache] Enable result caching.
 * @property {string} [cacheLocation] The cache file to use instead of .eslintcache.
 * @property {"metadata" | "content"} [cacheStrategy] The strategy used to detect changed files.
 * @property {string} [cwd] The value to use for the current working directory.
 * @property {boolean} [errorOnUnmatchedPattern] If `false` then `ESLint#lintFiles()` doesn't throw even if no target files found. Defaults to `true`.
 * @property {boolean|Function} [fix] Execute in autofix mode. If a function, should return a boolean.
 * @property {string[]} [fixTypes] Array of rule types to apply fixes for.
 * @property {string[]} [flags] Array of feature flags to enable.
 * @property {boolean} [globInputPaths] Set to false to skip glob resolution of input file paths to lint (default: true). If false, each input file paths is assumed to be a non-glob path to an existing file.
 * @property {boolean} [ignore] False disables all ignore patterns except for the default ones.
 * @property {string[]} [ignorePatterns] Ignore file patterns to use in addition to config ignores. These patterns are relative to `cwd`.
 * @property {Config|Array<Config>} [overrideConfig] Override config, overrides all configs used with this instance
 * @property {boolean|string} [overrideConfigFile] Searches for default config file when falsy;
 *      doesn't do any config file lookup when `true`; considered to be a config filename
 *      when a string.
 * @property {Record<string,Plugin>} [plugins] An array of plugin implementations.
 * @property {boolean} [stats] True enables added statistics on lint results.
 * @property {boolean} [warnIgnored] Show warnings when the file list includes ignored files
 * @property {boolean} [passOnNoPatterns=false] When set to true, missing patterns cause
 *      the linting operation to short circuit and not report any failures.
 */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const debug = require("debug")("eslint:eslint");
const privateMembers = new WeakMap();
const removedFormatters = new Set([
	"checkstyle",
	"codeframe",
	"compact",
	"jslint-xml",
	"junit",
	"table",
	"tap",
	"unix",
	"visualstudio",
]);

/**
 * Create rulesMeta object.
 * @param {Map<string,RuleDefinition>} rules a map of rules from which to generate the object.
 * @returns {Object} metadata for all enabled rules.
 */
function createRulesMeta(rules) {
	return Array.from(rules).reduce((retVal, [id, rule]) => {
		retVal[id] = rule.meta;
		return retVal;
	}, {});
}

/**
 * Return the absolute path of a file named `"__placeholder__.js"` in a given directory.
 * This is used as a replacement for a missing file path.
 * @param {string} cwd An absolute directory path.
 * @returns {string} The absolute path of a file named `"__placeholder__.js"` in the given directory.
 */
function getPlaceholderPath(cwd) {
	return path.join(cwd, "__placeholder__.js");
}

/** @type {WeakMap<ExtractedConfig, DeprecatedRuleInfo[]>} */
const usedDeprecatedRulesCache = new WeakMap();

/**
 * Create used deprecated rule list.
 * @param {ESLint} eslint The ESLint instance.
 * @param {string} maybeFilePath The absolute path to a lint target file or `"<text>"`.
 * @returns {DeprecatedRuleInfo[]} The used deprecated rule list.
 */
function getOrFindUsedDeprecatedRules(eslint, maybeFilePath) {
	const {
		options: { cwd },
		configLoader,
	} = privateMembers.get(eslint);
	const filePath = path.isAbsolute(maybeFilePath)
		? maybeFilePath
		: getPlaceholderPath(cwd);
	const configs = configLoader.getCachedConfigArrayForFile(filePath);
	const config = configs.getConfig(filePath);

	// Most files use the same config, so cache it.
	if (config && !usedDeprecatedRulesCache.has(config)) {
		const retv = [];

		if (config.rules) {
			for (const [ruleId, ruleConf] of Object.entries(config.rules)) {
				if (Config.getRuleNumericSeverity(ruleConf) === 0) {
					continue;
				}
				const rule = config.getRuleDefinition(ruleId);
				const meta = rule && rule.meta;

				if (meta && meta.deprecated) {
					const usesNewFormat = typeof meta.deprecated === "object";

					retv.push({
						ruleId,
						replacedBy: usesNewFormat
							? (meta.deprecated.replacedBy?.map(
									replacement =>
										`${replacement.plugin?.name !== void 0 ? `${getShorthandName(replacement.plugin.name, "eslint-plugin")}/` : ""}${replacement.rule?.name ?? ""}`,
								) ?? [])
							: meta.replacedBy || [],
						info: usesNewFormat ? meta.deprecated : void 0,
					});
				}
			}
		}

		usedDeprecatedRulesCache.set(config, Object.freeze(retv));
	}

	return config ? usedDeprecatedRulesCache.get(config) : Object.freeze([]);
}

/**
 * Processes the linting results generated by a CLIEngine linting report to
 * match the ESLint class's API.
 * @param {ESLint} eslint The ESLint instance.
 * @param {CLIEngineLintReport} report The CLIEngine linting report to process.
 * @returns {LintResult[]} The processed linting results.
 */
function processLintReport(eslint, { results }) {
	const descriptor = {
		configurable: true,
		enumerable: true,
		get() {
			return getOrFindUsedDeprecatedRules(eslint, this.filePath);
		},
	};

	for (const result of results) {
		Object.defineProperty(result, "usedDeprecatedRules", descriptor);
	}

	return results;
}

/**
 * An Array.prototype.sort() compatible compare function to order results by their file path.
 * @param {LintResult} a The first lint result.
 * @param {LintResult} b The second lint result.
 * @returns {number} An integer representing the order in which the two results should occur.
 */
function compareResultsByFilePath(a, b) {
	if (a.filePath < b.filePath) {
		return -1;
	}

	if (a.filePath > b.filePath) {
		return 1;
	}

	return 0;
}

/**
 * Determines which config file to use. This is determined by seeing if an
 * override config file was passed, and if so, using it; otherwise, as long
 * as override config file is not explicitly set to `false`, it will search
 * upwards from the cwd for a file named `eslint.config.js`.
 *
 * This function is used primarily by the `--inspect-config` option. For now,
 * we will maintain the existing behavior, which is to search up from the cwd.
 * @param {ESLintOptions} options The ESLint instance options.
 * @returns {Promise<{configFilePath:string|undefined;basePath:string}>} Location information for
 *      the config file.
 */
async function locateConfigFileToUse({ configFile, cwd }) {
	const configLoader = new ConfigLoader({
		cwd,
		configFile,
	});

	const configFilePath = await configLoader.findConfigFileForPath(
		path.join(cwd, "__placeholder__.js"),
	);

	if (!configFilePath) {
		throw new Error("No ESLint configuration file was found.");
	}

	return {
		configFilePath,
		basePath: configFile ? cwd : path.dirname(configFilePath),
	};
}

/**
 * Processes an source code using ESLint.
 * @param {Object} config The config object.
 * @param {string} config.text The source code to verify.
 * @param {string} config.cwd The path to the current working directory.
 * @param {string|undefined} config.filePath The path to the file of `text`. If this is undefined, it uses `<text>`.
 * @param {FlatConfigArray} config.configs The config.
 * @param {boolean} config.fix If `true` then it does fix.
 * @param {boolean} config.allowInlineConfig If `true` then it uses directive comments.
 * @param {Function} config.ruleFilter A predicate function to filter which rules should be run.
 * @param {boolean} config.stats If `true`, then if reports extra statistics with the lint results.
 * @param {Linter} config.linter The linter instance to verify.
 * @returns {LintResult} The result of linting.
 * @private
 */
function verifyText({
	text,
	cwd,
	filePath: providedFilePath,
	configs,
	fix,
	allowInlineConfig,
	ruleFilter,
	stats,
	linter,
}) {
	const filePath = providedFilePath || "<text>";

	debug(`Lint ${filePath}`);

	/*
	 * Verify.
	 * `config.extractConfig(filePath)` requires an absolute path, but `linter`
	 * doesn't know CWD, so it gives `linter` an absolute path always.
	 */
	const filePathToVerify =
		filePath === "<text>" ? getPlaceholderPath(cwd) : filePath;
	const { fixed, messages, output } = linter.verifyAndFix(text, configs, {
		allowInlineConfig,
		filename: filePathToVerify,
		fix,
		ruleFilter,
		stats,

		/**
		 * Check if the linter should adopt a given code block or not.
		 * @param {string} blockFilename The virtual filename of a code block.
		 * @returns {boolean} `true` if the linter should adopt the code block.
		 */
		filterCodeBlock(blockFilename) {
			return configs.getConfig(blockFilename) !== void 0;
		},
	});

	// Tweak and return.
	const result = {
		filePath: filePath === "<text>" ? filePath : path.resolve(filePath),
		messages,
		suppressedMessages: linter.getSuppressedMessages(),
		...calculateStatsPerFile(messages),
	};

	if (fixed) {
		result.output = output;
	}

	if (
		result.errorCount + result.warningCount > 0 &&
		typeof result.output === "undefined"
	) {
		result.source = text;
	}

	if (stats) {
		result.stats = {
			times: linter.getTimes(),
			fixPasses: linter.getFixPassCount(),
		};
	}

	return result;
}

/**
 * Checks whether a message's rule type should be fixed.
 * @param {LintMessage} message The message to check.
 * @param {FlatConfigArray} config The config for the file that generated the message.
 * @param {string[]} fixTypes An array of fix types to check.
 * @returns {boolean} Whether the message should be fixed.
 */
function shouldMessageBeFixed(message, config, fixTypes) {
	if (!message.ruleId) {
		return fixTypes.has("directive");
	}

	const rule = message.ruleId && config.getRuleDefinition(message.ruleId);

	return Boolean(rule && rule.meta && fixTypes.has(rule.meta.type));
}

/**
 * Creates an error to be thrown when an array of results passed to `getRulesMetaForResults` was not created by the current engine.
 * @returns {TypeError} An error object.
 */
function createExtraneousResultsError() {
	return new TypeError(
		"Results object was not created from this ESLint instance.",
	);
}

/**
 * Creates a fixer function based on the provided fix, fixTypesSet, and config.
 * @param {Function|boolean} fix The original fix option.
 * @param {Set<string>} fixTypesSet A set of fix types to filter messages for fixing.
 * @param {FlatConfigArray} config The config for the file that generated the message.
 * @returns {Function|boolean} The fixer function or the original fix value.
 */
function getFixerForFixTypes(fix, fixTypesSet, config) {
	if (!fix || !fixTypesSet) {
		return fix;
	}

	const originalFix = typeof fix === "function" ? fix : () => true;

	return message =>
		shouldMessageBeFixed(message, config, fixTypesSet) &&
		originalFix(message);
}

/**
 * Retrieves flags from the environment variable ESLINT_FLAGS.
 * @param {string[]} flags The flags defined via the API.
 * @returns {string[]} The merged flags to use.
 */
function mergeEnvironmentFlags(flags) {
	if (!process.env.ESLINT_FLAGS) {
		return flags;
	}

	const envFlags = process.env.ESLINT_FLAGS.trim().split(/\s*,\s*/gu);
	return Array.from(new Set([...envFlags, ...flags]));
}

//-----------------------------------------------------------------------------
// Main API
//-----------------------------------------------------------------------------

/**
 * Primary Node.js API for ESLint.
 */
class ESLint {
	/**
	 * The type of configuration used by this class.
	 * @type {string}
	 */
	static configType = "flat";

	/**
	 * The loader to use for finding config files.
	 * @type {ConfigLoader|LegacyConfigLoader}
	 */
	#configLoader;

	/**
	 * Creates a new instance of the main ESLint API.
	 * @param {ESLintOptions} options The options for this instance.
	 */
	constructor(options = {}) {
		const defaultConfigs = [];
		const processedOptions = processOptions(options);
		const warningService = new WarningService();
		const linter = new Linter({
			cwd: processedOptions.cwd,
			configType: "flat",
			flags: mergeEnvironmentFlags(processedOptions.flags),
			warningService,
		});

		const cacheFilePath = getCacheFile(
			processedOptions.cacheLocation,
			processedOptions.cwd,
		);

		const lintResultCache = processedOptions.cache
			? new LintResultCache(cacheFilePath, processedOptions.cacheStrategy)
			: null;

		const configLoaderOptions = {
			cwd: processedOptions.cwd,
			baseConfig: processedOptions.baseConfig,
			overrideConfig: processedOptions.overrideConfig,
			configFile: processedOptions.configFile,
			ignoreEnabled: processedOptions.ignore,
			ignorePatterns: processedOptions.ignorePatterns,
			defaultConfigs,
			hasUnstableNativeNodeJsTSConfigFlag: linter.hasFlag(
				"unstable_native_nodejs_ts_config",
			),
			warningService,
		};

		this.#configLoader = linter.hasFlag("unstable_config_lookup_from_file")
			? new ConfigLoader(configLoaderOptions)
			: new LegacyConfigLoader(configLoaderOptions);

		debug(`Using config loader ${this.#configLoader.constructor.name}`);

		privateMembers.set(this, {
			options: processedOptions,
			linter,
			cacheFilePath,
			lintResultCache,
			defaultConfigs,
			configs: null,
			configLoader: this.#configLoader,
		});

		/**
		 * If additional plugins are passed in, add that to the default
		 * configs for this instance.
		 */
		if (options.plugins) {
			const plugins = {};

			for (const [pluginName, plugin] of Object.entries(
				options.plugins,
			)) {
				plugins[getShorthandName(pluginName, "eslint-plugin")] = plugin;
			}

			defaultConfigs.push({
				plugins,
			});
		}

		// Check for the .eslintignore file, and warn if it's present.
		if (existsSync(path.resolve(processedOptions.cwd, ".eslintignore"))) {
			warningService.emitESLintIgnoreWarning();
		}
	}

	/**
	 * The version text.
	 * @type {string}
	 */
	static get version() {
		return version;
	}

	/**
	 * The default configuration that ESLint uses internally. This is provided for tooling that wants to calculate configurations using the same defaults as ESLint.
	 * Keep in mind that the default configuration may change from version to version, so you shouldn't rely on any particular keys or values to be present.
	 * @type {ConfigArray}
	 */
	static get defaultConfig() {
		return defaultConfig;
	}

	/**
	 * Outputs fixes from the given results to files.
	 * @param {LintResult[]} results The lint results.
	 * @returns {Promise<void>} Returns a promise that is used to track side effects.
	 */
	static async outputFixes(results) {
		if (!Array.isArray(results)) {
			throw new Error("'results' must be an array");
		}

		await Promise.all(
			results
				.filter(result => {
					if (typeof result !== "object" || result === null) {
						throw new Error("'results' must include only objects");
					}
					return (
						typeof result.output === "string" &&
						path.isAbsolute(result.filePath)
					);
				})
				.map(r => fs.writeFile(r.filePath, r.output)),
		);
	}

	/**
	 * Returns results that only contains errors.
	 * @param {LintResult[]} results The results to filter.
	 * @returns {LintResult[]} The filtered results.
	 */
	static getErrorResults(results) {
		const filtered = [];

		results.forEach(result => {
			const filteredMessages = result.messages.filter(isErrorMessage);
			const filteredSuppressedMessages =
				result.suppressedMessages.filter(isErrorMessage);

			if (filteredMessages.length > 0) {
				filtered.push({
					...result,
					messages: filteredMessages,
					suppressedMessages: filteredSuppressedMessages,
					errorCount: filteredMessages.length,
					warningCount: 0,
					fixableErrorCount: result.fixableErrorCount,
					fixableWarningCount: 0,
				});
			}
		});

		return filtered;
	}

	/**
	 * Returns meta objects for each rule represented in the lint results.
	 * @param {LintResult[]} results The results to fetch rules meta for.
	 * @returns {Object} A mapping of ruleIds to rule meta objects.
	 * @throws {TypeError} When the results object wasn't created from this ESLint instance.
	 * @throws {TypeError} When a plugin or rule is missing.
	 */
	getRulesMetaForResults(results) {
		// short-circuit simple case
		if (results.length === 0) {
			return {};
		}

		const resultRules = new Map();
		const {
			configLoader,
			options: { cwd },
		} = privateMembers.get(this);

		for (const result of results) {
			/*
			 * Normalize filename for <text>.
			 */
			const filePath =
				result.filePath === "<text>"
					? getPlaceholderPath(cwd)
					: result.filePath;
			const allMessages = result.messages.concat(
				result.suppressedMessages,
			);

			for (const { ruleId } of allMessages) {
				if (!ruleId) {
					continue;
				}

				/*
				 * All of the plugin and rule information is contained within the
				 * calculated config for the given file.
				 */
				let configs;

				try {
					configs =
						configLoader.getCachedConfigArrayForFile(filePath);
				} catch {
					throw createExtraneousResultsError();
				}

				const config = configs.getConfig(filePath);

				if (!config) {
					throw createExtraneousResultsError();
				}
				const rule = config.getRuleDefinition(ruleId);

				// ignore unknown rules
				if (rule) {
					resultRules.set(ruleId, rule);
				}
			}
		}

		return createRulesMeta(resultRules);
	}

	/**
	 * Indicates if the given feature flag is enabled for this instance.
	 * @param {string} flag The feature flag to check.
	 * @returns {boolean} `true` if the feature flag is enabled, `false` if not.
	 */
	hasFlag(flag) {
		// note: Linter does validation of the flags
		return privateMembers.get(this).linter.hasFlag(flag);
	}

	/**
	 * Executes the current configuration on an array of file and directory names.
	 * @param {string|string[]} patterns An array of file and directory names.
	 * @returns {Promise<LintResult[]>} The results of linting the file patterns given.
	 */
	async lintFiles(patterns) {
		let normalizedPatterns = patterns;
		const {
			cacheFilePath,
			lintResultCache,
			linter,
			options: eslintOptions,
		} = privateMembers.get(this);

		/*
		 * Special cases:
		 * 1. `patterns` is an empty string
		 * 2. `patterns` is an empty array
		 *
		 * In both cases, we use the cwd as the directory to lint.
		 */
		if (
			patterns === "" ||
			(Array.isArray(patterns) && patterns.length === 0)
		) {
			/*
			 * Special case: If `passOnNoPatterns` is true, then we just exit
			 * without doing any work.
			 */
			if (eslintOptions.passOnNoPatterns) {
				return [];
			}

			normalizedPatterns = ["."];
		} else {
			if (
				!isNonEmptyString(patterns) &&
				!isArrayOfNonEmptyString(patterns)
			) {
				throw new Error(
					"'patterns' must be a non-empty string or an array of non-empty strings",
				);
			}

			if (typeof patterns === "string") {
				normalizedPatterns = [patterns];
			}
		}

		debug(`Using file patterns: ${normalizedPatterns}`);

		const {
			allowInlineConfig,
			cache,
			cwd,
			fix,
			fixTypes,
			ruleFilter,
			stats,
			globInputPaths,
			errorOnUnmatchedPattern,
			warnIgnored,
		} = eslintOptions;
		const startTime = Date.now();
		const fixTypesSet = fixTypes ? new Set(fixTypes) : null;

		// Delete cache file; should this be done here?
		if (!cache && cacheFilePath) {
			debug(`Deleting cache file at ${cacheFilePath}`);

			try {
				if (existsSync(cacheFilePath)) {
					await fs.unlink(cacheFilePath);
				}
			} catch (error) {
				if (existsSync(cacheFilePath)) {
					throw error;
				}
			}
		}

		const filePaths = await findFiles({
			patterns: normalizedPatterns,
			cwd,
			globInputPaths,
			configLoader: this.#configLoader,
			errorOnUnmatchedPattern,
		});
		const controller = new AbortController();
		const retryCodes = new Set(["ENFILE", "EMFILE"]);
		const retrier = new Retrier(error => retryCodes.has(error.code), {
			concurrency: 100,
		});

		debug(
			`${filePaths.length} files found in: ${Date.now() - startTime}ms`,
		);

		/*
		 * Because we need to process multiple files, including reading from disk,
		 * it is most efficient to start by reading each file via promises so that
		 * they can be done in parallel. Then, we can lint the returned text. This
		 * ensures we are waiting the minimum amount of time in between lints.
		 */
		const results = await Promise.all(
			filePaths.map(async filePath => {
				const configs =
					await this.#configLoader.loadConfigArrayForFile(filePath);
				const config = configs.getConfig(filePath);

				/*
				 * If a filename was entered that cannot be matched
				 * to a config, then notify the user.
				 */
				if (!config) {
					if (warnIgnored) {
						const configStatus = configs.getConfigStatus(filePath);

						return createIgnoreResult(filePath, cwd, configStatus);
					}

					return void 0;
				}

				// Skip if there is cached result.
				if (lintResultCache) {
					const cachedResult = lintResultCache.getCachedLintResults(
						filePath,
						config,
					);

					if (cachedResult) {
						const hadMessages =
							cachedResult.messages &&
							cachedResult.messages.length > 0;

						if (hadMessages && fix) {
							debug(
								`Reprocessing cached file to allow autofix: ${filePath}`,
							);
						} else {
							debug(
								`Skipping file since it hasn't changed: ${filePath}`,
							);
							return cachedResult;
						}
					}
				}

				// set up fixer for fixTypes if necessary
				const fixer = getFixerForFixTypes(fix, fixTypesSet, config);

				return retrier
					.retry(
						() =>
							fs
								.readFile(filePath, {
									encoding: "utf8",
									signal: controller.signal,
								})
								.then(text => {
									// fail immediately if an error occurred in another file
									controller.signal.throwIfAborted();

									// do the linting
									const result = verifyText({
										text,
										filePath,
										configs,
										cwd,
										fix: fixer,
										allowInlineConfig,
										ruleFilter,
										stats,
										linter,
									});

									/*
									 * Store the lint result in the LintResultCache.
									 * NOTE: The LintResultCache will remove the file source and any
									 * other properties that are difficult to serialize, and will
									 * hydrate those properties back in on future lint runs.
									 */
									if (lintResultCache) {
										lintResultCache.setCachedLintResults(
											filePath,
											config,
											result,
										);
									}

									return result;
								}),
						{ signal: controller.signal },
					)
					.catch(error => {
						controller.abort(error);
						throw error;
					});
			}),
		);

		// Persist the cache to disk.
		if (lintResultCache) {
			lintResultCache.reconcile();
		}

		const finalResults = results.filter(result => !!result);

		return processLintReport(this, {
			results: finalResults,
		});
	}

	/**
	 * Executes the current configuration on text.
	 * @param {string} code A string of JavaScript code to lint.
	 * @param {Object} [options] The options.
	 * @param {string} [options.filePath] The path to the file of the source code.
	 * @param {boolean} [options.warnIgnored] When set to true, warn if given filePath is an ignored path.
	 * @returns {Promise<LintResult[]>} The results of linting the string of code given.
	 */
	async lintText(code, options = {}) {
		// Parameter validation

		if (typeof code !== "string") {
			throw new Error("'code' must be a string");
		}

		if (typeof options !== "object") {
			throw new Error("'options' must be an object, null, or undefined");
		}

		// Options validation

		const { filePath, warnIgnored, ...unknownOptions } = options || {};

		const unknownOptionKeys = Object.keys(unknownOptions);

		if (unknownOptionKeys.length > 0) {
			throw new Error(
				`'options' must not include the unknown option(s): ${unknownOptionKeys.join(", ")}`,
			);
		}

		if (filePath !== void 0 && !isNonEmptyString(filePath)) {
			throw new Error(
				"'options.filePath' must be a non-empty string or undefined",
			);
		}

		if (
			typeof warnIgnored !== "boolean" &&
			typeof warnIgnored !== "undefined"
		) {
			throw new Error(
				"'options.warnIgnored' must be a boolean or undefined",
			);
		}

		// Now we can get down to linting

		const { linter, options: eslintOptions } = privateMembers.get(this);
		const {
			allowInlineConfig,
			cwd,
			fix,
			fixTypes,
			warnIgnored: constructorWarnIgnored,
			ruleFilter,
			stats,
		} = eslintOptions;
		const results = [];
		const startTime = Date.now();
		const fixTypesSet = fixTypes ? new Set(fixTypes) : null;
		const resolvedFilename = path.resolve(
			cwd,
			filePath || "__placeholder__.js",
		);
		const configs =
			await this.#configLoader.loadConfigArrayForFile(resolvedFilename);
		const configStatus =
			configs?.getConfigStatus(resolvedFilename) ?? "unconfigured";

		// Clear the last used config arrays.
		if (resolvedFilename && configStatus !== "matched") {
			const shouldWarnIgnored =
				typeof warnIgnored === "boolean"
					? warnIgnored
					: constructorWarnIgnored;

			if (shouldWarnIgnored) {
				results.push(
					createIgnoreResult(resolvedFilename, cwd, configStatus),
				);
			}
		} else {
			const config = configs.getConfig(resolvedFilename);
			const fixer = getFixerForFixTypes(fix, fixTypesSet, config);

			// Do lint.
			results.push(
				verifyText({
					text: code,
					filePath: resolvedFilename.endsWith("__placeholder__.js")
						? "<text>"
						: resolvedFilename,
					configs,
					cwd,
					fix: fixer,
					allowInlineConfig,
					ruleFilter,
					stats,
					linter,
				}),
			);
		}

		debug(`Linting complete in: ${Date.now() - startTime}ms`);

		return processLintReport(this, {
			results,
		});
	}

	/**
	 * Returns the formatter representing the given formatter name.
	 * @param {string} [name] The name of the formatter to load.
	 * The following values are allowed:
	 * - `undefined` ... Load `stylish` builtin formatter.
	 * - A builtin formatter name ... Load the builtin formatter.
	 * - A third-party formatter name:
	 *   - `foo` → `eslint-formatter-foo`
	 *   - `@foo` → `@foo/eslint-formatter`
	 *   - `@foo/bar` → `@foo/eslint-formatter-bar`
	 * - A file path ... Load the file.
	 * @returns {Promise<Formatter>} A promise resolving to the formatter object.
	 * This promise will be rejected if the given formatter was not found or not
	 * a function.
	 */
	async loadFormatter(name = "stylish") {
		if (typeof name !== "string") {
			throw new Error("'name' must be a string");
		}

		// replace \ with / for Windows compatibility
		const normalizedFormatName = name.replace(/\\/gu, "/");
		const namespace = getNamespaceFromTerm(normalizedFormatName);

		// grab our options
		const { cwd } = privateMembers.get(this).options;

		let formatterPath;

		// if there's a slash, then it's a file (TODO: this check seems dubious for scoped npm packages)
		if (!namespace && normalizedFormatName.includes("/")) {
			formatterPath = path.resolve(cwd, normalizedFormatName);
		} else {
			try {
				const npmFormat = normalizePackageName(
					normalizedFormatName,
					"eslint-formatter",
				);

				// TODO: This is pretty dirty...would be nice to clean up at some point.
				formatterPath = resolve(npmFormat, getPlaceholderPath(cwd));
			} catch {
				formatterPath = path.resolve(
					__dirname,
					"../",
					"cli-engine",
					"formatters",
					`${normalizedFormatName}.js`,
				);
			}
		}

		let formatter;

		try {
			formatter = (await import(pathToFileURL(formatterPath))).default;
		} catch (ex) {
			// check for formatters that have been removed
			if (removedFormatters.has(name)) {
				ex.message = `The ${name} formatter is no longer part of core ESLint. Install it manually with \`npm install -D eslint-formatter-${name}\``;
			} else {
				ex.message = `There was a problem loading formatter: ${formatterPath}\nError: ${ex.message}`;
			}

			throw ex;
		}

		if (typeof formatter !== "function") {
			throw new TypeError(
				`Formatter must be a function, but got a ${typeof formatter}.`,
			);
		}

		const eslint = this;

		return {
			/**
			 * The main formatter method.
			 * @param {LintResult[]} results The lint results to format.
			 * @param {ResultsMeta} resultsMeta Warning count and max threshold.
			 * @returns {string} The formatted lint results.
			 */
			format(results, resultsMeta) {
				let rulesMeta = null;

				results.sort(compareResultsByFilePath);

				return formatter(results, {
					...resultsMeta,
					cwd,
					get rulesMeta() {
						if (!rulesMeta) {
							rulesMeta = eslint.getRulesMetaForResults(results);
						}

						return rulesMeta;
					},
				});
			},
		};
	}

	/**
	 * Returns a configuration object for the given file based on the CLI options.
	 * This is the same logic used by the ESLint CLI executable to determine
	 * configuration for each file it processes.
	 * @param {string} filePath The path of the file to retrieve a config object for.
	 * @returns {Promise<Config|undefined>} A configuration object for the file
	 *      or `undefined` if there is no configuration data for the object.
	 */
	async calculateConfigForFile(filePath) {
		if (!isNonEmptyString(filePath)) {
			throw new Error("'filePath' must be a non-empty string");
		}
		const options = privateMembers.get(this).options;
		const absolutePath = path.resolve(options.cwd, filePath);
		const configs =
			await this.#configLoader.loadConfigArrayForFile(absolutePath);

		if (!configs) {
			const error = new Error("Could not find config file.");

			error.messageTemplate = "config-file-missing";
			throw error;
		}

		return configs.getConfig(absolutePath);
	}

	/**
	 * Finds the config file being used by this instance based on the options
	 * passed to the constructor.
	 * @param {string} [filePath] The path of the file to find the config file for.
	 * @returns {Promise<string|undefined>} The path to the config file being used or
	 *      `undefined` if no config file is being used.
	 */
	findConfigFile(filePath) {
		const options = privateMembers.get(this).options;

		/*
		 * Because the new config lookup scheme skips the current directory
		 * and looks into the parent directories, we need to use a placeholder
		 * directory to ensure the file in cwd is checked.
		 */
		const fakeCwd = path.join(options.cwd, "__placeholder__");

		return this.#configLoader
			.findConfigFileForPath(filePath ?? fakeCwd)
			.catch(() => void 0);
	}

	/**
	 * Checks if a given path is ignored by ESLint.
	 * @param {string} filePath The path of the file to check.
	 * @returns {Promise<boolean>} Whether or not the given path is ignored.
	 */
	async isPathIgnored(filePath) {
		const config = await this.calculateConfigForFile(filePath);

		return config === void 0;
	}
}

/**
 * Returns whether flat config should be used.
 * @returns {Promise<boolean>} Whether flat config should be used.
 */
async function shouldUseFlatConfig() {
	return process.env.ESLINT_USE_FLAT_CONFIG !== "false";
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports = {
	ESLint,
	shouldUseFlatConfig,
	locateConfigFileToUse,
};
