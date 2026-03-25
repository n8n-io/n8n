/**
 * @author Pig Fang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { toRegExp } = require('../utils/regexp')
const utils = require('../utils')

/**
 * @typedef { 'always' | 'never' } PreferOption
 */

/**
 * @param {VDirective | VAttribute} node
 * @returns {string | null}
 */
function getAttributeName(node) {
  if (!node.directive) {
    return node.key.rawName
  }

  if (
    (node.key.name.name === 'bind' || node.key.name.name === 'model') &&
    node.key.argument &&
    node.key.argument.type === 'VIdentifier'
  ) {
    return node.key.argument.rawName
  }

  return null
}
/**
 * @param {VAttribute | VDirective} node
 * @param {boolean} isExcepted
 * @param {PreferOption} option
 */
function shouldConvertToLongForm(node, isExcepted, option) {
  return (
    !node.directive &&
    !node.value &&
    (option === 'always' ? isExcepted : !isExcepted)
  )
}

/**
 * @param {VAttribute | VDirective} node
 * @param {boolean} isExcepted
 * @param {PreferOption} option
 */
function shouldConvertToShortForm(node, isExcepted, option) {
  const isLiteralTrue =
    node.directive &&
    node.value?.expression?.type === 'Literal' &&
    node.value.expression.value === true &&
    Boolean(node.key.argument)

  return isLiteralTrue && (option === 'always' ? !isExcepted : isExcepted)
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'require shorthand form attribute when `v-bind` value is `true`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/prefer-true-attribute-shorthand.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      { enum: ['always', 'never'] },
      {
        type: 'object',
        properties: {
          except: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expectShort:
        "Boolean prop with 'true' value should be written in shorthand form.",
      expectLong:
        "Boolean prop with 'true' value should be written in long form.",
      rewriteIntoShort: 'Rewrite this prop into shorthand form.',
      rewriteIntoLongVueProp:
        'Rewrite this prop into long-form Vue component prop.',
      rewriteIntoLongHtmlAttr:
        'Rewrite this prop into long-form HTML attribute.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {'always' | 'never'} */
    const option = context.options[0] || 'always'
    /** @type {RegExp[]} */
    const exceptReg = (context.options[1]?.except || []).map(toRegExp)

    /**
     * @param {VAttribute | VDirective} node
     * @param {string} messageId
     * @param {string} longVuePropText
     * @param {string} longHtmlAttrText
     */
    function reportLongForm(
      node,
      messageId,
      longVuePropText,
      longHtmlAttrText
    ) {
      context.report({
        node,
        messageId,
        suggest: [
          {
            messageId: 'rewriteIntoLongVueProp',
            fix: (fixer) => fixer.replaceText(node, longVuePropText)
          },
          {
            messageId: 'rewriteIntoLongHtmlAttr',
            fix: (fixer) => fixer.replaceText(node, longHtmlAttrText)
          }
        ]
      })
    }

    /**
     * @param {VAttribute | VDirective} node
     * @param {string} messageId
     * @param {string} shortFormText
     */
    function reportShortForm(node, messageId, shortFormText) {
      context.report({
        node,
        messageId,
        suggest: [
          {
            messageId: 'rewriteIntoShort',
            fix: (fixer) => fixer.replaceText(node, shortFormText)
          }
        ]
      })
    }

    return utils.defineTemplateBodyVisitor(context, {
      VAttribute(node) {
        if (!utils.isCustomComponent(node.parent.parent)) return

        const name = getAttributeName(node)
        if (name === null) return

        const isExcepted = exceptReg.some((re) => re.test(name))

        if (shouldConvertToLongForm(node, isExcepted, option)) {
          const key = /** @type {VIdentifier} */ (node.key)
          reportLongForm(
            node,
            'expectLong',
            `:${key.rawName}="true"`,
            `${key.rawName}="${key.rawName}"`
          )
        } else if (shouldConvertToShortForm(node, isExcepted, option)) {
          const directiveKey = /** @type {VDirectiveKey} */ (node.key)
          if (
            directiveKey.argument &&
            directiveKey.argument.type === 'VIdentifier'
          ) {
            reportShortForm(node, 'expectShort', directiveKey.argument.rawName)
          }
        }
      }
    })
  }
}
