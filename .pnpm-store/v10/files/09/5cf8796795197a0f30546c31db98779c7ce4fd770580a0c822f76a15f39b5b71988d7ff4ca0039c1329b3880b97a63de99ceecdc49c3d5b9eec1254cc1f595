'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('../utils/index.js');

//#region lib/rules/define-macros-order.js
/**
* @author Eduard Deisling
* See LICENSE file in root directory for full license.
*/
var require_define_macros_order = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const utils = require_index.default;
	const MACROS_EMITS = "defineEmits";
	const MACROS_PROPS = "defineProps";
	const MACROS_OPTIONS = "defineOptions";
	const MACROS_SLOTS = "defineSlots";
	const MACROS_MODEL = "defineModel";
	const MACROS_EXPOSE = "defineExpose";
	const KNOWN_MACROS = new Set([
		MACROS_EMITS,
		MACROS_PROPS,
		MACROS_OPTIONS,
		MACROS_SLOTS,
		MACROS_MODEL,
		MACROS_EXPOSE
	]);
	const DEFAULT_ORDER = [MACROS_PROPS, MACROS_EMITS];
	/**
	* @param {VElement} scriptSetup
	* @param {ASTNode} node
	*/
	function inScriptSetup(scriptSetup, node) {
		return scriptSetup.range[0] <= node.range[0] && node.range[1] <= scriptSetup.range[1];
	}
	/**
	* @param {ASTNode} node
	*/
	function isDeclareStatement(node) {
		return "declare" in node && node.declare === true;
	}
	/**
	* @param {ASTNode} node
	*/
	function isUseStrictStatement(node) {
		return node.type === "ExpressionStatement" && node.expression.type === "Literal" && node.expression.value === "use strict";
	}
	/**
	* Get an index of the first statement after imports and interfaces in order
	* to place defineEmits and defineProps before this statement
	* @param {VElement} scriptSetup
	* @param {Program} program
	*/
	function getTargetStatementPosition(scriptSetup, program) {
		const skipStatements = new Set([
			"ImportDeclaration",
			"TSEnumDeclaration",
			"TSModuleDeclaration",
			"TSInterfaceDeclaration",
			"TSTypeAliasDeclaration",
			"DebuggerStatement",
			"EmptyStatement",
			"ExportNamedDeclaration"
		]);
		for (const [index, item] of program.body.entries()) if (inScriptSetup(scriptSetup, item) && !skipStatements.has(item.type) && !isDeclareStatement(item) && !isUseStrictStatement(item)) return index;
		return -1;
	}
	/**
	* We need to handle cases like "const props = defineProps(...)"
	* Define macros must be used only on top, so we can look for "Program" type
	* inside node.parent.type
	* @param {CallExpression|ASTNode} node
	* @return {ASTNode}
	*/
	function getDefineMacrosStatement(node) {
		if (!node.parent) throw new Error("Node has no parent");
		if (node.parent.type === "Program") return node;
		return getDefineMacrosStatement(node.parent);
	}
	/** @param {RuleContext} context */
	function create(context) {
		const scriptSetup = utils.getScriptSetupElement(context);
		if (!scriptSetup) return {};
		const sourceCode = context.sourceCode;
		const options = context.options;
		/** @type {[string, string]} */
		const order = options[0] && options[0].order || DEFAULT_ORDER;
		/** @type {boolean} */
		const defineExposeLast = options[0] && options[0].defineExposeLast || false;
		/** @type {Map<string, ASTNode[]>} */
		const macrosNodes = /* @__PURE__ */ new Map();
		/** @type {ASTNode} */
		let defineExposeNode;
		if (order.includes(MACROS_EXPOSE) && defineExposeLast) throw new Error("`defineExpose` macro can't be in the `order` array if `defineExposeLast` is true.");
		return utils.compositingVisitors(utils.defineScriptSetupVisitor(context, {
			onDefinePropsExit(node) {
				macrosNodes.set(MACROS_PROPS, [getDefineMacrosStatement(node)]);
			},
			onDefineEmitsExit(node) {
				macrosNodes.set(MACROS_EMITS, [getDefineMacrosStatement(node)]);
			},
			onDefineOptionsExit(node) {
				macrosNodes.set(MACROS_OPTIONS, [getDefineMacrosStatement(node)]);
			},
			onDefineSlotsExit(node) {
				macrosNodes.set(MACROS_SLOTS, [getDefineMacrosStatement(node)]);
			},
			onDefineModelExit(node) {
				const currentModelMacros = macrosNodes.get(MACROS_MODEL) ?? [];
				currentModelMacros.push(getDefineMacrosStatement(node));
				macrosNodes.set(MACROS_MODEL, currentModelMacros);
			},
			onDefineExposeExit(node) {
				defineExposeNode = getDefineMacrosStatement(node);
			},
			"Program > ExpressionStatement > CallExpression, Program > VariableDeclaration > VariableDeclarator > CallExpression"(node) {
				if (node.callee && node.callee.type === "Identifier" && order.includes(node.callee.name) && !KNOWN_MACROS.has(node.callee.name)) macrosNodes.set(node.callee.name, [getDefineMacrosStatement(node)]);
			}
		}), { "Program:exit"(program) {
			/**
			* @typedef {object} OrderedData
			* @property {string} name
			* @property {ASTNode} node
			*/
			const firstStatementIndex = getTargetStatementPosition(scriptSetup, program);
			const orderedList = order.flatMap((name) => {
				return (macrosNodes.get(name) ?? []).map((node) => ({
					name,
					node
				}));
			}).filter(
				/** @returns {data is OrderedData} */
				(data) => utils.isDef(data.node)
			);
			if (defineExposeLast) {
				const lastNode = program.body.at(-1);
				if (defineExposeNode && lastNode && lastNode !== defineExposeNode) reportExposeNotOnBottom(defineExposeNode, lastNode);
			}
			for (const [index, should] of orderedList.entries()) {
				const targetStatement = program.body[firstStatementIndex + index];
				if (should.node !== targetStatement) {
					let moveTargetNodes = orderedList.slice(index).map(({ node }) => node);
					const targetStatementIndex = moveTargetNodes.indexOf(targetStatement);
					if (targetStatementIndex !== -1) moveTargetNodes = moveTargetNodes.slice(0, targetStatementIndex);
					reportNotOnTop(should.name, moveTargetNodes, targetStatement);
					return;
				}
			}
		} });
		/**
		* @param {string} macro
		* @param {ASTNode[]} nodes
		* @param {ASTNode} before
		*/
		function reportNotOnTop(macro, nodes, before) {
			const beforeMacro = order.find((macroName) => (macrosNodes.get(macroName) ?? []).includes(before));
			const messageId = beforeMacro ? "macrosUnordered" : "macrosNotAtTop";
			const data = beforeMacro ? {
				macro,
				before: beforeMacro
			} : { macro };
			context.report({
				node: nodes[0],
				loc: nodes[0].loc,
				messageId,
				data,
				*fix(fixer) {
					for (const node of nodes) yield* moveNodeBefore(fixer, node, before);
				}
			});
		}
		/**
		* @param {ASTNode} node
		* @param {ASTNode} lastNode
		*/
		function reportExposeNotOnBottom(node, lastNode) {
			context.report({
				node,
				loc: node.loc,
				messageId: "defineExposeNotTheLast",
				suggest: [{
					messageId: "putExposeAtTheLast",
					fix(fixer) {
						return moveNodeToLast(fixer, node, lastNode);
					}
				}]
			});
		}
		/**
		* Move all lines of "node" with its comments to after the "target"
		* @param {RuleFixer} fixer
		* @param {ASTNode} node
		* @param {ASTNode} target
		*/
		function moveNodeToLast(fixer, node, target) {
			const beforeNodeToken = sourceCode.getTokenBefore(node);
			const nodeComment = sourceCode.getTokenAfter(beforeNodeToken, { includeComments: true });
			const nextNodeComment = sourceCode.getTokenAfter(node, { includeComments: true });
			const cutStart = getLineStartIndex(nodeComment, beforeNodeToken);
			const cutEnd = getLineStartIndex(nextNodeComment, node);
			const textNode = sourceCode.getText(node, node.range[0] - beforeNodeToken.range[1]);
			return [fixer.insertTextAfter(target, textNode), fixer.removeRange([cutStart, cutEnd])];
		}
		/**
		* Move all lines of "node" with its comments to before the "target"
		* @param {RuleFixer} fixer
		* @param {ASTNode} node
		* @param {ASTNode} target
		*/
		function moveNodeBefore(fixer, node, target) {
			const beforeNodeToken = sourceCode.getTokenBefore(node);
			const nodeComment = sourceCode.getTokenAfter(beforeNodeToken, { includeComments: true });
			const nextNodeComment = sourceCode.getTokenAfter(node, { includeComments: true });
			const cutStart = getLineStartIndex(nodeComment, beforeNodeToken);
			const cutEnd = getLineStartIndex(nextNodeComment, node);
			const beforeTargetToken = sourceCode.getTokenBefore(target);
			const targetComment = sourceCode.getTokenAfter(beforeTargetToken, { includeComments: true });
			const insertText = getInsertText(sourceCode.getText(node, node.range[0] - nodeComment.range[0]), target);
			return [fixer.insertTextBefore(targetComment, insertText), fixer.removeRange([cutStart, cutEnd])];
		}
		/**
		* Get result text to insert
		* @param {string} textNode
		* @param {ASTNode} target
		*/
		function getInsertText(textNode, target) {
			const afterTargetComment = sourceCode.getTokenAfter(target, { includeComments: true });
			const afterText = sourceCode.text.slice(target.range[1], afterTargetComment.range[0]);
			const invalidResult = !textNode.endsWith(";") && !afterText.includes("\n");
			return textNode + afterText + (invalidResult ? ";" : "");
		}
		/**
		* Get position of the beginning of the token's line(or prevToken end if no line)
		* @param {ASTNode|Token} token
		* @param {ASTNode|Token} prevToken
		*/
		function getLineStartIndex(token, prevToken) {
			if (token.loc.start.line === prevToken.loc.end.line) return prevToken.range[1];
			return sourceCode.getIndexFromLoc({
				line: token.loc.start.line,
				column: 0
			});
		}
	}
	module.exports = {
		meta: {
			type: "layout",
			docs: {
				description: "enforce order of compiler macros (`defineProps`, `defineEmits`, etc.)",
				categories: void 0,
				url: "https://eslint.vuejs.org/rules/define-macros-order.html"
			},
			fixable: "code",
			hasSuggestions: true,
			schema: [{
				type: "object",
				properties: {
					order: {
						type: "array",
						items: {
							type: "string",
							minLength: 1
						},
						uniqueItems: true,
						additionalItems: false
					},
					defineExposeLast: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: {
				macrosNotAtTop: "{{macro}} should be placed at the top of `<script setup>` (after any potential import statements or type definitions).",
				macrosUnordered: "{{macro}} should be above {{before}}.",
				defineExposeNotTheLast: "`defineExpose` should be the last statement in `<script setup>`.",
				putExposeAtTheLast: "Put `defineExpose` as the last statement in `<script setup>`."
			}
		},
		create
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_define_macros_order();
  }
});