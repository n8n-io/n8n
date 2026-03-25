/**
 * @author Yosuke Ota
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow `key` attribute on `<template v-for>`',
      categories: ['vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-v-for-template-key.html'
    },
    fixable: null,
    deprecated: true,
    schema: [],
    messages: {
      disallow:
        "'<template v-for>' cannot be keyed. Place the key on real elements instead."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VElement[name='template'] > VStartTag > VAttribute[directive=true][key.name.name='for']"(
        node
      ) {
        const element = node.parent.parent
        const keyNode =
          utils.getAttribute(element, 'key') ||
          utils.getDirective(element, 'bind', 'key')
        if (keyNode) {
          context.report({
            node: keyNode,
            loc: keyNode.loc,
            messageId: 'disallow'
          })
        }
      }
    })
  }
}
