/**
 * @fileoverview detect if there is a potential typo in your component property
 * @author IWANABETHATGUY
 */
'use strict'

const utils = require('../utils')
const vueComponentOptions = require('../utils/vue-component-options.json')
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow a potential typo in your component property',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-potential-component-option-typo.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          presets: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['all', 'vue', 'vue-router', 'nuxt']
            },
            uniqueItems: true,
            minItems: 0
          },
          custom: {
            type: 'array',
            minItems: 0,
            items: { type: 'string' },
            uniqueItems: true
          },
          threshold: {
            type: 'number',
            minimum: 1
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      potentialTypo: `'{{name}}' may be a typo, which is similar to option [{{option}}].`
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const option = context.options[0] || {}
    const custom = option.custom || []
    /** @type {('all' | 'vue' | 'vue-router' | 'nuxt')[]} */
    const presets = option.presets || ['vue']
    const threshold = option.threshold || 1
    /** @type {Set<string>} */
    const candidateOptionSet = new Set(custom)
    for (const preset of presets) {
      if (preset === 'all') {
        for (const opts of Object.values(vueComponentOptions)) {
          for (const opt of opts) {
            candidateOptionSet.add(opt)
          }
        }
      } else {
        for (const opt of vueComponentOptions[preset]) {
          candidateOptionSet.add(opt)
        }
      }
    }
    const candidateOptionList = [...candidateOptionSet]
    if (candidateOptionList.length === 0) {
      return {}
    }
    return utils.executeOnVue(context, (obj) => {
      const componentInstanceOptions = obj.properties
        .map((p) => {
          if (p.type === 'Property') {
            const name = utils.getStaticPropertyName(p)
            if (name != null) {
              return {
                name,
                key: p.key
              }
            }
          }
          return null
        })
        .filter(utils.isDef)

      if (componentInstanceOptions.length === 0) {
        return
      }
      for (const option of componentInstanceOptions) {
        const id = option.key
        const name = option.name
        if (candidateOptionSet.has(name)) {
          continue
        }
        const potentialTypoList = candidateOptionList
          .map((o) => ({ option: o, distance: utils.editDistance(o, name) }))
          .filter(({ distance }) => distance <= threshold && distance > 0)
          .sort((a, b) => a.distance - b.distance)
        if (potentialTypoList.length > 0) {
          context.report({
            node: id,
            messageId: 'potentialTypo',
            data: {
              name,
              option: potentialTypoList.map(({ option }) => option).join(',')
            },
            suggest: potentialTypoList.map(({ option }) => ({
              desc: `Replace property '${name}' to '${option}'`,
              fix(fixer) {
                return fixer.replaceText(id, option)
              }
            }))
          })
        }
      }
    })
  }
}
