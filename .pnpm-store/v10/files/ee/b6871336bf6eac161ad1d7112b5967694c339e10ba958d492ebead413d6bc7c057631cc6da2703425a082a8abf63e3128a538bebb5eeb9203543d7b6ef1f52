/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

// https://github.com/vuejs/vue-next/blob/64e2f4643602c5980361e66674141e61ba60ef70/packages/compiler-core/src/parse.ts#L405
const SPECIAL_TEMPLATE_DIRECTIVES = new Set([
  'if',
  'else',
  'else-if',
  'for',
  'slot'
])

/**
 * @param {VAttribute | VDirective} attr
 */
function getKeyName(attr) {
  if (attr.directive) {
    if (attr.key.name.name !== 'bind') {
      // no v-bind
      return null
    }
    if (
      !attr.key.argument ||
      attr.key.argument.type === 'VExpressionContainer'
    ) {
      // unknown
      return null
    }
    return attr.key.argument.name
  }
  return attr.key.name
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow unnecessary `<template>`',
      categories: ['vue3-recommended', 'vue2-recommended'],
      url: 'https://eslint.vuejs.org/rules/no-lone-template.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          ignoreAccessible: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      requireDirective: '`<template>` require directive.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const ignoreAccessible = options.ignoreAccessible === true

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VStartTag} node */
      "VElement[name='template'][parent.type='VElement'] > VStartTag"(node) {
        if (
          node.attributes.some((attr) => {
            if (attr.directive) {
              const directiveName = attr.key.name.name
              if (SPECIAL_TEMPLATE_DIRECTIVES.has(directiveName)) {
                return true
              }
              if (directiveName === 'slot-scope') {
                // `slot-scope` is deprecated in Vue.js 2.6
                return true
              }
              if (directiveName === 'scope') {
                // `scope` is deprecated in Vue.js 2.5
                return true
              }
            }

            const keyName = getKeyName(attr)
            if (keyName === 'slot') {
              // `slot` is deprecated in Vue.js 2.6
              return true
            }

            return false
          })
        ) {
          return
        }

        if (
          ignoreAccessible &&
          node.attributes.some((attr) => {
            const keyName = getKeyName(attr)
            return keyName === 'id' || keyName === 'ref'
          })
        ) {
          return
        }

        context.report({
          node,
          messageId: 'requireDirective'
        })
      }
    })
  }
}
