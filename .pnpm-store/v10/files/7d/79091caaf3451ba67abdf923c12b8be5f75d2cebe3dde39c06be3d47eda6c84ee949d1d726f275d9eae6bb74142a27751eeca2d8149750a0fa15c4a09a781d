/**
 * @fileoverview Prevents boolean defaults from being set
 * @author Hiroki Osame
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {import('../utils').ComponentProp} ComponentProp
 * @typedef {import('../utils').ComponentObjectProp} ComponentObjectProp
 */

/**
 * @param {Expression|undefined} node
 */
function isBooleanIdentifier(node) {
  return Boolean(node && node.type === 'Identifier' && node.name === 'Boolean')
}

/**
 * Detects whether given prop node is a Boolean
 * @param {ComponentObjectProp} prop
 * @return {Boolean}
 */
function isBooleanProp(prop) {
  const value = utils.skipTSAsExpression(prop.value)
  return (
    isBooleanIdentifier(value) ||
    (value.type === 'ObjectExpression' &&
      isBooleanIdentifier(utils.findProperty(value, 'type')?.value))
  )
}

/**
 * @param {ObjectExpression} propDefValue
 */
function getDefaultNode(propDefValue) {
  return utils.findProperty(propDefValue, 'default')
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow boolean defaults',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-boolean-default.html'
    },
    fixable: null,
    schema: [
      {
        enum: ['default-false', 'no-default']
      }
    ],
    messages: {
      noBooleanDefault:
        'Boolean prop should not set a default (Vue defaults it to false).',
      defaultFalse: 'Boolean prop should only be defaulted to false.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const booleanType = context.options[0] || 'no-default'
    /**
     * @param {ComponentProp} prop
     * @param {(propName: string) => Expression[]} otherDefaultProvider
     */
    function processProp(prop, otherDefaultProvider) {
      if (prop.type === 'object') {
        if (!isBooleanProp(prop)) {
          return
        }
        if (prop.value.type === 'ObjectExpression') {
          const defaultNode = getDefaultNode(prop.value)
          if (defaultNode) {
            verifyDefaultExpression(defaultNode.value)
          }
        }
        if (prop.propName != null) {
          for (const defaultNode of otherDefaultProvider(prop.propName)) {
            verifyDefaultExpression(defaultNode)
          }
        }
      } else if (prop.type === 'type') {
        if (prop.types.length !== 1 || prop.types[0] !== 'Boolean') {
          return
        }
        for (const defaultNode of otherDefaultProvider(prop.propName)) {
          verifyDefaultExpression(defaultNode)
        }
      }
    }
    /**
     * @param {ComponentProp[]} props
     * @param {(propName: string) => Expression[]} otherDefaultProvider
     */
    function processProps(props, otherDefaultProvider) {
      for (const prop of props) {
        processProp(prop, otherDefaultProvider)
      }
    }

    /**
     * @param {Expression} defaultNode
     */
    function verifyDefaultExpression(defaultNode) {
      switch (booleanType) {
        case 'no-default': {
          context.report({
            node: defaultNode,
            messageId: 'noBooleanDefault'
          })
          break
        }

        case 'default-false': {
          if (defaultNode.type !== 'Literal' || defaultNode.value !== false) {
            context.report({
              node: defaultNode,
              messageId: 'defaultFalse'
            })
          }
          break
        }
      }
    }
    return utils.compositingVisitors(
      utils.executeOnVueComponent(context, (obj) => {
        processProps(utils.getComponentPropsFromOptions(obj), () => [])
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          const defaultsByWithDefaults =
            utils.getWithDefaultsPropExpressions(node)
          const defaultsByAssignmentPatterns =
            utils.getDefaultPropExpressionsForPropsDestructure(node)
          processProps(props, (propName) =>
            [
              defaultsByWithDefaults[propName],
              defaultsByAssignmentPatterns[propName]?.expression
            ].filter(utils.isDef)
          )
        }
      })
    )
  }
}
