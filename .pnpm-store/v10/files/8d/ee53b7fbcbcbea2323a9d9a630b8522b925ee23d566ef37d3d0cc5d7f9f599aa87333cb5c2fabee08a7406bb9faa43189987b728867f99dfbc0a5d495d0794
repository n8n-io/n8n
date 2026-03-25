/**
 * @fileoverview disallow target="_blank" attribute without rel="noopener noreferrer"
 * @author Sosukesuzuki
 */
'use strict'

const utils = require('../utils')

/** @param {VAttribute} node */
function isTargetBlank(node) {
  return (
    node.key &&
    node.key.name === 'target' &&
    node.value &&
    node.value.value === '_blank'
  )
}
/**
 * @param {VStartTag} node
 * @param {boolean} allowReferrer
 */
function hasSecureRel(node, allowReferrer) {
  return node.attributes.some((attr) => {
    if (attr.key && attr.key.name === 'rel') {
      const tags =
        attr.value &&
        attr.value.type === 'VLiteral' &&
        attr.value.value.toLowerCase().split(' ')
      return (
        tags &&
        tags.includes('noopener') &&
        (allowReferrer || tags.includes('noreferrer'))
      )
    } else {
      return false
    }
  })
}

/**
 * @param {VStartTag} node
 */
function hasExternalLink(node) {
  return node.attributes.some(
    (attr) =>
      attr.key &&
      attr.key.name === 'href' &&
      attr.value &&
      attr.value.type === 'VLiteral' &&
      /^(?:\w+:|\/\/)/.test(attr.value.value)
  )
}

/**
 * @param {VStartTag} node
 */
function hasDynamicLink(node) {
  return node.attributes.some(
    (attr) =>
      attr.key &&
      attr.key.type === 'VDirectiveKey' &&
      attr.key.name &&
      attr.key.name.name === 'bind' &&
      attr.key.argument &&
      attr.key.argument.type === 'VIdentifier' &&
      attr.key.argument.name === 'href'
  )
}

/**
 * @param {VAttribute} node
 * @returns {Rule.SuggestionReportDescriptor}
 */
function getSuggestion(node) {
  const relAttributeNode = node.parent.attributes.find(
    (attribute) => attribute.key.name === 'rel'
  )

  if (relAttributeNode) {
    return {
      desc: 'Change `rel` attribute value to `noopener noreferrer`.',
      fix(fixer) {
        return fixer.replaceText(relAttributeNode, 'rel="noopener noreferrer"')
      }
    }
  }

  return {
    desc: 'Add `rel="noopener noreferrer"`.',
    fix(fixer) {
      return fixer.insertTextAfter(node, ' rel="noopener noreferrer"')
    }
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow target="_blank" attribute without rel="noopener noreferrer"',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-template-target-blank.html'
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowReferrer: {
            type: 'boolean'
          },
          enforceDynamicLinks: {
            enum: ['always', 'never']
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingRel:
        'Using target="_blank" without rel="noopener noreferrer" is a security risk.'
    }
  },

  /**
   * Creates AST event handlers for no-template-target-blank
   *
   * @param {RuleContext} context - The rule context.
   * @returns {Object} AST event handlers.
   */
  create(context) {
    const configuration = context.options[0] || {}
    const allowReferrer = configuration.allowReferrer || false
    const enforceDynamicLinks = configuration.enforceDynamicLinks || 'always'

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VAttribute} node */
      'VAttribute[directive=false]'(node) {
        if (!isTargetBlank(node) || hasSecureRel(node.parent, allowReferrer)) {
          return
        }

        const hasDangerHref =
          hasExternalLink(node.parent) ||
          (enforceDynamicLinks === 'always' && hasDynamicLink(node.parent))

        if (hasDangerHref) {
          context.report({
            node,
            messageId: 'missingRel',
            suggest: [getSuggestion(node)]
          })
        }
      }
    })
  }
}
