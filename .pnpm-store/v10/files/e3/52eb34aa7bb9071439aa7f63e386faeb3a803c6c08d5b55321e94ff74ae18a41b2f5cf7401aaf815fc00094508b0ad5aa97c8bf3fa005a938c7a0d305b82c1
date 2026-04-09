import { n as require_ast_utils } from "./vendor.js";
import { env } from "node:process";
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from "@typescript-eslint/types";
import { KEYS } from "eslint-visitor-keys";
import { latestEcmaVersion, tokenize } from "espree";
import { traverse } from "estraverse";
function createAllConfigs(plugin, name, filter) {
	const rules = Object.fromEntries(Object.entries(plugin.rules).filter(([key, rule]) => rule.meta.fixable && !rule.meta.deprecated && !rule.meta.experimental && key === rule.meta.docs.url.split("/").pop() && (!filter || filter(key, rule))).map(([key]) => [`${name}/${key}`, 2]));
	return {
		plugins: { [name]: plugin },
		rules
	};
}
const warned = /* @__PURE__ */ new Set();
function warnOnce(text) {
	if (env.TEST || warned.has(text)) return;
	warned.add(text);
	console.warn(`[@stylistic/eslint-plugin]: ${text}`);
}
function warnDeprecation(value, instead, rule = "") {
	let message = `You are using deprecated ${value}${rule ? ` in "${rule}"` : ""}`;
	if (instead) message += `, please use ${instead} instead.`;
	return warnOnce(message);
}
function warnDeprecatedOptions(options, keys, instead, rule = "") {
	if (!Array.isArray(keys)) keys = [keys];
	keys.forEach((key) => {
		if (options && Object.hasOwn(options, key)) warnDeprecation(`option("${key.toString()}")`, instead ? `"${instead.toString()}"` : void 0, rule);
	});
}
var import_ast_utils = require_ast_utils();
const COMMENTS_IGNORE_PATTERN = /^\s*(?:eslint|jshint\s+|jslint\s+|istanbul\s+|globals?\s+|exported\s+|jscs)/u;
const LINEBREAKS = /* @__PURE__ */ new Set([
	"\r\n",
	"\r",
	"\n",
	"\u2028",
	"\u2029"
]);
const STATEMENT_LIST_PARENTS = /* @__PURE__ */ new Set([
	"Program",
	"BlockStatement",
	"StaticBlock",
	"SwitchCase"
]);
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
const OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN = /^(?:[^\\]|\\.)*\\(?:[1-9]|0\d)/su;
const ASSIGNMENT_OPERATOR = [
	"=",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"<<=",
	">>=",
	">>>=",
	"|=",
	"^=",
	"&=",
	"**=",
	"||=",
	"&&=",
	"??="
];
const ES3_KEYWORDS = [
	"abstract",
	"boolean",
	"break",
	"byte",
	"case",
	"catch",
	"char",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"double",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"final",
	"finally",
	"float",
	"for",
	"function",
	"goto",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"int",
	"interface",
	"long",
	"native",
	"new",
	"null",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"short",
	"static",
	"super",
	"switch",
	"synchronized",
	"this",
	"throw",
	"throws",
	"transient",
	"true",
	"try",
	"typeof",
	"var",
	"void",
	"volatile",
	"while",
	"with"
];
const KEYWORDS = [
	...ES3_KEYWORDS,
	"arguments",
	"as",
	"async",
	"await",
	"eval",
	"from",
	"get",
	"let",
	"of",
	"set",
	"type",
	"using",
	"yield"
].concat(["accessor", "satisfies"]);
function createGlobalLinebreakMatcher() {
	return new RegExp(import_ast_utils.LINEBREAK_MATCHER.source, "gu");
}
const anyFunctionPattern = /^(?:Function(?:Declaration|Expression)|ArrowFunctionExpression)$/u;
function getUpperFunction(node) {
	for (let currentNode = node; currentNode; currentNode = currentNode.parent) if (anyFunctionPattern.test(currentNode.type)) return currentNode;
	return null;
}
function isNullLiteral(node) {
	return node.type === "Literal" && node.value === null && !("regex" in node) && !("bigint" in node);
}
function getStaticStringValue(node) {
	switch (node.type) {
		case "Literal":
			if (node.value === null) {
				if (isNullLiteral(node)) return String(node.value);
				if (isRegExpLiteral(node)) return `/${node.regex.pattern}/${node.regex.flags}`;
				if ("bigint" in node && node.bigint) return node.bigint;
			} else return String(node.value);
			break;
		case "TemplateLiteral":
			if (node.expressions.length === 0 && node.quasis.length === 1) return node.quasis[0].value.cooked;
			break;
	}
	return null;
}
function getStaticPropertyName(node) {
	let prop;
	if (node) switch (node.type) {
		case "ChainExpression": return getStaticPropertyName(node.expression);
		case "Property":
		case "PropertyDefinition":
		case "MethodDefinition":
		case "ImportAttribute":
			prop = node.key;
			break;
		case "MemberExpression":
			prop = node.property;
			break;
	}
	if (prop) {
		if (prop.type === "Identifier" && !("computed" in node && node.computed)) return prop.name;
		return getStaticStringValue(prop);
	}
	return null;
}
function skipChainExpression(node) {
	return node && node.type === "ChainExpression" ? node.expression : node;
}
function isParenthesised(sourceCode, node) {
	const previousToken = sourceCode.getTokenBefore(node);
	const nextToken = sourceCode.getTokenAfter(node);
	return !!previousToken && !!nextToken && (0, import_ast_utils.isOpeningParenToken)(previousToken) && previousToken.range[1] <= node.range[0] && (0, import_ast_utils.isClosingParenToken)(nextToken) && nextToken.range[0] >= node.range[1];
}
function isEqToken(token) {
	return token.value === "=" && token.type === "Punctuator";
}
function isQuestionToken(token) {
	return token.value === "?" && token.type === "Punctuator";
}
function isKeywordToken(token) {
	return token?.type === "Keyword";
}
function isHashbangComment(comment) {
	return comment.type === "Shebang" || comment.type === "Hashbang";
}
function isLogicalExpression(node) {
	return node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||");
}
function isCoalesceExpression(node) {
	return node.type === "LogicalExpression" && node.operator === "??";
}
function isMixedLogicalAndCoalesceExpressions(left, right) {
	return isLogicalExpression(left) && isCoalesceExpression(right) || isCoalesceExpression(left) && isLogicalExpression(right);
}
function getSwitchCaseColonToken(node, sourceCode) {
	if (node.test) return sourceCode.getTokenAfter(node.test, (token) => (0, import_ast_utils.isColonToken)(token));
	return sourceCode.getFirstToken(node, 1);
}
function isTopLevelExpressionStatement(node) {
	if (node.type !== "ExpressionStatement") return false;
	const parent = node.parent;
	return parent.type === "Program" || parent.type === "BlockStatement" && (0, import_ast_utils.isFunction)(parent.parent);
}
function isStringLiteral(node) {
	return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral";
}
function isRegExpLiteral(node) {
	return node.type === "Literal" && "regex" in node;
}
function isSurroundedBy(val, character) {
	return val[0] === character && val[val.length - 1] === character;
}
function getPrecedence(node) {
	switch (node.type) {
		case "SequenceExpression": return 0;
		case "AssignmentExpression":
		case "ArrowFunctionExpression":
		case "YieldExpression": return 1;
		case "ConditionalExpression":
		case "TSConditionalType": return 3;
		case "LogicalExpression": switch (node.operator) {
			case "||":
			case "??": return 4;
			case "&&": return 5;
		}
		case "BinaryExpression": switch (node.operator) {
			case "|": return 6;
			case "^": return 7;
			case "&": return 8;
			case "==":
			case "!=":
			case "===":
			case "!==": return 9;
			case "<":
			case "<=":
			case ">":
			case ">=":
			case "in":
			case "instanceof": return 10;
			case "<<":
			case ">>":
			case ">>>": return 11;
			case "+":
			case "-": return 12;
			case "*":
			case "/":
			case "%": return 13;
			case "**": return 15;
		}
		case "TSUnionType": return 6;
		case "TSIntersectionType": return 8;
		case "UnaryExpression":
		case "AwaitExpression": return 16;
		case "UpdateExpression": return 17;
		case "CallExpression":
		case "ChainExpression":
		case "ImportExpression": return 18;
		case "NewExpression": return 19;
		case "TSImportType":
		case "TSArrayType": return 20;
		default:
			if (node.type in KEYS) return 20;
			return -1;
	}
}
function isDecimalInteger(node) {
	return node.type === "Literal" && typeof node.value === "number" && DECIMAL_INTEGER_PATTERN.test(node.raw);
}
function isDecimalIntegerNumericToken(token) {
	return token.type === "Numeric" && DECIMAL_INTEGER_PATTERN.test(token.value);
}
function getNextLocation(sourceCode, { column, line }) {
	if (column < sourceCode.lines[line - 1].length) return {
		column: column + 1,
		line
	};
	if (line < sourceCode.lines.length) return {
		column: 0,
		line: line + 1
	};
	return null;
}
function isNumericLiteral(node) {
	return node.type === "Literal" && (typeof node.value === "number" || Boolean("bigint" in node && node.bigint));
}
function canTokensBeAdjacent(leftValue, rightValue) {
	const espreeOptions = {
		comment: true,
		ecmaVersion: latestEcmaVersion,
		range: true
	};
	let leftToken;
	if (typeof leftValue === "string") {
		let tokens;
		try {
			tokens = tokenize(leftValue, espreeOptions);
		} catch {
			return false;
		}
		const comments = tokens.comments;
		leftToken = tokens[tokens.length - 1];
		if (comments.length) {
			const lastComment = comments[comments.length - 1];
			if (!leftToken || lastComment.range[0] > leftToken.range[0]) leftToken = lastComment;
		}
	} else leftToken = leftValue;
	if (isHashbangComment(leftToken)) return false;
	let rightToken;
	if (typeof rightValue === "string") {
		let tokens;
		try {
			tokens = tokenize(rightValue, espreeOptions);
		} catch {
			return false;
		}
		const comments = tokens.comments;
		rightToken = tokens[0];
		if (comments.length) {
			const firstComment = comments[0];
			if (!rightToken || firstComment.range[0] < rightToken.range[0]) rightToken = firstComment;
		}
	} else rightToken = rightValue;
	if (leftToken.type === "Punctuator" || rightToken.type === "Punctuator") {
		if (leftToken.type === "Punctuator" && rightToken.type === "Punctuator") {
			const PLUS_TOKENS = new Set(["+", "++"]);
			const MINUS_TOKENS = new Set(["-", "--"]);
			return !(PLUS_TOKENS.has(leftToken.value) && PLUS_TOKENS.has(rightToken.value) || MINUS_TOKENS.has(leftToken.value) && MINUS_TOKENS.has(rightToken.value));
		}
		if (leftToken.type === "Punctuator" && leftToken.value === "/") return ![
			"Block",
			"Line",
			"RegularExpression"
		].includes(rightToken.type);
		return true;
	}
	if (leftToken.type === "String" || rightToken.type === "String" || leftToken.type === "Template" || rightToken.type === "Template") return true;
	if (leftToken.type !== "Numeric" && rightToken.type === "Numeric" && rightToken.value.startsWith(".")) return true;
	if (leftToken.type === "Block" || rightToken.type === "Block" || rightToken.type === "Line") return true;
	if (rightToken.type === "PrivateIdentifier") return true;
	return false;
}
function hasOctalOrNonOctalDecimalEscapeSequence(rawString) {
	return OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN.test(rawString);
}
const WHITE_SPACES_PATTERN = /^\s*$/u;
function isWhiteSpaces(value) {
	return typeof value === "string" ? WHITE_SPACES_PATTERN.test(value) : false;
}
function getFirstNodeInLine(context, node) {
	const sourceCode = context.sourceCode;
	let token = node;
	let lines = null;
	do {
		token = sourceCode.getTokenBefore(token);
		lines = token.type === "JSXText" ? token.value.split("\n") : null;
	} while (token.type === "JSXText" && lines && isWhiteSpaces(lines.at(-1)));
	return token;
}
function isNodeFirstInLine(context, node) {
	const token = getFirstNodeInLine(context, node);
	if (!token) return false;
	return !(0, import_ast_utils.isTokenOnSameLine)(token, node);
}
function getTokenBeforeClosingBracket(node) {
	const attributes = "attributes" in node && node.attributes;
	if (!attributes || attributes.length === 0) return node.name;
	return attributes[attributes.length - 1];
}
function isSingleLine(node) {
	return node.loc.start.line === node.loc.end.line;
}
function getCommentsBetween(sourceCode, left, right) {
	return sourceCode.getTokensBetween(left, right, {
		includeComments: true,
		filter: import_ast_utils.isCommentToken
	});
}
function isJSDocComment(token) {
	if (token.type !== "Block") return false;
	return token.value.startsWith("*");
}
function isObjectNotArray(obj) {
	return typeof obj === "object" && obj != null && !Array.isArray(obj);
}
function deepMerge(first = {}, second = {}) {
	const keys = new Set(Object.keys(first).concat(Object.keys(second)));
	return Array.from(keys).reduce((acc, key) => {
		const firstHasKey = key in first;
		const secondHasKey = key in second;
		const firstValue = first[key];
		const secondValue = second[key];
		if (firstHasKey && secondHasKey) if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) acc[key] = deepMerge(firstValue, secondValue);
		else acc[key] = secondValue;
		else if (firstHasKey) acc[key] = firstValue;
		else acc[key] = secondValue;
		return acc;
	}, {});
}
function createRule({ name, create, meta }) {
	return {
		create: ((context) => {
			if (meta.deprecated) {
				let insted;
				if (typeof meta.deprecated !== "boolean") {
					const { replacedBy } = meta.deprecated;
					if (replacedBy) insted = replacedBy.map(({ rule, plugin }) => `"${rule?.name}"${plugin?.name ? ` in "${plugin.name}"` : ""}`).join(", ");
				}
				warnDeprecation(`rule("${name}")`, insted);
			}
			const { defaultOptions = [] } = meta;
			const optionsCount = Math.max(context.options.length, defaultOptions.length);
			return create(context, Array.from({ length: optionsCount }, (_, i) => {
				if (isObjectNotArray(context.options[i]) && isObjectNotArray(defaultOptions[i])) return deepMerge(defaultOptions[i], context.options[i]);
				return context.options[i] ?? defaultOptions[i];
			}));
		}),
		meta: {
			...meta,
			docs: {
				...meta.docs,
				url: `https://eslint.style/rules/${name}`
			}
		}
	};
}
function safeReplaceTextBetween(sourceCode, left, right, replacement) {
	if (sourceCode.commentsExistBetween(left, right)) return null;
	const range = [left.range[1], right.range[0]];
	return (fixer) => fixer.replaceTextRange(range, typeof replacement === "function" ? replacement() : replacement);
}
function isTextSourceCode(sourceCode) {
	return typeof sourceCode.text === "string";
}
function hasLinesAndGetLocFromIndex(sourceCode) {
	return typeof sourceCode.getLocFromIndex === "function" && Array.isArray(sourceCode.lines);
}
function isESTreeSourceCode(sourceCode) {
	return typeof sourceCode === "object" && sourceCode !== null && "isESTree" in sourceCode && sourceCode.isESTree === true;
}
function traverse$1(ASTnode, visitor) {
	const opts = Object.assign({}, { fallback(node) {
		return Object.keys(node).filter((key) => key === "children" || key === "argument");
	} }, visitor);
	opts.keys = Object.assign({}, visitor.keys, {
		JSXElement: ["children"],
		JSXFragment: ["children"]
	});
	traverse(ASTnode, opts);
}
function traverseReturns(ASTNode, onReturn) {
	const nodeType = ASTNode.type;
	if (nodeType === "ReturnStatement") {
		onReturn(ASTNode.argument, () => {});
		return;
	}
	if (nodeType === "ArrowFunctionExpression" && ASTNode.expression) {
		onReturn(ASTNode.body, () => {});
		return;
	}
	if (nodeType !== "FunctionExpression" && nodeType !== "FunctionDeclaration" && nodeType !== "ArrowFunctionExpression" && nodeType !== "MethodDefinition") return;
	traverse$1(ASTNode.body, { enter(node) {
		const breakTraverse = () => {
			this.break();
		};
		switch (node.type) {
			case "ReturnStatement":
				this.skip();
				onReturn(node.argument, breakTraverse);
				return;
			case "BlockStatement":
			case "IfStatement":
			case "ForStatement":
			case "WhileStatement":
			case "SwitchStatement":
			case "SwitchCase": return;
			default: this.skip();
		}
	} });
}
function getVariable(variables, name) {
	return variables.find((variable) => variable.name === name);
}
function variablesInScope(context) {
	let scope = context.getScope();
	let variables = scope.variables;
	while (scope.type !== "global") {
		scope = scope.upper;
		variables = scope.variables.concat(variables);
	}
	if (scope.childScopes.length) {
		variables = scope.childScopes[0].variables.concat(variables);
		if (scope.childScopes[0].childScopes.length) variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
	}
	variables.reverse();
	return variables;
}
function findVariableByName(context, name) {
	const variable = getVariable(variablesInScope(context), name);
	if (!variable || !variable.defs[0] || !variable.defs[0].node) return null;
	if (variable.defs[0].node.type === "TypeAlias") return variable.defs[0].node.right;
	if (variable.defs[0].type === "ImportBinding") return variable.defs[0].node;
	return variable.defs[0].node.init;
}
const COMPAT_TAG_REGEX = /^[a-z]/;
function isDOMComponent(node) {
	const name = getElementType(node);
	return COMPAT_TAG_REGEX.test(name);
}
function isJSX(node) {
	return node && ["JSXElement", "JSXFragment"].includes(node.type);
}
function isReturningJSX(ASTnode, context, strict = false, ignoreNull = false) {
	const isJSXValue = (node) => {
		if (!node) return false;
		switch (node.type) {
			case "ConditionalExpression":
				if (strict) return isJSXValue(node.consequent) && isJSXValue(node.alternate);
				return isJSXValue(node.consequent) || isJSXValue(node.alternate);
			case "LogicalExpression":
				if (strict) return isJSXValue(node.left) && isJSXValue(node.right);
				return isJSXValue(node.left) || isJSXValue(node.right);
			case "SequenceExpression": return isJSXValue(node.expressions[node.expressions.length - 1]);
			case "JSXElement":
			case "JSXFragment": return true;
			case "Literal": return !ignoreNull && node.value === null;
			case "Identifier": return isJSX(findVariableByName(context, node.name));
			default: return false;
		}
	};
	let found = false;
	traverseReturns(ASTnode, (node, breakTraverse) => {
		if (isJSXValue(node)) {
			found = true;
			breakTraverse();
		}
	});
	return found;
}
function getPropName(sourceCode, prop) {
	if (prop.type === "JSXSpreadAttribute") return sourceCode.getText(prop.argument);
	if (prop.name.type === "JSXNamespacedName") return `${prop.name.namespace.name}:${prop.name.name.name}`;
	return prop.name.name;
}
function resolveMemberExpressions(object, property) {
	if (object.type === "JSXMemberExpression") return `${resolveMemberExpressions(object.object, object.property)}.${property.name}`;
	return `${object.name}.${property.name}`;
}
function getElementType(node) {
	if (node.type === "JSXOpeningFragment") return "<>";
	const { name } = node;
	if (!name) throw new Error("The argument provided is not a JSXElement node.");
	if (name.type === "JSXMemberExpression") {
		const { object, property } = name;
		return resolveMemberExpressions(object, property);
	}
	if (name.type === "JSXNamespacedName") return `${name.namespace.name}:${name.name.name}`;
	return node.name.name;
}
let segmenter;
function isASCII(value) {
	return /^[\u0020-\u007F]*$/u.test(value);
}
function getStringLength(value) {
	if (isASCII(value)) return value.length;
	segmenter ??= new Intl.Segmenter();
	return [...segmenter.segment(value)].length;
}
var FixTracker = class {
	retainedRange;
	constructor(fixer, sourceCode) {
		this.fixer = fixer;
		this.sourceCode = sourceCode;
		this.retainedRange = null;
	}
	retainRange(range) {
		this.retainedRange = range;
		return this;
	}
	retainEnclosingFunction(node) {
		const functionNode = getUpperFunction(node);
		return this.retainRange(functionNode ? functionNode.range : this.sourceCode.ast.range);
	}
	retainSurroundingTokens(nodeOrToken) {
		const tokenBefore = this.sourceCode.getTokenBefore(nodeOrToken) || nodeOrToken;
		const tokenAfter = this.sourceCode.getTokenAfter(nodeOrToken) || nodeOrToken;
		return this.retainRange([tokenBefore.range[0], tokenAfter.range[1]]);
	}
	replaceTextRange(range, text) {
		let actualRange;
		if (this.retainedRange) actualRange = [Math.min(this.retainedRange[0], range[0]), Math.max(this.retainedRange[1], range[1])];
		else actualRange = range;
		return this.fixer.replaceTextRange(actualRange, this.sourceCode.text.slice(actualRange[0], range[0]) + text + this.sourceCode.text.slice(range[1], actualRange[1]));
	}
	remove(nodeOrToken) {
		return this.replaceTextRange(nodeOrToken.range, "");
	}
};
export { warnDeprecation as $, getStaticPropertyName as A, isMixedLogicalAndCoalesceExpressions as B, WHITE_SPACES_PATTERN as C, getFirstNodeInLine as D, getCommentsBetween as E, isDecimalIntegerNumericToken as F, isRegExpLiteral as G, isNumericLiteral as H, isEqToken as I, isSurroundedBy as J, isSingleLine as K, isHashbangComment as L, getTokenBeforeClosingBracket as M, hasOctalOrNonOctalDecimalEscapeSequence as N, getNextLocation as O, isDecimalInteger as P, warnDeprecatedOptions as Q, isJSDocComment as R, STATEMENT_LIST_PARENTS as S, createGlobalLinebreakMatcher as T, isParenthesised as U, isNodeFirstInLine as V, isQuestionToken as W, isWhiteSpaces as X, isTopLevelExpressionStatement as Y, skipChainExpression as Z, ASSIGNMENT_OPERATOR as _, isDOMComponent as a, KEYWORDS as b, hasLinesAndGetLocFromIndex as c, safeReplaceTextBetween as d, createAllConfigs as et, createRule as f, import_ast_utils as g, AST_TOKEN_TYPES as h, getPropName as i, getSwitchCaseColonToken as j, getPrecedence as k, isESTreeSourceCode as l, AST_NODE_TYPES as m, getStringLength as n, isJSX as o, deepMerge as p, isStringLiteral as q, getElementType as r, isReturningJSX as s, FixTracker as t, isTextSourceCode as u, COMMENTS_IGNORE_PATTERN as v, canTokensBeAdjacent as w, LINEBREAKS as x, ES3_KEYWORDS as y, isKeywordToken as z };
