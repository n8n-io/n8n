/**
 * @author Yosuke Ota <https://github.com/ota-meshi>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce use of `defineOptions` instead of default export',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/prefer-define-options.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      preferDefineOptions: 'Use `defineOptions` instead of default export.'
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   */
  create(context) {
    const scriptSetup = utils.getScriptSetupElement(context)
    if (!scriptSetup) {
      return {}
    }

    /** @type {CallExpression | null} */
    let defineOptionsNode = null
    /** @type {ExportDefaultDeclaration | null} */
    let exportDefaultDeclaration = null
    /** @type {ImportDeclaration|null} */
    let lastImportDeclaration = null

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        ImportDeclaration(node) {
          lastImportDeclaration = node
        },
        onDefineOptionsEnter(node) {
          defineOptionsNode = node
        }
      }),
      {
        ExportDefaultDeclaration(node) {
          exportDefaultDeclaration = node
        },
        'Program:exit'() {
          if (!exportDefaultDeclaration) {
            return
          }
          context.report({
            node: exportDefaultDeclaration,
            messageId: 'preferDefineOptions',
            fix: defineOptionsNode
              ? null
              : buildFix(exportDefaultDeclaration, scriptSetup)
          })
        }
      }
    )

    /**
     * @param {ExportDefaultDeclaration} node
     * @param {VElement} scriptSetup
     * @returns {(fixer: RuleFixer) => Fix[]}
     */
    function buildFix(node, scriptSetup) {
      return (fixer) => {
        const sourceCode = context.getSourceCode()

        // Calc remove range
        /** @type {Range} */
        let removeRange = [...node.range]

        const script = scriptSetup.parent.children
          .filter(utils.isVElement)
          .find(
            (node) =>
              node.name === 'script' && !utils.hasAttribute(node, 'setup')
          )
        if (
          script &&
          script.endTag &&
          sourceCode
            .getTokensBetween(script.startTag, script.endTag, {
              includeComments: true
            })
            .every(
              (token) =>
                removeRange[0] <= token.range[0] &&
                token.range[1] <= removeRange[1]
            )
        ) {
          removeRange = [...script.range]
        }
        const removeStartLoc = sourceCode.getLocFromIndex(removeRange[0])
        if (
          sourceCode.lines[removeStartLoc.line - 1]
            .slice(0, removeStartLoc.column)
            .trim() === ''
        ) {
          removeRange[0] =
            removeStartLoc.line === 1
              ? 0
              : sourceCode.getIndexFromLoc({
                  line: removeStartLoc.line - 1,
                  column: sourceCode.lines[removeStartLoc.line - 2].length
                })
        }

        /** @type {VStartTag | ImportDeclaration} */
        const insertAfterTag = lastImportDeclaration || scriptSetup.startTag

        return [
          fixer.removeRange(removeRange),
          fixer.insertTextAfter(
            insertAfterTag,
            `\ndefineOptions(${sourceCode.getText(node.declaration)})\n`
          )
        ]
      }
    }
  }
}
