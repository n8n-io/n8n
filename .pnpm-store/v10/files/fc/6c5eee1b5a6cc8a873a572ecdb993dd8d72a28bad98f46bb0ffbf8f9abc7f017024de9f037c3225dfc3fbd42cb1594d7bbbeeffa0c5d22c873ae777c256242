import * as semver from 'semver';
import { cjsRequire } from '../require.js';
import { createRule, lazy, resolve } from '../utils/index.js';
const isTypeScriptVersionSupportPreferInline = lazy(() => {
    let typescriptPkg;
    try {
        typescriptPkg = cjsRequire('typescript/package.json');
    }
    catch {
    }
    return !typescriptPkg || !semver.satisfies(typescriptPkg.version, '>= 4.5');
});
function checkImports(imported, context) {
    imported.forEach((nodes, module) => {
        if (nodes.length <= 1) {
            return;
        }
        for (let i = 0, len = nodes.length; i < len; i++) {
            const node = nodes[i];
            context.report({
                node: node.source,
                messageId: 'duplicate',
                data: {
                    module,
                },
                fix: i === 0 ? getFix(nodes, context.sourceCode, context) : null,
            });
        }
    });
}
function getFix(nodes, sourceCode, context) {
    const first = nodes[0];
    if (hasProblematicComments(first, sourceCode) || hasNamespace(first)) {
        return null;
    }
    const defaultImportNames = new Set(nodes.flatMap(x => getDefaultImportName(x) || []));
    if (defaultImportNames.size > 1) {
        return null;
    }
    const rest = nodes.slice(1);
    const restWithoutCommentsAndNamespaces = rest.filter(node => !hasProblematicComments(node, sourceCode) && !hasNamespace(node));
    const restWithoutCommentsAndNamespacesHasSpecifiers = restWithoutCommentsAndNamespaces.map(hasSpecifiers);
    const specifiers = restWithoutCommentsAndNamespaces.reduce((acc, node, nodeIndex) => {
        const tokens = sourceCode.getTokens(node);
        const openBrace = tokens.find(token => isPunctuator(token, '{'));
        const closeBrace = tokens.find(token => isPunctuator(token, '}'));
        if (openBrace == null || closeBrace == null) {
            return acc;
        }
        acc.push({
            importNode: node,
            identifiers: sourceCode.text
                .slice(openBrace.range[1], closeBrace.range[0])
                .split(','),
            isEmpty: !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex],
        });
        return acc;
    }, []);
    const unnecessaryImports = restWithoutCommentsAndNamespaces.filter((node, nodeIndex) => !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex] &&
        !specifiers.some(specifier => specifier.importNode === node));
    const shouldAddSpecifiers = specifiers.length > 0;
    const shouldRemoveUnnecessary = unnecessaryImports.length > 0;
    const shouldAddDefault = lazy(() => getDefaultImportName(first) == null && defaultImportNames.size === 1);
    if (!shouldAddSpecifiers && !shouldRemoveUnnecessary && !shouldAddDefault()) {
        return null;
    }
    const preferInline = context.options[0] && context.options[0]['prefer-inline'];
    return (fixer) => {
        const tokens = sourceCode.getTokens(first);
        const openBrace = tokens.find(token => isPunctuator(token, '{'));
        const closeBrace = tokens.find(token => isPunctuator(token, '}'));
        const firstToken = sourceCode.getFirstToken(first);
        const [defaultImportName] = defaultImportNames;
        const firstHasTrailingComma = closeBrace != null &&
            isPunctuator(sourceCode.getTokenBefore(closeBrace), ',');
        const firstIsEmpty = !hasSpecifiers(first);
        const firstExistingIdentifiers = firstIsEmpty
            ? new Set()
            : new Set(sourceCode.text
                .slice(openBrace.range[1], closeBrace.range[0])
                .split(',')
                .map(x => x.split(' as ')[0].trim()));
        const [specifiersText] = specifiers.reduce(([result, needsComma, existingIdentifiers], specifier) => {
            const isTypeSpecifier = 'importNode' in specifier &&
                specifier.importNode.importKind === 'type';
            if (preferInline && isTypeScriptVersionSupportPreferInline()) {
                throw new Error('Your version of TypeScript does not support inline type imports.');
            }
            const [specifierText, updatedExistingIdentifiers] = specifier.identifiers.reduce(([text, set], cur) => {
                const trimmed = cur.trim();
                if (trimmed.length === 0 || existingIdentifiers.has(trimmed)) {
                    return [text, set];
                }
                const curWithType = preferInline && isTypeSpecifier
                    ? cur.replace(/^(\s*)/, '$1type ')
                    : cur;
                return [
                    text.length > 0 ? `${text},${curWithType}` : curWithType,
                    set.add(trimmed),
                ];
            }, ['', existingIdentifiers]);
            return [
                needsComma && !specifier.isEmpty && specifierText.length > 0
                    ? `${result},${specifierText}`
                    : `${result}${specifierText}`,
                specifier.isEmpty ? needsComma : true,
                updatedExistingIdentifiers,
            ];
        }, ['', !firstHasTrailingComma && !firstIsEmpty, firstExistingIdentifiers]);
        const fixes = [];
        if (shouldAddSpecifiers && preferInline && first.importKind === 'type') {
            const typeIdentifierToken = tokens.find(token => token.type === 'Identifier' && token.value === 'type');
            if (typeIdentifierToken) {
                fixes.push(fixer.removeRange([
                    typeIdentifierToken.range[0],
                    typeIdentifierToken.range[1] + 1,
                ]));
            }
            for (const identifier of tokens.filter(token => firstExistingIdentifiers.has(token.value))) {
                fixes.push(fixer.replaceTextRange([identifier.range[0], identifier.range[1]], `type ${identifier.value}`));
            }
        }
        if (openBrace == null && shouldAddSpecifiers && shouldAddDefault()) {
            fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName}, {${specifiersText}} from`));
        }
        else if (openBrace == null &&
            !shouldAddSpecifiers &&
            shouldAddDefault()) {
            fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName} from`));
        }
        else if (openBrace != null && closeBrace != null && shouldAddDefault()) {
            fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName},`));
            if (shouldAddSpecifiers) {
                fixes.push(fixer.insertTextBefore(closeBrace, specifiersText));
            }
        }
        else if (openBrace == null &&
            shouldAddSpecifiers &&
            !shouldAddDefault()) {
            if (first.specifiers.length === 0) {
                fixes.push(fixer.insertTextAfter(firstToken, ` {${specifiersText}} from`));
            }
            else {
                fixes.push(fixer.insertTextAfter(first.specifiers[0], `, {${specifiersText}}`));
            }
        }
        else if (openBrace != null && closeBrace != null && !shouldAddDefault()) {
            const tokenBefore = sourceCode.getTokenBefore(closeBrace);
            fixes.push(fixer.insertTextAfter(tokenBefore, specifiersText));
        }
        for (const specifier of specifiers) {
            const importNode = specifier.importNode;
            fixes.push(fixer.remove(importNode));
            const charAfterImportRange = [
                importNode.range[1],
                importNode.range[1] + 1,
            ];
            const charAfterImport = sourceCode.text.slice(charAfterImportRange[0], charAfterImportRange[1]);
            if (charAfterImport === '\n') {
                fixes.push(fixer.removeRange(charAfterImportRange));
            }
        }
        for (const node of unnecessaryImports) {
            fixes.push(fixer.remove(node));
            const charAfterImportRange = [node.range[1], node.range[1] + 1];
            const charAfterImport = sourceCode.text.slice(charAfterImportRange[0], charAfterImportRange[1]);
            if (charAfterImport === '\n') {
                fixes.push(fixer.removeRange(charAfterImportRange));
            }
        }
        return fixes;
    };
}
function isPunctuator(node, value) {
    return node.type === 'Punctuator' && node.value === value;
}
function getDefaultImportName(node) {
    const defaultSpecifier = node.specifiers.find(specifier => specifier.type === 'ImportDefaultSpecifier');
    return defaultSpecifier?.local.name;
}
function hasNamespace(node) {
    return node.specifiers.some(specifier => specifier.type === 'ImportNamespaceSpecifier');
}
function hasSpecifiers(node) {
    return node.specifiers.some(specifier => specifier.type === 'ImportSpecifier');
}
function hasProblematicComments(node, sourceCode) {
    return (hasCommentBefore(node, sourceCode) ||
        hasCommentAfter(node, sourceCode) ||
        hasCommentInsideNonSpecifiers(node, sourceCode));
}
function hasCommentBefore(node, sourceCode) {
    return sourceCode
        .getCommentsBefore(node)
        .some(comment => comment.loc.end.line >= node.loc.start.line - 1);
}
function hasCommentAfter(node, sourceCode) {
    return sourceCode
        .getCommentsAfter(node)
        .some(comment => comment.loc.start.line === node.loc.end.line);
}
function hasCommentInsideNonSpecifiers(node, sourceCode) {
    const tokens = sourceCode.getTokens(node);
    const openBraceIndex = tokens.findIndex(token => isPunctuator(token, '{'));
    const closeBraceIndex = tokens.findIndex(token => isPunctuator(token, '}'));
    const someTokens = openBraceIndex !== -1 && closeBraceIndex !== -1
        ? [
            ...tokens.slice(1, openBraceIndex + 1),
            ...tokens.slice(closeBraceIndex + 1),
        ]
        : tokens.slice(1);
    return someTokens.some(token => sourceCode.getCommentsBefore(token).length > 0);
}
export default createRule({
    name: 'no-duplicates',
    meta: {
        type: 'problem',
        docs: {
            category: 'Style guide',
            description: 'Forbid repeated import of the same module in multiple places.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    considerQueryString: {
                        type: 'boolean',
                    },
                    'prefer-inline': {
                        type: 'boolean',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            duplicate: "'{{module}}' imported multiple times.",
        },
    },
    defaultOptions: [],
    create(context) {
        const preferInline = context.options[0]?.['prefer-inline'];
        const considerQueryStringOption = context.options[0]?.considerQueryString;
        const defaultResolver = (sourcePath) => resolve(sourcePath, context) || sourcePath;
        const resolver = considerQueryStringOption
            ? (sourcePath) => {
                const parts = sourcePath.match(/^([^?]*)\?(.*)$/);
                if (!parts) {
                    return defaultResolver(sourcePath);
                }
                return `${defaultResolver(parts[1])}?${parts[2]}`;
            }
            : defaultResolver;
        const moduleMaps = new Map();
        function getImportMap(n) {
            const parent = n.parent;
            let map;
            if (moduleMaps.has(parent)) {
                map = moduleMaps.get(parent);
            }
            else {
                map = {
                    imported: new Map(),
                    nsImported: new Map(),
                    defaultTypesImported: new Map(),
                    namespaceTypesImported: new Map(),
                    namedTypesImported: new Map(),
                };
                moduleMaps.set(parent, map);
            }
            if (n.importKind === 'type') {
                if (n.specifiers.length > 0 &&
                    n.specifiers[0].type === 'ImportDefaultSpecifier') {
                    return map.defaultTypesImported;
                }
                if (n.specifiers.length > 0 &&
                    n.specifiers[0].type === 'ImportNamespaceSpecifier') {
                    return map.namespaceTypesImported;
                }
                if (!preferInline) {
                    return map.namedTypesImported;
                }
            }
            if (!preferInline &&
                n.specifiers.some(spec => 'importKind' in spec && spec.importKind === 'type')) {
                return map.namedTypesImported;
            }
            return hasNamespace(n) ? map.nsImported : map.imported;
        }
        return {
            ImportDeclaration(n) {
                const resolvedPath = resolver(n.source.value);
                const importMap = getImportMap(n);
                if (importMap.has(resolvedPath)) {
                    importMap.get(resolvedPath).push(n);
                }
                else {
                    importMap.set(resolvedPath, [n]);
                }
            },
            'Program:exit'() {
                for (const map of moduleMaps.values()) {
                    checkImports(map.imported, context);
                    checkImports(map.nsImported, context);
                    checkImports(map.defaultTypesImported, context);
                    checkImports(map.namedTypesImported, context);
                }
            },
        };
    },
});
//# sourceMappingURL=no-duplicates.js.map