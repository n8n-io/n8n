/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

// https://html.spec.whatwg.org/multipage/parsing.html#parse-errors
const DEFAULT_OPTIONS = Object.freeze(
  Object.assign(Object.create(null), {
    'abrupt-closing-of-empty-comment': true,
    'absence-of-digits-in-numeric-character-reference': true,
    'cdata-in-html-content': true,
    'character-reference-outside-unicode-range': true,
    'control-character-in-input-stream': true,
    'control-character-reference': true,
    'eof-before-tag-name': true,
    'eof-in-cdata': true,
    'eof-in-comment': true,
    'eof-in-tag': true,
    'incorrectly-closed-comment': true,
    'incorrectly-opened-comment': true,
    'invalid-first-character-of-tag-name': true,
    'missing-attribute-value': true,
    'missing-end-tag-name': true,
    'missing-semicolon-after-character-reference': true,
    'missing-whitespace-between-attributes': true,
    'nested-comment': true,
    'noncharacter-character-reference': true,
    'noncharacter-in-input-stream': true,
    'null-character-reference': true,
    'surrogate-character-reference': true,
    'surrogate-in-input-stream': true,
    'unexpected-character-in-attribute-name': true,
    'unexpected-character-in-unquoted-attribute-value': true,
    'unexpected-equals-sign-before-attribute-name': true,
    'unexpected-null-character': true,
    'unexpected-question-mark-instead-of-tag-name': true,
    'unexpected-solidus-in-tag': true,
    'unknown-named-character-reference': true,
    'end-tag-with-attributes': true,
    'duplicate-attribute': true,
    'end-tag-with-trailing-solidus': true,
    'non-void-html-element-start-tag-with-trailing-solidus': false,
    'x-invalid-end-tag': true,
    'x-invalid-namespace': true
  })
)

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow parsing errors in `<template>`',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-parsing-error.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: Object.fromEntries(
          Object.keys(DEFAULT_OPTIONS).map((code) => [
            code,
            { type: 'boolean' }
          ])
        ),
        additionalProperties: false
      }
    ],
    messages: {
      parsingError: 'Parsing error: {{message}}.'
    }
  },
  /**
   * @param {RuleContext} context - The rule context.
   * @returns {RuleListener} AST event handlers.
   */
  create(context) {
    const options = Object.assign({}, DEFAULT_OPTIONS, context.options[0] || {})

    return {
      Program(program) {
        const node = program.templateBody
        if (node == null || node.errors == null) {
          return
        }

        for (const error of node.errors) {
          if (error.code && !options[error.code]) {
            continue
          }

          context.report({
            node,
            loc: { line: error.lineNumber, column: error.column },
            messageId: 'parsingError',
            data: {
              message: error.message.endsWith('.')
                ? error.message.slice(0, -1)
                : error.message
            }
          })
        }
      }
    }
  }
}
