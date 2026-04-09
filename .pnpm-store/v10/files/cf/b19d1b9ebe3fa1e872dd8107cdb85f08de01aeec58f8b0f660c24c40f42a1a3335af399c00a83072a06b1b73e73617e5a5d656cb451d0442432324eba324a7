/**
 * @fileoverview A collection of methods for processing Espree's options.
 * @author Kai Cataldo
 */

/**
 * @import { EcmaVersion, Options } from "../espree.js";
 */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const SUPPORTED_VERSIONS = /** @type {const} */ ([
	3,
	5,
	6, // 2015
	7, // 2016
	8, // 2017
	9, // 2018
	10, // 2019
	11, // 2020
	12, // 2021
	13, // 2022
	14, // 2023
	15, // 2024
	16, // 2025
	17, // 2026
]);

/**
 * @typedef {typeof SUPPORTED_VERSIONS[number]} NormalizedEcmaVersion
 */

const LATEST_ECMA_VERSION =
	/* eslint-disable jsdoc/valid-types -- Bug */
	/** @type {typeof SUPPORTED_VERSIONS extends readonly [...unknown[], infer L] ? L : never} */ (
		SUPPORTED_VERSIONS.at(-1)
		/* eslint-enable jsdoc/valid-types -- Bug */
	);

/**
 * Get the latest ECMAScript version supported by Espree.
 * @returns {typeof LATEST_ECMA_VERSION} The latest ECMAScript version.
 */
export function getLatestEcmaVersion() {
	return LATEST_ECMA_VERSION;
}

/**
 * Get the list of ECMAScript versions supported by Espree.
 * @returns {[...typeof SUPPORTED_VERSIONS]} An array containing the supported ECMAScript versions.
 */
export function getSupportedEcmaVersions() {
	return [...SUPPORTED_VERSIONS];
}

/**
 * Normalize ECMAScript version from the initial config
 * @param {EcmaVersion} ecmaVersion ECMAScript version from the initial config
 * @throws {Error} throws an error if the ecmaVersion is invalid.
 * @returns {NormalizedEcmaVersion} normalized ECMAScript version
 */
function normalizeEcmaVersion(ecmaVersion = 5) {
	let version =
		ecmaVersion === "latest" ? getLatestEcmaVersion() : ecmaVersion;

	if (typeof version !== "number") {
		throw new Error(
			`ecmaVersion must be a number or "latest". Received value of type ${typeof ecmaVersion} instead.`,
		);
	}

	// Calculate ECMAScript edition number from official year version starting with
	// ES2015, which corresponds with ES6 (or a difference of 2009).
	if (version >= 2015) {
		version -= 2009;
	}

	if (
		!SUPPORTED_VERSIONS.includes(
			/** @type {NormalizedEcmaVersion} */
			(version),
		)
	) {
		throw new Error("Invalid ecmaVersion.");
	}

	return /** @type {NormalizedEcmaVersion} */ (version);
}

/**
 * Normalize sourceType from the initial config
 * @param {string} sourceType to normalize
 * @throws {Error} throw an error if sourceType is invalid
 * @returns {"script"|"module"|"commonjs"} normalized sourceType
 */
function normalizeSourceType(sourceType = "script") {
	if (
		sourceType === "script" ||
		sourceType === "module" ||
		sourceType === "commonjs"
	) {
		return sourceType;
	}

	throw new Error("Invalid sourceType.");
}

/**
 * @typedef {{
 *   ecmaVersion: NormalizedEcmaVersion,
 *   sourceType: "script"|"module"|"commonjs",
 *   range?: boolean,
 *   loc?: boolean,
 *   allowReserved: boolean | "never",
 *   ecmaFeatures?: {
 *     jsx?: boolean,
 *     globalReturn?: boolean,
 *     impliedStrict?: boolean
 *   },
 *   ranges: boolean,
 *   locations: boolean,
 *   allowReturnOutsideFunction: boolean,
 *   tokens?: boolean,
 *   comment?: boolean
 * }} NormalizedParserOptions
 */

/**
 * Normalize parserOptions
 * @param {Options} options the parser options to normalize
 * @throws {Error} throw an error if found invalid option.
 * @returns {NormalizedParserOptions} normalized options
 */
export function normalizeOptions(options) {
	const ecmaVersion = normalizeEcmaVersion(options.ecmaVersion);
	const sourceType = normalizeSourceType(options.sourceType);
	const ranges = options.range === true;
	const locations = options.loc === true;

	if (ecmaVersion !== 3 && options.allowReserved) {
		// a value of `false` is intentionally allowed here, so a shared config can overwrite it when needed
		throw new Error(
			"`allowReserved` is only supported when ecmaVersion is 3",
		);
	}
	if (
		typeof options.allowReserved !== "undefined" &&
		typeof options.allowReserved !== "boolean"
	) {
		throw new Error(
			"`allowReserved`, when present, must be `true` or `false`",
		);
	}
	const allowReserved =
		ecmaVersion === 3 ? options.allowReserved || "never" : false;
	const ecmaFeatures = options.ecmaFeatures || {};
	const allowReturnOutsideFunction =
		options.sourceType === "commonjs" || Boolean(ecmaFeatures.globalReturn);

	if (sourceType === "module" && ecmaVersion < 6) {
		throw new Error(
			"sourceType 'module' is not supported when ecmaVersion < 2015. Consider adding `{ ecmaVersion: 2015 }` to the parser options.",
		);
	}

	return Object.assign({}, options, {
		ecmaVersion,
		sourceType,
		ranges,
		locations,
		allowReserved,
		allowReturnOutsideFunction,
	});
}
