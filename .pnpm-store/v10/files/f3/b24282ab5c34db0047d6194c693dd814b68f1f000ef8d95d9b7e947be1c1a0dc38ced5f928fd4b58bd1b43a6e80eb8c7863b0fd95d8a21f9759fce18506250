/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const regexp = require('../utils/regexp')
const casing = require('../utils/casing')

/**
 * @typedef { { names: { [tagName in string]: Set<string> }, regexps: { name: RegExp, attrs: Set<string> }[], cache: { [tagName in string]: Set<string> } } } TargetAttrs
 */

// https://dev.w3.org/html5/html-author/charref
const DEFAULT_ALLOWLIST = [
  '(',
  ')',
  ',',
  '.',
  '&',
  '+',
  '-',
  '=',
  '*',
  '/',
  '#',
  '%',
  '!',
  '?',
  ':',
  '[',
  ']',
  '{',
  '}',
  '<',
  '>',
  '\u00B7', // "·"
  '\u2022', // "•"
  '\u2010', // "‐"
  '\u2013', // "–"
  '\u2014', // "—"
  '\u2212', // "−"
  '|'
]

const DEFAULT_ATTRIBUTES = {
  '/.+/': [
    'title',
    'aria-label',
    'aria-placeholder',
    'aria-roledescription',
    'aria-valuetext'
  ],
  input: ['placeholder'],
  img: ['alt']
}

const DEFAULT_DIRECTIVES = ['v-text']

/**
 * Parse attributes option
 * @param {any} options
 * @returns {TargetAttrs}
 */
function parseTargetAttrs(options) {
  /** @type {TargetAttrs} */
  const result = { names: {}, regexps: [], cache: {} }
  for (const tagName of Object.keys(options)) {
    /** @type { Set<string> } */
    const attrs = new Set(options[tagName])
    if (regexp.isRegExp(tagName)) {
      result.regexps.push({
        name: regexp.toRegExp(tagName),
        attrs
      })
    } else {
      result.names[tagName] = attrs
    }
  }
  return result
}

/**
 * Get a string from given expression container node
 * @param {VExpressionContainer} value
 * @returns { string | null }
 */
function getStringValue(value) {
  const expression = value.expression
  if (!expression) {
    return null
  }
  if (expression.type !== 'Literal') {
    return null
  }
  if (typeof expression.value === 'string') {
    return expression.value
  }
  return null
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow the use of bare strings in `<template>`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-bare-strings-in-template.html'
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true
          },
          attributes: {
            type: 'object',
            patternProperties: {
              '^(?:\\S+|/.*/[a-z]*)$': {
                type: 'array',
                items: { type: 'string' },
                uniqueItems: true
              }
            },
            additionalProperties: false
          },
          directives: {
            type: 'array',
            items: { type: 'string', pattern: '^v-' },
            uniqueItems: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpected: 'Unexpected non-translated string used.',
      unexpectedInAttr: 'Unexpected non-translated string used in `{{attr}}`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef { { upper: ElementStack | null, name: string, attrs: Set<string> } } ElementStack
     */
    const opts = context.options[0] || {}
    /** @type {string[]} */
    const rawAllowlist = opts.allowlist || DEFAULT_ALLOWLIST
    const attributes = parseTargetAttrs(opts.attributes || DEFAULT_ATTRIBUTES)
    const directives = opts.directives || DEFAULT_DIRECTIVES

    /** @type {string[]} */
    const stringAllowlist = []
    /** @type {RegExp[]} */
    const regexAllowlist = []

    for (const item of rawAllowlist) {
      if (regexp.isRegExp(item)) {
        regexAllowlist.push(regexp.toRegExp(item))
      } else {
        stringAllowlist.push(item)
      }
    }

    const allowlistRe =
      stringAllowlist.length > 0
        ? new RegExp(
            stringAllowlist
              .map((w) => regexp.escape(w))
              .sort((a, b) => b.length - a.length)
              .join('|'),
            'gu'
          )
        : null

    /** @type {ElementStack | null} */
    let elementStack = null
    /**
     * Gets the bare string from given string
     * @param {string} str
     */
    function getBareString(str) {
      let result = str.trim()

      if (allowlistRe) {
        result = result.replace(allowlistRe, '')
      }

      for (const regex of regexAllowlist) {
        const flags = regex.flags.includes('g')
          ? regex.flags
          : `${regex.flags}g`
        const globalRegex = new RegExp(regex.source, flags)
        result = result.replace(globalRegex, '')
      }

      return result.trim()
    }

    /**
     * Get the attribute to be verified from the element name.
     * @param {string} tagName
     * @returns {Set<string>}
     */
    function getTargetAttrs(tagName) {
      if (attributes.cache[tagName]) {
        return attributes.cache[tagName]
      }
      /** @type {string[]} */
      const result = []
      if (attributes.names[tagName]) {
        result.push(...attributes.names[tagName])
      }
      for (const { name, attrs } of attributes.regexps) {
        name.lastIndex = 0
        if (name.test(tagName)) {
          result.push(...attrs)
        }
      }
      if (casing.isKebabCase(tagName)) {
        result.push(...getTargetAttrs(casing.pascalCase(tagName)))
      }

      return (attributes.cache[tagName] = new Set(result))
    }

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VText} node */
      VText(node) {
        if (getBareString(node.value)) {
          context.report({
            node,
            messageId: 'unexpected'
          })
        }
      },
      /**
       * @param {VElement} node
       */
      VElement(node) {
        elementStack = {
          upper: elementStack,
          name: node.rawName,
          attrs: getTargetAttrs(node.rawName)
        }
      },
      'VElement:exit'() {
        elementStack = elementStack && elementStack.upper
      },
      /** @param {VAttribute|VDirective} node */
      VAttribute(node) {
        if (!node.value || !elementStack) {
          return
        }
        if (node.directive === false) {
          const attrs = elementStack.attrs
          if (!attrs.has(node.key.rawName)) {
            return
          }

          if (getBareString(node.value.value)) {
            context.report({
              node: node.value,
              messageId: 'unexpectedInAttr',
              data: {
                attr: node.key.rawName
              }
            })
          }
        } else {
          const directive = `v-${node.key.name.name}`
          if (!directives.includes(directive)) {
            return
          }
          const str = getStringValue(node.value)
          if (str && getBareString(str)) {
            context.report({
              node: node.value,
              messageId: 'unexpectedInAttr',
              data: {
                attr: directive
              }
            })
          }
        }
      }
    })
  }
}
