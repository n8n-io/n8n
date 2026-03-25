/**
 * @fileoverview Require component name property to match its file name
 * @author Rodrigo Pedra Brum <rodrigo.pedra@gmail.com>
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const path = require('path')

/**
 * @param {Expression | SpreadElement} node
 * @returns {node is (Literal | TemplateLiteral)}
 */
function canVerify(node) {
  return (
    node.type === 'Literal' ||
    (node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1)
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require component name property to match its file name',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/match-component-file-name.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          extensions: {
            type: 'array',
            items: {
              type: 'string'
            },
            uniqueItems: true,
            additionalItems: false
          },
          shouldMatchCase: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      shouldMatchFileName:
        'Component name `{{name}}` should match file name `{{filename}}`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0]
    const shouldMatchCase = (options && options.shouldMatchCase) || false
    const extensionsArray = options && options.extensions
    const allowedExtensions = Array.isArray(extensionsArray)
      ? extensionsArray
      : ['jsx']

    const extension = path.extname(context.getFilename())
    const filename = path.basename(context.getFilename(), extension)

    /** @type {Rule.ReportDescriptor[]} */
    const errors = []
    let componentCount = 0

    if (!allowedExtensions.includes(extension.replace(/^\./, ''))) {
      return {}
    }

    /**
     * @param {string} name
     * @param {string} filename
     */
    function compareNames(name, filename) {
      if (shouldMatchCase) {
        return name === filename
      }

      return (
        casing.pascalCase(name) === filename ||
        casing.kebabCase(name) === filename
      )
    }

    /**
     * @param {Literal | TemplateLiteral} node
     */
    function verifyName(node) {
      let name
      if (node.type === 'TemplateLiteral') {
        const quasis = node.quasis[0]
        name = quasis.value.cooked
      } else {
        name = `${node.value}`
      }

      if (!compareNames(name, filename)) {
        errors.push({
          node,
          messageId: 'shouldMatchFileName',
          data: { filename, name },
          suggest: [
            {
              desc: 'Rename component to match file name.',
              fix(fixer) {
                const quote =
                  node.type === 'TemplateLiteral' ? '`' : node.raw[0]
                return fixer.replaceText(node, `${quote}${filename}${quote}`)
              }
            }
          ]
        })
      }
    }

    return utils.compositingVisitors(
      utils.executeOnCallVueComponent(context, (node) => {
        if (node.arguments.length === 2) {
          const argument = node.arguments[0]

          if (canVerify(argument)) {
            verifyName(argument)
          }
        }
      }),
      utils.executeOnVue(context, (object) => {
        const node = utils.findProperty(object, 'name')

        componentCount++

        if (!node) return
        if (!canVerify(node.value)) return
        verifyName(node.value)
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          componentCount++
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          const nameNode = utils.findProperty(define, 'name')
          if (!nameNode) return
          if (!canVerify(nameNode.value)) return
          verifyName(nameNode.value)
        }
      }),
      {
        'Program:exit'() {
          if (componentCount > 1) return

          for (const error of errors) context.report(error)
        }
      }
    )
  }
}
