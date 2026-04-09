import { f as createRule, g as import_ast_utils } from "../utils.js";
var comma_style_default = createRule({
	name: "comma-style",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent comma style" },
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["first", "last"]
		}, {
			type: "object",
			properties: { exceptions: {
				type: "object",
				additionalProperties: { type: "boolean" }
			} },
			additionalProperties: false
		}],
		defaultOptions: ["last"],
		messages: {
			unexpectedLineBeforeAndAfterComma: "Bad line breaking before and after ','.",
			expectedCommaFirst: "',' should be placed first.",
			expectedCommaLast: "',' should be placed last."
		}
	},
	create(context, [style, options]) {
		const sourceCode = context.sourceCode;
		const exceptions = options?.exceptions ?? {};
		function getReplacedText(styleType, text) {
			switch (styleType) {
				case "between": return `,${text.replace(import_ast_utils.LINEBREAK_MATCHER, "")}`;
				case "first": return `${text},`;
				case "last": return `,${text}`;
				default: return "";
			}
		}
		function getFixerFunction(styleType, tokenBeforeComma, commaToken, tokenAfterComma) {
			const text = sourceCode.text.slice(tokenBeforeComma.range[1], commaToken.range[0]) + sourceCode.text.slice(commaToken.range[1], tokenAfterComma.range[0]);
			const range = [tokenBeforeComma.range[1], tokenAfterComma.range[0]];
			return function(fixer) {
				return fixer.replaceTextRange(range, getReplacedText(styleType, text));
			};
		}
		function validateCommaItemSpacing(tokenBeforeComma, commaToken, tokenAfterComma) {
			if ((0, import_ast_utils.isTokenOnSameLine)(commaToken, tokenAfterComma) && (0, import_ast_utils.isTokenOnSameLine)(tokenBeforeComma, commaToken)) {} else if (!(0, import_ast_utils.isTokenOnSameLine)(commaToken, tokenAfterComma) && !(0, import_ast_utils.isTokenOnSameLine)(tokenBeforeComma, commaToken)) {
				const comment = sourceCode.getCommentsAfter(commaToken)[0];
				const styleType = comment && comment.type === "Block" && (0, import_ast_utils.isTokenOnSameLine)(commaToken, comment) ? style : "between";
				context.report({
					node: commaToken,
					messageId: "unexpectedLineBeforeAndAfterComma",
					fix: getFixerFunction(styleType, tokenBeforeComma, commaToken, tokenAfterComma)
				});
			} else if (style === "first" && !(0, import_ast_utils.isTokenOnSameLine)(commaToken, tokenAfterComma)) context.report({
				node: commaToken,
				messageId: "expectedCommaFirst",
				fix: getFixerFunction(style, tokenBeforeComma, commaToken, tokenAfterComma)
			});
			else if (style === "last" && (0, import_ast_utils.isTokenOnSameLine)(commaToken, tokenAfterComma)) context.report({
				node: commaToken,
				messageId: "expectedCommaLast",
				fix: getFixerFunction(style, tokenBeforeComma, commaToken, tokenAfterComma)
			});
		}
		function extractCommaTokens(node, items) {
			if (items.length === 0) return [];
			const definedItems = items.filter((item) => Boolean(item));
			if (definedItems.length === 0) return sourceCode.getTokens(node).filter(import_ast_utils.isCommaToken);
			const commaTokens = [];
			const firstItem = definedItems[0];
			let prevToken = sourceCode.getTokenBefore(firstItem);
			while (prevToken && node.range[0] <= prevToken.range[0]) {
				if ((0, import_ast_utils.isCommaToken)(prevToken)) commaTokens.unshift(prevToken);
				else if ((0, import_ast_utils.isNotOpeningParenToken)(prevToken)) break;
				prevToken = sourceCode.getTokenBefore(prevToken);
			}
			let prevItem = null;
			for (const item of definedItems) {
				if (prevItem) commaTokens.push(...sourceCode.getTokensBetween(prevItem, item).filter(import_ast_utils.isCommaToken));
				const tokenLastItem = sourceCode.getLastToken(item);
				if (tokenLastItem && (0, import_ast_utils.isCommaToken)(tokenLastItem)) commaTokens.push(tokenLastItem);
				prevItem = item;
			}
			let nextToken = sourceCode.getTokenAfter(prevItem);
			while (nextToken && nextToken.range[1] <= node.range[1]) {
				if ((0, import_ast_utils.isCommaToken)(nextToken)) commaTokens.push(nextToken);
				else if ((0, import_ast_utils.isNotClosingParenToken)(nextToken)) break;
				nextToken = sourceCode.getTokenAfter(nextToken);
			}
			return commaTokens;
		}
		function validateComma(node, items) {
			extractCommaTokens(node, items).forEach((commaToken) => {
				const tokenBeforeComma = sourceCode.getTokenBefore(commaToken);
				const tokenAfterComma = sourceCode.getTokenAfter(commaToken);
				if ((0, import_ast_utils.isOpeningBracketToken)(tokenBeforeComma)) return;
				if ((0, import_ast_utils.isCommaToken)(tokenBeforeComma) && (0, import_ast_utils.isOpeningBracketToken)(sourceCode.getTokenBefore(tokenBeforeComma, import_ast_utils.isNotCommaToken))) return;
				if ((0, import_ast_utils.isCommaToken)(tokenAfterComma) && !(0, import_ast_utils.isTokenOnSameLine)(commaToken, tokenAfterComma)) return;
				validateCommaItemSpacing(tokenBeforeComma, commaToken, tokenAfterComma);
			});
		}
		const nodes = {};
		if (!exceptions.VariableDeclaration) nodes.VariableDeclaration = (node) => validateComma(node, node.declarations);
		if (!exceptions.ObjectExpression) nodes.ObjectExpression = validateObjectProperties;
		if (!exceptions.ObjectPattern) nodes.ObjectPattern = validateObjectProperties;
		if (!exceptions.ArrayExpression) nodes.ArrayExpression = validateArrayElements;
		if (!exceptions.ArrayPattern) nodes.ArrayPattern = validateArrayElements;
		if (!exceptions.FunctionDeclaration) nodes.FunctionDeclaration = validateFunctionParams;
		if (!exceptions.FunctionExpression) nodes.FunctionExpression = validateFunctionParams;
		if (!exceptions.ArrowFunctionExpression) nodes.ArrowFunctionExpression = validateFunctionParams;
		if (!exceptions.CallExpression) nodes.CallExpression = validateCallArguments;
		if (!exceptions.ImportDeclaration) nodes.ImportDeclaration = (node) => {
			validateComma(node, node.specifiers);
			visitImportAttributes(node);
		};
		if (!exceptions.NewExpression) nodes.NewExpression = validateCallArguments;
		if (!exceptions.ExportAllDeclaration) nodes.ExportAllDeclaration = visitImportAttributes;
		if (!exceptions.ExportNamedDeclaration) nodes.ExportNamedDeclaration = (node) => {
			validateComma(node, node.specifiers);
			visitImportAttributes(node);
		};
		if (!exceptions.ImportExpression) nodes.ImportExpression = (node) => {
			validateComma(node, [node.source, node.options ?? null]);
		};
		if (!exceptions.SequenceExpression) nodes.SequenceExpression = (node) => validateComma(node, node.expressions);
		if (!exceptions.ClassDeclaration) nodes.ClassDeclaration = visitClassImplements;
		if (!exceptions.ClassExpression) nodes.ClassExpression = visitClassImplements;
		if (!exceptions.TSDeclareFunction) nodes.TSDeclareFunction = validateFunctionParams;
		if (!exceptions.TSFunctionType) nodes.TSFunctionType = validateFunctionParams;
		if (!exceptions.TSConstructorType) nodes.TSConstructorType = validateFunctionParams;
		if (!exceptions.TSEmptyBodyFunctionExpression) nodes.TSEmptyBodyFunctionExpression = validateFunctionParams;
		if (!exceptions.TSMethodSignature) nodes.TSMethodSignature = validateFunctionParams;
		if (!exceptions.TSCallSignatureDeclaration) nodes.TSCallSignatureDeclaration = validateFunctionParams;
		if (!exceptions.TSConstructSignatureDeclaration) nodes.TSConstructSignatureDeclaration = validateFunctionParams;
		if (!exceptions.TSTypeParameterDeclaration) nodes.TSTypeParameterDeclaration = validateTypeParams;
		if (!exceptions.TSTypeParameterInstantiation) nodes.TSTypeParameterInstantiation = validateTypeParams;
		if (!exceptions.TSEnumBody) nodes.TSEnumBody = visitMembers;
		if (!exceptions.TSTypeLiteral) nodes.TSTypeLiteral = visitMembers;
		if (!exceptions.TSIndexSignature) nodes.TSIndexSignature = (node) => validateComma(node, node.parameters);
		if (!exceptions.TSInterfaceDeclaration) nodes.TSInterfaceDeclaration = (node) => validateComma(node, node.extends);
		if (!exceptions.TSInterfaceBody) nodes.TSInterfaceBody = (node) => validateComma(node, node.body);
		if (!exceptions.TSTupleType) nodes.TSTupleType = (node) => validateComma(node, node.elementTypes);
		return nodes;
		function validateObjectProperties(node) {
			validateComma(node, node.properties);
		}
		function validateArrayElements(node) {
			validateComma(node, node.elements);
		}
		function validateFunctionParams(node) {
			validateComma(node, node.params);
		}
		function validateCallArguments(node) {
			validateComma(node, node.arguments);
		}
		function visitImportAttributes(node) {
			if (!node.attributes) return;
			validateComma(node, node.attributes);
		}
		function visitClassImplements(node) {
			if (!node.implements) return;
			validateComma(node, node.implements);
		}
		function visitMembers(node) {
			validateComma(node, node.members);
		}
		function validateTypeParams(node) {
			validateComma(node, node.params);
		}
	}
});
export { comma_style_default as t };
