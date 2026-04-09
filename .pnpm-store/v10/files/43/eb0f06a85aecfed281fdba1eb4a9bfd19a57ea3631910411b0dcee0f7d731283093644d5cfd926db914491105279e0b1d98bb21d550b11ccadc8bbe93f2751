'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_casing$1 = require('../utils/casing.js');

//#region lib/rules/match-component-file-name.js
/**
* @fileoverview Require component name property to match its file name
* @author Rodrigo Pedra Brum <rodrigo.pedra@gmail.com>
*/
var require_match_component_file_name = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const casing = require_casing$1.default;
	const path = require("node:path");
	/**
	* @param {Expression | SpreadElement} node
	* @returns {node is (Literal | TemplateLiteral)}
	*/
	function canVerify(node) {
		return node.type === "Literal" || node.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis.length === 1;
	}
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require component name property to match its file name",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/match-component-file-name.html"
			},
			fixable: null,
			hasSuggestions: true,
			schema: [{
				type: "object",
				properties: {
					extensions: {
						type: "array",
						items: { type: "string" },
						uniqueItems: true,
						additionalItems: false
					},
					shouldMatchCase: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: { shouldMatchFileName: "Component name `{{name}}` should match file name `{{filename}}`." }
		},
		create(context) {
			const options = context.options[0];
			const shouldMatchCase = options && options.shouldMatchCase || false;
			const extensionsArray = options && options.extensions;
			const allowedExtensions = Array.isArray(extensionsArray) ? extensionsArray : ["jsx"];
			const extension = path.extname(context.filename);
			const filename = path.basename(context.filename, extension);
			/** @type {Rule.ReportDescriptor[]} */
			const errors = [];
			let componentCount = 0;
			if (!allowedExtensions.includes(extension.replace(/^\./, ""))) return {};
			/**
			* @param {string} name
			* @param {string} filename
			*/
			function compareNames(name, filename$1) {
				if (shouldMatchCase) return name === filename$1;
				return casing.pascalCase(name) === filename$1 || casing.kebabCase(name) === filename$1;
			}
			/**
			* @param {Literal | TemplateLiteral} node
			*/
			function verifyName(node) {
				let name;
				if (node.type === "TemplateLiteral") name = node.quasis[0].value.cooked;
				else name = `${node.value}`;
				if (!compareNames(name, filename)) errors.push({
					node,
					messageId: "shouldMatchFileName",
					data: {
						filename,
						name
					},
					suggest: [{
						desc: "Rename component to match file name.",
						fix(fixer) {
							const quote = node.type === "TemplateLiteral" ? "`" : node.raw[0];
							return fixer.replaceText(node, `${quote}${filename}${quote}`);
						}
					}]
				});
			}
			return utils.compositingVisitors(utils.executeOnCallVueComponent(context, (node) => {
				if (node.arguments.length === 2) {
					const argument = node.arguments[0];
					if (canVerify(argument)) verifyName(argument);
				}
			}), utils.executeOnVue(context, (object) => {
				const node = utils.findProperty(object, "name");
				componentCount++;
				if (!node) return;
				if (!canVerify(node.value)) return;
				verifyName(node.value);
			}), utils.defineScriptSetupVisitor(context, { onDefineOptionsEnter(node) {
				componentCount++;
				if (node.arguments.length === 0) return;
				const define = node.arguments[0];
				if (define.type !== "ObjectExpression") return;
				const nameNode = utils.findProperty(define, "name");
				if (!nameNode) return;
				if (!canVerify(nameNode.value)) return;
				verifyName(nameNode.value);
			} }), { "Program:exit"() {
				if (componentCount > 1) return;
				for (const error of errors) context.report(error);
			} });
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_match_component_file_name();
  }
});