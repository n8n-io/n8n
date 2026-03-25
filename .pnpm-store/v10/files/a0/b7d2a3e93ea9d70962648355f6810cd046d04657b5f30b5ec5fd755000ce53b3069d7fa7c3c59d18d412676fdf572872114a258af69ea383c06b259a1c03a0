import { createRule, getValue } from '../utils/index.js';
function isComma(token) {
    return token.type === 'Punctuator' && token.value === ',';
}
function removeSpecifiers(fixes, fixer, sourceCode, specifiers) {
    for (const specifier of specifiers) {
        const token = sourceCode.getTokenAfter(specifier);
        if (token && isComma(token)) {
            fixes.push(fixer.remove(token));
        }
        fixes.push(fixer.remove(specifier));
    }
}
function getImportText(node, sourceCode, specifiers, kind) {
    const sourceString = sourceCode.getText(node.source);
    if (specifiers.length === 0) {
        return '';
    }
    const names = specifiers.map(s => {
        const importedName = getValue(s.imported);
        if (importedName === s.local.name) {
            return importedName;
        }
        return `${importedName} as ${s.local.name}`;
    });
    return `import ${kind} {${names.join(', ')}} from ${sourceString};`;
}
export default createRule({
    name: 'consistent-type-specifier-style',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Enforce or ban the use of inline type-only markers for named imports.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'string',
                enum: ['prefer-top-level', 'prefer-inline'],
                default: 'prefer-top-level',
            },
        ],
        messages: {
            inline: 'Prefer using inline {{kind}} specifiers instead of a top-level {{kind}}-only import.',
            topLevel: 'Prefer using a top-level {{kind}}-only import instead of inline {{kind}} specifiers.',
        },
    },
    defaultOptions: [],
    create(context) {
        const { sourceCode } = context;
        if (context.options[0] === 'prefer-inline') {
            return {
                ImportDeclaration(node) {
                    if (node.importKind === 'value' || node.importKind == null) {
                        return;
                    }
                    if (node.specifiers.length === 0 ||
                        (node.specifiers.length === 1 &&
                            (node.specifiers[0].type === 'ImportDefaultSpecifier' ||
                                node.specifiers[0].type === 'ImportNamespaceSpecifier'))) {
                        return;
                    }
                    context.report({
                        node,
                        messageId: 'inline',
                        data: {
                            kind: node.importKind,
                        },
                        fix(fixer) {
                            const kindToken = sourceCode.getFirstToken(node, { skip: 1 });
                            return [
                                kindToken ? fixer.remove(kindToken) : [],
                                node.specifiers.map(specifier => fixer.insertTextBefore(specifier, `${node.importKind} `)),
                            ].flat();
                        },
                    });
                },
            };
        }
        return {
            ImportDeclaration(node) {
                if (node.importKind === 'type' ||
                    node.importKind === 'typeof' ||
                    node.specifiers.length === 0 ||
                    (node.specifiers.length === 1 &&
                        (node.specifiers[0].type === 'ImportDefaultSpecifier' ||
                            node.specifiers[0].type === 'ImportNamespaceSpecifier'))) {
                    return;
                }
                const typeSpecifiers = [];
                const typeofSpecifiers = [];
                const valueSpecifiers = [];
                let defaultSpecifier = null;
                for (const specifier of node.specifiers) {
                    if (specifier.type === 'ImportDefaultSpecifier') {
                        defaultSpecifier = specifier;
                        continue;
                    }
                    if (!('importKind' in specifier)) {
                        continue;
                    }
                    if (specifier.importKind === 'type') {
                        typeSpecifiers.push(specifier);
                    }
                    else if (specifier.importKind === 'typeof') {
                        typeofSpecifiers.push(specifier);
                    }
                    else if (specifier.importKind === 'value' ||
                        specifier.importKind == null) {
                        valueSpecifiers.push(specifier);
                    }
                }
                const typeImport = getImportText(node, sourceCode, typeSpecifiers, 'type');
                const typeofImport = getImportText(node, sourceCode, typeofSpecifiers, 'typeof');
                const newImports = `${typeImport}\n${typeofImport}`.trim();
                if (typeSpecifiers.length + typeofSpecifiers.length ===
                    node.specifiers.length) {
                    const kind = [
                        typeSpecifiers.length > 0 ? 'type' : [],
                        typeofSpecifiers.length > 0 ? 'typeof' : [],
                    ].flat();
                    context.report({
                        node,
                        messageId: 'topLevel',
                        data: {
                            kind: kind.join('/'),
                        },
                        fix(fixer) {
                            return fixer.replaceText(node, newImports);
                        },
                    });
                }
                else {
                    for (const specifier of [...typeSpecifiers, ...typeofSpecifiers]) {
                        context.report({
                            node: specifier,
                            messageId: 'topLevel',
                            data: {
                                kind: specifier.importKind,
                            },
                            fix(fixer) {
                                const fixes = [];
                                if (valueSpecifiers.length > 0) {
                                    removeSpecifiers(fixes, fixer, sourceCode, typeSpecifiers);
                                    removeSpecifiers(fixes, fixer, sourceCode, typeofSpecifiers);
                                    const maybeComma = sourceCode.getTokenAfter(valueSpecifiers[valueSpecifiers.length - 1]);
                                    if (isComma(maybeComma)) {
                                        fixes.push(fixer.remove(maybeComma));
                                    }
                                }
                                else if (defaultSpecifier) {
                                    const comma = sourceCode.getTokenAfter(defaultSpecifier, isComma);
                                    const closingBrace = sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1], token => token.type === 'Punctuator' && token.value === '}');
                                    fixes.push(fixer.removeRange([
                                        comma.range[0],
                                        closingBrace.range[1],
                                    ]));
                                }
                                return [
                                    ...fixes,
                                    fixer.insertTextAfter(node, `\n${newImports}`),
                                ];
                            },
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=consistent-type-specifier-style.js.map