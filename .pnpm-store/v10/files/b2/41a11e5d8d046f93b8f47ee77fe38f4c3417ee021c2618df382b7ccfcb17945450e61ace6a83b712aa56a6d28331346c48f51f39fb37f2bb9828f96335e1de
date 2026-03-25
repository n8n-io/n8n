/**
 * @fileoverview Report used components
 * @author Michał Sajnóg
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow registering components that are not used inside templates',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-unused-components.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          ignoreWhenBindingPresent: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unused: 'The "{{name}}" component has been registered but not used.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const ignoreWhenBindingPresent =
      options.ignoreWhenBindingPresent === undefined
        ? true
        : options.ignoreWhenBindingPresent
    const usedComponents = new Set()
    /** @type { { node: Property, name: string }[] } */
    let registeredComponents = []
    let ignoreReporting = false
    /** @type {Position} */
    let templateLocation

    return utils.defineTemplateBodyVisitor(
      context,
      {
        /** @param {VElement} node */
        VElement(node) {
          if (
            (!utils.isHtmlElementNode(node) &&
              !utils.isSvgElementNode(node) &&
              !utils.isMathElementNode(node)) ||
            utils.isHtmlWellKnownElementName(node.rawName) ||
            utils.isSvgWellKnownElementName(node.rawName) ||
            utils.isMathWellKnownElementName(node.rawName)
          ) {
            return
          }

          usedComponents.add(node.rawName)
        },
        /** @param {VDirective} node */
        "VAttribute[directive=true][key.name.name='bind'][key.argument.name='is'], VAttribute[directive=true][key.name.name='is']"(
          node
        ) {
          if (
            !node.value || // `<component :is>`
            node.value.type !== 'VExpressionContainer' ||
            !node.value.expression // `<component :is="">`
          )
            return

          if (node.value.expression.type === 'Literal') {
            usedComponents.add(node.value.expression.value)
          } else if (ignoreWhenBindingPresent) {
            ignoreReporting = true
          }
        },
        /** @param {VAttribute} node */
        "VAttribute[directive=false][key.name='is']"(node) {
          if (!node.value) {
            return
          }
          const value = node.value.value.startsWith('vue:') // Usage on native elements 3.1+
            ? node.value.value.slice(4)
            : node.value.value
          usedComponents.add(value)
        },
        /** @param {VElement} node */
        "VElement[name='template']"(node) {
          templateLocation = templateLocation || node.loc.start
        },
        /** @param {VElement} node */
        "VElement[name='template']:exit"(node) {
          if (
            node.loc.start !== templateLocation ||
            ignoreReporting ||
            utils.hasAttribute(node, 'src')
          )
            return

          for (const { node, name } of registeredComponents) {
            // If the component name is PascalCase or camelCase
            // it can be used in various of ways inside template,
            // like "theComponent", "The-component" etc.
            // but except snake_case
            if (casing.isPascalCase(name) || casing.isCamelCase(name)) {
              if (
                [...usedComponents].some(
                  (n) =>
                    !n.includes('_') &&
                    (name === casing.pascalCase(n) ||
                      name === casing.camelCase(n))
                )
              ) {
                continue
              }
            } else {
              // In any other case the used component name must exactly match
              // the registered name
              if (usedComponents.has(name)) {
                continue
              }
            }

            context.report({
              node,
              messageId: 'unused',
              data: {
                name
              }
            })
          }
        }
      },
      utils.executeOnVue(context, (obj) => {
        registeredComponents = utils.getRegisteredComponents(obj)
      })
    )
  }
}
