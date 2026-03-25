/**
 * @author ItMaga <https://github.com/ItMaga>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

// eslint-disable-next-line internal/no-invalid-meta
module.exports = utils.wrapCoreRule('no-console', {
  skipBaseHandlers: true,
  create(context) {
    const options = context.options[0] || {}
    const allowed = options.allow || []

    /**
     * Copied from the core rule `no-console`.
     * Checks whether the property name of the given MemberExpression node
     * is allowed by options or not.
     * @param {MemberExpression} node The MemberExpression node to check.
     * @returns {boolean} `true` if the property name of the node is allowed.
     */
    function isAllowed(node) {
      const propertyName = utils.getStaticPropertyName(node)

      return propertyName && allowed.includes(propertyName)
    }

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'console' &&
          !isAllowed(node)
        ) {
          context.report({
            node: node.object,
            loc: node.object.loc,
            messageId: 'unexpected'
          })
        }
      }
    }
  }
})
