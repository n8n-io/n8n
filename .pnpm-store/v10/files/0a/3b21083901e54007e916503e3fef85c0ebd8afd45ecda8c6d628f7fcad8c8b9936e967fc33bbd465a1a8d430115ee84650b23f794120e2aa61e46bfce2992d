/**
 * @author @neferqiqi
 * See LICENSE file in root directory for full license.
 */
'use strict'
const utils = require('../utils')
/**
 * @typedef {import('../utils').ComponentTypeProp} ComponentTypeProp
 * @typedef {import('../utils').ComponentArrayProp} ComponentArrayProp
 * @typedef {import('../utils').ComponentObjectProp} ComponentObjectProp
 * @typedef {import('../utils').ComponentUnknownProp} ComponentUnknownProp
 * @typedef {import('../utils').ComponentProp} ComponentProp
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce props with default values to be optional',
      categories: ['vue2-recommended', 'vue3-recommended'],
      url: 'https://eslint.vuejs.org/rules/no-required-prop-with-default.html'
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          autofix: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      requireOptional: `Prop "{{ key }}" should be optional.`,
      fixRequiredProp: `Change this prop to be optional.`
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    let canAutoFix = false
    const option = context.options[0]
    if (option) {
      canAutoFix = option.autofix
    }

    /**
     * @param {ComponentProp} prop
     * @param {Set<string>} [defaultProps]
     **/
    const handleObjectProp = (prop, defaultProps) => {
      if (
        prop.type === 'object' &&
        prop.propName &&
        prop.value.type === 'ObjectExpression' &&
        (utils.findProperty(prop.value, 'default') ||
          defaultProps?.has(prop.propName))
      ) {
        const requiredProperty = utils.findProperty(prop.value, 'required')
        if (!requiredProperty) return
        const requiredNode = requiredProperty.value
        if (
          requiredNode &&
          requiredNode.type === 'Literal' &&
          !!requiredNode.value
        ) {
          context.report({
            node: prop.node,
            loc: prop.node.loc,
            data: {
              key: prop.propName
            },
            messageId: 'requireOptional',
            fix: canAutoFix
              ? (fixer) => fixer.replaceText(requiredNode, 'false')
              : null,
            suggest: canAutoFix
              ? null
              : [
                  {
                    messageId: 'fixRequiredProp',
                    fix: (fixer) => fixer.replaceText(requiredNode, 'false')
                  }
                ]
          })
        }
      } else if (
        prop.type === 'type' &&
        defaultProps?.has(prop.propName) &&
        prop.required
      ) {
        // skip setter & getter case
        if (
          prop.node.type === 'TSMethodSignature' &&
          (prop.node.kind === 'get' || prop.node.kind === 'set')
        ) {
          return
        }
        // skip computed
        if (prop.node.computed) {
          return
        }
        context.report({
          node: prop.node,
          loc: prop.node.loc,
          data: {
            key: prop.propName
          },
          messageId: 'requireOptional',
          fix: canAutoFix
            ? (fixer) => fixer.insertTextAfter(prop.key, '?')
            : null,
          suggest: canAutoFix
            ? null
            : [
                {
                  messageId: 'fixRequiredProp',
                  fix: (fixer) => fixer.insertTextAfter(prop.key, '?')
                }
              ]
        })
      }
    }

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onVueObjectEnter(node) {
          utils
            .getComponentPropsFromOptions(node)
            .map((prop) => handleObjectProp(prop))
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          const defaultProps = new Set([
            ...Object.keys(utils.getWithDefaultsPropExpressions(node)),
            ...Object.keys(
              utils.getDefaultPropExpressionsForPropsDestructure(node)
            )
          ])
          props.map((prop) => handleObjectProp(prop, defaultProps))
        }
      })
    )
  }
}
