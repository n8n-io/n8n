/**
 * @author Pig Fang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')

/**
 * @param {import('../../typings/eslint-plugin-vue/util-types/ast').Expression} node
 * @returns {string | null}
 */
function getOptionsComponentName(node) {
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null
  }
  return null
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'enforce the casing of component name in `components` options',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/component-options-name-casing.html'
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [{ enum: casing.allowedCaseOptions }],
    messages: {
      caseNotMatched: 'Component name "{{component}}" is not {{caseType}}.',
      possibleRenaming: 'Rename component name to be in {{caseType}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const caseType = context.options[0] || 'PascalCase'

    const canAutoFix = caseType === 'PascalCase'
    const checkCase = casing.getChecker(caseType)
    const convert = casing.getConverter(caseType)

    return utils.executeOnVue(context, (obj) => {
      const node = utils.findProperty(obj, 'components')
      if (!node || node.value.type !== 'ObjectExpression') {
        return
      }

      for (const property of node.value.properties) {
        if (property.type !== 'Property') {
          continue
        }

        const name = getOptionsComponentName(property.key)
        if (!name || checkCase(name)) {
          continue
        }

        context.report({
          node: property.key,
          messageId: 'caseNotMatched',
          data: {
            component: name,
            caseType
          },
          fix: canAutoFix
            ? (fixer) => {
                const converted = convert(name)
                return property.shorthand
                  ? fixer.replaceText(property, `${converted}: ${name}`)
                  : fixer.replaceText(property.key, converted)
              }
            : undefined,
          suggest: canAutoFix
            ? undefined
            : [
                {
                  messageId: 'possibleRenaming',
                  data: { caseType },
                  fix: (fixer) => {
                    const converted = convert(name)
                    if (caseType === 'kebab-case') {
                      return property.shorthand
                        ? fixer.replaceText(property, `'${converted}': ${name}`)
                        : fixer.replaceText(property.key, `'${converted}'`)
                    }
                    return property.shorthand
                      ? fixer.replaceText(property, `${converted}: ${name}`)
                      : fixer.replaceText(property.key, converted)
                  }
                }
              ]
        })
      }
    })
  }
}
