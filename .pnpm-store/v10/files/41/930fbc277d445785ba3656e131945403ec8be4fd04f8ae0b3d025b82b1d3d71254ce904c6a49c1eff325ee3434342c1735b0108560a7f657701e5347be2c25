/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const indentCommon = require('../utils/indent-common')
const utils = require('../utils')

module.exports = {
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const tokenStore =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()
    const visitor = indentCommon.defineVisitor(context, tokenStore, {
      baseIndent: 1
    })

    return utils.defineTemplateBodyVisitor(context, visitor)
  },
  // eslint-disable-next-line eslint-plugin/prefer-message-ids
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce consistent indentation in `<template>`',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/html-indent.html'
    },
    // eslint-disable-next-line eslint-plugin/require-meta-fixable -- fixer is not recognized
    fixable: 'whitespace',
    schema: [
      {
        oneOf: [{ type: 'integer', minimum: 1 }, { enum: ['tab'] }]
      },
      {
        type: 'object',
        properties: {
          attribute: { type: 'integer', minimum: 0 },
          baseIndent: { type: 'integer', minimum: 0 },
          closeBracket: {
            oneOf: [
              { type: 'integer', minimum: 0 },
              {
                type: 'object',
                properties: {
                  startTag: { type: 'integer', minimum: 0 },
                  endTag: { type: 'integer', minimum: 0 },
                  selfClosingTag: { type: 'integer', minimum: 0 }
                },
                additionalProperties: false
              }
            ]
          },
          switchCase: { type: 'integer', minimum: 0 },
          alignAttributesVertically: { type: 'boolean' },
          ignores: {
            type: 'array',
            items: {
              allOf: [
                { type: 'string' },
                { not: { type: 'string', pattern: ':exit$' } },
                { not: { type: 'string', pattern: String.raw`^\s*$` } }
              ]
            },
            uniqueItems: true,
            additionalItems: false
          }
        },
        additionalProperties: false
      }
    ]
  }
}
