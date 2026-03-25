/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const vue3ExportNames = new Set(require('../utils/vue3-export-names.json'))

const TARGET_AT_VUE_MODULES = new Set([
  '@vue/runtime-dom',
  '@vue/runtime-core',
  '@vue/reactivity',
  '@vue/shared'
])
// Modules with the names of a subset of vue.
const SUBSET_AT_VUE_MODULES = new Set(['@vue/runtime-dom', '@vue/runtime-core'])

/**
 * @param {ImportDeclaration} node
 */
function* extractImportNames(node) {
  for (const specifier of node.specifiers) {
    switch (specifier.type) {
      case 'ImportDefaultSpecifier': {
        yield 'default'
        break
      }
      case 'ImportNamespaceSpecifier': {
        yield null // all
        break
      }
      case 'ImportSpecifier': {
        yield specifier.imported.name
        break
      }
    }
  }
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: "enforce import from 'vue' instead of import from '@vue/*'",
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/prefer-import-from-vue.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      importedAtVue: "Import from 'vue' instead of '{{source}}'."
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   */
  create(context) {
    /**
     *
     * @param {Literal & { value: string }} source
     * @param { () => boolean } fixable
     */
    function verifySource(source, fixable) {
      if (!TARGET_AT_VUE_MODULES.has(source.value)) {
        return
      }

      context.report({
        node: source,
        messageId: 'importedAtVue',
        data: { source: source.value },
        fix: fixable()
          ? (fixer) =>
              fixer.replaceTextRange(
                [source.range[0] + 1, source.range[1] - 1],
                'vue'
              )
          : null
      })
    }

    return {
      ImportDeclaration(node) {
        // Skip imports without specifiers in `.d.ts` files
        if (
          node.specifiers.length === 0 &&
          context.getFilename().endsWith('.d.ts')
        )
          return

        verifySource(node.source, () => {
          if (SUBSET_AT_VUE_MODULES.has(node.source.value)) {
            // If the module is a subset of 'vue', we can safely change it to 'vue'.
            return true
          }
          for (const name of extractImportNames(node)) {
            if (name == null) {
              return false // import all
            }
            if (!vue3ExportNames.has(name)) {
              // If there is a name that is not exported from 'vue', it will not be auto-fixed.
              return false
            }
          }
          return true
        })
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          verifySource(node.source, () => {
            for (const specifier of node.specifiers) {
              if (!vue3ExportNames.has(specifier.local.name)) {
                // If there is a name that is not exported from 'vue', it will not be auto-fixed.
                return false
              }
            }
            return true
          })
        }
      },
      ExportAllDeclaration(node) {
        verifySource(
          node.source,
          // If we change it to `from 'vue'`, it will export more, so it will not be auto-fixed.
          () => false
        )
      }
    }
  }
}
