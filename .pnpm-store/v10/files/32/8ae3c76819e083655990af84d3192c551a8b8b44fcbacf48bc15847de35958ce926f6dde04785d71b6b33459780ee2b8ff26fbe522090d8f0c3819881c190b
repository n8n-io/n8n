import { $ as warnDeprecation, J as isSurroundedBy, N as hasOctalOrNonOctalDecimalEscapeSequence, U as isParenthesised, Y as isTopLevelExpressionStatement, f as createRule, m as AST_NODE_TYPES, x as LINEBREAKS } from "../utils.js";
function switchQuote(str) {
	const newQuote = this.quote;
	const oldQuote = str[0];
	if (newQuote === oldQuote) return str;
	return newQuote + str.slice(1, -1).replace(/\\(\$\{|\r\n?|\n|.)|["'`]|\$\{|(\r\n?|\n)/gu, (match, escaped, newline) => {
		if (escaped === oldQuote || oldQuote === "`" && escaped === "${") return escaped;
		if (match === newQuote || newQuote === "`" && match === "${") return `\\${match}`;
		if (newline && oldQuote === "`") return "\\n";
		return match;
	}) + newQuote;
}
const QUOTE_SETTINGS = {
	double: {
		quote: "\"",
		alternateQuote: "'",
		description: "doublequote",
		convert: switchQuote
	},
	single: {
		quote: "'",
		alternateQuote: "\"",
		description: "singlequote",
		convert: switchQuote
	},
	backtick: {
		quote: "`",
		alternateQuote: "\"",
		description: "backtick",
		convert: switchQuote
	}
};
const UNESCAPED_LINEBREAK_PATTERN = new RegExp(String.raw`(^|[^\\])(\\\\)*[${Array.from(LINEBREAKS).join("")}]`, "u");
const AVOID_ESCAPE = "avoid-escape";
var quotes_default = createRule({
	name: "quotes",
	meta: {
		type: "layout",
		docs: { description: "Enforce the consistent use of either backticks, double, or single quotes" },
		fixable: "code",
		schema: [{
			type: "string",
			enum: [
				"single",
				"double",
				"backtick"
			]
		}, { anyOf: [{
			type: "string",
			enum: ["avoid-escape"]
		}, {
			type: "object",
			properties: {
				avoidEscape: { type: "boolean" },
				allowTemplateLiterals: { anyOf: [{ type: "boolean" }, {
					type: "string",
					enum: [
						"never",
						"avoidEscape",
						"always"
					]
				}] },
				ignoreStringLiterals: { type: "boolean" }
			},
			additionalProperties: false
		}] }],
		defaultOptions: ["double", {
			allowTemplateLiterals: "never",
			avoidEscape: false,
			ignoreStringLiterals: false
		}],
		messages: { wrongQuotes: "Strings must use {{description}}." }
	},
	create(context, [quoteOption, options]) {
		const settings = QUOTE_SETTINGS[quoteOption || "double"];
		const sourceCode = context.sourceCode;
		let avoidEscape = false;
		let ignoreStringLiterals = false;
		let allowTemplateLiteralsAlways = false;
		let allowTemplateLiteralsToAvoidEscape = false;
		if (typeof options === "object") {
			avoidEscape = options.avoidEscape === true;
			ignoreStringLiterals = options.ignoreStringLiterals === true;
			if (typeof options.allowTemplateLiterals === "string") {
				allowTemplateLiteralsAlways = options.allowTemplateLiterals === "always";
				allowTemplateLiteralsToAvoidEscape = allowTemplateLiteralsAlways || options.allowTemplateLiterals === "avoidEscape";
			} else if (typeof options.allowTemplateLiterals === "boolean") {
				warnDeprecation("value(boolean) for \"allowTemplateLiterals\"", "\"always\"/\"never\"", "quotes");
				allowTemplateLiteralsAlways = options.allowTemplateLiterals === true;
				allowTemplateLiteralsToAvoidEscape = options.allowTemplateLiterals === true;
			}
		} else if (options === AVOID_ESCAPE) {
			warnDeprecation(`option("${AVOID_ESCAPE}")`, "\"avoidEscape\"", "quotes");
			avoidEscape = true;
		}
		function isJSXLiteral(node) {
			if (!node.parent) return false;
			return node.parent.type === "JSXAttribute" || node.parent.type === "JSXElement" || node.parent.type === "JSXFragment";
		}
		function isDirective(node) {
			return node.type === "ExpressionStatement" && node.expression.type === "Literal" && typeof node.expression.value === "string" && !isParenthesised(sourceCode, node.expression);
		}
		function isExpressionInOrJustAfterDirectivePrologue(node) {
			if (!node.parent) return false;
			if (!isTopLevelExpressionStatement(node.parent)) return false;
			const block = node.parent.parent;
			if (!block || !("body" in block) || !Array.isArray(block.body)) return false;
			for (let i = 0; i < block.body.length; ++i) {
				const statement = block.body[i];
				if (statement === node.parent) return true;
				if (!isDirective(statement)) break;
			}
			return false;
		}
		function isAllowedAsNonBacktick(node) {
			const parent = node.parent;
			if (!parent) return false;
			switch (parent.type) {
				case AST_NODE_TYPES.ExpressionStatement: return !isParenthesised(sourceCode, node) && isExpressionInOrJustAfterDirectivePrologue(node);
				case AST_NODE_TYPES.Property:
				case AST_NODE_TYPES.MethodDefinition: return parent.key === node && !parent.computed;
				case AST_NODE_TYPES.ImportDeclaration:
				case AST_NODE_TYPES.ExportNamedDeclaration: return parent.source === node;
				case AST_NODE_TYPES.ExportAllDeclaration: return parent.exported === node || parent.source === node;
				case AST_NODE_TYPES.ImportSpecifier: return parent.imported === node;
				case AST_NODE_TYPES.ExportSpecifier: return parent.local === node || parent.exported === node;
				case AST_NODE_TYPES.ImportAttribute: return parent.value === node;
				case AST_NODE_TYPES.TSImportType:
				case AST_NODE_TYPES.TSAbstractMethodDefinition:
				case AST_NODE_TYPES.TSMethodSignature:
				case AST_NODE_TYPES.TSPropertySignature:
				case AST_NODE_TYPES.TSModuleDeclaration:
				case AST_NODE_TYPES.TSExternalModuleReference: return true;
				case AST_NODE_TYPES.TSEnumMember: return node === parent.id;
				case AST_NODE_TYPES.TSAbstractPropertyDefinition:
				case AST_NODE_TYPES.PropertyDefinition:
				case AST_NODE_TYPES.AccessorProperty: return parent.key === node && !parent.computed;
				case AST_NODE_TYPES.TSLiteralType: return parent.parent?.type === AST_NODE_TYPES.TSImportType;
				default: return false;
			}
		}
		function isUsingFeatureOfTemplateLiteral(node) {
			if (node.parent.type === "TaggedTemplateExpression" && node === node.parent.quasi) return true;
			if (node.expressions.length > 0) return true;
			if (node.quasis.length >= 1 && UNESCAPED_LINEBREAK_PATTERN.test(node.quasis[0].value.raw)) return true;
			return false;
		}
		return {
			Literal(node) {
				if (ignoreStringLiterals) return;
				const val = node.value;
				const rawVal = node.raw;
				if (settings && typeof val === "string") {
					let isValid = quoteOption === "backtick" && isAllowedAsNonBacktick(node) || isJSXLiteral(node) || isSurroundedBy(rawVal, settings.quote);
					if (!isValid && avoidEscape) isValid = isSurroundedBy(rawVal, settings.alternateQuote) && rawVal.includes(settings.quote);
					if (!isValid) context.report({
						node,
						messageId: "wrongQuotes",
						data: { description: settings.description },
						fix(fixer) {
							if (quoteOption === "backtick" && hasOctalOrNonOctalDecimalEscapeSequence(rawVal)) return null;
							return fixer.replaceText(node, settings.convert(node.raw));
						}
					});
				}
			},
			TemplateLiteral(node) {
				if (allowTemplateLiteralsAlways || quoteOption === "backtick" || isUsingFeatureOfTemplateLiteral(node)) return;
				if (allowTemplateLiteralsToAvoidEscape && avoidEscape && sourceCode.getText(node).includes(settings.quote)) return;
				context.report({
					node,
					messageId: "wrongQuotes",
					data: { description: settings.description },
					fix(fixer) {
						if (isTopLevelExpressionStatement(node.parent) && !isParenthesised(sourceCode, node)) return null;
						return fixer.replaceText(node, settings.convert(sourceCode.getText(node)));
					}
				});
			}
		};
	}
});
export { quotes_default as t };
