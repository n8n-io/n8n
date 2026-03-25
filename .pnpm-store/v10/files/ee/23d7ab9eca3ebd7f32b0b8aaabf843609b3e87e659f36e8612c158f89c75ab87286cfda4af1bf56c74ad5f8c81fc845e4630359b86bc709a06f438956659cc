/**
 * @author Przemysław Jan Beigert
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @param {RuleContext} context
 * @param {Identifier} identifierNode
 */
const checkPropIdentifierType = (context, identifierNode) => {
  if (identifierNode.name === 'Object' || identifierNode.name === 'Array') {
    const arrayTypeSuggestion = identifierNode.name === 'Array' ? '[]' : ''
    context.report({
      node: identifierNode,
      messageId: 'expectedTypeAnnotation',
      suggest: [
        {
          messageId: 'addTypeAnnotation',
          data: { type: `any${arrayTypeSuggestion}` },
          fix(fixer) {
            return fixer.insertTextAfter(
              identifierNode,
              ` as PropType<any${arrayTypeSuggestion}>`
            )
          }
        },
        {
          messageId: 'addTypeAnnotation',
          data: { type: `unknown${arrayTypeSuggestion}` },
          fix(fixer) {
            return fixer.insertTextAfter(
              identifierNode,
              ` as PropType<unknown${arrayTypeSuggestion}>`
            )
          }
        }
      ]
    })
  }
}

/**
 * @param {RuleContext} context
 * @param {ArrayExpression} arrayNode
 */
const checkPropArrayType = (context, arrayNode) => {
  for (const elementNode of arrayNode.elements) {
    if (elementNode?.type === 'Identifier') {
      checkPropIdentifierType(context, elementNode)
    }
  }
}

/**
 * @param {RuleContext} context
 * @param {ObjectExpression} objectNode
 */
const checkPropObjectType = (context, objectNode) => {
  const typeProperty = objectNode.properties.find(
    (prop) =>
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'type'
  )
  if (!typeProperty || typeProperty.type !== 'Property') {
    return
  }

  if (typeProperty.value.type === 'Identifier') {
    // `foo: { type: String }`
    checkPropIdentifierType(context, typeProperty.value)
  } else if (typeProperty.value.type === 'ArrayExpression') {
    // `foo: { type: [String, Boolean] }`
    checkPropArrayType(context, typeProperty.value)
  }
}

/**
 * @param {import('../utils').ComponentProp} prop
 * @param {RuleContext} context
 */
const checkProp = (prop, context) => {
  if (prop.type !== 'object') {
    return
  }

  switch (prop.node.value.type) {
    case 'Identifier': {
      // e.g. `foo: String`
      checkPropIdentifierType(context, prop.node.value)
      break
    }
    case 'ArrayExpression': {
      // e.g. `foo: [String, Boolean]`
      checkPropArrayType(context, prop.node.value)
      break
    }
    case 'ObjectExpression': {
      // e.g. `foo: { type: … }`
      checkPropObjectType(context, prop.node.value)
      return
    }
  }
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce adding type declarations to object props',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-typed-object-prop.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [],
    messages: {
      expectedTypeAnnotation: 'Expected type annotation on object prop.',
      addTypeAnnotation: 'Add `{{ type }}` type annotation.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const filename = context.getFilename()
    if (!utils.isVueFile(filename) && !utils.isTypeScriptFile(filename)) {
      return {}
    }

    if (utils.isVueFile(filename)) {
      const sourceCode = context.getSourceCode()
      const documentFragment =
        sourceCode.parserServices.getDocumentFragment &&
        sourceCode.parserServices.getDocumentFragment()
      if (!documentFragment) {
        return {}
      }
      const scripts = documentFragment.children.filter(
        /** @returns {element is VElement} */
        (element) => utils.isVElement(element) && element.name === 'script'
      )
      if (
        scripts.every((script) => !utils.hasAttribute(script, 'lang', 'ts'))
      ) {
        return {}
      }
    }

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_node, props) {
          for (const prop of props) {
            checkProp(prop, context)
          }
        }
      }),
      utils.executeOnVue(context, (obj) => {
        const props = utils.getComponentPropsFromOptions(obj)

        for (const prop of props) {
          checkProp(prop, context)
        }
      })
    )
  }
}
