/**
 * @fileoverview Prop definitions should be detailed
 * @author Armano
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {import('../utils').ComponentProp} ComponentProp
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require type definitions in props',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/require-prop-types.html'
    },
    fixable: null,
    schema: [],
    messages: {
      requireType: 'Prop "{{name}}" should define at least its type.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {Expression} node
     * @returns {boolean|null}
     */
    function optionHasType(node) {
      switch (node.type) {
        case 'ObjectExpression': {
          // foo: {
          return objectHasType(node)
        }
        case 'ArrayExpression': {
          // foo: [
          return node.elements.length > 0
        }
        case 'FunctionExpression':
        case 'ArrowFunctionExpression': {
          return false
        }
      }

      // Unknown
      return null
    }
    /**
     * @param {ObjectExpression} node
     * @returns {boolean}
     */
    function objectHasType(node) {
      const typeProperty = node.properties.find(
        (p) =>
          p.type === 'Property' &&
          utils.getStaticPropertyName(p) === 'type' &&
          (p.value.type !== 'ArrayExpression' || p.value.elements.length > 0)
      )
      const validatorProperty = node.properties.find(
        (p) =>
          p.type === 'Property' &&
          utils.getStaticPropertyName(p) === 'validator'
      )
      return Boolean(typeProperty || validatorProperty)
    }
    /**
     * @param {ComponentProp} prop
     */
    function checkProperty(prop) {
      if (prop.type !== 'object' && prop.type !== 'array') {
        return
      }
      const hasType =
        prop.type === 'array' ? false : (optionHasType(prop.value) ?? true)

      if (!hasType) {
        const { node, propName } = prop
        const name =
          propName ||
          (node.type === 'Identifier' && node.name) ||
          'Unknown prop'
        context.report({
          node,
          messageId: 'requireType',
          data: {
            name
          }
        })
      }
    }

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_node, props) {
          for (const prop of props) {
            checkProperty(prop)
          }
        },
        onDefineModelEnter(node, model) {
          if (model.typeNode) return
          if (model.options && (optionHasType(model.options) ?? true)) {
            return
          }
          context.report({
            node: model.options || node,
            messageId: 'requireType',
            data: {
              name: model.name.modelName
            }
          })
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
