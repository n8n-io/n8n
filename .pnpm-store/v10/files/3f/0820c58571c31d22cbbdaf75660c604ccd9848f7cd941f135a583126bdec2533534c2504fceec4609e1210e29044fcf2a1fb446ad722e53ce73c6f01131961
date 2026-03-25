/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../../utils/index')

module.exports = {
  supported: '>=3.3.0',
  /** @param {RuleContext} context @returns {RuleListener} */
  createScriptVisitor(context) {
    const sourceCode = context.getSourceCode()
    return utils.defineScriptSetupVisitor(context, {
      onDefineOptionsEnter(node) {
        context.report({
          node,
          messageId: 'forbiddenDefineOptions',
          fix(fixer) {
            return fix(fixer, node)
          }
        })
      }
    })

    /**
     * @param {RuleFixer} fixer
     * @param {CallExpression} node defineOptions() node
     */
    function fix(fixer, node) {
      if (node.arguments.length === 0) return null
      const scriptSetup = utils.getScriptSetupElement(context)
      if (!scriptSetup) return null
      if (
        scriptSetup.parent.children
          .filter(utils.isVElement)
          .some(
            (node) =>
              node.name === 'script' && !utils.hasAttribute(node, 'setup')
          )
      ) {
        // has `<script>`
        return null
      }

      // Find defineOptions statement
      /** @type {ASTNode} */
      let statement = node
      while (statement.parent && statement.parent.type !== 'Program') {
        statement = statement.parent
      }
      // Calc remove range
      /** @type {Range} */
      const removeRange = [...statement.range]
      if (
        sourceCode.lines[statement.loc.start.line - 1]
          .slice(0, statement.loc.start.column)
          .trim() === ''
      ) {
        removeRange[0] -= statement.loc.start.column
      }

      return [
        fixer.insertTextBefore(
          scriptSetup,
          `<script>\nexport default ${sourceCode.getText(
            node.arguments[0]
          )}\n</script>\n`
        ),
        fixer.removeRange(removeRange)
      ]
    }
  }
}
