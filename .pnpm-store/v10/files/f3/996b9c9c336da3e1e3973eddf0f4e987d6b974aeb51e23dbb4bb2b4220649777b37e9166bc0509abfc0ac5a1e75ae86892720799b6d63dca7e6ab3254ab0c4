const typeScriptExtensions = ['.ts', '.tsx', '.cts', '.mts'];
const allExtensions = [
    ...typeScriptExtensions,
    '.js',
    '.jsx',
    '.cjs',
    '.mjs',
];
export default {
    settings: {
        'import-x/extensions': allExtensions,
        'import-x/external-module-folders': ['node_modules', 'node_modules/@types'],
        'import-x/parsers': {
            '@typescript-eslint/parser': [...typeScriptExtensions],
        },
        'import-x/resolver': {
            typescript: true,
        },
    },
    rules: {
        'import-x/named': 'off',
    },
};
//# sourceMappingURL=typescript.js.map