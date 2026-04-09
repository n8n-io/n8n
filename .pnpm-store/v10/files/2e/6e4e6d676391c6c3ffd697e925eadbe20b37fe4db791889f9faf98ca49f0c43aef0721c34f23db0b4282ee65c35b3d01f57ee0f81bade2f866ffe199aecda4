'use strict';

const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');
const require_index = require('./ts-utils/index.js');

//#region lib/utils/indent-ts.js
/**
* @author Yosuke Ota
* See LICENSE file in root directory for full license.
*/
var require_indent_ts = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const { isClosingParenToken, isOpeningParenToken, isOpeningBraceToken, isNotClosingParenToken, isClosingBracketToken, isOpeningBracketToken } = require("@eslint-community/eslint-utils");
	const { isTypeNode } = require_index.default;
	/**
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/indent-helper').TSNodeListener} TSNodeListener
	* @typedef {import('../../typings/eslint-plugin-vue/util-types/node').HasLocation} HasLocation
	* @typedef { { type: string } & HasLocation } MaybeNode
	*/
	/**
	* @typedef {import('@typescript-eslint/types').TSESTree.Node} TSESTreeNode
	* @typedef {import('@typescript-eslint/types').TSESTree.ClassExpression} ClassExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.ClassDeclaration} ClassDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeAliasDeclaration} TSTypeAliasDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSCallSignatureDeclaration} TSCallSignatureDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSConstructSignatureDeclaration} TSConstructSignatureDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSImportEqualsDeclaration} TSImportEqualsDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSAbstractMethodDefinition} TSAbstractMethodDefinition
	* @typedef {import('@typescript-eslint/types').TSESTree.TSAbstractPropertyDefinition} TSAbstractPropertyDefinition
	* @typedef {import('@typescript-eslint/types').TSESTree.TSAbstractAccessorProperty} TSAbstractAccessorProperty
	* @typedef {import('@typescript-eslint/types').TSESTree.TSEnumMember} TSEnumMember
	* @typedef {import('@typescript-eslint/types').TSESTree.TSPropertySignature} TSPropertySignature
	* @typedef {import('@typescript-eslint/types').TSESTree.TSIndexSignature} TSIndexSignature
	* @typedef {import('@typescript-eslint/types').TSESTree.TSMethodSignature} TSMethodSignature
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeParameterInstantiation} TSTypeParameterInstantiation
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeParameterDeclaration} TSTypeParameterDeclaration
	* @typedef {import('@typescript-eslint/types').TSESTree.TSConstructorType} TSConstructorType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSFunctionType} TSFunctionType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSUnionType} TSUnionType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSIntersectionType} TSIntersectionType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSInterfaceHeritage} TSInterfaceHeritage
	* @typedef {import('@typescript-eslint/types').TSESTree.TSClassImplements} TSClassImplements
	* @typedef {import('@typescript-eslint/types').TSESTree.TSInterfaceBody} TSInterfaceBody
	* @typedef {import('@typescript-eslint/types').TSESTree.TSModuleBlock} TSModuleBlock
	* @typedef {import('@typescript-eslint/types').TSESTree.TSDeclareFunction} TSDeclareFunction
	* @typedef {import('@typescript-eslint/types').TSESTree.TSEmptyBodyFunctionExpression} TSEmptyBodyFunctionExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeOperator} TSTypeOperator
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeQuery} TSTypeQuery
	* @typedef {import('@typescript-eslint/types').TSESTree.TSInferType} TSInferType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSOptionalType} TSOptionalType
	* @typedef {import('@typescript-eslint/types').TSESTree.TSNonNullExpression} TSNonNullExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.TSAsExpression} TSAsExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.TSSatisfiesExpression} TSSatisfiesExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.TSTypeReference} TSTypeReference
	* @typedef {import('@typescript-eslint/types').TSESTree.TSInstantiationExpression} TSInstantiationExpression
	* @typedef {import('@typescript-eslint/types').TSESTree.JSXChild} JSXChild
	* @typedef {import('@typescript-eslint/types').TSESTree.TypeNode} TypeNode
	*
	*/
	/**
	* Deprecated in @typescript-eslint/parser v5
	* @typedef {import('@typescript-eslint/types').TSESTree.PropertyDefinition} ClassProperty
	* @typedef {import('@typescript-eslint/types').TSESTree.TSAbstractPropertyDefinition} TSAbstractClassProperty
	*/
	module.exports = { defineVisitor };
	/**
	* Process the given node list.
	* The first node is offsetted from the given left token.
	* Rest nodes are adjusted to the first node.
	* @callback ProcessNodeList
	* @param {(MaybeNode|null)[]} nodeList The node to process.
	* @param {MaybeNode|Token|null} left The left parenthesis token.
	* @param {MaybeNode|Token|null} right The right parenthesis token.
	* @param {number} offset The offset to set.
	* @param {boolean} [alignVertically=true] The flag to align vertically. If `false`, this doesn't align vertically even if the first node is not at beginning of line.
	* @returns {void}
	*/
	/**
	* Set offset to the given tokens.
	* @callback SetOffset
	* @param {Token|Token[]|null|(Token|null)[]} token The token to set.
	* @param {number} offset The offset of the tokens.
	* @param {Token} baseToken The token of the base offset.
	* @returns {void}
	*/
	/**
	*
	* Copy offset to the given tokens from srcToken.
	* @callback CopyOffset
	* @param {Token} token The token to set.
	* @param {Token} srcToken The token of the source offset.
	* @returns {void}
	*/
	/**
	* Process semicolons of the given statement node.
	* @callback ProcessSemicolons
	* @param {MaybeNode} node The statement node to process.
	* @returns {void}
	*/
	/**
	* Get the first and last tokens of the given node.
	* If the node is parenthesized, this gets the outermost parentheses.
	* @callback GetFirstAndLastTokens
	* @param {MaybeNode} node The node to get.
	* @param {number} [borderOffset] The least offset of the first token. Defailt is 0. This value is used to prevent false positive in the following case: `(a) => {}` The parentheses are enclosing the whole parameter part rather than the first parameter, but this offset parameter is needed to distinguish.
	* @returns {{firstToken:Token,lastToken:Token}} The gotten tokens.
	*/
	/**
	* @typedef {object} DefineVisitorParam
	* @property {ProcessNodeList} processNodeList
	* @property {ParserServices.TokenStore | SourceCode} tokenStore
	* @property {SetOffset} setOffset
	* @property {CopyOffset} copyOffset
	* @property {ProcessSemicolons} processSemicolons
	* @property {GetFirstAndLastTokens} getFirstAndLastTokens
	*/
	/**
	* @param {DefineVisitorParam} param
	* @returns {TSNodeListener}
	*/
	function defineVisitor({ processNodeList, tokenStore, setOffset, copyOffset, processSemicolons, getFirstAndLastTokens }) {
		/**
		* Check whether a given token is the first token of:
		*
		* - A parameter of TSTypeParameterInstantiation
		* - An element of TSTupleType
		*
		* @param {Token} token The token to check.
		* @param {TSUnionType | TSIntersectionType} belongingNode The node that the token is belonging to.
		* @returns {boolean} `true` if the token is the first token of an element.
		*/
		function isBeginningOfElement(token, belongingNode) {
			/** @type {TSESTreeNode | null} */
			let node = belongingNode;
			while (node != null && node.parent != null) {
				/** @type {TSESTreeNode} */
				const parent = node.parent;
				if (parent.type === "TSTypeParameterInstantiation") return parent.params.length >= 2 && parent.params.some((param) => getFirstAndLastTokens(param).firstToken.range[0] === token.range[0]);
				if (parent.type === "TSTupleType") return parent.elementTypes.some((element) => element != null && getFirstAndLastTokens(element).firstToken.range[0] === token.range[0]);
				node = parent;
			}
			return false;
		}
		return {
			["ClassDeclaration[implements], ClassDeclaration[typeParameters], ClassDeclaration[superTypeParameters],ClassExpression[implements], ClassExpression[typeParameters], ClassExpression[superTypeParameters]"](node) {
				if (node.typeParameters != null) setOffset(tokenStore.getFirstToken(node.typeParameters), 1, tokenStore.getFirstToken(node.id || node));
				const superTypeArguments = node.superTypeArguments || node.superTypeParameters;
				if (superTypeArguments != null && node.superClass != null) setOffset(tokenStore.getFirstToken(superTypeArguments), 1, tokenStore.getFirstToken(node.superClass));
				if (node.implements != null && node.implements.length > 0) {
					const classToken = tokenStore.getFirstToken(node);
					const implementsToken = tokenStore.getTokenBefore(node.implements[0]);
					setOffset(implementsToken, 1, classToken);
					processNodeList(node.implements, implementsToken, null, 1);
				}
			},
			["TSTypeAliasDeclaration, TSCallSignatureDeclaration, TSConstructSignatureDeclaration, TSImportEqualsDeclaration,TSAbstractMethodDefinition, TSAbstractPropertyDefinition, TSAbstractAccessorProperty, TSEnumMember,TSPropertySignature, TSIndexSignature, TSMethodSignature,ClassProperty, TSAbstractClassProperty"](node) {
				processSemicolons(node);
			},
			"*[type=/^TS/]"(node) {
				if (!isTypeNode(node)) return;
				if (node.parent.type === "TSParenthesizedType") return;
				let leftToken = tokenStore.getTokenBefore(node);
				let rightToken = tokenStore.getTokenAfter(node);
				let firstToken = tokenStore.getFirstToken(node);
				while (leftToken && rightToken && isOpeningParenToken(leftToken) && isClosingParenToken(rightToken)) {
					setOffset(firstToken, 1, leftToken);
					setOffset(rightToken, 0, leftToken);
					firstToken = leftToken;
					leftToken = tokenStore.getTokenBefore(leftToken);
					rightToken = tokenStore.getTokenAfter(rightToken);
				}
			},
			TSTypeAnnotation(node) {
				const [colonOrArrowToken, secondToken] = tokenStore.getFirstTokens(node, {
					count: 2,
					includeComments: false
				});
				const baseToken = tokenStore.getFirstToken(node.parent);
				setOffset([colonOrArrowToken, secondToken], 1, baseToken);
				const before = tokenStore.getTokenBefore(colonOrArrowToken);
				if (before && before.value === "?") setOffset(before, 1, baseToken);
			},
			"TSAsExpression, TSSatisfiesExpression"(node) {
				const expressionTokens = getFirstAndLastTokens(node.expression);
				setOffset([tokenStore.getTokenAfter(expressionTokens.lastToken), getFirstAndLastTokens(node.typeAnnotation).firstToken], 1, expressionTokens.firstToken);
			},
			"TSTypeReference, TSInstantiationExpression"(node) {
				const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
				if (typeArguments) {
					const firstToken = tokenStore.getFirstToken(node);
					setOffset(tokenStore.getFirstToken(typeArguments), 1, firstToken);
				}
			},
			"TSTypeParameterInstantiation, TSTypeParameterDeclaration"(node) {
				processNodeList(node.params, tokenStore.getFirstToken(node), tokenStore.getLastToken(node), 1);
			},
			TSTypeAliasDeclaration(node) {
				const typeToken = tokenStore.getFirstToken(node);
				const idToken = tokenStore.getFirstToken(node.id);
				setOffset(idToken, 1, typeToken);
				let eqToken;
				if (node.typeParameters) {
					setOffset(tokenStore.getFirstToken(node.typeParameters), 1, idToken);
					eqToken = tokenStore.getTokenAfter(node.typeParameters);
				} else eqToken = tokenStore.getTokenAfter(node.id);
				const initToken = tokenStore.getTokenAfter(eqToken);
				setOffset([eqToken, initToken], 1, idToken);
			},
			"TSConstructorType, TSFunctionType"(node) {
				const firstToken = tokenStore.getFirstToken(node);
				let currToken = firstToken;
				if (node.type === "TSConstructorType") {
					currToken = tokenStore.getTokenAfter(currToken);
					setOffset(currToken, 1, firstToken);
				}
				if (node.typeParameters) {
					currToken = tokenStore.getTokenAfter(node.typeParameters);
					setOffset(currToken, 1, firstToken);
				}
				const leftParenToken = currToken;
				const rightParenToken = tokenStore.getTokenAfter(node.params.at(-1) || leftParenToken, isClosingParenToken);
				processNodeList(node.params, leftParenToken, rightParenToken, 1);
				setOffset(tokenStore.getTokenAfter(rightParenToken), 1, leftParenToken);
			},
			TSTypeLiteral(node) {
				processNodeList(node.members, tokenStore.getFirstToken(node), tokenStore.getLastToken(node), 1);
			},
			TSPropertySignature(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const keyTokens = getFirstAndLastTokens(node.key);
				let keyLast;
				if (node.computed) {
					const closeBracket = tokenStore.getTokenAfter(keyTokens.lastToken);
					processNodeList([node.key], firstToken, closeBracket, 1);
					keyLast = closeBracket;
				} else keyLast = keyTokens.lastToken;
				if (node.typeAnnotation) {
					const typeAnnotationToken = tokenStore.getFirstToken(node.typeAnnotation);
					setOffset([...tokenStore.getTokensBetween(keyLast, typeAnnotationToken), typeAnnotationToken], 1, firstToken);
				} else if (node.optional) setOffset(tokenStore.getLastToken(node), 1, firstToken);
			},
			TSIndexSignature(node) {
				const leftBracketToken = tokenStore.getFirstToken(node);
				const rightBracketToken = tokenStore.getTokenAfter(node.parameters.at(-1) || leftBracketToken, isClosingBracketToken);
				processNodeList(node.parameters, leftBracketToken, rightBracketToken, 1);
				const keyLast = rightBracketToken;
				if (node.typeAnnotation) {
					const typeAnnotationToken = tokenStore.getFirstToken(node.typeAnnotation);
					setOffset([...tokenStore.getTokensBetween(keyLast, typeAnnotationToken), typeAnnotationToken], 1, leftBracketToken);
				}
			},
			TSArrayType(node) {
				const firstToken = tokenStore.getFirstToken(node);
				setOffset(tokenStore.getLastTokens(node, {
					count: 2,
					includeComments: false
				}), 0, firstToken);
			},
			TSTupleType(node) {
				processNodeList(node.elementTypes, tokenStore.getFirstToken(node), tokenStore.getLastToken(node), 1);
			},
			TSQualifiedName(node) {
				const objectToken = tokenStore.getFirstToken(node);
				const dotToken = tokenStore.getTokenBefore(node.right);
				setOffset([dotToken, tokenStore.getTokenAfter(dotToken)], 1, objectToken);
			},
			TSIndexedAccessType(node) {
				const objectToken = tokenStore.getFirstToken(node);
				const leftBracketToken = tokenStore.getTokenBefore(node.indexType, isOpeningBracketToken);
				const rightBracketToken = tokenStore.getTokenAfter(node.indexType, isClosingBracketToken);
				setOffset(leftBracketToken, 1, objectToken);
				processNodeList([node.indexType], leftBracketToken, rightBracketToken, 1);
			},
			"TSUnionType, TSIntersectionType"(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const prevToken = tokenStore.getTokenBefore(firstToken);
				const offset = prevToken == null || prevToken.loc.end.line === firstToken.loc.start.line || isBeginningOfElement(firstToken, node) ? 1 : 0;
				const typeTokensList = node.types.map(getFirstAndLastTokens);
				const typeTokens = typeTokensList.shift();
				if (!typeTokens) return;
				let lastToken;
				if (typeTokens.firstToken === firstToken) lastToken = typeTokens.lastToken;
				else {
					typeTokensList.unshift(typeTokens);
					lastToken = firstToken;
				}
				for (const typeTokens$1 of typeTokensList) {
					setOffset(tokenStore.getTokensBetween(lastToken, typeTokens$1.firstToken), offset, firstToken);
					setOffset(typeTokens$1.firstToken, offset, firstToken);
				}
			},
			TSMappedType(node) {
				const leftBraceToken = tokenStore.getFirstToken(node);
				const leftBracketToken = tokenStore.getTokenBefore(node.key || node.typeParameter);
				const rightBracketToken = tokenStore.getTokenAfter(node.nameType || node.constraint || node.typeParameter);
				setOffset([...tokenStore.getTokensBetween(leftBraceToken, leftBracketToken), leftBracketToken], 1, leftBraceToken);
				processNodeList([node.key || node.typeParameter, node.nameType], leftBracketToken, rightBracketToken, 1);
				if (node.constraint) setOffset([...tokenStore.getTokensBetween(node.key, node.constraint), tokenStore.getFirstToken(node.constraint)], 1, tokenStore.getFirstToken(node.key));
				const rightBraceToken = tokenStore.getLastToken(node);
				if (node.typeAnnotation) {
					const typeAnnotationToken = tokenStore.getFirstToken(node.typeAnnotation);
					setOffset([...tokenStore.getTokensBetween(rightBracketToken, typeAnnotationToken), typeAnnotationToken], 1, leftBraceToken);
				} else setOffset([...tokenStore.getTokensBetween(rightBracketToken, rightBraceToken)], 1, leftBraceToken);
				setOffset(rightBraceToken, 0, leftBraceToken);
			},
			TSTypeParameter(node) {
				const [firstToken, ...afterTokens] = tokenStore.getTokens(node);
				for (const child of [node.constraint, node.default]) {
					if (!child) continue;
					const [, ...removeTokens] = tokenStore.getTokens(child);
					for (const token of removeTokens) {
						const i = afterTokens.indexOf(token);
						if (i !== -1) afterTokens.splice(i, 1);
					}
				}
				const secondToken = afterTokens.shift();
				if (!secondToken) return;
				setOffset(secondToken, 1, firstToken);
				if (secondToken.value === "extends") {
					let prevToken = null;
					let token = afterTokens.shift();
					while (token) {
						if (token.value === "=") break;
						setOffset(token, 1, secondToken);
						prevToken = token;
						token = afterTokens.shift();
					}
					while (token) {
						setOffset(token, 1, prevToken || secondToken);
						token = afterTokens.shift();
					}
				} else setOffset(afterTokens, 1, firstToken);
			},
			TSConditionalType(node) {
				const checkTypeToken = tokenStore.getFirstToken(node);
				const extendsToken = tokenStore.getTokenAfter(node.checkType);
				const extendsTypeToken = tokenStore.getFirstToken(node.extendsType);
				setOffset(extendsToken, 1, checkTypeToken);
				setOffset(extendsTypeToken, 1, extendsToken);
				const questionToken = tokenStore.getTokenAfter(node.extendsType, isNotClosingParenToken);
				const consequentToken = tokenStore.getTokenAfter(questionToken);
				const colonToken = tokenStore.getTokenAfter(node.trueType, isNotClosingParenToken);
				const alternateToken = tokenStore.getTokenAfter(colonToken);
				let baseNode = node;
				let parent = baseNode.parent;
				while (parent && parent.type === "TSConditionalType" && parent.falseType === baseNode) {
					baseNode = parent;
					parent = baseNode.parent;
				}
				const baseToken = tokenStore.getFirstToken(baseNode);
				setOffset([questionToken, colonToken], 1, baseToken);
				setOffset(consequentToken, 1, questionToken);
				setOffset(alternateToken, 1, colonToken);
			},
			TSInterfaceDeclaration(node) {
				const interfaceToken = tokenStore.getFirstToken(node);
				setOffset(tokenStore.getFirstToken(node.id), 1, interfaceToken);
				if (node.typeParameters != null) setOffset(tokenStore.getFirstToken(node.typeParameters), 1, tokenStore.getFirstToken(node.id));
				if (node.extends != null && node.extends.length > 0) {
					const extendsToken = tokenStore.getTokenBefore(node.extends[0]);
					setOffset(extendsToken, 1, interfaceToken);
					processNodeList(node.extends, extendsToken, null, 1);
				}
				setOffset(tokenStore.getFirstToken(node.body), 0, interfaceToken);
			},
			"TSInterfaceBody, TSModuleBlock"(node) {
				processNodeList(node.body, tokenStore.getFirstToken(node), tokenStore.getLastToken(node), 1);
			},
			"TSClassImplements, TSInterfaceHeritage"(node) {
				const typeArguments = node.typeArguments || node.typeParameters;
				if (typeArguments) setOffset(tokenStore.getFirstToken(typeArguments), 1, tokenStore.getFirstToken(node));
			},
			TSEnumDeclaration(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const idTokens = getFirstAndLastTokens(node.id);
				setOffset(tokenStore.getTokensBetween(firstToken, idTokens.firstToken), 0, firstToken);
				setOffset(idTokens.firstToken, 1, firstToken);
				const leftBraceToken = tokenStore.getTokenAfter(idTokens.lastToken);
				const rightBraceToken = tokenStore.getLastToken(node);
				setOffset(leftBraceToken, 0, firstToken);
				if (node.body) return;
				processNodeList(node.members, leftBraceToken, rightBraceToken, 1);
			},
			TSEnumBody(node) {
				const leftBraceToken = tokenStore.getFirstToken(node);
				const rightBraceToken = tokenStore.getLastToken(node);
				processNodeList(node.members, leftBraceToken, rightBraceToken, 1);
			},
			TSModuleDeclaration(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const idTokens = getFirstAndLastTokens(node.id);
				setOffset(tokenStore.getTokensBetween(firstToken, idTokens.firstToken), 0, firstToken);
				setOffset(idTokens.firstToken, 1, firstToken);
				if (node.body) {
					const bodyFirstToken = tokenStore.getFirstToken(node.body);
					setOffset(bodyFirstToken, isOpeningBraceToken(bodyFirstToken) ? 0 : 1, firstToken);
				}
			},
			TSMethodSignature(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const keyTokens = getFirstAndLastTokens(node.key);
				let keyLast;
				if (node.computed) {
					const closeBracket = tokenStore.getTokenAfter(keyTokens.lastToken);
					processNodeList([node.key], firstToken, closeBracket, 1);
					keyLast = closeBracket;
				} else keyLast = keyTokens.lastToken;
				const leftParenToken = tokenStore.getTokenAfter(keyLast, isOpeningParenToken);
				setOffset([...tokenStore.getTokensBetween(keyLast, leftParenToken), leftParenToken], 1, firstToken);
				const rightParenToken = tokenStore.getTokenAfter(node.params.at(-1) || leftParenToken, isClosingParenToken);
				processNodeList(node.params, leftParenToken, rightParenToken, 1);
				if (node.returnType) {
					const typeAnnotationToken = tokenStore.getFirstToken(node.returnType);
					setOffset([...tokenStore.getTokensBetween(keyLast, typeAnnotationToken), typeAnnotationToken], 1, firstToken);
				}
			},
			"TSCallSignatureDeclaration, TSConstructSignatureDeclaration"(node) {
				const firstToken = tokenStore.getFirstToken(node);
				let currToken = firstToken;
				if (node.type === "TSConstructSignatureDeclaration") {
					currToken = tokenStore.getTokenAfter(currToken);
					setOffset(currToken, 1, firstToken);
				}
				if (node.typeParameters) {
					currToken = tokenStore.getTokenAfter(node.typeParameters);
					setOffset(currToken, 1, firstToken);
				}
				const leftParenToken = currToken;
				const rightParenToken = tokenStore.getTokenAfter(node.params.at(-1) || leftParenToken, isClosingParenToken);
				processNodeList(node.params, leftParenToken, rightParenToken, 1);
				if (node.returnType) {
					const typeAnnotationToken = tokenStore.getFirstToken(node.returnType);
					setOffset([...tokenStore.getTokensBetween(rightParenToken, typeAnnotationToken), typeAnnotationToken], 1, firstToken);
				}
			},
			"TSDeclareFunction, TSEmptyBodyFunctionExpression"(node) {
				const firstToken = tokenStore.getFirstToken(node);
				let leftParenToken, bodyBaseToken;
				if (firstToken.type === "Punctuator") {
					leftParenToken = firstToken;
					bodyBaseToken = tokenStore.getFirstToken(node.parent);
				} else {
					let nextToken = tokenStore.getTokenAfter(firstToken);
					let nextTokenOffset = 0;
					while (nextToken && !isOpeningParenToken(nextToken) && nextToken.value !== "<") {
						if (nextToken.value === "*" || node.id && nextToken.range[0] === node.id.range[0]) nextTokenOffset = 1;
						setOffset(nextToken, nextTokenOffset, firstToken);
						nextToken = tokenStore.getTokenAfter(nextToken);
					}
					leftParenToken = nextToken;
					bodyBaseToken = firstToken;
				}
				if (!isOpeningParenToken(leftParenToken) && node.typeParameters) leftParenToken = tokenStore.getTokenAfter(node.typeParameters);
				const rightParenToken = tokenStore.getTokenAfter(node.params.at(-1) || leftParenToken, isClosingParenToken);
				setOffset(leftParenToken, 1, bodyBaseToken);
				processNodeList(node.params, leftParenToken, rightParenToken, 1);
			},
			"TSTypeOperator, TSTypeQuery, TSInferType"(node) {
				const firstToken = tokenStore.getFirstToken(node);
				setOffset(tokenStore.getTokenAfter(firstToken), 1, firstToken);
			},
			TSTypePredicate(node) {
				const firstToken = tokenStore.getFirstToken(node);
				setOffset([tokenStore.getTokenAfter(node.parameterName, isNotClosingParenToken), node.typeAnnotation && getFirstAndLastTokens(node.typeAnnotation).firstToken], 1, getFirstAndLastTokens(firstToken).firstToken);
			},
			["TSAbstractMethodDefinition, TSAbstractPropertyDefinition, TSAbstractAccessorProperty, TSEnumMember,ClassProperty, TSAbstractClassProperty"](node) {
				const { keyNode, valueNode } = node.type === "TSEnumMember" ? {
					keyNode: node.id,
					valueNode: node.initializer
				} : {
					keyNode: node.key,
					valueNode: node.value
				};
				const firstToken = tokenStore.getFirstToken(node);
				const keyTokens = getFirstAndLastTokens(keyNode);
				const prefixTokens = tokenStore.getTokensBetween(firstToken, keyTokens.firstToken);
				if (node.computed) prefixTokens.pop();
				setOffset(prefixTokens, 0, firstToken);
				let lastKeyToken;
				if (node.computed) {
					const leftBracketToken = tokenStore.getTokenBefore(keyTokens.firstToken);
					const rightBracketToken = lastKeyToken = tokenStore.getTokenAfter(keyTokens.lastToken);
					setOffset(leftBracketToken, 0, firstToken);
					processNodeList([keyNode], leftBracketToken, rightBracketToken, 1);
				} else {
					setOffset(keyTokens.firstToken, 0, firstToken);
					lastKeyToken = keyTokens.lastToken;
				}
				if (valueNode != null) {
					const initToken = tokenStore.getFirstToken(valueNode);
					setOffset([...tokenStore.getTokensBetween(lastKeyToken, initToken), initToken], 1, lastKeyToken);
				}
			},
			"TSOptionalType, TSNonNullExpression, TSJSDocNonNullableType"(node) {
				setOffset(tokenStore.getLastToken(node), 1, tokenStore.getFirstToken(node));
			},
			TSTypeAssertion(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const expressionToken = getFirstAndLastTokens(node.expression).firstToken;
				processNodeList([node.typeAnnotation], firstToken, tokenStore.getTokenBefore(expressionToken), 1);
				setOffset(expressionToken, 1, firstToken);
			},
			TSImportType(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const leftParenToken = tokenStore.getTokenAfter(firstToken, isOpeningParenToken);
				setOffset(leftParenToken, 1, firstToken);
				const args = [];
				if (node.source) args.push(node.source);
				else args.push(node.argument || node.parameter);
				if (node.options) args.push(node.options);
				processNodeList(args, leftParenToken, tokenStore.getTokenAfter(args.at(-1), isClosingParenToken), 1);
				if (node.qualifier) {
					const dotToken = tokenStore.getTokenBefore(node.qualifier);
					setOffset([dotToken, tokenStore.getTokenAfter(dotToken)], 1, firstToken);
				}
				const typeArguments = "typeArguments" in node ? node.typeArguments : node.typeParameters;
				if (typeArguments) setOffset(tokenStore.getFirstToken(typeArguments), 1, firstToken);
			},
			TSParameterProperty(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const parameterToken = tokenStore.getFirstToken(node.parameter);
				setOffset([...tokenStore.getTokensBetween(firstToken, parameterToken), parameterToken], 1, firstToken);
			},
			TSImportEqualsDeclaration(node) {
				const importToken = tokenStore.getFirstToken(node);
				const idTokens = getFirstAndLastTokens(node.id);
				setOffset(idTokens.firstToken, 1, importToken);
				setOffset([tokenStore.getTokenAfter(idTokens.lastToken), tokenStore.getFirstToken(node.moduleReference)], 1, idTokens.lastToken);
			},
			TSExternalModuleReference(node) {
				const requireToken = tokenStore.getFirstToken(node);
				const leftParenToken = tokenStore.getTokenAfter(requireToken, isOpeningParenToken);
				const rightParenToken = tokenStore.getLastToken(node);
				setOffset(leftParenToken, 1, requireToken);
				processNodeList([node.expression], leftParenToken, rightParenToken, 1);
			},
			TSExportAssignment(node) {
				const exportNode = tokenStore.getFirstToken(node);
				const exprTokens = getFirstAndLastTokens(node.expression);
				setOffset([tokenStore.getTokenBefore(exprTokens.firstToken), exprTokens.firstToken], 1, exportNode);
			},
			TSNamedTupleMember(node) {
				const labelToken = tokenStore.getFirstToken(node);
				const elementTokens = getFirstAndLastTokens(node.elementType);
				setOffset([...tokenStore.getTokensBetween(labelToken, elementTokens.firstToken), elementTokens.firstToken], 1, labelToken);
			},
			TSRestType(node) {
				const firstToken = tokenStore.getFirstToken(node);
				setOffset(tokenStore.getTokenAfter(firstToken), 1, firstToken);
			},
			TSNamespaceExportDeclaration(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const idToken = tokenStore.getFirstToken(node.id);
				setOffset([...tokenStore.getTokensBetween(firstToken, idToken), idToken], 1, firstToken);
			},
			TSTemplateLiteralType(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const quasiTokens = node.quasis.slice(1).map((n) => tokenStore.getFirstToken(n));
				const expressionToken = node.quasis.slice(0, -1).map((n) => tokenStore.getTokenAfter(n));
				setOffset(quasiTokens, 0, firstToken);
				setOffset(expressionToken, 1, firstToken);
			},
			Decorator(node) {
				const [atToken, secondToken] = tokenStore.getFirstTokens(node, {
					count: 2,
					includeComments: false
				});
				setOffset(secondToken, 0, atToken);
				const parent = node.parent;
				const { decorators, range } = parent;
				if (!decorators || decorators.length === 0) return;
				if (decorators[0] === node) if (range[0] === node.range[0]) setOffset(tokenStore.getTokenAfter(decorators.at(-1)), 0, atToken);
				else copyOffset(atToken, tokenStore.getFirstToken(parent.parent && (parent.parent.type === "ExportDefaultDeclaration" || parent.parent.type === "ExportNamedDeclaration") && node.range[0] < parent.parent.range[0] ? parent.parent : parent));
				else setOffset(atToken, 0, tokenStore.getFirstToken(decorators[0]));
			},
			AccessorProperty(node) {
				const keyNode = node.key;
				const valueNode = node.value;
				const firstToken = tokenStore.getFirstToken(node);
				const keyTokens = getFirstAndLastTokens(keyNode);
				const prefixTokens = tokenStore.getTokensBetween(firstToken, keyTokens.firstToken);
				if (node.computed) prefixTokens.pop();
				setOffset(prefixTokens, 0, firstToken);
				let lastKeyToken;
				if (node.computed) {
					const leftBracketToken = tokenStore.getTokenBefore(keyTokens.firstToken);
					const rightBracketToken = lastKeyToken = tokenStore.getTokenAfter(keyTokens.lastToken);
					setOffset(leftBracketToken, 0, firstToken);
					processNodeList([keyNode], leftBracketToken, rightBracketToken, 1);
				} else {
					setOffset(keyTokens.firstToken, 0, firstToken);
					lastKeyToken = keyTokens.lastToken;
				}
				if (valueNode != null) {
					const initToken = tokenStore.getFirstToken(valueNode);
					setOffset([...tokenStore.getTokensBetween(lastKeyToken, initToken), initToken], 1, lastKeyToken);
				}
				processSemicolons(node);
			},
			ImportAttribute(node) {
				const firstToken = tokenStore.getFirstToken(node);
				const keyTokens = getFirstAndLastTokens(node.key);
				setOffset(tokenStore.getTokensBetween(firstToken, keyTokens.firstToken), 0, firstToken);
				setOffset(keyTokens.firstToken, 0, firstToken);
				const initToken = tokenStore.getFirstToken(node.value);
				setOffset([...tokenStore.getTokensBetween(keyTokens.lastToken, initToken), initToken], 1, keyTokens.lastToken);
			},
			TSParenthesizedType(node) {
				processNodeList([node.typeAnnotation], tokenStore.getFirstToken(node), tokenStore.getLastToken(node), 1);
			},
			TSPrivateIdentifier() {},
			TSAnyKeyword() {},
			TSBigIntKeyword() {},
			TSBooleanKeyword() {},
			TSNeverKeyword() {},
			TSNullKeyword() {},
			TSNumberKeyword() {},
			TSObjectKeyword() {},
			TSStringKeyword() {},
			TSSymbolKeyword() {},
			TSUndefinedKeyword() {},
			TSUnknownKeyword() {},
			TSVoidKeyword() {},
			TSAbstractKeyword() {},
			TSAsyncKeyword() {},
			TSPrivateKeyword() {},
			TSProtectedKeyword() {},
			TSPublicKeyword() {},
			TSReadonlyKeyword() {},
			TSStaticKeyword() {},
			TSDeclareKeyword() {},
			TSExportKeyword() {},
			TSIntrinsicKeyword() {},
			TSThisType() {},
			TSLiteralType() {}
		};
	}
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_indent_ts();
  }
});