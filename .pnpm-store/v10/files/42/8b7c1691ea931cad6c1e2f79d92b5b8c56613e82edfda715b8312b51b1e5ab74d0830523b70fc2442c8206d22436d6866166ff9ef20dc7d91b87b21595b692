/**
 * @author Pig Fang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @param {ArrayExpression} node
 * @param {RuleContext} context
 */
function checkArrayExpression(node, context) {
  const booleanType = node.elements.find(
    (element) =>
      element && element.type === 'Identifier' && element.name === 'Boolean'
  )
  if (!booleanType) {
    return
  }
  const booleanTypeIndex = node.elements.indexOf(booleanType)
  if (booleanTypeIndex > 0) {
    context.report({
      node: booleanType,
      messageId: 'shouldBeFirst',
      suggest: [
        {
          messageId: 'moveToFirst',
          fix: (fixer) => {
            const sourceCode = context.getSourceCode()

            const elements = [...node.elements]
            elements.splice(booleanTypeIndex, 1)
            const code = elements
              .filter(utils.isDef)
              .map((element) => sourceCode.getText(element))
            code.unshift('Boolean')

            return fixer.replaceText(node, `[${code.join(', ')}]`)
          }
        }
      ]
    })
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce `Boolean` comes first in component prop types',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/prefer-prop-type-boolean-first.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [],
    messages: {
      shouldBeFirst: 'Type `Boolean` should be at first in prop types.',
      moveToFirst: 'Move `Boolean` to be first in prop types.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {import('../utils').ComponentProp} prop
     */
    function checkProperty(prop) {
      if (prop.type !== 'object') {
        return
      }
      const { value } = prop
      if (!value) {
        return
      }

      if (value.type === 'ArrayExpression') {
        checkArrayExpression(value, context)
      } else if (value.type === 'ObjectExpression') {
        const type = value.properties.find(
          /** @return {property is Property} */
          (property) =>
            property.type === 'Property' &&
            utils.getStaticPropertyName(property) === 'type'
        )
        if (!type || type.value.type !== 'ArrayExpression') {
          return
        }
        checkArrayExpression(type.value, context)
      }
    }

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_, props) {
          for (const prop of props) {
            checkProperty(prop)
          }
        }
      }),
      utils.executeOnVue(context, (obj) => {
        const props = utils.getComponentPropsFromOptions(obj)
        for (const prop of props) {
          checkProperty(prop)
        }
      })
    )
  }
}
