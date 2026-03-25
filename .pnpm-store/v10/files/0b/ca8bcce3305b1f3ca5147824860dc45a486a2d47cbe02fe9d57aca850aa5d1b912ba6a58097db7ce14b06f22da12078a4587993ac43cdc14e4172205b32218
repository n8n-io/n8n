import { minimatch } from 'minimatch';
import { createRule } from '../utils/index.js';
export default createRule({
    name: 'no-namespace',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid namespace (a.k.a. "wildcard" `*`) imports.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    ignore: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        uniqueItems: true,
                    },
                },
            },
        ],
        messages: {
            noNamespace: 'Unexpected namespace import.',
        },
    },
    defaultOptions: [],
    create(context) {
        const firstOption = context.options[0] || {};
        const ignoreGlobs = firstOption.ignore;
        return {
            ImportNamespaceSpecifier(node) {
                if (ignoreGlobs?.find(glob => minimatch(node.parent.source.value, glob, {
                    matchBase: true,
                    nocomment: true,
                }))) {
                    return;
                }
                const scopeVariables = context.sourceCode.getScope(node).variables;
                const namespaceVariable = scopeVariables.find(variable => variable.defs[0].node === node);
                const namespaceReferences = namespaceVariable.references;
                const namespaceIdentifiers = namespaceReferences.map(reference => reference.identifier);
                const canFix = namespaceIdentifiers.length > 0 &&
                    !usesNamespaceAsObject(namespaceIdentifiers);
                context.report({
                    node,
                    messageId: `noNamespace`,
                    fix: canFix
                        ? fixer => {
                            const scopeManager = context.sourceCode.scopeManager;
                            const fixes = [];
                            const importNameConflicts = {};
                            for (const identifier of namespaceIdentifiers) {
                                const parent = identifier.parent;
                                if (parent && parent.type === 'MemberExpression') {
                                    const importName = getMemberPropertyName(parent);
                                    const localConflicts = getVariableNamesInScope(scopeManager, parent);
                                    if (importNameConflicts[importName]) {
                                        for (const c of localConflicts)
                                            importNameConflicts[importName].add(c);
                                    }
                                    else {
                                        importNameConflicts[importName] = localConflicts;
                                    }
                                }
                            }
                            const importNames = Object.keys(importNameConflicts);
                            const importLocalNames = generateLocalNames(importNames, importNameConflicts, namespaceVariable.name);
                            const namedImportSpecifiers = importNames.map(importName => importName === importLocalNames[importName]
                                ? importName
                                : `${importName} as ${importLocalNames[importName]}`);
                            fixes.push(fixer.replaceText(node, `{ ${namedImportSpecifiers.join(', ')} }`));
                            for (const identifier of namespaceIdentifiers) {
                                const parent = identifier.parent;
                                if (parent && parent.type === 'MemberExpression') {
                                    const importName = getMemberPropertyName(parent);
                                    fixes.push(fixer.replaceText(parent, importLocalNames[importName]));
                                }
                            }
                            return fixes;
                        }
                        : null,
                });
            },
        };
    },
});
function usesNamespaceAsObject(namespaceIdentifiers) {
    return !namespaceIdentifiers.every(identifier => {
        const parent = identifier.parent;
        return (parent &&
            parent.type === 'MemberExpression' &&
            (parent.property.type === 'Identifier' ||
                parent.property.type === 'Literal'));
    });
}
function getMemberPropertyName(memberExpression) {
    return memberExpression.property.type === 'Identifier'
        ? memberExpression.property.name
        : memberExpression.property.value;
}
function getVariableNamesInScope(scopeManager, node) {
    let currentNode = node;
    let scope = scopeManager.acquire(currentNode);
    while (scope == null) {
        currentNode = currentNode.parent;
        scope = scopeManager.acquire(currentNode, true);
    }
    return new Set([...scope.variables, ...scope.upper.variables].map(variable => variable.name));
}
function generateLocalNames(names, nameConflicts, namespaceName) {
    const localNames = {};
    for (const name of names) {
        let localName;
        if (!nameConflicts[name].has(name)) {
            localName = name;
        }
        else if (nameConflicts[name].has(`${namespaceName}_${name}`)) {
            for (let i = 1; i < Number.POSITIVE_INFINITY; i++) {
                if (!nameConflicts[name].has(`${namespaceName}_${name}_${i}`)) {
                    localName = `${namespaceName}_${name}_${i}`;
                    break;
                }
            }
        }
        else {
            localName = `${namespaceName}_${name}`;
        }
        localNames[name] = localName;
    }
    return localNames;
}
//# sourceMappingURL=no-namespace.js.map