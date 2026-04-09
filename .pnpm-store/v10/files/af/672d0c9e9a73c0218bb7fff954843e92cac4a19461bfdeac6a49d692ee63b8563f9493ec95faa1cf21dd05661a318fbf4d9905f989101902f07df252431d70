/* eslint no-param-reassign: 0 -- stylistic choice */

import TokenTranslator from "./token-translator.js";
import { normalizeOptions } from "./options.js";

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
export default () => {
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
