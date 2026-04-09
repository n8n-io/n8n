'use strict';

var acorn = require('acorn');
var jsx = require('acorn-jsx');
var eslintVisitorKeys = require('eslint-visitor-keys');

function _interopNamespaceDefault(e) {
	var n = Object.create(null);
	if (e) {
		Object.keys(e).forEach(function (k) {
			if (k !== 'default') {
				var d = Object.getOwnPropertyDescriptor(e, k);
				Object.defineProperty(n, k, d.get ? d : {
					enumerable: true,
					get: function () { return e[k]; }
				});
			}
		});
	}
	n.default = e;
	return Object.freeze(n);
}

var acorn__namespace = /*#__PURE__*/_interopNamespaceDefault(acorn);

/**
 * @fileoverview Translates tokens between Acorn format and Esprima format.
 * @author Nicholas C. Zakas
 */

/**
 * @import * as acorn from "acorn";
 * @import { EnhancedTokTypes } from "./espree.js"
 * @import { NormalizedEcmaVersion } from "./options.js";
 * @import { EspreeToken as EsprimaToken } from "../espree.js";
 */
/**
 * Based on the `acorn.Token` class, but without a fixed `type` (since we need
 * it to be a string). Avoiding `type` lets us make one extending interface
 * more strict and another more lax.
 *
 * We could make `value` more strict to `string` even though the original is
 * `any`.
 *
 * `start` and `end` are required in `acorn.Token`
 *
 * `loc` and `range` are from `acorn.Token`
 *
 * Adds `regex`.
 */
/**
 * @typedef {{
 *   jsxAttrValueToken: boolean;
 *   ecmaVersion: NormalizedEcmaVersion;
 * }} ExtraNoTokens
 * @typedef {{
 *   tokens: EsprimaToken[]
 * } & ExtraNoTokens} Extra
 */

//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------

// Esprima Token Types
const Token = {
	Boolean: "Boolean",
	EOF: "<end>",
	Identifier: "Identifier",
	PrivateIdentifier: "PrivateIdentifier",
	Keyword: "Keyword",
	Null: "Null",
	Numeric: "Numeric",
	Punctuator: "Punctuator",
	String: "String",
	RegularExpression: "RegularExpression",
	Template: "Template",
	JSXIdentifier: "JSXIdentifier",
	JSXText: "JSXText",
};

/**
 * Converts part of a template into an Esprima token.
 * @param {acorn.Token[]} tokens The Acorn tokens representing the template.
 * @param {string} code The source code.
 * @returns {EsprimaToken} The Esprima equivalent of the template token.
 * @private
 */
function convertTemplatePart(tokens, code) {
	const firstToken = tokens[0],
		lastTemplateToken =
			/** @type {acorn.Token & { loc: acorn.SourceLocation, range: [number, number] }} */ (
				tokens.at(-1)
			);

	/** @type {EsprimaToken} */
	const token = {
		type: Token.Template,
		value: code.slice(firstToken.start, lastTemplateToken.end),
	};

	if (firstToken.loc) {
		token.loc = {
			start: firstToken.loc.start,
			end: lastTemplateToken.loc.end,
		};
	}

	if (firstToken.range) {
		token.start = firstToken.range[0];
		token.end = lastTemplateToken.range[1];
		token.range = [token.start, token.end];
	}

	return token;
}

/* eslint-disable jsdoc/check-types -- The API allows either */
/**
 * Contains logic to translate Acorn tokens into Esprima tokens.
 */
class TokenTranslator {
	/**
	 * Contains logic to translate Acorn tokens into Esprima tokens.
	 * @param {EnhancedTokTypes} acornTokTypes The Acorn token types.
	 * @param {string|String} code The source code Acorn is parsing. This is necessary
	 *      to correct the "value" property of some tokens.
	 */
	constructor(acornTokTypes, code) {
		/* eslint-enable jsdoc/check-types -- The API allows either */

		// token types
		this._acornTokTypes = acornTokTypes;

		// token buffer for templates
		/** @type {acorn.Token[]} */
		this._tokens = [];

		// track the last curly brace
		this._curlyBrace = null;

		// the source code
		this._code = code;
	}

	/**
	 * Translates a single Esprima token to a single Acorn token. This may be
	 * inaccurate due to how templates are handled differently in Esprima and
	 * Acorn, but should be accurate for all other tokens.
	 * @param {acorn.Token} token The Acorn token to translate.
	 * @param {ExtraNoTokens} extra Espree extra object.
	 * @returns {EsprimaToken} The Esprima version of the token.
	 */
	translate(token, extra) {
		const type = token.type,
			tt = this._acornTokTypes,
			// We use an unknown type because `acorn.Token` is a class whose
			//   `type` property we cannot override to our desired `string`;
			//   this also allows us to define a stricter `EsprimaToken` with
			//   a string-only `type` property
			unknownTokenType = /** @type {unknown} */ (token),
			newToken = /** @type {EsprimaToken} */ (unknownTokenType);

		if (type === tt.name) {
			newToken.type = Token.Identifier;

			// TODO: See if this is an Acorn bug
			if ("value" in token && token.value === "static") {
				newToken.type = Token.Keyword;
			}

			if (
				extra.ecmaVersion > 5 &&
				"value" in token &&
				(token.value === "yield" || token.value === "let")
			) {
				newToken.type = Token.Keyword;
			}
		} else if (type === tt.privateId) {
			newToken.type = Token.PrivateIdentifier;
		} else if (
			type === tt.semi ||
			type === tt.comma ||
			type === tt.parenL ||
			type === tt.parenR ||
			type === tt.braceL ||
			type === tt.braceR ||
			type === tt.dot ||
			type === tt.bracketL ||
			type === tt.colon ||
			type === tt.question ||
			type === tt.bracketR ||
			type === tt.ellipsis ||
			type === tt.arrow ||
			type === tt.jsxTagStart ||
			type === tt.incDec ||
			type === tt.starstar ||
			type === tt.jsxTagEnd ||
			type === tt.prefix ||
			type === tt.questionDot ||
			("binop" in type && type.binop && !type.keyword) ||
			("isAssign" in type && type.isAssign)
		) {
			newToken.type = Token.Punctuator;
			newToken.value = this._code.slice(token.start, token.end);
		} else if (type === tt.jsxName) {
			newToken.type = Token.JSXIdentifier;
		} else if (type.label === "jsxText" || type === tt.jsxAttrValueToken) {
			newToken.type = Token.JSXText;
		} else if (type.keyword) {
			if (type.keyword === "true" || type.keyword === "false") {
				newToken.type = Token.Boolean;
			} else if (type.keyword === "null") {
				newToken.type = Token.Null;
			} else {
				newToken.type = Token.Keyword;
			}
		} else if (type === tt.num) {
			newToken.type = Token.Numeric;
			newToken.value = this._code.slice(token.start, token.end);
		} else if (type === tt.string) {
			if (extra.jsxAttrValueToken) {
				extra.jsxAttrValueToken = false;
				newToken.type = Token.JSXText;
			} else {
				newToken.type = Token.String;
			}

			newToken.value = this._code.slice(token.start, token.end);
		} else if (type === tt.regexp) {
			newToken.type = Token.RegularExpression;
			const value = /** @type {{flags: string, pattern: string}} */ (
				"value" in token && token.value
			);

			newToken.regex = {
				flags: value.flags,
				pattern: value.pattern,
			};
			newToken.value = `/${value.pattern}/${value.flags}`;
		}

		return newToken;
	}

	/**
	 * Function to call during Acorn's onToken handler.
	 * @param {acorn.Token} token The Acorn token.
	 * @param {Extra} extra The Espree extra object.
	 * @returns {void}
	 */
	onToken(token, extra) {
		const tt = this._acornTokTypes,
			tokens = extra.tokens,
			templateTokens = this._tokens;

		/**
		 * Flushes the buffered template tokens and resets the template
		 * tracking.
		 * @returns {void}
		 * @private
		 */
		const translateTemplateTokens = () => {
			tokens.push(convertTemplatePart(this._tokens, this._code));
			this._tokens = [];
		};

		if (token.type === tt.eof) {
			// might be one last curlyBrace
			if (this._curlyBrace) {
				tokens.push(this.translate(this._curlyBrace, extra));
			}

			return;
		}

		if (token.type === tt.backQuote) {
			// if there's already a curly, it's not part of the template
			if (this._curlyBrace) {
				tokens.push(this.translate(this._curlyBrace, extra));
				this._curlyBrace = null;
			}

			templateTokens.push(token);

			// it's the end
			if (templateTokens.length > 1) {
				translateTemplateTokens();
			}

			return;
		}
		if (token.type === tt.dollarBraceL) {
			templateTokens.push(token);
			translateTemplateTokens();
			return;
		}
		if (token.type === tt.braceR) {
			// if there's already a curly, it's not part of the template
			if (this._curlyBrace) {
				tokens.push(this.translate(this._curlyBrace, extra));
			}

			// store new curly for later
			this._curlyBrace = token;
			return;
		}
		if (token.type === tt.template || token.type === tt.invalidTemplate) {
			if (this._curlyBrace) {
				templateTokens.push(this._curlyBrace);
				this._curlyBrace = null;
			}

			templateTokens.push(token);
			return;
		}

		if (this._curlyBrace) {
			tokens.push(this.translate(this._curlyBrace, extra));
			this._curlyBrace = null;
		}

		tokens.push(this.translate(token, extra));
	}
}

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
function getLatestEcmaVersion() {
	return LATEST_ECMA_VERSION;
}

/**
 * Get the list of ECMAScript versions supported by Espree.
 * @returns {[...typeof SUPPORTED_VERSIONS]} An array containing the supported ECMAScript versions.
 */
function getSupportedEcmaVersions() {
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
function normalizeOptions(options) {
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

/* eslint no-param-reassign: 0 -- stylistic choice */


/**
 * @import {
 *   CommentType,
 *   EspreeParserCtor,
 *   EsprimaNode,
 *   AcornJsxParserCtorEnhanced,
 *   TokTypes
 * } from "./types.js";
 * @import {
 *   Options,
 *   EspreeToken as EsprimaToken,
 *   EspreeTokens as EsprimaTokens,
 *   EspreeComment as EsprimaComment
 * } from "../espree.js";
 * @import { NormalizedEcmaVersion } from "./options.js";
 * @import * as acorn from "acorn";
 */

/**
 * @typedef {{
 *   originalSourceType: "script" | "module" | "commonjs" | undefined
 *   tokens: EsprimaToken[] | null,
 *   comments: EsprimaComment[] | null,
 *   impliedStrict: boolean,
 *   ecmaVersion: NormalizedEcmaVersion,
 *   jsxAttrValueToken: boolean,
 *   lastToken: acorn.Token | null,
 *   templateElements: acorn.TemplateElement[]
 * }} State
 */

/**
 * @typedef {{
 *   sourceType?: "script"|"module"|"commonjs";
 *   comments?: EsprimaComment[];
 *   tokens?: EsprimaToken[];
 *   body: acorn.Node[];
 * } & acorn.Program} EsprimaProgramNode
 */

// ----------------------------------------------------------------------------
// Types exported from file
// ----------------------------------------------------------------------------
/**
 * @typedef {{
 *   index?: number;
 *   lineNumber?: number;
 *   column?: number;
 * } & SyntaxError} EnhancedSyntaxError
 */

// We add `jsxAttrValueToken` ourselves.
/**
 * @typedef {{
 *   jsxAttrValueToken?: acorn.TokenType;
 * } & TokTypes} EnhancedTokTypes
 */

const STATE = Symbol("espree's internal state");
const ESPRIMA_FINISH_NODE = Symbol("espree's esprimaFinishNode");

/**
 * Converts an Acorn comment to a Esprima comment.
 * @param {boolean} block True if it's a block comment, false if not.
 * @param {string} text The text of the comment.
 * @param {number} start The index at which the comment starts.
 * @param {number} end The index at which the comment ends.
 * @param {acorn.Position | undefined} startLoc The location at which the comment starts.
 * @param {acorn.Position | undefined} endLoc The location at which the comment ends.
 * @param {string} code The source code being parsed.
 * @returns {EsprimaComment} The comment object.
 * @private
 */
function convertAcornCommentToEsprimaComment(
	block,
	text,
	start,
	end,
	startLoc,
	endLoc,
	code,
) {
	/** @type {CommentType} */
	let type;

	if (block) {
		type = "Block";
	} else if (code.slice(start, start + 2) === "#!") {
		type = "Hashbang";
	} else {
		type = "Line";
	}

	/**
	 * @type {{
	 *   type: CommentType,
	 *   value: string,
	 *   start?: number,
	 *   end?: number,
	 *   range?: [number, number],
	 *   loc?: {
	 *     start: acorn.Position | undefined,
	 *     end: acorn.Position | undefined
	 *   }
	 * }}
	 */
	const comment = {
		type,
		value: text,
	};

	if (typeof start === "number") {
		comment.start = start;
		comment.end = end;
		comment.range = [start, end];
	}

	if (typeof startLoc === "object") {
		comment.loc = {
			start: startLoc,
			end: endLoc,
		};
	}

	return comment;
}

// eslint-disable-next-line arrow-body-style -- For TS
var espree = () => {
	/**
	 * Returns the Espree parser.
	 * @param {AcornJsxParserCtorEnhanced} Parser The Acorn parser. The `acorn` property is missing from acorn's
	 *   TypeScript but is present statically on the class.
	 * @returns {EspreeParserCtor} The Espree Parser constructor.
	 */
	return Parser => {
		const tokTypes = /** @type {EnhancedTokTypes} */ (
			Object.assign({}, Parser.acorn.tokTypes)
		);

		if (Parser.acornJsx) {
			Object.assign(tokTypes, Parser.acornJsx.tokTypes);
		}

		return class Espree extends Parser {
			/**
			 * @param {Options | null | undefined} opts The parser options
			 * @param {string | object} code The code which will be converted to a string.
			 */
			constructor(opts, code) {
				if (typeof opts !== "object" || opts === null) {
					opts = {};
				}
				if (typeof code !== "string" && !(code instanceof String)) {
					code = String(code);
				}

				// save original source type in case of commonjs
				const originalSourceType = opts.sourceType;
				const options = normalizeOptions(opts);
				const ecmaFeatures = options.ecmaFeatures || {};
				const tokenTranslator =
					options.tokens === true
						? new TokenTranslator(
								tokTypes,

								// @ts-expect-error Appears to be a TS bug since the type is indeed string|String
								code,
							)
						: null;

				/**
				 * Data that is unique to Espree and is not represented internally
				 * in Acorn.
				 *
				 * For ES2023 hashbangs, Espree will call `onComment()` during the
				 * constructor, so we must define state before having access to
				 * `this`.
				 * @type {State}
				 */
				const state = {
					originalSourceType:
						originalSourceType || options.sourceType,
					tokens: tokenTranslator ? [] : null,
					comments: options.comment === true ? [] : null,
					impliedStrict:
						ecmaFeatures.impliedStrict === true &&
						options.ecmaVersion >= 5,
					ecmaVersion: options.ecmaVersion,
					jsxAttrValueToken: false,
					lastToken: null,
					templateElements: [],
				};

				// Initialize acorn parser.
				super(
					{
						// do not use spread, because we don't want to pass any unknown options to acorn
						ecmaVersion: options.ecmaVersion,
						sourceType: options.sourceType,
						ranges: options.ranges,
						locations: options.locations,
						allowReserved: options.allowReserved,

						// Truthy value is true for backward compatibility.
						allowReturnOutsideFunction:
							options.allowReturnOutsideFunction,

						// Collect tokens
						onToken(token) {
							if (tokenTranslator) {
								// Use `tokens`, `ecmaVersion`, and `jsxAttrValueToken` in the state.
								tokenTranslator.onToken(
									token,

									/**
									 * @type {Omit<State, "tokens"> & {
									 *   tokens: EsprimaToken[]
									 * }}
									 */
									(state),
								);
							}
							if (token.type !== tokTypes.eof) {
								state.lastToken = token;
							}
						},

						// Collect comments
						onComment(block, text, start, end, startLoc, endLoc) {
							if (state.comments) {
								const comment =
									convertAcornCommentToEsprimaComment(
										block,
										text,
										start,
										end,
										startLoc,
										endLoc,

										// @ts-expect-error Appears to be a TS bug
										//   since the type is indeed string|String
										code,
									);

								state.comments.push(comment);
							}
						},
					},
					// @ts-expect-error Appears to be a TS bug
					//   since the type is indeed string|String
					code,
				);

				/*
				 * We put all of this data into a symbol property as a way to avoid
				 * potential naming conflicts with future versions of Acorn.
				 */
				this[STATE] = state;
			}

			/**
			 * Returns Espree tokens.
			 * @returns {EsprimaTokens} The Esprima-compatible tokens
			 */
			tokenize() {
				do {
					this.next();
				} while (this.type !== tokTypes.eof);

				// Consume the final eof token
				this.next();

				const extra = this[STATE];
				const tokens = /** @type {EsprimaTokens} */ (extra.tokens);

				if (extra.comments) {
					tokens.comments = extra.comments;
				}

				return tokens;
			}

			/**
			 * Calls parent.
			 * @param {acorn.Node} node The node
			 * @param {string} type The type
			 * @returns {acorn.Node} The altered Node
			 */
			finishNode(node, type) {
				const result = super.finishNode(node, type);

				return this[ESPRIMA_FINISH_NODE](result);
			}

			/**
			 * Calls parent.
			 * @param {acorn.Node} node The node
			 * @param {string} type The type
			 * @param {number} pos The position
			 * @param {acorn.Position} loc The location
			 * @returns {acorn.Node} The altered Node
			 */
			finishNodeAt(node, type, pos, loc) {
				const result = super.finishNodeAt(node, type, pos, loc);

				return this[ESPRIMA_FINISH_NODE](result);
			}

			/**
			 * Parses.
			 * @returns {EsprimaProgramNode} The program Node
			 */
			parse() {
				const extra = this[STATE];
				const prog = super.parse();

				const program = /** @type {EsprimaProgramNode} */ (prog);

				// @ts-expect-error TS bug? We've already converted to `EsprimaProgramNode`
				program.sourceType = extra.originalSourceType;

				if (extra.comments) {
					program.comments = extra.comments;
				}
				if (extra.tokens) {
					program.tokens = extra.tokens;
				}

				/*
				 * https://github.com/eslint/espree/issues/349
				 * Ensure that template elements have correct range information.
				 * This is one location where Acorn produces a different value
				 * for its start and end properties vs. the values present in the
				 * range property. In order to avoid confusion, we set the start
				 * and end properties to the values that are present in range.
				 * This is done here, instead of in finishNode(), because Acorn
				 * uses the values of start and end internally while parsing, making
				 * it dangerous to change those values while parsing is ongoing.
				 * By waiting until the end of parsing, we can safely change these
				 * values without affect any other part of the process.
				 */
				this[STATE].templateElements.forEach(templateElement => {
					const startOffset = -1;
					const endOffset = templateElement.tail ? 1 : 2;

					templateElement.start += startOffset;
					templateElement.end += endOffset;

					if (templateElement.range) {
						templateElement.range[0] += startOffset;
						templateElement.range[1] += endOffset;
					}

					if (templateElement.loc) {
						templateElement.loc.start.column += startOffset;
						templateElement.loc.end.column += endOffset;
					}
				});

				return program;
			}

			/**
			 * Parses top level.
			 * @param {acorn.Node} node AST Node
			 * @returns {acorn.Node} The changed node
			 */
			parseTopLevel(node) {
				if (this[STATE].impliedStrict) {
					this.strict = true;
				}
				return super.parseTopLevel(node);
			}

			/**
			 * Overwrites the default raise method to throw Esprima-style errors.
			 * @param {number} pos The position of the error.
			 * @param {string} message The error message.
			 * @throws {EnhancedSyntaxError} A syntax error.
			 * @returns {void}
			 */
			raise(pos, message) {
				const loc = Parser.acorn.getLineInfo(this.input, pos);
				const err = /** @type {EnhancedSyntaxError} */ (
					new SyntaxError(message)
				);

				err.index = pos;
				err.lineNumber = loc.line;
				err.column = loc.column + 1; // acorn uses 0-based columns
				throw err;
			}

			/**
			 * Overwrites the default raise method to throw Esprima-style errors.
			 * @param {number} pos The position of the error.
			 * @param {string} message The error message.
			 * @throws {SyntaxError} A syntax error.
			 * @returns {void}
			 */
			raiseRecoverable(pos, message) {
				this.raise(pos, message);
			}

			/**
			 * Overwrites the default unexpected method to throw Esprima-style errors.
			 * @param {number} pos The position of the error.
			 * @throws {SyntaxError} A syntax error.
			 * @returns {void}
			 */
			unexpected(pos) {
				let message = "Unexpected token";

				if (pos !== null && pos !== void 0) {
					this.pos = pos;

					if (this.options.locations) {
						while (this.pos < this.lineStart) {
							this.lineStart =
								this.input.lastIndexOf(
									"\n",
									this.lineStart - 2,
								) + 1;
							--this.curLine;
						}
					}

					this.nextToken();
				}

				if (this.end > this.start) {
					message += ` ${this.input.slice(this.start, this.end)}`;
				}

				this.raise(this.start, message);
			}

			/**
			 * Esprima-FB represents JSX strings as tokens called "JSXText", but Acorn-JSX
			 * uses regular tt.string without any distinction between this and regular JS
			 * strings. As such, we intercept an attempt to read a JSX string and set a flag
			 * on extra so that when tokens are converted, the next token will be switched
			 * to JSXText via onToken.
			 * @param {number} quote A character code
			 * @returns {void}
			 */ // eslint-disable-next-line camelcase -- required by API
			jsx_readString(quote) {
				const result = super.jsx_readString(quote);

				if (this.type === tokTypes.string) {
					this[STATE].jsxAttrValueToken = true;
				}
				return result;
			}

			/**
			 * Performs last-minute Esprima-specific compatibility checks and fixes.
			 * @param {acorn.Node} result The node to check.
			 * @returns {EsprimaNode} The finished node.
			 */
			[ESPRIMA_FINISH_NODE](result) {
				// Acorn doesn't count the opening and closing backticks as part of templates
				// so we have to adjust ranges/locations appropriately.
				if (result.type === "TemplateElement") {
					// save template element references to fix start/end later
					this[STATE].templateElements.push(
						/** @type {acorn.TemplateElement} */
						(result),
					);
				}

				if (
					result.type.includes("Function") &&
					!("generator" in result)
				) {
					/**
					 * @type {acorn.FunctionDeclaration|acorn.FunctionExpression|
					 *   acorn.ArrowFunctionExpression}
					 */
					(result).generator = false;
				}

				return result;
			}
		};
	};
};

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
					acorn__namespace.Parser.extend(
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
					acorn__namespace.Parser.extend(
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
function tokenize(code, options) {
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
function parse(code, options) {
	const Parser = parsers.get(options);

	return new Parser(options, code).parse();
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

/** @type {string} */
const version = "11.2.0"; // x-release-please-version
const name = "espree";

// Derive node types from VisitorKeys
const Syntax = /* #__PURE__ */ (function () {
	let key,
		/** @type {Record<string,string>} */
		types = {};

	if (typeof Object.create === "function") {
		types = Object.create(null);
	}

	for (key in eslintVisitorKeys.KEYS) {
		if (Object.hasOwn(eslintVisitorKeys.KEYS, key)) {
			types[key] = key;
		}
	}

	if (typeof Object.freeze === "function") {
		Object.freeze(types);
	}

	return types;
})();

const latestEcmaVersion = /* #__PURE__ */ getLatestEcmaVersion();

const supportedEcmaVersions = /* #__PURE__ */ getSupportedEcmaVersions();

Object.defineProperty(exports, "VisitorKeys", {
	enumerable: true,
	get: function () { return eslintVisitorKeys.KEYS; }
});
exports.Syntax = Syntax;
exports.latestEcmaVersion = latestEcmaVersion;
exports.name = name;
exports.parse = parse;
exports.supportedEcmaVersions = supportedEcmaVersions;
exports.tokenize = tokenize;
exports.version = version;
