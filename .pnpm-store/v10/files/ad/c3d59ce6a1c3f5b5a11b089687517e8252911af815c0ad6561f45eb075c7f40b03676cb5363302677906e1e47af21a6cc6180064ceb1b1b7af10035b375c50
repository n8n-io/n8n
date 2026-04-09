'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');
const require_comments$1 = require('../utils/comments.js');

//#region lib/rules/require-prop-comment.js
/**
* @author CZB
* See LICENSE file in root directory for full license.
*/
var require_require_prop_comment = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const { isBlockComment, isJSDocComment } = require_comments$1.default;
	module.exports = {
		meta: {
			type: "suggestion",
			docs: {
				description: "require props to have a comment",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/require-prop-comment.html"
			},
			fixable: null,
			schema: [{
				type: "object",
				properties: { type: { enum: [
					"JSDoc",
					"line",
					"block",
					"any"
				] } },
				additionalProperties: false
			}],
			messages: {
				requireAnyComment: "The \"{{name}}\" property should have a comment.",
				requireLineComment: "The \"{{name}}\" property should have a line comment.",
				requireBlockComment: "The \"{{name}}\" property should have a block comment.",
				requireJSDocComment: "The \"{{name}}\" property should have a JSDoc comment."
			}
		},
		create(context) {
			/** @type {{type?: "JSDoc" | "line" | "block" | "any"}|undefined} */
			const schema = context.options[0];
			const type = schema && schema.type || "JSDoc";
			const sourceCode = context.sourceCode;
			/** @param {Comment | undefined} comment */
			const verifyBlock = (comment) => comment && isBlockComment(comment) ? void 0 : "requireBlockComment";
			/** @param {Comment | undefined} comment */
			const verifyLine = (comment) => comment && comment.type === "Line" ? void 0 : "requireLineComment";
			/** @param {Comment | undefined} comment */
			const verifyAny = (comment) => comment ? void 0 : "requireAnyComment";
			/** @param {Comment | undefined} comment */
			const verifyJSDoc = (comment) => comment && isJSDocComment(comment) ? void 0 : "requireJSDocComment";
			/**
			* @param {import('../utils').ComponentProp[]} props
			*/
			function verifyProps(props) {
				for (const prop of props) {
					if (!prop.propName || prop.type === "infer-type") continue;
					const lastPrecedingComment = sourceCode.getCommentsBefore(prop.node).at(-1);
					/** @type {string|undefined} */
					let messageId;
					switch (type) {
						case "block":
							messageId = verifyBlock(lastPrecedingComment);
							break;
						case "line":
							messageId = verifyLine(lastPrecedingComment);
							break;
						case "any":
							messageId = verifyAny(lastPrecedingComment);
							break;
						default:
							messageId = verifyJSDoc(lastPrecedingComment);
							break;
					}
					if (!messageId) continue;
					context.report({
						node: prop.node,
						messageId,
						data: { name: prop.propName }
					});
				}
			}
			return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, { onDefinePropsEnter(_node, props) {
				verifyProps(props);
			} }), utils.defineVueVisitor(context, { onVueObjectEnter(node) {
				verifyProps(utils.getComponentPropsFromOptions(node));
			} }));
		}
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_require_prop_comment();
  }
});