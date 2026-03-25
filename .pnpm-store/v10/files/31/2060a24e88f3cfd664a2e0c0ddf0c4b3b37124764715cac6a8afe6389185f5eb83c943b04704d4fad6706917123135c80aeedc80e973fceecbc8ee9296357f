/**
 * @author Doug Wade <douglas.b.wade@gmail.com>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')

/**
 * @param {Identifier} identifier
 * @return {Array<String>}
 */
function getExpectedNames(identifier) {
  return [casing.pascalCase(identifier.name), casing.kebabCase(identifier.name)]
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'require the registered component name to match the imported component name',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/match-component-import-name.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected:
        'Component alias {{importedName}} should be one of: {{expectedName}}.'
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   */
  create(context) {
    return utils.executeOnVueComponent(context, (obj) => {
      const components = utils.findProperty(obj, 'components')
      if (
        !components ||
        !components.value ||
        components.value.type !== 'ObjectExpression'
      ) {
        return
      }

      for (const property of components.value.properties) {
        if (
          property.type === 'SpreadElement' ||
          property.value.type !== 'Identifier' ||
          property.computed === true
        ) {
          continue
        }

        const importedName = utils.getStaticPropertyName(property) || ''
        const expectedNames = getExpectedNames(property.value)
        if (!expectedNames.includes(importedName)) {
          context.report({
            node: property,
            messageId: 'unexpected',
            data: {
              importedName,
              expectedName: expectedNames.join(', ')
            }
          })
        }
      }
    })
  }
}
