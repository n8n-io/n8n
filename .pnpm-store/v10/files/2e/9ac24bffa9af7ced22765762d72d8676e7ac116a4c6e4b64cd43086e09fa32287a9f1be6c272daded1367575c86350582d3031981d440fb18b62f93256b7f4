'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_regexp$1 = require('../utils/regexp.js');

//#region lib/rules/no-restricted-component-options.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_no_restricted_component_options = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const regexp = require_regexp$1.default;
	/**
	* @typedef {object} ParsedOption
	* @property {Tester} test
	* @property {string|undefined} [message]
	*/
	/**
	* @typedef {object} MatchResult
	* @property {Tester | undefined} [next]
	* @property {boolean} [wildcard]
	* @property {string} keyName
	*/
	/**
	* @typedef { (name: string) => boolean } Matcher
	* @typedef { (node: Property | SpreadElement) => (MatchResult | null) } Tester
	*/
	/**
	* @param {string | string[] | { name: string | string[], message?: string } } option
	* @returns {ParsedOption}
	*/
	function parseOption(option) {
		if (typeof option === "string" || Array.isArray(option)) return parseOption({ name: option });
		/**
		* @typedef {object} StepForTest
		* @property {Matcher} test
		* @property {undefined} [wildcard]
		* @typedef {object} StepForWildcard
		* @property {undefined} [test]
		* @property {true} wildcard
		* @typedef {StepForTest | StepForWildcard} Step
		*/
		/** @type {Step[]} */
		const steps = [];
		for (const name of Array.isArray(option.name) ? option.name : [option.name]) if (name === "*") steps.push({ wildcard: true });
		else {
			const matcher = regexp.toRegExp(name, { remove: "g" });
			steps.push({ test: (value) => matcher.test(value) });
		}
		const message = option.message;
		return {
			test: buildTester(0),
			message
		};
		/**
		* @param {number} index
		* @returns {Tester}
		*/
		function buildTester(index) {
			const step = steps[index];
			const next = index + 1;
			const needNext = steps.length > next;
			return (node) => {
				/** @type {string} */
				let keyName;
				if (step.wildcard) keyName = "*";
				else {
					if (node.type !== "Property") return null;
					const name = utils.getStaticPropertyName(node);
					if (!name || !step.test(name)) return null;
					keyName = name;
				}
				return {
					next: needNext ? buildTester(next) : void 0,
					wildcard: step.wildcard,
					keyName
				};
			};
		}
	}
	/**
	* @param {string[]} path
	*/
	function defaultMessage(path) {
		return `Using \`${path.join(".")}\` is not allowed.`;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "disallow specific component option",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/no-restricted-component-options.html"
			},
			fixable: null,
			schema: {
				type: "array",
				items: { oneOf: [
					{ type: "string" },
					{
						type: "array",
						items: { type: "string" }
					},
					{
						type: "object",
						properties: {
							name: { oneOf: [{ type: "string" }, {
								type: "array",
								items: { type: "string" }
							}] },
							message: {
								type: "string",
								minLength: 1
							}
						},
						required: ["name"],
						additionalProperties: false
					}
				] },
				uniqueItems: true,
				minItems: 0
			},
			messages: { restrictedOption: "{{message}}" }
		},
		create(context) {
			if (!context.options || context.options.length === 0) return {};
			/** @type {ParsedOption[]} */
			const options = context.options.map(parseOption);
			return utils.compositingVisitors(utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				for (const option of options) verify(node, option.test, option.message);
			} }), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				for (const option of options) verify(define, option.test, option.message);
			} }));
			/**
			* @param {ObjectExpression} node
			* @param {Tester} test
			* @param {string | undefined} customMessage
			* @param {string[]} path
			*/
			function verify(node, test, customMessage, path = []) {
				for (const prop of node.properties) {
					const result = test(prop);
					if (!result) continue;
					if (result.next) {
						if (prop.type !== "Property" || prop.value.type !== "ObjectExpression") continue;
						verify(prop.value, result.next, customMessage, [...path, result.keyName]);
					} else {
						const message = customMessage || defaultMessage([...path, result.keyName]);
						context.report({
							node: prop.type === "Property" ? prop.key : prop,
							messageId: "restrictedOption",
							data: { message }
						});
					}
				}
			}
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_no_restricted_component_options();
  }
});