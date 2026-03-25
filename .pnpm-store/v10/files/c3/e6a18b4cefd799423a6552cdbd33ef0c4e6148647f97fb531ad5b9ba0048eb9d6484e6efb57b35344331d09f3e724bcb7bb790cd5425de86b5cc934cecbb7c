/**
 * @fileoverview Restrict usage of specified globals.
 * @author Benoît Zugmeyer
 */
"use strict";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const TYPE_NODES = new Set([
	"TSTypeReference",
	"TSInterfaceHeritage",
	"TSClassImplements",
	"TSTypeQuery",
	"TSQualifiedName",
]);

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../types').Rule.RuleModule} */
module.exports = {
	meta: {
		dialects: ["javascript", "typescript"],
		language: "javascript",
		type: "suggestion",

		docs: {
			description: "Disallow specified global variables",
			recommended: false,
			url: "https://eslint.org/docs/latest/rules/no-restricted-globals",
		},

		schema: {
			type: "array",
			items: {
				oneOf: [
					{
						type: "string",
					},
					{
						type: "object",
						properties: {
							name: { type: "string" },
							message: { type: "string" },
						},
						required: ["name"],
						additionalProperties: false,
					},
				],
			},
			uniqueItems: true,
			minItems: 0,
		},

		messages: {
			defaultMessage: "Unexpected use of '{{name}}'.",
			// eslint-disable-next-line eslint-plugin/report-message-format -- Custom message might not end in a period
			customMessage: "Unexpected use of '{{name}}'. {{customMessage}}",
		},
	},

	create(context) {
		const sourceCode = context.sourceCode;

		// If no globals are restricted, we don't need to do anything
		if (context.options.length === 0) {
			return {};
		}

		const restrictedGlobalMessages = context.options.reduce(
			(memo, option) => {
				if (typeof option === "string") {
					memo[option] = null;
				} else {
					memo[option.name] = option.message;
				}

				return memo;
			},
			{},
		);

		/**
		 * Report a variable to be used as a restricted global.
		 * @param {Reference} reference the variable reference
		 * @returns {void}
		 * @private
		 */
		function reportReference(reference) {
			const name = reference.identifier.name,
				customMessage = restrictedGlobalMessages[name],
				messageId = customMessage ? "customMessage" : "defaultMessage";

			context.report({
				node: reference.identifier,
				messageId,
				data: {
					name,
					customMessage,
				},
			});
		}

		/**
		 * Check if the given name is a restricted global name.
		 * @param {string} name name of a variable
		 * @returns {boolean} whether the variable is a restricted global or not
		 * @private
		 */
		function isRestricted(name) {
			return Object.hasOwn(restrictedGlobalMessages, name);
		}

		/**
		 * Check if the given reference occurs within a TypeScript type context.
		 * @param {Reference} reference The variable reference to check.
		 * @returns {boolean} Whether the reference is in a type context.
		 * @private
		 */
		function isInTypeContext(reference) {
			const parent = reference.identifier.parent;

			return TYPE_NODES.has(parent.type);
		}

		return {
			Program(node) {
				const scope = sourceCode.getScope(node);

				// Report variables declared elsewhere (ex: variables defined as "global" by eslint)
				scope.variables.forEach(variable => {
					if (!variable.defs.length && isRestricted(variable.name)) {
						variable.references.forEach(reference => {
							if (!isInTypeContext(reference)) {
								reportReference(reference);
							}
						});
					}
				});

				// Report variables not declared at all
				scope.through.forEach(reference => {
					if (
						isRestricted(reference.identifier.name) &&
						!isInTypeContext(reference)
					) {
						reportReference(reference);
					}
				});
			},
		};
	},
};
