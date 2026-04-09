import { createRule } from '../utils/index.js';
export default createRule({
    name: 'prefer-namespace-import',
    meta: {
        type: 'problem',
        docs: {
            category: 'Style guide',
            description: 'Enforce using namespace imports for specific modules, like `react`/`react-dom`, etc.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    patterns: {
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
            preferNamespaceImport: 'Prefer importing {{specifier}} as \'import * as {{specifier}} from "{{source}}"\';',
        },
    },
    defaultOptions: [],
    create(context) {
        const { patterns } = context.options[0] ?? {};
        if (!patterns?.length) {
            return {};
        }
        const regexps = patterns.map(toRegExp);
        return {
            ImportDefaultSpecifier(node) {
                const importSource = node.parent.source.value;
                if (!regexps.some(exp => exp.test(importSource))) {
                    return;
                }
                const defaultSpecifier = node.local.name;
                const hasOtherSpecifiers = node.parent.specifiers.length > 1;
                context.report({
                    messageId: 'preferNamespaceImport',
                    node: hasOtherSpecifiers ? node : node.parent,
                    data: {
                        source: importSource,
                        specifier: defaultSpecifier,
                    },
                    fix(fixer) {
                        const importDeclarationText = context.sourceCode.getText(node.parent);
                        const localName = node.local.name;
                        if (!hasOtherSpecifiers) {
                            return fixer.replaceText(node, `* as ${localName}`);
                        }
                        const isTypeImport = node.parent.importKind === 'type';
                        const importStringPrefix = `import${isTypeImport ? ' type' : ''}`;
                        const rightBraceIndex = importDeclarationText.indexOf('}') + 1;
                        const specifiers = importDeclarationText.slice(importDeclarationText.indexOf('{'), rightBraceIndex);
                        const remainingText = importDeclarationText.slice(rightBraceIndex);
                        return fixer.replaceText(node.parent, [
                            `${importStringPrefix} * as ${localName} ${remainingText.trimStart()}`,
                            `${importStringPrefix} ${specifiers}${remainingText}`,
                        ].join('\n'));
                    },
                });
            },
        };
    },
});
const REGEXP_STR = /^\/(.+)\/([A-Za-z]*)$/u;
function toRegExp(string) {
    const [, pattern, flags = 'u'] = REGEXP_STR.exec(string) ?? [];
    if (pattern != null) {
        return new RegExp(pattern, flags);
    }
    return { test: s => s === string };
}
//# sourceMappingURL=prefer-namespace-import.js.map