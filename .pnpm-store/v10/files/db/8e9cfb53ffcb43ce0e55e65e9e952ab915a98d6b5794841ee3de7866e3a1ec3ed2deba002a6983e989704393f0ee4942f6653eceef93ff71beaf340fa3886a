import { getContextIdentifiers, isAutoFixerFunction, isSuggestionFixerFunction } from "../utils.js";
import { getStaticValue } from "@eslint-community/eslint-utils";

//#region lib/rules/fixer-return.ts
/**
* @fileoverview require fixer functions to return a fix
* @author 薛定谔的猫<hh_2013@foxmail.com>
*/
const DEFAULT_FUNC_INFO = {
	upper: null,
	codePath: null,
	hasReturnWithFixer: false,
	hasYieldWithFixer: false,
	shouldCheck: false,
	node: null
};
const rule = {
	meta: {
		type: "problem",
		docs: {
			description: "require fixer functions to return a fix",
			category: "Rules",
			recommended: true,
			url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/fixer-return.md"
		},
		fixable: void 0,
		schema: [],
		messages: { missingFix: "Fixer function never returned a fix." }
	},
	create(context) {
		let funcInfo = DEFAULT_FUNC_INFO;
		let contextIdentifiers = /* @__PURE__ */ new Set();
		/**
		* As we exit the fix() function, ensure we have returned or yielded a real fix by this point.
		* If not, report the function as a violation.
		*
		* @param node - A node to check.
		* @param loc - Optional location to report violation on.
		*/
		function ensureFunctionReturnedFix(node, loc = (node.type === "FunctionExpression" && node.id ? node.id : node).loc?.start) {
			if (node.generator && !funcInfo.hasYieldWithFixer || !node.generator && !funcInfo.hasReturnWithFixer) context.report({
				node,
				loc,
				messageId: "missingFix"
			});
		}
		/**
		* Check if a returned/yielded node is likely to be a fix or not.
		* A fix is an object created by fixer.replaceText() for example and returned by the fix function.
		* @param node - node to check
		*/
		function isFix(node) {
			if (node.type === "ArrayExpression" && node.elements.length === 0) return false;
			const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
			if (!staticValue) return true;
			if (Array.isArray(staticValue.value)) return true;
			return false;
		}
		return {
			Program(ast) {
				const sourceCode = context.sourceCode;
				contextIdentifiers = getContextIdentifiers(sourceCode.scopeManager, ast);
			},
			onCodePathStart(codePath, node) {
				funcInfo = {
					upper: funcInfo,
					codePath,
					hasYieldWithFixer: false,
					hasReturnWithFixer: false,
					shouldCheck: isAutoFixerFunction(node, contextIdentifiers, context) || isSuggestionFixerFunction(node, contextIdentifiers, context),
					node
				};
			},
			onCodePathEnd() {
				funcInfo = funcInfo.upper ?? DEFAULT_FUNC_INFO;
			},
			YieldExpression(node) {
				if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) funcInfo.hasYieldWithFixer = true;
			},
			ReturnStatement(node) {
				if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) funcInfo.hasReturnWithFixer = true;
			},
			"FunctionExpression:exit"(node) {
				if (funcInfo.shouldCheck) ensureFunctionReturnedFix(node);
			},
			"ArrowFunctionExpression:exit"(node) {
				if (funcInfo.shouldCheck) {
					const loc = context.sourceCode.getTokenBefore(node.body)?.loc;
					if (node.expression) {
						if (!isFix(node.body)) context.report({
							node,
							loc,
							messageId: "missingFix"
						});
					} else ensureFunctionReturnedFix(node, loc);
				}
			}
		};
	}
};

//#endregion
export { rule as default };