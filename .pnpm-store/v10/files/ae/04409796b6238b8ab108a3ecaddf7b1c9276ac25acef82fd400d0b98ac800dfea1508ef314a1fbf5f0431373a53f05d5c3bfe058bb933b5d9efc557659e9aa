'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const { toRegExp } = require('../utils/regexp')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'enforce v-on event naming style on custom components in template',
      categories: ['vue3-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/v-on-event-hyphenation.html',
      defaultOptions: {
        vue3: ['always', { autofix: true }]
      }
    },
    fixable: 'code',
    schema: [
      {
        enum: ['always', 'never']
      },
      {
        type: 'object',
        properties: {
          autofix: { type: 'boolean' },
          ignore: {
            type: 'array',
            items: {
              allOf: [
                { type: 'string' },
                { not: { type: 'string', pattern: ':exit$' } },
                { not: { type: 'string', pattern: String.raw`^\s*$` } }
              ]
            },
            uniqueItems: true,
            additionalItems: false
          },
          ignoreTags: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      // eslint-disable-next-line eslint-plugin/report-message-format
      mustBeHyphenated: "v-on event '{{text}}' must be hyphenated.",
      // eslint-disable-next-line eslint-plugin/report-message-format
      cannotBeHyphenated: "v-on event '{{text}}' can't be hyphenated."
    }
  },

  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const option = context.options[0]
    const optionsPayload = context.options[1]
    const useHyphenated = option !== 'never'
    /** @type {string[]} */
    const ignoredAttributes = (optionsPayload && optionsPayload.ignore) || []
    /** @type {RegExp[]} */
    const ignoredTagsRegexps = (
      (optionsPayload && optionsPayload.ignoreTags) ||
      []
    ).map(toRegExp)
    const autofix = Boolean(optionsPayload && optionsPayload.autofix)

    const caseConverter = casing.getConverter(
      useHyphenated ? 'kebab-case' : 'camelCase'
    )

    /**
     * @param {VDirective} node
     * @param {VIdentifier} argument
     * @param {string} name
     */
    function reportIssue(node, argument, name) {
      const text = sourceCode.getText(node.key)

      context.report({
        node: node.key,
        loc: node.loc,
        messageId: useHyphenated ? 'mustBeHyphenated' : 'cannotBeHyphenated',
        data: {
          text
        },
        fix:
          autofix &&
          // It cannot be converted in snake_case.
          !name.includes('_')
            ? (fixer) => fixer.replaceText(argument, caseConverter(name))
            : null
      })
    }

    /**
     * @param {string} value
     */
    function isIgnoredAttribute(value) {
      const isIgnored = ignoredAttributes.some((attr) => value.includes(attr))

      if (isIgnored) {
        return true
      }

      return useHyphenated ? value.toLowerCase() === value : !/-/.test(value)
    }

    /** @param {string} name */
    function isIgnoredTagName(name) {
      return ignoredTagsRegexps.some((re) => re.test(name))
    }

    return utils.defineTemplateBodyVisitor(context, {
      "VAttribute[directive=true][key.name.name='on']"(node) {
        const element = node.parent.parent
        if (
          !utils.isCustomComponent(element) ||
          isIgnoredTagName(element.rawName)
        ) {
          return
        }
        if (!node.key.argument || node.key.argument.type !== 'VIdentifier') {
          return
        }
        const name = node.key.argument.rawName
        if (!name || isIgnoredAttribute(name)) return

        reportIssue(node, node.key.argument, name)
      }
    })
  }
}
