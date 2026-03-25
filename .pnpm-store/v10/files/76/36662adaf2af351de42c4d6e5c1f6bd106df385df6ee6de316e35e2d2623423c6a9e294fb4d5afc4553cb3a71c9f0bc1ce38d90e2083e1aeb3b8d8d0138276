/**
 * @author Wayne Zhang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const COMPILER_MACROS = new Set([
  'defineProps',
  'defineEmits',
  'defineExpose',
  'withDefaults',
  'defineModel',
  'defineOptions',
  'defineSlots'
])

const VUE_MODULES = new Set(['@vue/runtime-core', '@vue/runtime-dom', 'vue'])

/**
 * @param {Token} node
 */
function isComma(node) {
  return node.type === 'Punctuator' && node.value === ','
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow importing Vue compiler macros',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-import-compiler-macros.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      noImportCompilerMacros:
        "'{{name}}' is a compiler macro and doesn't need to be imported."
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   */
  create(context) {
    const sourceCode = context.getSourceCode()

    return {
      ImportDeclaration(node) {
        if (node.specifiers.length === 0 || !VUE_MODULES.has(node.source.value))
          return

        for (const specifier of node.specifiers) {
          if (
            specifier.type !== 'ImportSpecifier' ||
            !COMPILER_MACROS.has(specifier.imported.name)
          ) {
            continue
          }

          context.report({
            node: specifier,
            messageId: 'noImportCompilerMacros',
            data: {
              name: specifier.imported.name
            },
            fix: (fixer) => {
              const isOnlySpecifier = node.specifiers.length === 1
              const isLastSpecifier =
                specifier === node.specifiers[node.specifiers.length - 1]

              if (isOnlySpecifier) {
                return fixer.remove(node)
              } else if (isLastSpecifier) {
                const precedingComma = sourceCode.getTokenBefore(
                  specifier,
                  isComma
                )
                return fixer.removeRange([
                  precedingComma ? precedingComma.range[0] : specifier.range[0],
                  specifier.range[1]
                ])
              } else {
                const subsequentComma = sourceCode.getTokenAfter(
                  specifier,
                  isComma
                )
                return fixer.removeRange([
                  specifier.range[0],
                  subsequentComma
                    ? subsequentComma.range[1]
                    : specifier.range[1]
                ])
              }
            }
          })
        }
      }
    }
  }
}
