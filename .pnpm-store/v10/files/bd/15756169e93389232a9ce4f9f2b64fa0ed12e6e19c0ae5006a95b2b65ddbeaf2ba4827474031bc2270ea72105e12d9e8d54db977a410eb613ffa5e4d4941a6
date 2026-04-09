/**
 * @fileoverview Main Espree file that converts Acorn into Esprima output.
 *
 * This file contains code from the following MIT-licensed projects:
 * 1. Acorn
 * 2. Babylon
 * 3. Babel-ESLint
 *
 * This file also contains code from Esprima, which is BSD licensed.
 *
 * Acorn is Copyright 2012-2015 Acorn Contributors (https://github.com/marijnh/acorn/blob/master/AUTHORS)
 * Babylon is Copyright 2014-2015 various contributors (https://github.com/babel/babel/blob/master/packages/babylon/AUTHORS)
 * Babel-ESLint is Copyright 2014-2015 Sebastian McKenzie <sebmck@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Esprima is Copyright (c) jQuery Foundation, Inc. and Contributors, All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   * Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as acorn from "acorn";
import jsx from "acorn-jsx";
import espree from "./lib/espree.js";
import { KEYS as VisitorKeys } from "eslint-visitor-keys";
import {
	getLatestEcmaVersion,
	getSupportedEcmaVersions,
} from "./lib/options.js";

/**
 * @import { EspreeParserCtor, EspreeParserJsxCtor } from "./lib/types.js";
 */

// ----------------------------------------------------------------------------
// Types exported from file
// ----------------------------------------------------------------------------
/**
 * @typedef {3|5|6|7|8|9|10|11|12|13|14|15|16|17|2015|2016|2017|2018|2019|2020|2021|2022|2023|2024|2025|2026|'latest'} EcmaVersion
 */

/**
 * @typedef {{
 *   type: string;
 *   value: any;
 *   start?: number;
 *   end?: number;
 *   loc?: acorn.SourceLocation;
 *   range?: [number, number];
 *   regex?: {flags: string, pattern: string};
 * }} EspreeToken
 */

/**
 * @typedef {{
 *   type: "Block" | "Hashbang" | "Line",
 *   value: string,
 *   range?: [number, number],
 *   start?: number,
 *   end?: number,
 *   loc?: {
 *     start: acorn.Position | undefined,
 *     end: acorn.Position | undefined
 *   }
 * }} EspreeComment
 */

/**
 * @typedef {{
 *   comments?: EspreeComment[]
 * } & EspreeToken[]} EspreeTokens
 */

/**
 * `allowReserved` is as in `acorn.Options`
 *
 * `ecmaVersion` currently as in `acorn.Options` though optional
 *
 * `sourceType` as in `acorn.Options` but also allows `commonjs`
 *
 * `ecmaFeatures`, `range`, `loc`, `tokens` are not in `acorn.Options`
 *
 * `comment` is not in `acorn.Options` and doesn't err without it, but is used
 */
/**
 * @typedef {{
 *   allowReserved?: boolean,
 *   ecmaVersion?: EcmaVersion,
 *   sourceType?: "script"|"module"|"commonjs",
 *   ecmaFeatures?: {
 *     jsx?: boolean,
 *     globalReturn?: boolean,
 *     impliedStrict?: boolean
 *   },
 *   range?: boolean,
 *   loc?: boolean,
 *   tokens?: boolean,
 *   comment?: boolean,
 * }} Options
 */

// To initialize lazily.
const parsers = {
	/** @type {EspreeParserCtor|null} */
	_regular: null,

	/** @type {EspreeParserJsxCtor|null} */
	_jsx: null,

	/**
	 * Returns regular Parser
	 * @returns {EspreeParserCtor} Regular Acorn parser
	 */
	get regular() {
		if (this._regular === null) {
			const espreeParserFactory = /** @type {unknown} */ (espree());

			this._regular = /** @type {EspreeParserCtor} */ (
				// Without conversion, types are incompatible, as
				// acorn's has a protected constructor
				/** @type {unknown} */
				(
					acorn.Parser.extend(
						/**
						 * @type {(
						 *   BaseParser: typeof acorn.Parser
						 * ) => typeof acorn.Parser}
						 */ (espreeParserFactory),
					)
				)
			);
		}
		return this._regular;
	},

	/**
	 * Returns JSX Parser
	 * @returns {EspreeParserJsxCtor} JSX Acorn parser
	 */
	get jsx() {
		if (this._jsx === null) {
			const espreeParserFactory = /** @type {unknown} */ (espree());
			const jsxFactory = jsx();

			this._jsx = /** @type {EspreeParserJsxCtor} */ (
				// Without conversion, types are incompatible, as
				// acorn's has a protected constructor
				/** @type {unknown} */
				(
					acorn.Parser.extend(
						jsxFactory,

						/** @type {(BaseParser: typeof acorn.Parser) => typeof acorn.Parser} */
						(espreeParserFactory),
					)
				)
			);
		}
		return this._jsx;
	},

	/**
	 * Gets the parser object based on the supplied options.
	 * @param {Options} [options] The parser options.
	 * @returns {EspreeParserJsxCtor|EspreeParserCtor} Regular or JSX Acorn parser
	 */
	get(options) {
		const useJsx = Boolean(
			options && options.ecmaFeatures && options.ecmaFeatures.jsx,
		);

		return useJsx ? this.jsx : this.regular;
	},
};

//------------------------------------------------------------------------------
// Tokenizer
//------------------------------------------------------------------------------

/**
 * Tokenizes the given code.
 * @param {string} code The code to tokenize.
 * @param {Options} [options] Options defining how to tokenize.
 * @returns {EspreeTokens} An array of tokens.
 * @throws {EnhancedSyntaxError} If the input code is invalid.
 * @private
 */
export function tokenize(code, options) {
	const Parser = parsers.get(options);

	// Ensure to collect tokens.
	if (!options || options.tokens !== true) {
		options = Object.assign({}, options, { tokens: true }); // eslint-disable-line no-param-reassign -- stylistic choice
	}

	return /** @type {EspreeTokens} */ (new Parser(options, code).tokenize());
}

//------------------------------------------------------------------------------
// Parser
//------------------------------------------------------------------------------

/**
 * Parses the given code.
 * @param {string} code The code to tokenize.
 * @param {Options} [options] Options defining how to tokenize.
 * @returns {acorn.Program} The "Program" AST node.
 * @throws {EnhancedSyntaxError} If the input code is invalid.
 */
export function parse(code, options) {
	const Parser = parsers.get(options);

	return new Parser(options, code).parse();
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

/** @type {string} */
export const version = "11.2.0"; // x-release-please-version
export const name = "espree";

// Derive node types from VisitorKeys
export const Syntax = /* #__PURE__ */ (function () {
	let key,
		/** @type {Record<string,string>} */
		types = {};

	if (typeof Object.create === "function") {
		types = Object.create(null);
	}

	for (key in VisitorKeys) {
		if (Object.hasOwn(VisitorKeys, key)) {
			types[key] = key;
		}
	}

	if (typeof Object.freeze === "function") {
		Object.freeze(types);
	}

	return types;
})();

export const latestEcmaVersion = /* #__PURE__ */ getLatestEcmaVersion();

export const supportedEcmaVersions = /* #__PURE__ */ getSupportedEcmaVersions();

export { KEYS as VisitorKeys } from "eslint-visitor-keys";
