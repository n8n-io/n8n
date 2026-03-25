'use strict';

var levn = require('levn');

/**
 * @fileoverview Config Comment Parser
 * @author Nicholas C. Zakas
 */


//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("@eslint/core").RuleConfig} RuleConfig */
/** @typedef {import("@eslint/core").RulesConfig} RulesConfig */
/** @typedef {import("./types.ts").StringConfig} StringConfig */
/** @typedef {import("./types.ts").BooleanConfig} BooleanConfig */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const directivesPattern = /^([a-z]+(?:-[a-z]+)*)(?:\s|$)/u;
const validSeverities = new Set([0, 1, 2, "off", "warn", "error"]);

/**
 * Determines if the severity in the rule configuration is valid.
 * @param {RuleConfig} ruleConfig A rule's configuration.
 * @returns {boolean} `true` if the severity is valid, otherwise `false`.
 */
function isSeverityValid(ruleConfig) {
	const severity = Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig;
	return validSeverities.has(severity);
}

/**
 * Determines if all severities in the rules configuration are valid.
 * @param {RulesConfig} rulesConfig The rules configuration to check.
 * @returns {boolean} `true` if all severities are valid, otherwise `false`.
 */
function isEverySeverityValid(rulesConfig) {
	return Object.values(rulesConfig).every(isSeverityValid);
}

/**
 * Represents a directive comment.
 */
class DirectiveComment {
	/**
	 * The label of the directive, such as "eslint", "eslint-disable", etc.
	 * @type {string}
	 */
	label = "";

	/**
	 * The value of the directive (the string after the label).
	 * @type {string}
	 */
	value = "";

	/**
	 * The justification of the directive (the string after the --).
	 * @type {string}
	 */
	justification = "";

	/**
	 * Creates a new directive comment.
	 * @param {string} label The label of the directive.
	 * @param {string} value The value of the directive.
	 * @param {string} justification The justification of the directive.
	 */
	constructor(label, value, justification) {
		this.label = label;
		this.value = value;
		this.justification = justification;
	}
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

/**
 * Object to parse ESLint configuration comments.
 */
class ConfigCommentParser {
	/**
	 * Parses a list of "name:string_value" or/and "name" options divided by comma or
	 * whitespace. Used for "global" comments.
	 * @param {string} string The string to parse.
	 * @returns {StringConfig} Result map object of names and string values, or null values if no value was provided.
	 */
	parseStringConfig(string) {
		const items = /** @type {StringConfig} */ ({});

		// Collapse whitespace around `:` and `,` to make parsing easier
		const trimmedString = string
			.trim()
			.replace(/(?<!\s)\s*([:,])\s*/gu, "$1");

		trimmedString.split(/\s|,+/u).forEach(name => {
			if (!name) {
				return;
			}

			// value defaults to null (if not provided), e.g: "foo" => ["foo", null]
			const [key, value = null] = name.split(":");

			items[key] = value;
		});

		return items;
	}

	/**
	 * Parses a JSON-like config.
	 * @param {string} string The string to parse.
	 * @returns {({ok: true, config: RulesConfig}|{ok: false, error: {message: string}})} Result map object
	 */
	parseJSONLikeConfig(string) {
		// Parses a JSON-like comment by the same way as parsing CLI option.
		try {
			const items =
				/** @type {RulesConfig} */ (levn.parse("Object", string)) || {};

			/*
			 * When the configuration has any invalid severities, it should be completely
			 * ignored. This is because the configuration is not valid and should not be
			 * applied.
			 *
			 * For example, the following configuration is invalid:
			 *
			 *    "no-alert: 2 no-console: 2"
			 *
			 * This results in a configuration of { "no-alert": "2 no-console: 2" }, which is
			 * not valid. In this case, the configuration should be ignored.
			 */
			if (isEverySeverityValid(items)) {
				return {
					ok: true,
					config: items,
				};
			}
		} catch {
			// levn parsing error: ignore to parse the string by a fallback.
		}

		/*
		 * Optionator cannot parse commaless notations.
		 * But we are supporting that. So this is a fallback for that.
		 */
		const normalizedString = string
			.replace(/([-a-zA-Z0-9/]+):/gu, '"$1":')
			.replace(/(\]|[0-9])\s+(?=")/u, "$1,");

		try {
			const items = JSON.parse(`{${normalizedString}}`);

			return {
				ok: true,
				config: items,
			};
		} catch (ex) {
			const errorMessage = ex instanceof Error ? ex.message : String(ex);

			return {
				ok: false,
				error: {
					message: `Failed to parse JSON from '${normalizedString}': ${errorMessage}`,
				},
			};
		}
	}

	/**
	 * Parses a config of values separated by comma.
	 * @param {string} string The string to parse.
	 * @returns {BooleanConfig} Result map of values and true values
	 */
	parseListConfig(string) {
		const items = /** @type {BooleanConfig} */ ({});

		string.split(",").forEach(name => {
			const trimmedName = name
				.trim()
				.replace(
					/^(?<quote>['"]?)(?<ruleId>.*)\k<quote>$/su,
					"$<ruleId>",
				);

			if (trimmedName) {
				items[trimmedName] = true;
			}
		});

		return items;
	}

	/**
	 * Extract the directive and the justification from a given directive comment and trim them.
	 * @param {string} value The comment text to extract.
	 * @returns {{directivePart: string, justificationPart: string}} The extracted directive and justification.
	 */
	#extractDirectiveComment(value) {
		const match = /\s-{2,}\s/u.exec(value);

		if (!match) {
			return { directivePart: value.trim(), justificationPart: "" };
		}

		const directive = value.slice(0, match.index).trim();
		const justification = value.slice(match.index + match[0].length).trim();

		return { directivePart: directive, justificationPart: justification };
	}

	/**
	 * Parses a directive comment into directive text and value.
	 * @param {string} string The string with the directive to be parsed.
	 * @returns {DirectiveComment|undefined} The parsed directive or `undefined` if the directive is invalid.
	 */
	parseDirective(string) {
		const { directivePart, justificationPart } =
			this.#extractDirectiveComment(string);
		const match = directivesPattern.exec(directivePart);

		if (!match) {
			return undefined;
		}

		const directiveText = match[1];
		const directiveValue = directivePart.slice(
			match.index + directiveText.length,
		);

		return new DirectiveComment(
			directiveText,
			directiveValue.trim(),
			justificationPart,
		);
	}
}

/**
 * @fileoverview A collection of helper classes for implementing `SourceCode`.
 * @author Nicholas C. Zakas
 */

/* eslint class-methods-use-this: off -- Required to complete interface. */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("@eslint/core").VisitTraversalStep} VisitTraversalStep */
/** @typedef {import("@eslint/core").CallTraversalStep} CallTraversalStep */
/** @typedef {import("@eslint/core").TraversalStep} TraversalStep */
/** @typedef {import("@eslint/core").SourceLocation} SourceLocation */
/** @typedef {import("@eslint/core").SourceLocationWithOffset} SourceLocationWithOffset */
/** @typedef {import("@eslint/core").SourceRange} SourceRange */
/** @typedef {import("@eslint/core").Directive} IDirective */
/** @typedef {import("@eslint/core").DirectiveType} DirectiveType */
/** @typedef {import("@eslint/core").SourceCodeBaseTypeOptions} SourceCodeBaseTypeOptions */
/**
 * @typedef {import("@eslint/core").TextSourceCode<Options>} TextSourceCode<Options>
 * @template {SourceCodeBaseTypeOptions} [Options=SourceCodeBaseTypeOptions]
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Determines if a node has ESTree-style loc information.
 * @param {object} node The node to check.
 * @returns {node is {loc:SourceLocation}} `true` if the node has ESTree-style loc information, `false` if not.
 */
function hasESTreeStyleLoc(node) {
	return "loc" in node;
}

/**
 * Determines if a node has position-style loc information.
 * @param {object} node The node to check.
 * @returns {node is {position:SourceLocation}} `true` if the node has position-style range information, `false` if not.
 */
function hasPosStyleLoc(node) {
	return "position" in node;
}

/**
 * Determines if a node has ESTree-style range information.
 * @param {object} node The node to check.
 * @returns {node is {range:SourceRange}} `true` if the node has ESTree-style range information, `false` if not.
 */
function hasESTreeStyleRange(node) {
	return "range" in node;
}

/**
 * Determines if a node has position-style range information.
 * @param {object} node The node to check.
 * @returns {node is {position:SourceLocationWithOffset}} `true` if the node has position-style range information, `false` if not.
 */
function hasPosStyleRange(node) {
	return "position" in node;
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class to represent a step in the traversal process where a node is visited.
 * @implements {VisitTraversalStep}
 */
class VisitNodeStep {
	/**
	 * The type of the step.
	 * @type {"visit"}
	 * @readonly
	 */
	type = "visit";

	/**
	 * The kind of the step. Represents the same data as the `type` property
	 * but it's a number for performance.
	 * @type {1}
	 * @readonly
	 */
	kind = 1;

	/**
	 * The target of the step.
	 * @type {object}
	 */
	target;

	/**
	 * The phase of the step.
	 * @type {1|2}
	 */
	phase;

	/**
	 * The arguments of the step.
	 * @type {Array<any>}
	 */
	args;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the step.
	 * @param {object} options.target The target of the step.
	 * @param {1|2} options.phase The phase of the step.
	 * @param {Array<any>} options.args The arguments of the step.
	 */
	constructor({ target, phase, args }) {
		this.target = target;
		this.phase = phase;
		this.args = args;
	}
}

/**
 * A class to represent a step in the traversal process where a
 * method is called.
 * @implements {CallTraversalStep}
 */
class CallMethodStep {
	/**
	 * The type of the step.
	 * @type {"call"}
	 * @readonly
	 */
	type = "call";

	/**
	 * The kind of the step. Represents the same data as the `type` property
	 * but it's a number for performance.
	 * @type {2}
	 * @readonly
	 */
	kind = 2;

	/**
	 * The name of the method to call.
	 * @type {string}
	 */
	target;

	/**
	 * The arguments to pass to the method.
	 * @type {Array<any>}
	 */
	args;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the step.
	 * @param {string} options.target The target of the step.
	 * @param {Array<any>} options.args The arguments of the step.
	 */
	constructor({ target, args }) {
		this.target = target;
		this.args = args;
	}
}

/**
 * A class to represent a directive comment.
 * @implements {IDirective}
 */
class Directive {
	/**
	 * The type of directive.
	 * @type {DirectiveType}
	 * @readonly
	 */
	type;

	/**
	 * The node representing the directive.
	 * @type {unknown}
	 * @readonly
	 */
	node;

	/**
	 * Everything after the "eslint-disable" portion of the directive,
	 * but before the "--" that indicates the justification.
	 * @type {string}
	 * @readonly
	 */
	value;

	/**
	 * The justification for the directive.
	 * @type {string}
	 * @readonly
	 */
	justification;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the directive.
	 * @param {"disable"|"enable"|"disable-next-line"|"disable-line"} options.type The type of directive.
	 * @param {unknown} options.node The node representing the directive.
	 * @param {string} options.value The value of the directive.
	 * @param {string} options.justification The justification for the directive.
	 */
	constructor({ type, node, value, justification }) {
		this.type = type;
		this.node = node;
		this.value = value;
		this.justification = justification;
	}
}

/**
 * Source Code Base Object
 * @template {SourceCodeBaseTypeOptions & {SyntaxElementWithLoc: object}} [Options=SourceCodeBaseTypeOptions & {SyntaxElementWithLoc: object}]
 * @implements {TextSourceCode<Options>}
 */
class TextSourceCodeBase {
	/**
	 * The lines of text in the source code.
	 * @type {Array<string>}
	 */
	#lines;

	/**
	 * The AST of the source code.
	 * @type {Options['RootNode']}
	 */
	ast;

	/**
	 * The text of the source code.
	 * @type {string}
	 */
	text;

	/**
	 * Creates a new instance.
	 * @param {Object} options The options for the instance.
	 * @param {string} options.text The source code text.
	 * @param {Options['RootNode']} options.ast The root AST node.
	 * @param {RegExp} [options.lineEndingPattern] The pattern to match lineEndings in the source code.
	 */
	constructor({ text, ast, lineEndingPattern = /\r?\n/u }) {
		this.ast = ast;
		this.text = text;
		this.#lines = text.split(lineEndingPattern);
	}

	/**
	 * Returns the loc information for the given node or token.
	 * @param {Options['SyntaxElementWithLoc']} nodeOrToken The node or token to get the loc information for.
	 * @returns {SourceLocation} The loc information for the node or token.
	 * @throws {Error} If the node or token does not have loc information.
	 */
	getLoc(nodeOrToken) {
		if (hasESTreeStyleLoc(nodeOrToken)) {
			return nodeOrToken.loc;
		}

		if (hasPosStyleLoc(nodeOrToken)) {
			return nodeOrToken.position;
		}

		throw new Error(
			"Custom getLoc() method must be implemented in the subclass.",
		);
	}

	/**
	 * Returns the range information for the given node or token.
	 * @param {Options['SyntaxElementWithLoc']} nodeOrToken The node or token to get the range information for.
	 * @returns {SourceRange} The range information for the node or token.
	 * @throws {Error} If the node or token does not have range information.
	 */
	getRange(nodeOrToken) {
		if (hasESTreeStyleRange(nodeOrToken)) {
			return nodeOrToken.range;
		}

		if (hasPosStyleRange(nodeOrToken)) {
			return [
				nodeOrToken.position.start.offset,
				nodeOrToken.position.end.offset,
			];
		}

		throw new Error(
			"Custom getRange() method must be implemented in the subclass.",
		);
	}

	/* eslint-disable no-unused-vars -- Required to complete interface. */
	/**
	 * Returns the parent of the given node.
	 * @param {Options['SyntaxElementWithLoc']} node The node to get the parent of.
	 * @returns {Options['SyntaxElementWithLoc']|undefined} The parent of the node.
	 * @throws {Error} If the method is not implemented in the subclass.
	 */
	getParent(node) {
		throw new Error("Not implemented.");
	}
	/* eslint-enable no-unused-vars -- Required to complete interface. */

	/**
	 * Gets all the ancestors of a given node
	 * @param {Options['SyntaxElementWithLoc']} node The node
	 * @returns {Array<Options['SyntaxElementWithLoc']>} All the ancestor nodes in the AST, not including the provided node, starting
	 * from the root node at index 0 and going inwards to the parent node.
	 * @throws {TypeError} When `node` is missing.
	 */
	getAncestors(node) {
		if (!node) {
			throw new TypeError("Missing required argument: node.");
		}

		const ancestorsStartingAtParent = [];

		for (
			let ancestor = this.getParent(node);
			ancestor;
			ancestor = this.getParent(ancestor)
		) {
			ancestorsStartingAtParent.push(ancestor);
		}

		return ancestorsStartingAtParent.reverse();
	}

	/**
	 * Gets the source code for the given node.
	 * @param {Options['SyntaxElementWithLoc']} [node] The AST node to get the text for.
	 * @param {number} [beforeCount] The number of characters before the node to retrieve.
	 * @param {number} [afterCount] The number of characters after the node to retrieve.
	 * @returns {string} The text representing the AST node.
	 * @public
	 */
	getText(node, beforeCount, afterCount) {
		if (node) {
			const range = this.getRange(node);
			return this.text.slice(
				Math.max(range[0] - (beforeCount || 0), 0),
				range[1] + (afterCount || 0),
			);
		}
		return this.text;
	}

	/**
	 * Gets the entire source text split into an array of lines.
	 * @returns {Array<string>} The source text as an array of lines.
	 * @public
	 */
	get lines() {
		return this.#lines;
	}

	/**
	 * Traverse the source code and return the steps that were taken.
	 * @returns {Iterable<TraversalStep>} The steps that were taken while traversing the source code.
	 */
	traverse() {
		throw new Error("Not implemented.");
	}
}

exports.CallMethodStep = CallMethodStep;
exports.ConfigCommentParser = ConfigCommentParser;
exports.Directive = Directive;
exports.TextSourceCodeBase = TextSourceCodeBase;
exports.VisitNodeStep = VisitNodeStep;
