/**
 * @author Yosuke Ota
 * issue https://github.com/vuejs/eslint-plugin-vue/issues/250
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const { toRegExp } = require('../utils/regexp')

const allowedCaseOptions = ['PascalCase', 'kebab-case']
const defaultCase = 'PascalCase'

/**
 * Checks whether the given variable is the type-only import object.
 * @param {Variable} variable
 * @returns {boolean} `true` if the given variable is the type-only import.
 */
function isTypeOnlyImport(variable) {
  if (variable.defs.length === 0) return false

  return variable.defs.every((def) => {
    if (def.type !== 'ImportBinding') {
      return false
    }
    if (def.parent.importKind === 'type') {
      // check for `import type Foo from './xxx'`
      return true
    }
    if (def.node.type === 'ImportSpecifier' && def.node.importKind === 'type') {
      // check for `import { type Foo } from './xxx'`
      return true
    }
    return false
  })
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'enforce specific casing for the component naming style in template',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/component-name-in-template-casing.html'
    },
    fixable: 'code',
    schema: [
      {
        enum: allowedCaseOptions
      },
      {
        type: 'object',
        properties: {
          globals: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true
          },
          ignores: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          },
          registeredComponentsOnly: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      incorrectCase: 'Component name "{{name}}" is not {{caseType}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const caseOption = context.options[0]
    const options = context.options[1] || {}
    const caseType = allowedCaseOptions.includes(caseOption)
      ? caseOption
      : defaultCase
    /** @type {RegExp[]} */
    const ignores = (options.ignores || []).map(toRegExp)
    /** @type {string[]} */
    const globals = (options.globals || []).map(casing.pascalCase)
    const registeredComponentsOnly = options.registeredComponentsOnly !== false
    const sourceCode = context.getSourceCode()
    const tokens =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    /** @type { Set<string> } */
    const registeredComponents = new Set(globals)

    if (utils.isScriptSetup(context)) {
      // For <script setup>
      const globalScope = context.getSourceCode().scopeManager.globalScope
      if (globalScope) {
        // Only check find the import module
        const moduleScope = globalScope.childScopes.find(
          (scope) => scope.type === 'module'
        )
        for (const variable of (moduleScope && moduleScope.variables) || []) {
          if (!isTypeOnlyImport(variable)) {
            registeredComponents.add(variable.name)
          }
        }
      }
    }

    /**
     * Checks whether the given node is the verification target node.
     * @param {VElement} node element node
     * @returns {boolean} `true` if the given node is the verification target node.
     */
    function isVerifyTarget(node) {
      if (ignores.some((re) => re.test(node.rawName))) {
        // ignore
        return false
      }

      if (
        (!utils.isHtmlElementNode(node) &&
          !utils.isSvgElementNode(node) &&
          !utils.isMathElementNode(node)) ||
        utils.isHtmlWellKnownElementName(node.rawName) ||
        utils.isSvgWellKnownElementName(node.rawName) ||
        utils.isMathWellKnownElementName(node.rawName) ||
        utils.isVueBuiltInElementName(node.rawName)
      ) {
        return false
      }

      if (!registeredComponentsOnly) {
        // If the user specifies registeredComponentsOnly as false, it checks all component tags.
        return true
      }

      // We only verify the registered components.
      return registeredComponents.has(casing.pascalCase(node.rawName))
    }

    let hasInvalidEOF = false

    return utils.defineTemplateBodyVisitor(
      context,
      {
        VElement(node) {
          if (hasInvalidEOF) {
            return
          }

          if (!isVerifyTarget(node)) {
            return
          }

          const name = node.rawName
          if (!casing.getChecker(caseType)(name)) {
            const startTag = node.startTag
            const open = tokens.getFirstToken(startTag)
            const casingName = casing.getExactConverter(caseType)(name)
            context.report({
              node: open,
              loc: open.loc,
              messageId: 'incorrectCase',
              data: {
                name,
                caseType
              },
              *fix(fixer) {
                yield fixer.replaceText(open, `<${casingName}`)
                const endTag = node.endTag
                if (endTag) {
                  const endTagOpen = tokens.getFirstToken(endTag)
                  yield fixer.replaceText(endTagOpen, `</${casingName}`)
                }
              }
            })
          }
        }
      },
      {
        Program(node) {
          hasInvalidEOF = utils.hasInvalidEOF(node)
        },
        ...(registeredComponentsOnly
          ? utils.executeOnVue(context, (obj) => {
              for (const n of utils.getRegisteredComponents(obj)) {
                registeredComponents.add(n.name)
              }
            })
          : {})
      }
    )
  }
}
