/**
 * @fileoverview Rule to disallow the use of a chain for a single method
 */
'use strict'

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const {isFullLodashImport, getNameFromCjsRequire, getMethodImportFromName} = require('../util/importUtil')
const getDocsUrl = require('../util/getDocsUrl')
const every = require('lodash/every')
const includes = require('lodash/includes')

const messages = {
    method: 'Import individual methods from the Lodash module.',
    member: 'Import members from the full Lodash module.',
    full: 'Use the full Lodash module.',
    'method-package': 'Import Lodash methods only from method packages (e.g. lodash.map)'
}

const importNodeTypes = {
    method: ['ImportDefaultSpecifier'],
    'method-package': ['ImportDefaultSpecifier'],
    member: ['ImportSpecifier'],
    full: ['ImportDefaultSpecifier', 'ImportNamespaceSpecifier']
}

const isMethodImport = name => getMethodImportFromName(name) && !includes(name, '.')
const isMethodPackageImport = name => getMethodImportFromName(name) && includes(name, '.')
const allImportsAreOfType = (node, types) => every(node.specifiers, specifier => includes(types, specifier.type))

/**
 * Creates a fix(fixer) method for `full` imports
 * @param {*} context
 * @param {*} node
 * @returns
 */
const createFullFix = (context, node) => {
    const sourceCode = context.getSourceCode()
    const text = sourceCode.getText(node)
    if (!/.*(lodash)';$/.test(text)) {
        return () => []
    }

    const regexp = new RegExp(/(\w+)/g)
    const matches = text.match(regexp)
    if (!matches) {
        return () => []
    }

    const libs = matches
        .filter(match => !['import', 'from', 'lodash'].includes(match))
    if (!libs || libs.length < 1) {
        return () => []
    }

    const imports = libs
        .sort()
        .map(lib => `import ${lib} from 'lodash/${lib}';`)
        .join('\n')

    return fixer => [fixer.insertTextAfter(node, imports), fixer.remove(node)]
}

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            url: getDocsUrl('import-scope')
        },
        schema: [{
            enum: ['method', 'member', 'full', 'method-package']
        }]
    },

    create(context) {
        const importType = context.options[0] || 'method'

        return {
            ImportDeclaration(node) {
                if (isFullLodashImport(node.source.value)) {
                    if (importType === 'method' || importType === 'method-package') {
                        context.report({node, message: messages[importType]})
                    } else if (!allImportsAreOfType(node, importNodeTypes[importType])) {
                        context.report({node, message: messages[importType]})
                    }
                } else if ((isMethodImport(node.source.value) && importType !== 'method') ||
                           (isMethodPackageImport(node.source.value) && importType !== 'method-package')) {
                    context.report({node, message: messages[importType], fix: createFullFix(context, node)})
                }
            },
            VariableDeclarator(node) {
                const name = getNameFromCjsRequire(node.init)
                if (isFullLodashImport(name)) {
                    if (importType === 'method' || importType === 'method-package') {
                        context.report({node, message: messages[importType]})
                    } else {
                        const isObjectPattern = node.id.type === 'ObjectPattern'
                        const isMemberImport = importType === 'member'
                        if (isObjectPattern !== isMemberImport) {
                            context.report({node, message: messages[importType]})
                        }
                    }
                } else if ((isMethodImport(name) && importType !== 'method') ||
                           (isMethodPackageImport(name) && importType !== 'method-package')) {
                    context.report({node, message: messages[importType]})
                }
            }
        }
    }
}
