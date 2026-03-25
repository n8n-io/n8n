/**
 * @author Wayne Zhang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')

/**
 * @typedef { 'camelCase' | 'kebab-case' | 'singleword' } OptionType
 * @typedef { (str: string) => boolean } CheckerType
 */

/**
 * Checks whether the given string is a single word.
 * @param {string} str
 * @return {boolean}
 */
function isSingleWord(str) {
  return /^[a-z]+$/u.test(str)
}

/** @type {OptionType[]} */
const allowedCaseOptions = ['camelCase', 'kebab-case', 'singleword']

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce specific casing for slot names',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/slot-name-casing.html'
    },
    fixable: null,
    schema: [
      {
        enum: allowedCaseOptions
      }
    ],
    messages: {
      invalidCase: 'Slot name "{{name}}" is not {{caseType}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const option = context.options[0]

    /** @type {OptionType} */
    const caseType = allowedCaseOptions.includes(option) ? option : 'camelCase'

    /** @type {CheckerType} */
    const checker =
      caseType === 'singleword' ? isSingleWord : casing.getChecker(caseType)

    /** @param {VAttribute} node */
    function processSlotNode(node) {
      const name = node.value?.value
      if (name && !checker(name)) {
        context.report({
          node,
          loc: node.loc,
          messageId: 'invalidCase',
          data: {
            name,
            caseType
          }
        })
      }
    }

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VElement} node */
      "VElement[name='slot']"(node) {
        const slotName = utils.getAttribute(node, 'name')
        if (slotName) {
          processSlotNode(slotName)
        }
      }
    })
  }
}
