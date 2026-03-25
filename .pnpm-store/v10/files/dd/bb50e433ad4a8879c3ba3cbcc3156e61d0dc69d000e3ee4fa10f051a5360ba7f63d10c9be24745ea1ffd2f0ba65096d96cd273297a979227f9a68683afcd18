/**
 * @author kevsommer Kevin Sommer
 * See LICENSE file in root directory for full license.
 */
'use strict'
const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce maximum number of props in Vue component',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/max-props.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxProps: {
            type: 'integer',
            minimum: 1
          }
        },
        additionalProperties: false,
        minProperties: 1
      }
    ],
    messages: {
      tooManyProps:
        'Component has too many props ({{propCount}}). Maximum allowed is {{limit}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {Record<string, number>} */
    const option = context.options[0] || {}

    /**
     * @param {import('../utils').ComponentProp[]} props
     * @param {CallExpression | Property} node
     */
    function checkMaxNumberOfProps(props, node) {
      const uniqueProps = new Set(props.map((prop) => prop.propName))
      const propCount = uniqueProps.size
      if (propCount > option.maxProps && props[0].node) {
        context.report({
          node,
          messageId: 'tooManyProps',
          data: {
            propCount,
            limit: option.maxProps
          }
        })
      }
    }

    return utils.compositingVisitors(
      utils.executeOnVue(context, (node) => {
        const propsNode = node.properties.find(
          /** @returns {p is Property} */
          (p) =>
            p.type === 'Property' && utils.getStaticPropertyName(p) === 'props'
        )

        if (!propsNode) return

        checkMaxNumberOfProps(
          utils.getComponentPropsFromOptions(node),
          propsNode
        )
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          checkMaxNumberOfProps(props, node)
        }
      })
    )
  }
}
