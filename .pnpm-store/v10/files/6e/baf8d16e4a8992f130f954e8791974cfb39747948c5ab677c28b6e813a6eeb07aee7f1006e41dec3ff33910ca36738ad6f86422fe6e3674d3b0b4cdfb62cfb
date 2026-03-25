/**
 * @fileoverview Define the number of attributes allows per line
 * @author Filipa Lacerda
 */
'use strict'

const utils = require('../utils')

/**
 * @param {any} options
 */
function parseOptions(options) {
  const defaults = {
    singleline: 1,
    multiline: 1
  }

  if (options) {
    if (typeof options.singleline === 'number') {
      defaults.singleline = options.singleline
    } else if (
      typeof options.singleline === 'object' &&
      typeof options.singleline.max === 'number'
    ) {
      defaults.singleline = options.singleline.max
    }

    if (options.multiline) {
      if (typeof options.multiline === 'number') {
        defaults.multiline = options.multiline
      } else if (
        typeof options.multiline === 'object' &&
        typeof options.multiline.max === 'number'
      ) {
        defaults.multiline = options.multiline.max
      }
    }
  }

  return defaults
}

/**
 * @param {(VDirective | VAttribute)[]} attributes
 */
function groupAttrsByLine(attributes) {
  const propsPerLine = [[attributes[0]]]

  for (let index = 1; index < attributes.length; index++) {
    const previous = attributes[index - 1]
    const current = attributes[index]

    if (previous.loc.end.line === current.loc.start.line) {
      propsPerLine[propsPerLine.length - 1].push(current)
    } else {
      propsPerLine.push([current])
    }
  }

  return propsPerLine
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce the maximum number of attributes per line',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/max-attributes-per-line.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          singleline: {
            oneOf: [
              {
                type: 'number',
                minimum: 1
              },
              {
                type: 'object',
                properties: {
                  max: {
                    type: 'number',
                    minimum: 1
                  }
                },
                additionalProperties: false
              }
            ]
          },
          multiline: {
            oneOf: [
              {
                type: 'number',
                minimum: 1
              },
              {
                type: 'object',
                properties: {
                  max: {
                    type: 'number',
                    minimum: 1
                  }
                },
                additionalProperties: false
              }
            ]
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      shouldBeOnNewLine: "'{{name}}' should be on a new line."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const configuration = parseOptions(context.options[0])
    const multilineMaximum = configuration.multiline
    const singlelinemMaximum = configuration.singleline
    const template =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    return utils.defineTemplateBodyVisitor(context, {
      VStartTag(node) {
        const numberOfAttributes = node.attributes.length

        if (!numberOfAttributes) return

        if (
          utils.isSingleLine(node) &&
          numberOfAttributes > singlelinemMaximum
        ) {
          showErrors(node.attributes.slice(singlelinemMaximum))
        }

        if (!utils.isSingleLine(node)) {
          for (const attrs of groupAttrsByLine(node.attributes)) {
            if (attrs.length > multilineMaximum) {
              showErrors(attrs.splice(multilineMaximum))
            }
          }
        }
      }
    })

    /**
     * @param {(VDirective | VAttribute)[]} attributes
     */
    function showErrors(attributes) {
      for (const [i, prop] of attributes.entries()) {
        context.report({
          node: prop,
          loc: prop.loc,
          messageId: 'shouldBeOnNewLine',
          data: { name: sourceCode.getText(prop.key) },
          fix(fixer) {
            if (i !== 0) return null

            // Find the closest token before the current prop
            // that is not a white space
            const prevToken = /** @type {Token} */ (
              template.getTokenBefore(prop, {
                filter: (token) => token.type !== 'HTMLWhitespace'
              })
            )

            /** @type {Range} */
            const range = [prevToken.range[1], prop.range[0]]

            return fixer.replaceTextRange(range, '\n')
          }
        })
      }
    }
  }
}
