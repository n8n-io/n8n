/**
 * @author Flo Edelmann
 * See LICENSE file in root directory for full license.
 */
'use strict'

const {
  defineTemplateBodyVisitor,
  isStringLiteral,
  getStringLiteralValue
} = require('../utils')

/**
 * @param {Expression | VForExpression | VOnExpression | VSlotScopeExpression | VFilterSequenceExpression} expressionNode
 * @returns {(Literal | TemplateLiteral | Identifier)[]}
 */
function findStaticClasses(expressionNode) {
  if (isStringLiteral(expressionNode)) {
    return [expressionNode]
  }

  if (expressionNode.type === 'ArrayExpression') {
    return expressionNode.elements.flatMap((element) => {
      if (element === null || element.type === 'SpreadElement') {
        return []
      }
      return findStaticClasses(element)
    })
  }

  if (expressionNode.type === 'ObjectExpression') {
    return expressionNode.properties.flatMap((property) => {
      if (
        property.type === 'Property' &&
        property.value.type === 'Literal' &&
        property.value.value === true &&
        (isStringLiteral(property.key) ||
          (property.key.type === 'Identifier' && !property.computed))
      ) {
        return [property.key]
      }
      return []
    })
  }

  return []
}

/**
 * @param {VAttribute | VDirective} attributeNode
 * @returns {attributeNode is VAttribute & { value: VLiteral }}
 */
function isStaticClassAttribute(attributeNode) {
  return (
    !attributeNode.directive &&
    attributeNode.key.name === 'class' &&
    attributeNode.value !== null
  )
}

/**
 * Removes the node together with the comma before or after the node.
 * @param {RuleFixer} fixer
 * @param {ParserServices.TokenStore} tokenStore
 * @param {ASTNode} node
 */
function* removeNodeWithComma(fixer, tokenStore, node) {
  const prevToken = tokenStore.getTokenBefore(node)
  if (prevToken.type === 'Punctuator' && prevToken.value === ',') {
    yield fixer.removeRange([prevToken.range[0], node.range[1]])
    return
  }

  const [nextToken, nextNextToken] = tokenStore.getTokensAfter(node, {
    count: 2
  })
  if (
    nextToken.type === 'Punctuator' &&
    nextToken.value === ',' &&
    (nextNextToken.type !== 'Punctuator' ||
      (nextNextToken.value !== ']' && nextNextToken.value !== '}'))
  ) {
    yield fixer.removeRange([node.range[0], nextNextToken.range[0]])
    return
  }

  yield fixer.remove(node)
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require static class names in template to be in a separate `class` attribute',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/prefer-separate-static-class.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferSeparateStaticClass:
        'Static class "{{className}}" should be in a static `class` attribute.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return defineTemplateBodyVisitor(context, {
      /** @param {VDirectiveKey} directiveKeyNode */
      "VAttribute[directive=true] > VDirectiveKey[name.name='bind'][argument.name='class']"(
        directiveKeyNode
      ) {
        const attributeNode = directiveKeyNode.parent
        if (!attributeNode.value || !attributeNode.value.expression) {
          return
        }

        const expressionNode = attributeNode.value.expression
        const staticClassNameNodes = findStaticClasses(expressionNode)

        for (const staticClassNameNode of staticClassNameNodes) {
          const className =
            staticClassNameNode.type === 'Identifier'
              ? staticClassNameNode.name
              : getStringLiteralValue(staticClassNameNode, true)

          if (className === null) {
            continue
          }

          context.report({
            node: staticClassNameNode,
            messageId: 'preferSeparateStaticClass',
            data: { className },
            *fix(fixer) {
              let dynamicClassDirectiveRemoved = false

              yield* removeFromClassDirective()
              yield* addToClassAttribute()

              /**
               * Remove class from dynamic `:class` directive.
               */
              function* removeFromClassDirective() {
                if (isStringLiteral(expressionNode)) {
                  yield fixer.remove(attributeNode)
                  dynamicClassDirectiveRemoved = true
                  return
                }

                const listElement =
                  staticClassNameNode.parent.type === 'Property'
                    ? staticClassNameNode.parent
                    : staticClassNameNode

                const listNode = listElement.parent
                if (
                  listNode.type === 'ArrayExpression' ||
                  listNode.type === 'ObjectExpression'
                ) {
                  const elements =
                    listNode.type === 'ObjectExpression'
                      ? listNode.properties
                      : listNode.elements

                  if (elements.length === 1 && listNode === expressionNode) {
                    yield fixer.remove(attributeNode)
                    dynamicClassDirectiveRemoved = true
                    return
                  }

                  const sourceCode = context.getSourceCode()
                  const tokenStore =
                    sourceCode.parserServices.getTemplateBodyTokenStore()

                  if (elements.length === 1) {
                    yield* removeNodeWithComma(fixer, tokenStore, listNode)
                    return
                  }

                  yield* removeNodeWithComma(fixer, tokenStore, listElement)
                }
              }

              /**
               * Add class to static `class` attribute.
               */
              function* addToClassAttribute() {
                const existingStaticClassAttribute =
                  attributeNode.parent.attributes.find(isStaticClassAttribute)
                if (existingStaticClassAttribute) {
                  const literalNode = existingStaticClassAttribute.value
                  yield fixer.replaceText(
                    literalNode,
                    `"${literalNode.value} ${className}"`
                  )
                  return
                }

                // new static `class` attribute
                const separator = dynamicClassDirectiveRemoved ? '' : ' '
                yield fixer.insertTextBefore(
                  attributeNode,
                  `class="${className}"${separator}`
                )
              }
            }
          })
        }
      }
    })
  }
}
