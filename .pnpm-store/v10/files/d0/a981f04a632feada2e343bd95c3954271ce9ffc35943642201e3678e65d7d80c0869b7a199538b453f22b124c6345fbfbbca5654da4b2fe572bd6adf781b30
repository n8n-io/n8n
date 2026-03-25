/**
 * @author Flo Edelmann
 * See LICENSE file in root directory for full license.
 */
'use strict'
const { defineTemplateBodyVisitor } = require('../utils')

/**
 * @typedef {object} RuleOption
 * @property {string[]} additionalDirectives
 */

/**
 * @param {VNode | Token} node
 * @returns {boolean}
 */
function isWhiteSpaceTextNode(node) {
  return node.type === 'VText' && node.value.trim() === ''
}

/**
 * @param {Position} pos1
 * @param {Position} pos2
 * @returns {'less' | 'equal' | 'greater'}
 */
function comparePositions(pos1, pos2) {
  if (
    pos1.line < pos2.line ||
    (pos1.line === pos2.line && pos1.column < pos2.column)
  ) {
    return 'less'
  }

  if (
    pos1.line > pos2.line ||
    (pos1.line === pos2.line && pos1.column > pos2.column)
  ) {
    return 'greater'
  }

  return 'equal'
}

/**
 * @param {(VNode | Token)[]} nodes
 * @returns {SourceLocation | undefined}
 */
function getLocationRange(nodes) {
  /** @type {Position | undefined} */
  let start
  /** @type {Position | undefined} */
  let end

  for (const node of nodes) {
    if (!start || comparePositions(node.loc.start, start) === 'less') {
      start = node.loc.start
    }

    if (!end || comparePositions(node.loc.end, end) === 'greater') {
      end = node.loc.end
    }
  }

  if (start === undefined || end === undefined) {
    return undefined
  }

  return { start, end }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "disallow element's child contents which would be overwritten by a directive like `v-html` or `v-text`",
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-child-content.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          additionalDirectives: {
            type: 'array',
            uniqueItems: true,
            minItems: 1,
            items: {
              type: 'string'
            }
          }
        },
        required: ['additionalDirectives']
      }
    ],
    messages: {
      disallowedChildContent:
        'Child content is disallowed because it will be overwritten by the v-{{ directiveName }} directive.',
      removeChildContent: 'Remove child content.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const directives = new Set(['html', 'text'])

    /** @type {RuleOption | undefined} */
    const option = context.options[0]
    if (option !== undefined) {
      for (const directive of option.additionalDirectives) {
        directives.add(directive)
      }
    }

    return defineTemplateBodyVisitor(context, {
      /** @param {VDirective} directiveNode */
      'VAttribute[directive=true]'(directiveNode) {
        const directiveName = directiveNode.key.name.name
        const elementNode = directiveNode.parent.parent

        if (elementNode.endTag === null) {
          return
        }
        const sourceCode = context.getSourceCode()
        const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore()
        const elementComments = tokenStore.getTokensBetween(
          elementNode.startTag,
          elementNode.endTag,
          {
            includeComments: true,
            filter: (token) => token.type === 'HTMLComment'
          }
        )

        const childNodes = [...elementNode.children, ...elementComments]

        if (
          directives.has(directiveName) &&
          childNodes.some((childNode) => !isWhiteSpaceTextNode(childNode))
        ) {
          context.report({
            node: elementNode,
            loc: getLocationRange(childNodes),
            messageId: 'disallowedChildContent',
            data: { directiveName },
            suggest: [
              {
                messageId: 'removeChildContent',
                *fix(fixer) {
                  for (const childNode of childNodes) {
                    yield fixer.remove(childNode)
                  }
                }
              }
            ]
          })
        }
      }
    })
  }
}
