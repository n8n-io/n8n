/**
 * @author CZB
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { isBlockComment, isJSDocComment } = require('../utils/comments.js')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require props to have a comment',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-prop-comment.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          type: { enum: ['JSDoc', 'line', 'block', 'any'] }
        },
        additionalProperties: false
      }
    ],
    messages: {
      requireAnyComment: 'The "{{name}}" property should have a comment.',
      requireLineComment: 'The "{{name}}" property should have a line comment.',
      requireBlockComment:
        'The "{{name}}" property should have a block comment.',
      requireJSDocComment:
        'The "{{name}}" property should have a JSDoc comment.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {{type?: "JSDoc" | "line" | "block" | "any"}|undefined} */
    const schema = context.options[0]
    const type = (schema && schema.type) || 'JSDoc'

    const sourceCode = context.getSourceCode()

    /** @param {Comment | undefined} comment */
    const verifyBlock = (comment) =>
      comment && isBlockComment(comment) ? undefined : 'requireBlockComment'

    /** @param {Comment | undefined} comment */
    const verifyLine = (comment) =>
      comment && comment.type === 'Line' ? undefined : 'requireLineComment'

    /** @param {Comment | undefined} comment */
    const verifyAny = (comment) => (comment ? undefined : 'requireAnyComment')

    /** @param {Comment | undefined} comment */
    const verifyJSDoc = (comment) =>
      comment && isJSDocComment(comment) ? undefined : 'requireJSDocComment'

    /**
     * @param {import('../utils').ComponentProp[]} props
     */
    function verifyProps(props) {
      for (const prop of props) {
        if (!prop.propName || prop.type === 'infer-type') {
          continue
        }

        const precedingComments = sourceCode.getCommentsBefore(prop.node)
        const lastPrecedingComment =
          precedingComments.length > 0
            ? precedingComments[precedingComments.length - 1]
            : undefined

        /** @type {string|undefined} */
        let messageId

        switch (type) {
          case 'block': {
            messageId = verifyBlock(lastPrecedingComment)
            break
          }
          case 'line': {
            messageId = verifyLine(lastPrecedingComment)
            break
          }
          case 'any': {
            messageId = verifyAny(lastPrecedingComment)
            break
          }
          default: {
            messageId = verifyJSDoc(lastPrecedingComment)
            break
          }
        }

        if (!messageId) {
          continue
        }

        context.report({
          node: prop.node,
          messageId,
          data: {
            name: prop.propName
          }
        })
      }
    }

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(_node, props) {
          verifyProps(props)
        }
      }),
      utils.defineVueVisitor(context, {
        onVueObjectEnter(node) {
          verifyProps(utils.getComponentPropsFromOptions(node))
        }
      })
    )
  }
}
