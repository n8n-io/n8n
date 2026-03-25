/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const {
  isClosingParenToken,
  isOpeningParenToken,
  isOpeningBraceToken,
  isNotClosingParenToken,
  isClosingBracketToken,
  isOpeningBracketToken
} = require('@eslint-community/eslint-utils')
const { isTypeNode } = require('./ts-utils')

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

module.exports = {
  defineVisitor
}

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
function defineVisitor({
  processNodeList,
  tokenStore,
  setOffset,
  copyOffset,
  processSemicolons,
  getFirstAndLastTokens
}) {
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
    let node = belongingNode

    while (node != null && node.parent != null) {
      /** @type {TSESTreeNode} */
      const parent = node.parent
      if (parent.type === 'TSTypeParameterInstantiation') {
        return (
          parent.params.length >= 2 &&
          parent.params.some(
            (param) =>
              getFirstAndLastTokens(param).firstToken.range[0] ===
              token.range[0]
          )
        )
      }
      if (parent.type === 'TSTupleType') {
        return parent.elementTypes.some(
          (element) =>
            element != null &&
            getFirstAndLastTokens(element).firstToken.range[0] ===
              token.range[0]
        )
      }

      node = parent
    }

    return false
  }

  return {
    // Support TypeScript
    /** @param {ClassDeclaration | ClassExpression} node */
    ['ClassDeclaration[implements], ClassDeclaration[typeParameters], ClassDeclaration[superTypeParameters],' +
      'ClassExpression[implements], ClassExpression[typeParameters], ClassExpression[superTypeParameters]'](
      node
    ) {
      if (node.typeParameters != null) {
        setOffset(
          tokenStore.getFirstToken(node.typeParameters),
          1,
          tokenStore.getFirstToken(node.id || node)
        )
      }
      if (node.superTypeParameters != null && node.superClass != null) {
        setOffset(
          tokenStore.getFirstToken(node.superTypeParameters),
          1,
          tokenStore.getFirstToken(node.superClass)
        )
      }
      if (node.implements != null && node.implements.length > 0) {
        const classToken = tokenStore.getFirstToken(node)
        const implementsToken = tokenStore.getTokenBefore(node.implements[0])
        setOffset(implementsToken, 1, classToken)
        processNodeList(node.implements, implementsToken, null, 1)
      }
    },
    // Process semicolons.
    /**
     * @param {TSTypeAliasDeclaration
     *   | TSCallSignatureDeclaration
     *   | TSConstructSignatureDeclaration
     *   | TSImportEqualsDeclaration
     *   | TSAbstractMethodDefinition
     *   | TSAbstractPropertyDefinition
     *   | TSAbstractAccessorProperty
     *   | TSEnumMember
     *   | TSPropertySignature
     *   | TSIndexSignature
     *   | TSMethodSignature
     *   | ClassProperty
     *   | TSAbstractClassProperty} node
     */
    ['TSTypeAliasDeclaration, TSCallSignatureDeclaration, TSConstructSignatureDeclaration, TSImportEqualsDeclaration,' +
      'TSAbstractMethodDefinition, TSAbstractPropertyDefinition, TSAbstractAccessorProperty, TSEnumMember,' +
      'TSPropertySignature, TSIndexSignature, TSMethodSignature,' +
      // Deprecated in @typescript-eslint/parser v5
      'ClassProperty, TSAbstractClassProperty'](node) {
      processSemicolons(node)
    },
    /**
     * @param {ASTNode} node
     */
    '*[type=/^TS/]'(node) {
      if (!isTypeNode(node)) {
        return
      }
      const typeNode = node
      if (/** @type {any} */ (typeNode.parent).type === 'TSParenthesizedType') {
        return
      }
      // Process parentheses.
      let leftToken = tokenStore.getTokenBefore(node)
      let rightToken = tokenStore.getTokenAfter(node)
      let firstToken = tokenStore.getFirstToken(node)

      while (
        leftToken &&
        rightToken &&
        isOpeningParenToken(leftToken) &&
        isClosingParenToken(rightToken)
      ) {
        setOffset(firstToken, 1, leftToken)
        setOffset(rightToken, 0, leftToken)

        firstToken = leftToken
        leftToken = tokenStore.getTokenBefore(leftToken)
        rightToken = tokenStore.getTokenAfter(rightToken)
      }
    },
    /**
     * Process type annotation
     *
     * e.g.
     * ```
     * const foo: Type
     * //       ^^^^^^
     * type foo = () => string
     * //            ^^^^^^^^^
     * ```
     */
    TSTypeAnnotation(node) {
      const [colonOrArrowToken, secondToken] = tokenStore.getFirstTokens(node, {
        count: 2,
        includeComments: false
      })
      const baseToken = tokenStore.getFirstToken(
        /** @type {HasLocation} */ (node.parent)
      )
      setOffset([colonOrArrowToken, secondToken], 1, baseToken)

      // a ?: T
      const before = tokenStore.getTokenBefore(colonOrArrowToken)
      if (before && before.value === '?') {
        setOffset(before, 1, baseToken)
      }
    },
    /**
     * Process as expression or satisfies expression
     *
     * e.g.
     * ```
     * var foo = bar as boolean
     * //        ^^^^^^^^^^^^^^
     * ```
     *
     * e.g.
     * ```
     * var foo = bar satisfies Bar
     * //        ^^^^^^^^^^^^^^^^^
     * ```
     *
     * @param {TSAsExpression | TSSatisfiesExpression} node
     */
    'TSAsExpression, TSSatisfiesExpression'(node) {
      const expressionTokens = getFirstAndLastTokens(node.expression)
      const asOrSatisfiesToken = tokenStore.getTokenAfter(
        expressionTokens.lastToken
      )
      setOffset(
        [
          asOrSatisfiesToken,
          getFirstAndLastTokens(node.typeAnnotation).firstToken
        ],
        1,
        expressionTokens.firstToken
      )
    },
    /**
     * Process type reference and instantiation expression
     *
     * e.g.
     * ```
     * const foo: Type<P>
     * //         ^^^^^^^
     * ```
     *
     * e.g.
     * ```
     * const ErrorMap = Map<string, Error>;
     * //               ^^^^^^^^^^^^^^^^^^
     * ```
     *
     * @param {TSTypeReference | TSInstantiationExpression} node
     */
    'TSTypeReference, TSInstantiationExpression'(node) {
      const typeArguments =
        'typeArguments' in node
          ? node.typeArguments
          : /** @type {any} typescript-eslint v5 */ (node).typeParameters
      if (typeArguments) {
        const firstToken = tokenStore.getFirstToken(node)
        setOffset(tokenStore.getFirstToken(typeArguments), 1, firstToken)
      }
    },
    /**
     * Process type parameter instantiation and type parameter declaration
     *
     * e.g.
     * ```
     * const foo: Type<P>
     * //             ^^^
     * ```
     *
     * e.g.
     * ```
     * type Foo<T>
     * //      ^^^
     * ```
     * @param {TSTypeParameterInstantiation | TSTypeParameterDeclaration} node
     */
    'TSTypeParameterInstantiation, TSTypeParameterDeclaration'(node) {
      // <T>
      processNodeList(
        node.params,
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    /**
     * Process type alias declaration
     *
     * e.g.
     * ```
     * type Foo
     * ```
     */
    TSTypeAliasDeclaration(node) {
      // type T = {}
      const typeToken = tokenStore.getFirstToken(node)
      const idToken = tokenStore.getFirstToken(node.id)
      setOffset(idToken, 1, typeToken)
      let eqToken
      if (node.typeParameters) {
        setOffset(tokenStore.getFirstToken(node.typeParameters), 1, idToken)
        eqToken = tokenStore.getTokenAfter(node.typeParameters)
      } else {
        eqToken = tokenStore.getTokenAfter(node.id)
      }
      const initToken = tokenStore.getTokenAfter(eqToken)
      setOffset([eqToken, initToken], 1, idToken)
    },
    /**
     * Process constructor type or function type
     *
     * e.g.
     * ```
     * type Foo = new () => T
     * //         ^^^^^^^^^^^
     * type Foo = () => void
     * //         ^^^^^^^^^^
     * ```
     * @param {TSConstructorType | TSFunctionType} node
     */
    'TSConstructorType, TSFunctionType'(node) {
      // ()=>void
      const firstToken = tokenStore.getFirstToken(node)
      // new or < or (
      let currToken = firstToken
      if (node.type === 'TSConstructorType') {
        // currToken is new token
        // < or (
        currToken = tokenStore.getTokenAfter(currToken)
        setOffset(currToken, 1, firstToken)
      }
      if (node.typeParameters) {
        // currToken is < token
        // (
        currToken = tokenStore.getTokenAfter(node.typeParameters)
        setOffset(currToken, 1, firstToken)
      }
      const leftParenToken = currToken
      const rightParenToken = /**@type {Token} */ (
        tokenStore.getTokenAfter(
          node.params[node.params.length - 1] || leftParenToken,
          isClosingParenToken
        )
      )
      processNodeList(node.params, leftParenToken, rightParenToken, 1)
      const arrowToken = tokenStore.getTokenAfter(rightParenToken)
      setOffset(arrowToken, 1, leftParenToken)
    },
    /**
     * Process type literal
     *
     * e.g.
     * ```
     * const foo: { bar: string }
     * //         ^^^^^^^^^^^^^^^
     * ```
     */
    TSTypeLiteral(node) {
      processNodeList(
        node.members,
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    /**
     * Process property signature
     *
     * e.g.
     * ```
     * const foo: { bar: string }
     * //           ^^^^^^^^^^^
     * ```
     */
    TSPropertySignature(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(node.key)
      let keyLast
      if (node.computed) {
        const closeBracket = tokenStore.getTokenAfter(keyTokens.lastToken)
        processNodeList([node.key], firstToken, closeBracket, 1)
        keyLast = closeBracket
      } else {
        keyLast = keyTokens.lastToken
      }
      if (node.typeAnnotation) {
        const typeAnnotationToken = tokenStore.getFirstToken(
          node.typeAnnotation
        )
        setOffset(
          [
            ...tokenStore.getTokensBetween(keyLast, typeAnnotationToken),
            typeAnnotationToken
          ],
          1,
          firstToken
        )
      } else if (node.optional) {
        const qToken = tokenStore.getLastToken(node)
        setOffset(qToken, 1, firstToken)
      }
    },
    /**
     * Process index signature
     *
     * e.g.
     * ```
     * const foo: { [bar: string]: string }
     * //           ^^^^^^^^^^^^^^^^^^^^^
     * ```
     */
    TSIndexSignature(node) {
      const leftBracketToken = tokenStore.getFirstToken(node)
      const rightBracketToken = /**@type {Token} */ (
        tokenStore.getTokenAfter(
          node.parameters[node.parameters.length - 1] || leftBracketToken,
          isClosingBracketToken
        )
      )
      processNodeList(node.parameters, leftBracketToken, rightBracketToken, 1)
      const keyLast = rightBracketToken
      if (node.typeAnnotation) {
        const typeAnnotationToken = tokenStore.getFirstToken(
          node.typeAnnotation
        )
        setOffset(
          [
            ...tokenStore.getTokensBetween(keyLast, typeAnnotationToken),
            typeAnnotationToken
          ],
          1,
          leftBracketToken
        )
      }
    },
    /**
     * Process array type
     *
     * e.g.
     * ```
     * const foo: Type[]
     * //         ^^^^^^
     * ```
     */
    TSArrayType(node) {
      const firstToken = tokenStore.getFirstToken(node)
      setOffset(
        tokenStore.getLastTokens(node, { count: 2, includeComments: false }),
        0,
        firstToken
      )
    },
    TSTupleType(node) {
      // [T, U]
      processNodeList(
        node.elementTypes,
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    TSQualifiedName(node) {
      // A.B
      const objectToken = tokenStore.getFirstToken(node)
      const dotToken = tokenStore.getTokenBefore(node.right)
      const propertyToken = tokenStore.getTokenAfter(dotToken)
      setOffset([dotToken, propertyToken], 1, objectToken)
    },
    TSIndexedAccessType(node) {
      // A[B]
      const objectToken = tokenStore.getFirstToken(node)
      const leftBracketToken = tokenStore.getTokenBefore(
        node.indexType,
        isOpeningBracketToken
      )
      const rightBracketToken = tokenStore.getTokenAfter(
        node.indexType,
        isClosingBracketToken
      )
      setOffset(leftBracketToken, 1, objectToken)
      processNodeList([node.indexType], leftBracketToken, rightBracketToken, 1)
    },
    /** @param {TSUnionType | TSIntersectionType} node */
    'TSUnionType, TSIntersectionType'(node) {
      // A | B
      // A & B
      const firstToken = tokenStore.getFirstToken(node)

      const prevToken = tokenStore.getTokenBefore(firstToken)
      const shouldIndent =
        prevToken == null ||
        prevToken.loc.end.line === firstToken.loc.start.line ||
        isBeginningOfElement(firstToken, node)
      const offset = shouldIndent ? 1 : 0

      const typeTokensList = node.types.map(getFirstAndLastTokens)
      const typeTokens = typeTokensList.shift()
      if (!typeTokens) {
        return
      }
      let lastToken
      if (typeTokens.firstToken === firstToken) {
        lastToken = typeTokens.lastToken
      } else {
        typeTokensList.unshift(typeTokens)
        lastToken = firstToken
      }
      for (const typeTokens of typeTokensList) {
        setOffset(
          tokenStore.getTokensBetween(lastToken, typeTokens.firstToken),
          offset,
          firstToken
        )
        setOffset(typeTokens.firstToken, offset, firstToken)
      }
    },
    TSMappedType(node) {
      // {[key in foo]: bar}
      const leftBraceToken = tokenStore.getFirstToken(node)
      const leftBracketToken = tokenStore.getTokenBefore(node.typeParameter)
      const rightBracketToken = tokenStore.getTokenAfter(
        node.nameType || node.typeParameter
      )
      setOffset(
        [
          ...tokenStore.getTokensBetween(leftBraceToken, leftBracketToken),
          leftBracketToken
        ],
        1,
        leftBraceToken
      )
      processNodeList(
        [node.typeParameter, node.nameType],
        leftBracketToken,
        rightBracketToken,
        1
      )
      const rightBraceToken = tokenStore.getLastToken(node)
      if (node.typeAnnotation) {
        const typeAnnotationToken = tokenStore.getFirstToken(
          node.typeAnnotation
        )
        setOffset(
          [
            ...tokenStore.getTokensBetween(
              rightBracketToken,
              typeAnnotationToken
            ),
            typeAnnotationToken
          ],
          1,
          leftBraceToken
        )
      } else {
        setOffset(
          [...tokenStore.getTokensBetween(rightBracketToken, rightBraceToken)],
          1,
          leftBraceToken
        )
      }
      setOffset(rightBraceToken, 0, leftBraceToken)
    },
    /**
     * Process type parameter
     *
     * e.g.
     * ```
     * type Foo<T, U extends T, V = U>
     * //       ^  ^^^^^^^^^^^  ^^^^^
     * type Foo = {[key in foo]: bar}
     * //           ^^^^^^^^^^
     * ```
     */
    TSTypeParameter(node) {
      const [firstToken, ...afterTokens] = tokenStore.getTokens(node)
      for (const child of [node.constraint, node.default]) {
        if (!child) {
          continue
        }
        const [, ...removeTokens] = tokenStore.getTokens(child)
        for (const token of removeTokens) {
          const i = afterTokens.indexOf(token)
          if (i !== -1) {
            afterTokens.splice(i, 1)
          }
        }
      }
      const secondToken = afterTokens.shift()
      if (!secondToken) {
        return
      }
      setOffset(secondToken, 1, firstToken)
      if (secondToken.value === 'extends') {
        let prevToken = null
        let token = afterTokens.shift()
        while (token) {
          if (token.value === '=') {
            break
          }
          setOffset(token, 1, secondToken)
          prevToken = token
          token = afterTokens.shift()
        }
        while (token) {
          setOffset(token, 1, prevToken || secondToken)
          token = afterTokens.shift()
        }
      } else {
        setOffset(afterTokens, 1, firstToken)
      }
    },
    /**
     * Process conditional type
     *
     * e.g.
     * ```
     * type Foo = A extends B ? Bar : Baz
     * //         ^^^^^^^^^^^^^^^^^^^^^^^
     * ```
     */
    TSConditionalType(node) {
      // T extends Foo ? T : U
      const checkTypeToken = tokenStore.getFirstToken(node)
      const extendsToken = tokenStore.getTokenAfter(node.checkType)
      const extendsTypeToken = tokenStore.getFirstToken(node.extendsType)
      setOffset(extendsToken, 1, checkTypeToken)
      setOffset(extendsTypeToken, 1, extendsToken)
      const questionToken = /**@type {Token} */ (
        tokenStore.getTokenAfter(node.extendsType, isNotClosingParenToken)
      )
      const consequentToken = tokenStore.getTokenAfter(questionToken)
      const colonToken = /**@type {Token} */ (
        tokenStore.getTokenAfter(node.trueType, isNotClosingParenToken)
      )
      const alternateToken = tokenStore.getTokenAfter(colonToken)
      let baseNode = node
      let parent = baseNode.parent
      while (
        parent &&
        parent.type === 'TSConditionalType' &&
        parent.falseType === baseNode
      ) {
        baseNode = parent
        parent = baseNode.parent
      }
      const baseToken = tokenStore.getFirstToken(baseNode)
      setOffset([questionToken, colonToken], 1, baseToken)
      setOffset(consequentToken, 1, questionToken)
      setOffset(alternateToken, 1, colonToken)
    },
    /**
     * Process interface declaration
     *
     * e.g.
     * ```
     * interface Foo { }
     * ```
     */
    TSInterfaceDeclaration(node) {
      const interfaceToken = tokenStore.getFirstToken(node)
      setOffset(tokenStore.getFirstToken(node.id), 1, interfaceToken)
      if (node.typeParameters != null) {
        setOffset(
          tokenStore.getFirstToken(node.typeParameters),
          1,
          tokenStore.getFirstToken(node.id)
        )
      }
      if (node.extends != null && node.extends.length > 0) {
        const extendsToken = tokenStore.getTokenBefore(node.extends[0])
        setOffset(extendsToken, 1, interfaceToken)
        processNodeList(node.extends, extendsToken, null, 1)
      }
      // It may not calculate the correct location because the visitor key is not provided.
      // if (node.implements != null && node.implements.length) {
      //   const implementsToken = tokenStore.getTokenBefore(node.implements[0])
      //   setOffset(implementsToken, 1, interfaceToken)
      //   processNodeList(node.implements, implementsToken, null, 1)
      // }
      const bodyToken = tokenStore.getFirstToken(node.body)
      setOffset(bodyToken, 0, interfaceToken)
    },
    /**
     * Process interface body
     *
     * e.g.
     * ```
     * interface Foo { }
     * //            ^^^
     * ```
     *
     * @param {TSInterfaceBody | TSModuleBlock} node
     */
    'TSInterfaceBody, TSModuleBlock'(node) {
      processNodeList(
        node.body,
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    /**
     * Process interface heritage and class implements
     *
     * e.g.
     * ```
     * interface Foo<T> extends Bar<T> { }
     * //                       ^^^^^^
     * class Foo<T> implements Bar<T> { }
     * //                      ^^^^^^
     * ```
     * @param {TSInterfaceHeritage | TSClassImplements} node
     */
    'TSClassImplements, TSInterfaceHeritage'(node) {
      if (node.typeParameters) {
        setOffset(
          tokenStore.getFirstToken(node.typeParameters),
          1,
          tokenStore.getFirstToken(node)
        )
      }
    },
    /**
     * Process enum
     *
     * e.g.
     * ```
     * enum Foo { }
     * ```
     */
    TSEnumDeclaration(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const idTokens = getFirstAndLastTokens(node.id)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        idTokens.firstToken
      )
      setOffset(prefixTokens, 0, firstToken)
      setOffset(idTokens.firstToken, 1, firstToken)
      const leftBraceToken = tokenStore.getTokenAfter(idTokens.lastToken)
      const rightBraceToken = tokenStore.getLastToken(node)
      setOffset(leftBraceToken, 0, firstToken)
      processNodeList(node.members, leftBraceToken, rightBraceToken, 1)
    },
    TSModuleDeclaration(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const idTokens = getFirstAndLastTokens(node.id)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        idTokens.firstToken
      )
      setOffset(prefixTokens, 0, firstToken)
      setOffset(idTokens.firstToken, 1, firstToken)
      if (node.body) {
        const bodyFirstToken = tokenStore.getFirstToken(node.body)
        setOffset(
          bodyFirstToken,
          isOpeningBraceToken(bodyFirstToken) ? 0 : 1,
          firstToken
        )
      }
    },
    TSMethodSignature(node) {
      // fn(arg: A): R | null;
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(node.key)
      let keyLast
      if (node.computed) {
        const closeBracket = tokenStore.getTokenAfter(keyTokens.lastToken)
        processNodeList([node.key], firstToken, closeBracket, 1)
        keyLast = closeBracket
      } else {
        keyLast = keyTokens.lastToken
      }
      const leftParenToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(keyLast, isOpeningParenToken)
      )
      setOffset(
        [
          ...tokenStore.getTokensBetween(keyLast, leftParenToken),
          leftParenToken
        ],
        1,
        firstToken
      )
      const rightParenToken = tokenStore.getTokenAfter(
        node.params[node.params.length - 1] || leftParenToken,
        isClosingParenToken
      )
      processNodeList(node.params, leftParenToken, rightParenToken, 1)
      if (node.returnType) {
        const typeAnnotationToken = tokenStore.getFirstToken(node.returnType)
        setOffset(
          [
            ...tokenStore.getTokensBetween(keyLast, typeAnnotationToken),
            typeAnnotationToken
          ],
          1,
          firstToken
        )
      }
    },
    /**
     * Process call signature declaration and construct signature declaration
     *
     * e.g.
     * ```
     * interface Foo {
     *   (): string;
     * //^^^^^^^^^^^
     *   <T> (e: E): R
     * //^^^^^^^^^^^^^
     * }
     * ```
     *
     * e.g.
     * ```
     * interface Foo {
     *   new ();
     * //^^^^^^^
     * }
     * interface A { new <T> (e: E): R }
     * //            ^^^^^^^^^^^^^^^^^
     * ```
     * @param {TSCallSignatureDeclaration | TSConstructSignatureDeclaration} node
     */
    'TSCallSignatureDeclaration, TSConstructSignatureDeclaration'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      // new or < or (
      let currToken = firstToken
      if (node.type === 'TSConstructSignatureDeclaration') {
        // currToken is new token
        // < or (
        currToken = tokenStore.getTokenAfter(currToken)
        setOffset(currToken, 1, firstToken)
      }
      if (node.typeParameters) {
        // currToken is < token
        // (
        currToken = tokenStore.getTokenAfter(node.typeParameters)
        setOffset(currToken, 1, firstToken)
      }
      const leftParenToken = currToken
      const rightParenToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(
          node.params[node.params.length - 1] || leftParenToken,
          isClosingParenToken
        )
      )
      processNodeList(node.params, leftParenToken, rightParenToken, 1)
      if (node.returnType) {
        const typeAnnotationToken = tokenStore.getFirstToken(node.returnType)
        setOffset(
          [
            ...tokenStore.getTokensBetween(
              rightParenToken,
              typeAnnotationToken
            ),
            typeAnnotationToken
          ],
          1,
          firstToken
        )
      }
    },
    /**
     * Process declare function and empty body function
     *
     * e.g.
     * ```
     * declare function foo();
     * ```
     *
     * e.g.
     * ```
     * class Foo {
     *   abstract fn();
     * //           ^^^
     * }
     * ```
     * @param {TSDeclareFunction | TSEmptyBodyFunctionExpression} node
     */
    'TSDeclareFunction, TSEmptyBodyFunctionExpression'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      let leftParenToken, bodyBaseToken
      if (firstToken.type === 'Punctuator') {
        // method
        leftParenToken = firstToken
        bodyBaseToken = tokenStore.getFirstToken(
          /** @type {HasLocation} */ (node.parent)
        )
      } else {
        let nextToken = tokenStore.getTokenAfter(firstToken)
        let nextTokenOffset = 0
        while (
          nextToken &&
          !isOpeningParenToken(nextToken) &&
          nextToken.value !== '<'
        ) {
          if (
            nextToken.value === '*' ||
            (node.id && nextToken.range[0] === node.id.range[0])
          ) {
            nextTokenOffset = 1
          }
          setOffset(nextToken, nextTokenOffset, firstToken)
          nextToken = tokenStore.getTokenAfter(nextToken)
        }

        leftParenToken = nextToken
        bodyBaseToken = firstToken
      }
      if (!isOpeningParenToken(leftParenToken) && node.typeParameters) {
        leftParenToken = tokenStore.getTokenAfter(node.typeParameters)
      }
      const rightParenToken = tokenStore.getTokenAfter(
        node.params[node.params.length - 1] || leftParenToken,
        isClosingParenToken
      )
      setOffset(leftParenToken, 1, bodyBaseToken)
      processNodeList(node.params, leftParenToken, rightParenToken, 1)
    },
    /**
     * Process type operator, type query and infer type
     *
     * e.g.
     * ```
     * type Foo = keyof Bar
     * //         ^^^^^^^^^
     * ```
     *
     * e.g.
     * ```
     * type T = typeof a
     * //       ^^^^^^^^
     * ```
     *
     * e.g.
     * ```
     * type Foo<T> = T extends Bar<infer U> ? U : T;
     * //                          ^^^^^^^
     * ```
     *
     * @param {TSTypeOperator | TSTypeQuery | TSInferType} node
     */
    'TSTypeOperator, TSTypeQuery, TSInferType'(node) {
      // keyof T
      // type T = typeof av
      // infer U
      const firstToken = tokenStore.getFirstToken(node)
      const nextToken = tokenStore.getTokenAfter(firstToken)
      setOffset(nextToken, 1, firstToken)
    },
    /**
     * Process type predicate
     *
     * e.g.
     * ```
     * function foo(value): value is string;
     * //                   ^^^^^^^^^^^^^^^
     * ```
     */
    TSTypePredicate(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const opToken = tokenStore.getTokenAfter(
        node.parameterName,
        isNotClosingParenToken
      )
      const rightToken =
        node.typeAnnotation &&
        getFirstAndLastTokens(node.typeAnnotation).firstToken
      setOffset(
        [opToken, rightToken],
        1,
        getFirstAndLastTokens(firstToken).firstToken
      )
    },
    /**
     * Process abstract method definition, abstract class property, enum member and class property
     *
     * e.g.
     * ```
     * class Foo {
     *   abstract fn()
     * //^^^^^^^^^^^^^
     *   abstract x
     * //^^^^^^^^^^
     *   x
     * //^
     * }
     * ```
     *
     * e.g.
     * ```
     * enum Foo { Bar = x }
     * //         ^^^^^^^
     * ```
     *
     * @param {TSAbstractMethodDefinition | TSAbstractPropertyDefinition | TSAbstractAccessorProperty | TSEnumMember | TSAbstractClassProperty | ClassProperty} node
     *
     */
    ['TSAbstractMethodDefinition, TSAbstractPropertyDefinition, TSAbstractAccessorProperty, TSEnumMember,' +
      // Deprecated in @typescript-eslint/parser v5
      'ClassProperty, TSAbstractClassProperty'](node) {
      const { keyNode, valueNode } =
        node.type === 'TSEnumMember'
          ? { keyNode: node.id, valueNode: node.initializer }
          : { keyNode: node.key, valueNode: node.value }
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(keyNode)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        keyTokens.firstToken
      )
      if (node.computed) {
        prefixTokens.pop() // pop [
      }
      setOffset(prefixTokens, 0, firstToken)
      let lastKeyToken
      if (node.computed) {
        const leftBracketToken = tokenStore.getTokenBefore(keyTokens.firstToken)
        const rightBracketToken = (lastKeyToken = tokenStore.getTokenAfter(
          keyTokens.lastToken
        ))
        setOffset(leftBracketToken, 0, firstToken)
        processNodeList([keyNode], leftBracketToken, rightBracketToken, 1)
      } else {
        setOffset(keyTokens.firstToken, 0, firstToken)
        lastKeyToken = keyTokens.lastToken
      }

      if (valueNode != null) {
        const initToken = tokenStore.getFirstToken(valueNode)
        setOffset(
          [...tokenStore.getTokensBetween(lastKeyToken, initToken), initToken],
          1,
          lastKeyToken
        )
      }
    },

    /**
     * Process optional type, non-null expression and JSDocNonNullableType
     *
     * e.g.
     * ```
     * type Foo = [number?]
     * //          ^^^^^^^
     * const a = v!
     * //        ^
     * type T = U!
     * //       ^^
     * ```
     *
     * @param {TSOptionalType | TSNonNullExpression} node
     */
    'TSOptionalType, TSNonNullExpression, TSJSDocNonNullableType'(node) {
      setOffset(
        tokenStore.getLastToken(node),
        1,
        tokenStore.getFirstToken(node)
      )
    },
    TSTypeAssertion(node) {
      // <const>
      const firstToken = tokenStore.getFirstToken(node)
      const expressionToken = getFirstAndLastTokens(node.expression).firstToken
      processNodeList(
        [node.typeAnnotation],
        firstToken,
        tokenStore.getTokenBefore(expressionToken),
        1
      )
      setOffset(expressionToken, 1, firstToken)
    },
    /**
     * Process import type
     *
     * e.g.
     * ```
     * const foo: import('foo').Bar<T>
     * //         ^^^^^^^^^^^^^^^^^^^^
     * ```
     */
    TSImportType(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const leftParenToken = tokenStore.getTokenAfter(
        firstToken,
        isOpeningParenToken
      )
      setOffset(leftParenToken, 1, firstToken)
      const argument =
        node.argument ||
        /** @type {any} typescript-eslint v5 */ (node).parameter
      const rightParenToken = tokenStore.getTokenAfter(
        argument,
        isClosingParenToken
      )
      processNodeList([argument], leftParenToken, rightParenToken, 1)
      if (node.qualifier) {
        const dotToken = tokenStore.getTokenBefore(node.qualifier)
        const propertyToken = tokenStore.getTokenAfter(dotToken)
        setOffset([dotToken, propertyToken], 1, firstToken)
      }
      const typeArguments =
        'typeArguments' in node
          ? node.typeArguments
          : /** @type {any} typescript-eslint v5 */ (node).typeParameters
      if (typeArguments) {
        setOffset(tokenStore.getFirstToken(typeArguments), 1, firstToken)
      }
    },
    TSParameterProperty(node) {
      // constructor(private a)
      const firstToken = tokenStore.getFirstToken(node)
      const parameterToken = tokenStore.getFirstToken(node.parameter)
      setOffset(
        [
          ...tokenStore.getTokensBetween(firstToken, parameterToken),
          parameterToken
        ],
        1,
        firstToken
      )
    },
    /**
     * Process import equal
     *
     * e.g.
     * ```
     * import foo = require('foo')
     * ```
     */
    TSImportEqualsDeclaration(node) {
      const importToken = tokenStore.getFirstToken(node)
      const idTokens = getFirstAndLastTokens(node.id)
      setOffset(idTokens.firstToken, 1, importToken)
      const opToken = tokenStore.getTokenAfter(idTokens.lastToken)
      setOffset(
        [opToken, tokenStore.getFirstToken(node.moduleReference)],
        1,
        idTokens.lastToken
      )
    },
    /**
     * Process external module reference
     *
     * e.g.
     * ```
     * import foo = require('foo')
     * //           ^^^^^^^^^^^^^^
     * ```
     */
    TSExternalModuleReference(node) {
      const requireToken = tokenStore.getFirstToken(node)
      const leftParenToken = tokenStore.getTokenAfter(
        requireToken,
        isOpeningParenToken
      )
      const rightParenToken = tokenStore.getLastToken(node)
      setOffset(leftParenToken, 1, requireToken)
      processNodeList([node.expression], leftParenToken, rightParenToken, 1)
    },
    /**
     * Process export assignment
     *
     * e.g.
     * ```
     * export = foo
     * ```
     */
    TSExportAssignment(node) {
      const exportNode = tokenStore.getFirstToken(node)
      const exprTokens = getFirstAndLastTokens(node.expression)
      const opToken = tokenStore.getTokenBefore(exprTokens.firstToken)
      setOffset([opToken, exprTokens.firstToken], 1, exportNode)
    },
    TSNamedTupleMember(node) {
      // [a: string, ...b: string[]]
      //  ^^^^^^^^^
      const labelToken = tokenStore.getFirstToken(node)
      const elementTokens = getFirstAndLastTokens(node.elementType)
      setOffset(
        [
          ...tokenStore.getTokensBetween(labelToken, elementTokens.firstToken),
          elementTokens.firstToken
        ],
        1,
        labelToken
      )
    },
    TSRestType(node) {
      // [a: string, ...b: string[]]
      //             ^^^^^^^^^^^^^^
      const firstToken = tokenStore.getFirstToken(node)
      const nextToken = tokenStore.getTokenAfter(firstToken)
      setOffset(nextToken, 1, firstToken)
    },
    TSNamespaceExportDeclaration(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const idToken = tokenStore.getFirstToken(node.id)
      setOffset(
        [...tokenStore.getTokensBetween(firstToken, idToken), idToken],
        1,
        firstToken
      )
    },
    TSTemplateLiteralType(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const quasiTokens = node.quasis
        .slice(1)
        .map((n) => tokenStore.getFirstToken(n))
      const expressionToken = node.quasis
        .slice(0, -1)
        .map((n) => tokenStore.getTokenAfter(n))
      setOffset(quasiTokens, 0, firstToken)
      setOffset(expressionToken, 1, firstToken)
    },
    // ----------------------------------------------------------------------
    // NON-STANDARD NODES
    // ----------------------------------------------------------------------
    Decorator(node) {
      // @Decorator
      const [atToken, secondToken] = tokenStore.getFirstTokens(node, {
        count: 2,
        includeComments: false
      })
      setOffset(secondToken, 0, atToken)
      const parent = /** @type {any} */ (node.parent)
      const { decorators, range } = parent
      if (!decorators || decorators.length === 0) {
        return
      }
      if (decorators[0] === node) {
        if (range[0] === node.range[0]) {
          const startParentToken = tokenStore.getTokenAfter(
            decorators[decorators.length - 1]
          )
          setOffset(startParentToken, 0, atToken)
        } else {
          const startParentToken = tokenStore.getFirstToken(
            parent.parent &&
              (parent.parent.type === 'ExportDefaultDeclaration' ||
                parent.parent.type === 'ExportNamedDeclaration') &&
              node.range[0] < parent.parent.range[0]
              ? parent.parent
              : parent
          )
          copyOffset(atToken, startParentToken)
        }
      } else {
        setOffset(atToken, 0, tokenStore.getFirstToken(decorators[0]))
      }
    },
    AccessorProperty(node) {
      const keyNode = node.key
      const valueNode = node.value
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(keyNode)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        keyTokens.firstToken
      )
      if (node.computed) {
        prefixTokens.pop() // pop opening bracket character (`[`)
      }
      setOffset(prefixTokens, 0, firstToken)
      let lastKeyToken
      if (node.computed) {
        const leftBracketToken = tokenStore.getTokenBefore(keyTokens.firstToken)
        const rightBracketToken = (lastKeyToken = tokenStore.getTokenAfter(
          keyTokens.lastToken
        ))
        setOffset(leftBracketToken, 0, firstToken)
        processNodeList([keyNode], leftBracketToken, rightBracketToken, 1)
      } else {
        setOffset(keyTokens.firstToken, 0, firstToken)
        lastKeyToken = keyTokens.lastToken
      }

      if (valueNode != null) {
        const initToken = tokenStore.getFirstToken(valueNode)
        setOffset(
          [...tokenStore.getTokensBetween(lastKeyToken, initToken), initToken],
          1,
          lastKeyToken
        )
      }
      processSemicolons(node)
    },
    ImportAttribute(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(node.key)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        keyTokens.firstToken
      )
      setOffset(prefixTokens, 0, firstToken)

      setOffset(keyTokens.firstToken, 0, firstToken)

      const initToken = tokenStore.getFirstToken(node.value)
      setOffset(
        [
          ...tokenStore.getTokensBetween(keyTokens.lastToken, initToken),
          initToken
        ],
        1,
        keyTokens.lastToken
      )
    },

    // ----------------------------------------------------------------------
    // DEPRECATED  NODES
    // ----------------------------------------------------------------------
    /** @param {any} node */
    TSParenthesizedType(node) {
      // Deprecated in @typescript-eslint/parser v5
      // (T)
      processNodeList(
        [node.typeAnnotation],
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    // ----------------------------------------------------------------------
    // SINGLE TOKEN NODES
    // ----------------------------------------------------------------------
    TSPrivateIdentifier() {
      // Perhaps this node will be deprecated in the future.
      // It was present in @typescript-eslint/parser@4.1.0.
    },
    // VALUES KEYWORD
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
    // MODIFIERS KEYWORD
    TSAbstractKeyword() {},
    TSAsyncKeyword() {},
    TSPrivateKeyword() {},
    TSProtectedKeyword() {},
    TSPublicKeyword() {},
    TSReadonlyKeyword() {},
    TSStaticKeyword() {},
    // OTHERS KEYWORD
    TSDeclareKeyword() {},
    TSExportKeyword() {},
    TSIntrinsicKeyword() {},
    // OTHERS
    TSThisType() {},
    // ----------------------------------------------------------------------
    // WRAPPER NODES
    // ----------------------------------------------------------------------
    TSLiteralType() {}
  }
}
