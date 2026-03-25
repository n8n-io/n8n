/**
 * @author Eduard Deisling
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

const MACROS_EMITS = 'defineEmits'
const MACROS_PROPS = 'defineProps'
const MACROS_OPTIONS = 'defineOptions'
const MACROS_SLOTS = 'defineSlots'
const MACROS_MODEL = 'defineModel'
const MACROS_EXPOSE = 'defineExpose'
const KNOWN_MACROS = new Set([
  MACROS_EMITS,
  MACROS_PROPS,
  MACROS_OPTIONS,
  MACROS_SLOTS,
  MACROS_MODEL,
  MACROS_EXPOSE
])
const DEFAULT_ORDER = [MACROS_PROPS, MACROS_EMITS]

/**
 * @param {VElement} scriptSetup
 * @param {ASTNode} node
 */
function inScriptSetup(scriptSetup, node) {
  return (
    scriptSetup.range[0] <= node.range[0] &&
    node.range[1] <= scriptSetup.range[1]
  )
}

/**
 * @param {ASTNode} node
 */
function isUseStrictStatement(node) {
  return (
    node.type === 'ExpressionStatement' &&
    node.expression.type === 'Literal' &&
    node.expression.value === 'use strict'
  )
}

/**
 * Get an index of the first statement after imports and interfaces in order
 * to place defineEmits and defineProps before this statement
 * @param {VElement} scriptSetup
 * @param {Program} program
 */
function getTargetStatementPosition(scriptSetup, program) {
  const skipStatements = new Set([
    'ImportDeclaration',
    'TSModuleDeclaration',
    'TSInterfaceDeclaration',
    'TSTypeAliasDeclaration',
    'DebuggerStatement',
    'EmptyStatement',
    'ExportNamedDeclaration'
  ])

  for (const [index, item] of program.body.entries()) {
    if (
      inScriptSetup(scriptSetup, item) &&
      !skipStatements.has(item.type) &&
      !isUseStrictStatement(item)
    ) {
      return index
    }
  }

  return -1
}

/**
 * We need to handle cases like "const props = defineProps(...)"
 * Define macros must be used only on top, so we can look for "Program" type
 * inside node.parent.type
 * @param {CallExpression|ASTNode} node
 * @return {ASTNode}
 */
function getDefineMacrosStatement(node) {
  if (!node.parent) {
    throw new Error('Node has no parent')
  }

  if (node.parent.type === 'Program') {
    return node
  }

  return getDefineMacrosStatement(node.parent)
}

/** @param {RuleContext} context */
function create(context) {
  const scriptSetup = utils.getScriptSetupElement(context)

  if (!scriptSetup) {
    return {}
  }

  const sourceCode = context.getSourceCode()
  const options = context.options
  /** @type {[string, string]} */
  const order = (options[0] && options[0].order) || DEFAULT_ORDER
  /** @type {boolean} */
  const defineExposeLast = (options[0] && options[0].defineExposeLast) || false
  /** @type {Map<string, ASTNode[]>} */
  const macrosNodes = new Map()
  /** @type {ASTNode} */
  let defineExposeNode

  if (order.includes(MACROS_EXPOSE) && defineExposeLast) {
    throw new Error(
      "`defineExpose` macro can't be in the `order` array if `defineExposeLast` is true."
    )
  }

  return utils.compositingVisitors(
    utils.defineScriptSetupVisitor(context, {
      onDefinePropsExit(node) {
        macrosNodes.set(MACROS_PROPS, [getDefineMacrosStatement(node)])
      },
      onDefineEmitsExit(node) {
        macrosNodes.set(MACROS_EMITS, [getDefineMacrosStatement(node)])
      },
      onDefineOptionsExit(node) {
        macrosNodes.set(MACROS_OPTIONS, [getDefineMacrosStatement(node)])
      },
      onDefineSlotsExit(node) {
        macrosNodes.set(MACROS_SLOTS, [getDefineMacrosStatement(node)])
      },
      onDefineModelExit(node) {
        const currentModelMacros = macrosNodes.get(MACROS_MODEL) ?? []
        currentModelMacros.push(getDefineMacrosStatement(node))
        macrosNodes.set(MACROS_MODEL, currentModelMacros)
      },
      onDefineExposeExit(node) {
        defineExposeNode = getDefineMacrosStatement(node)
      },

      /** @param {CallExpression} node */
      'Program > ExpressionStatement > CallExpression, Program > VariableDeclaration > VariableDeclarator > CallExpression'(
        node
      ) {
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          order.includes(node.callee.name) &&
          !KNOWN_MACROS.has(node.callee.name)
        ) {
          macrosNodes.set(node.callee.name, [getDefineMacrosStatement(node)])
        }
      }
    }),
    {
      'Program:exit'(program) {
        /**
         * @typedef {object} OrderedData
         * @property {string} name
         * @property {ASTNode} node
         */
        const firstStatementIndex = getTargetStatementPosition(
          scriptSetup,
          program
        )
        const orderedList = order
          .flatMap((name) => {
            const nodes = macrosNodes.get(name) ?? []
            return nodes.map((node) => ({ name, node }))
          })
          .filter(
            /** @returns {data is OrderedData} */
            (data) => utils.isDef(data.node)
          )

        // check last node
        if (defineExposeLast) {
          const lastNode = program.body[program.body.length - 1]
          if (defineExposeNode && lastNode !== defineExposeNode) {
            reportExposeNotOnBottom(defineExposeNode, lastNode)
          }
        }

        for (const [index, should] of orderedList.entries()) {
          const targetStatement = program.body[firstStatementIndex + index]

          if (should.node !== targetStatement) {
            let moveTargetNodes = orderedList
              .slice(index)
              .map(({ node }) => node)
            const targetStatementIndex =
              moveTargetNodes.indexOf(targetStatement)

            if (targetStatementIndex !== -1) {
              moveTargetNodes = moveTargetNodes.slice(0, targetStatementIndex)
            }
            reportNotOnTop(should.name, moveTargetNodes, targetStatement)
            return
          }
        }
      }
    }
  )

  /**
   * @param {string} macro
   * @param {ASTNode[]} nodes
   * @param {ASTNode} before
   */
  function reportNotOnTop(macro, nodes, before) {
    context.report({
      node: nodes[0],
      loc: nodes[0].loc,
      messageId: 'macrosNotOnTop',
      data: {
        macro
      },
      *fix(fixer) {
        for (const node of nodes) {
          yield* moveNodeBefore(fixer, node, before)
        }
      }
    })
  }

  /**
   * @param {ASTNode} node
   * @param {ASTNode} lastNode
   */
  function reportExposeNotOnBottom(node, lastNode) {
    context.report({
      node,
      loc: node.loc,
      messageId: 'defineExposeNotTheLast',
      suggest: [
        {
          messageId: 'putExposeAtTheLast',
          fix(fixer) {
            return moveNodeToLast(fixer, node, lastNode)
          }
        }
      ]
    })
  }

  /**
   * Move all lines of "node" with its comments to after the "target"
   * @param {RuleFixer} fixer
   * @param {ASTNode} node
   * @param {ASTNode} target
   */
  function moveNodeToLast(fixer, node, target) {
    // get comments under tokens(if any)
    const beforeNodeToken = sourceCode.getTokenBefore(node)
    const nodeComment = sourceCode.getTokenAfter(beforeNodeToken, {
      includeComments: true
    })
    const nextNodeComment = sourceCode.getTokenAfter(node, {
      includeComments: true
    })

    // remove position: node (and comments) to next node (and comments)
    const cutStart = getLineStartIndex(nodeComment, beforeNodeToken)
    const cutEnd = getLineStartIndex(nextNodeComment, node)

    // insert text: comment + node
    const textNode = sourceCode.getText(
      node,
      node.range[0] - beforeNodeToken.range[1]
    )

    return [
      fixer.insertTextAfter(target, textNode),
      fixer.removeRange([cutStart, cutEnd])
    ]
  }

  /**
   * Move all lines of "node" with its comments to before the "target"
   * @param {RuleFixer} fixer
   * @param {ASTNode} node
   * @param {ASTNode} target
   */
  function moveNodeBefore(fixer, node, target) {
    // get comments under tokens(if any)
    const beforeNodeToken = sourceCode.getTokenBefore(node)
    const nodeComment = sourceCode.getTokenAfter(beforeNodeToken, {
      includeComments: true
    })
    const nextNodeComment = sourceCode.getTokenAfter(node, {
      includeComments: true
    })
    // get positions of what we need to remove
    const cutStart = getLineStartIndex(nodeComment, beforeNodeToken)
    const cutEnd = getLineStartIndex(nextNodeComment, node)
    // get space before target
    const beforeTargetToken = sourceCode.getTokenBefore(target)
    const targetComment = sourceCode.getTokenAfter(beforeTargetToken, {
      includeComments: true
    })
    // make insert text: comments + node + space before target
    const textNode = sourceCode.getText(
      node,
      node.range[0] - nodeComment.range[0]
    )
    const insertText = getInsertText(textNode, target)

    return [
      fixer.insertTextBefore(targetComment, insertText),
      fixer.removeRange([cutStart, cutEnd])
    ]
  }

  /**
   * Get result text to insert
   * @param {string} textNode
   * @param {ASTNode} target
   */
  function getInsertText(textNode, target) {
    const afterTargetComment = sourceCode.getTokenAfter(target, {
      includeComments: true
    })
    const afterText = sourceCode.text.slice(
      target.range[1],
      afterTargetComment.range[0]
    )
    // handle case when a();b() -> b()a();
    const invalidResult = !textNode.endsWith(';') && !afterText.includes('\n')

    return textNode + afterText + (invalidResult ? ';' : '')
  }

  /**
   * Get position of the beginning of the token's line(or prevToken end if no line)
   * @param {ASTNode|Token} token
   * @param {ASTNode|Token} prevToken
   */
  function getLineStartIndex(token, prevToken) {
    // if we have next token on the same line - get index right before that token
    if (token.loc.start.line === prevToken.loc.end.line) {
      return prevToken.range[1]
    }

    return sourceCode.getIndexFromLoc({
      line: token.loc.start.line,
      column: 0
    })
  }
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'enforce order of compiler macros (`defineProps`, `defineEmits`, etc.)',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/define-macros-order.html'
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          order: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 1
            },
            uniqueItems: true,
            additionalItems: false
          },
          defineExposeLast: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      macrosNotOnTop:
        '{{macro}} should be the first statement in `<script setup>` (after any potential import statements or type definitions).',
      defineExposeNotTheLast:
        '`defineExpose` should be the last statement in `<script setup>`.',
      putExposeAtTheLast:
        'Put `defineExpose` as the last statement in `<script setup>`.'
    }
  },
  create
}
