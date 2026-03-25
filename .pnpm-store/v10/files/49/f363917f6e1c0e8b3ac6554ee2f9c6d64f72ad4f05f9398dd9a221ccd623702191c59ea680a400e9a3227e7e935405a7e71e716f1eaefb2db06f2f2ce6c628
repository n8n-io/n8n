/**
 * @fileoverview Prevent overwrite reserved keys
 * @author Armano
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {import('../utils').GroupName} GroupName
 */

const RESERVED_KEYS = require('../utils/vue-reserved.json')
/** @type {GroupName[]} */
const GROUP_NAMES = [
  'props',
  'computed',
  'data',
  'asyncData',
  'methods',
  'setup'
]

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow overwriting reserved keys',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-reserved-keys.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          reserved: {
            type: 'array'
          },
          groups: {
            type: 'array'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      reserved: "Key '{{name}}' is reserved.",
      startsWithUnderscore:
        "Keys starting with '_' are reserved in '{{name}}' group."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const reservedKeys = new Set([
      ...RESERVED_KEYS,
      ...(options.reserved || [])
    ])
    const groups = new Set([...GROUP_NAMES, ...(options.groups || [])])

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_node, props) {
          for (const prop of props) {
            if (prop.propName && reservedKeys.has(prop.propName)) {
              const { propName, node } = prop
              context.report({
                node,
                messageId: 'reserved',
                data: {
                  name: propName
                }
              })
            }
          }
        }
      }),
      utils.executeOnVue(context, (obj) => {
        const properties = utils.iterateProperties(obj, groups)
        for (const o of properties) {
          if (
            (o.groupName === 'data' || o.groupName === 'asyncData') &&
            o.name[0] === '_'
          ) {
            context.report({
              node: o.node,
              messageId: 'startsWithUnderscore',
              data: {
                name: o.name
              }
            })
          } else if (reservedKeys.has(o.name)) {
            context.report({
              node: o.node,
              messageId: 'reserved',
              data: {
                name: o.name
              }
            })
          }
        }
      })
    )
  }
}
