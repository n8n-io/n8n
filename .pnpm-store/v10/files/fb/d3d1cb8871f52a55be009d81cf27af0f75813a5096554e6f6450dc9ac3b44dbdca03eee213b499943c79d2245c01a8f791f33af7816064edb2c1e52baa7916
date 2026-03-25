import type { TSESLint } from '@typescript-eslint/utils';
import { meta } from './meta.js';
import { createNodeResolver } from './node-resolver.js';
import { cjsRequire } from './require.js';
import type { PluginConfig, PluginFlatConfig } from './types.js';
import { importXResolverCompat } from './utils/index.js';
declare const rules: {
    'no-unresolved': TSESLint.RuleModule<import("./rules/no-unresolved.js").MessageId, [(import("./rules/no-unresolved.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    named: TSESLint.RuleModule<import("./rules/named.js").MessageId, [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    default: TSESLint.RuleModule<"noDefaultExport", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    namespace: TSESLint.RuleModule<import("./rules/namespace.js").MessageId, [import("./rules/namespace.js").Options], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-namespace': TSESLint.RuleModule<"noNamespace", [(import("./rules/no-namespace.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    export: TSESLint.RuleModule<import("./rules/export.js").MessageId, [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-mutable-exports': TSESLint.RuleModule<"noMutable", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    extensions: TSESLint.RuleModule<import("./rules/extensions.js").MessageId, import("./rules/extensions.js").Options, import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-restricted-paths': TSESLint.RuleModule<import("./rules/no-restricted-paths.js").MessageId, [(import("./rules/no-restricted-paths.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-internal-modules': TSESLint.RuleModule<"noAllowed", [(import("./rules/no-internal-modules.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'group-exports': TSESLint.RuleModule<import("./rules/group-exports.js").MessageId, [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-relative-packages': TSESLint.RuleModule<"noAllowed", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-relative-parent-imports': TSESLint.RuleModule<"noAllowed", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'consistent-type-specifier-style': TSESLint.RuleModule<"inline" | "topLevel", [(import("./rules/consistent-type-specifier-style.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-self-import': TSESLint.RuleModule<"self", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-cycle': TSESLint.RuleModule<import("./rules/no-cycle.js").MessageId, [(import("./rules/no-cycle.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-default': TSESLint.RuleModule<"default", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-as-default': TSESLint.RuleModule<"default", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-as-default-member': TSESLint.RuleModule<"member", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-anonymous-default-export': TSESLint.RuleModule<"assign" | "anonymous", [(import("./rules/no-anonymous-default-export.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-rename-default': TSESLint.RuleModule<"renameDefault", [(import("./rules/no-rename-default.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-unused-modules': TSESLint.RuleModule<"notFound" | "unused", import("./rules/no-unused-modules.js").Options[], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-commonjs': TSESLint.RuleModule<"import" | "export", [(import("./rules/no-commonjs.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-amd': TSESLint.RuleModule<"amd", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-duplicates': TSESLint.RuleModule<"duplicate", [(import("./rules/no-duplicates.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    first: TSESLint.RuleModule<import("./rules/first.js").MessageId, [(import("./rules/first.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'max-dependencies': TSESLint.RuleModule<"max", [(import("./rules/max-dependencies.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-extraneous-dependencies': TSESLint.RuleModule<import("./rules/no-extraneous-dependencies.js").MessageId, [(import("./rules/no-extraneous-dependencies.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-absolute-path': TSESLint.RuleModule<"absolute", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-nodejs-modules': TSESLint.RuleModule<"builtin", [(import("./rules/no-nodejs-modules.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-webpack-loader-syntax': TSESLint.RuleModule<"unexpected", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    order: TSESLint.RuleModule<"error" | "order" | "noLineWithinGroup" | "noLineBetweenGroups" | "oneLineBetweenGroups" | "oneLineBetweenTheMultiLineImport" | "oneLineBetweenThisMultiLineImport" | "noLineBetweenSingleLineImport", [(import("./rules/order.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'newline-after-import': TSESLint.RuleModule<"newline", [(import("./rules/newline-after-import.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'prefer-default-export': TSESLint.RuleModule<"any" | "single", [(import("./rules/prefer-default-export.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-default-export': TSESLint.RuleModule<"preferNamed" | "noAliasDefault", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-named-export': TSESLint.RuleModule<"noAllowed", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-dynamic-require': TSESLint.RuleModule<import("./rules/no-dynamic-require.js").MessageId, [(import("./rules/no-dynamic-require.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    unambiguous: TSESLint.RuleModule<"module", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-unassigned-import': TSESLint.RuleModule<"unassigned", [(import("./rules/no-unassigned-import.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-useless-path-segments': TSESLint.RuleModule<"useless", [(import("./rules/no-useless-path-segments.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'dynamic-import-chunkname': TSESLint.RuleModule<import("./rules/dynamic-import-chunkname.js").MessageId, [(import("./rules/dynamic-import-chunkname.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-import-module-exports': TSESLint.RuleModule<"notAllowed", [(import("./rules/no-import-module-exports.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-empty-named-blocks': TSESLint.RuleModule<"emptyNamed" | "unused" | "emptyImport", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'exports-last': TSESLint.RuleModule<"end", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'no-deprecated': TSESLint.RuleModule<"deprecated" | "deprecatedDesc", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    'imports-first': TSESLint.RuleModule<import("./rules/first.js").MessageId, [(import("./rules/first.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
};
declare const plugin_: {
    meta: {
        name: string;
        version: string;
    };
    rules: {
        'no-unresolved': TSESLint.RuleModule<import("./rules/no-unresolved.js").MessageId, [(import("./rules/no-unresolved.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        named: TSESLint.RuleModule<import("./rules/named.js").MessageId, [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        default: TSESLint.RuleModule<"noDefaultExport", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        namespace: TSESLint.RuleModule<import("./rules/namespace.js").MessageId, [import("./rules/namespace.js").Options], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-namespace': TSESLint.RuleModule<"noNamespace", [(import("./rules/no-namespace.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        export: TSESLint.RuleModule<import("./rules/export.js").MessageId, [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-mutable-exports': TSESLint.RuleModule<"noMutable", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        extensions: TSESLint.RuleModule<import("./rules/extensions.js").MessageId, import("./rules/extensions.js").Options, import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-restricted-paths': TSESLint.RuleModule<import("./rules/no-restricted-paths.js").MessageId, [(import("./rules/no-restricted-paths.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-internal-modules': TSESLint.RuleModule<"noAllowed", [(import("./rules/no-internal-modules.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'group-exports': TSESLint.RuleModule<import("./rules/group-exports.js").MessageId, [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-relative-packages': TSESLint.RuleModule<"noAllowed", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-relative-parent-imports': TSESLint.RuleModule<"noAllowed", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'consistent-type-specifier-style': TSESLint.RuleModule<"inline" | "topLevel", [(import("./rules/consistent-type-specifier-style.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-self-import': TSESLint.RuleModule<"self", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-cycle': TSESLint.RuleModule<import("./rules/no-cycle.js").MessageId, [(import("./rules/no-cycle.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-named-default': TSESLint.RuleModule<"default", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-named-as-default': TSESLint.RuleModule<"default", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-named-as-default-member': TSESLint.RuleModule<"member", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-anonymous-default-export': TSESLint.RuleModule<"assign" | "anonymous", [(import("./rules/no-anonymous-default-export.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-rename-default': TSESLint.RuleModule<"renameDefault", [(import("./rules/no-rename-default.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-unused-modules': TSESLint.RuleModule<"notFound" | "unused", import("./rules/no-unused-modules.js").Options[], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-commonjs': TSESLint.RuleModule<"import" | "export", [(import("./rules/no-commonjs.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-amd': TSESLint.RuleModule<"amd", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-duplicates': TSESLint.RuleModule<"duplicate", [(import("./rules/no-duplicates.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        first: TSESLint.RuleModule<import("./rules/first.js").MessageId, [(import("./rules/first.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'max-dependencies': TSESLint.RuleModule<"max", [(import("./rules/max-dependencies.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-extraneous-dependencies': TSESLint.RuleModule<import("./rules/no-extraneous-dependencies.js").MessageId, [(import("./rules/no-extraneous-dependencies.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-absolute-path': TSESLint.RuleModule<"absolute", [(import("./utils/module-visitor.ts").ModuleOptions | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-nodejs-modules': TSESLint.RuleModule<"builtin", [(import("./rules/no-nodejs-modules.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-webpack-loader-syntax': TSESLint.RuleModule<"unexpected", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        order: TSESLint.RuleModule<"error" | "order" | "noLineWithinGroup" | "noLineBetweenGroups" | "oneLineBetweenGroups" | "oneLineBetweenTheMultiLineImport" | "oneLineBetweenThisMultiLineImport" | "noLineBetweenSingleLineImport", [(import("./rules/order.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'newline-after-import': TSESLint.RuleModule<"newline", [(import("./rules/newline-after-import.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'prefer-default-export': TSESLint.RuleModule<"any" | "single", [(import("./rules/prefer-default-export.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-default-export': TSESLint.RuleModule<"preferNamed" | "noAliasDefault", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-named-export': TSESLint.RuleModule<"noAllowed", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-dynamic-require': TSESLint.RuleModule<import("./rules/no-dynamic-require.js").MessageId, [(import("./rules/no-dynamic-require.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        unambiguous: TSESLint.RuleModule<"module", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-unassigned-import': TSESLint.RuleModule<"unassigned", [(import("./rules/no-unassigned-import.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-useless-path-segments': TSESLint.RuleModule<"useless", [(import("./rules/no-useless-path-segments.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'dynamic-import-chunkname': TSESLint.RuleModule<import("./rules/dynamic-import-chunkname.js").MessageId, [(import("./rules/dynamic-import-chunkname.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-import-module-exports': TSESLint.RuleModule<"notAllowed", [(import("./rules/no-import-module-exports.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-empty-named-blocks': TSESLint.RuleModule<"emptyNamed" | "unused" | "emptyImport", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'exports-last': TSESLint.RuleModule<"end", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'no-deprecated': TSESLint.RuleModule<"deprecated" | "deprecatedDesc", [], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
        'imports-first': TSESLint.RuleModule<import("./rules/first.js").MessageId, [(import("./rules/first.js").Options | undefined)?], import("./utils/create-rule.ts").ImportXPluginDocs, TSESLint.RuleListener>;
    };
    cjsRequire: import("./types.js").CjsRequire;
    importXResolverCompat: typeof importXResolverCompat;
    createNodeResolver: typeof createNodeResolver;
};
declare const flatConfigs: {
    recommended: PluginFlatConfig;
    errors: PluginFlatConfig;
    warnings: PluginFlatConfig;
    'stage-0': PluginFlatConfig;
    react: PluginFlatConfig;
    'react-native': PluginFlatConfig;
    electron: PluginFlatConfig;
    typescript: PluginFlatConfig;
};
declare const configs: {
    recommended: {
        plugins: ["import-x"];
        rules: {
            'import-x/no-unresolved': "error";
            'import-x/named': "error";
            'import-x/namespace': "error";
            'import-x/default': "error";
            'import-x/export': "error";
            'import-x/no-named-as-default': "warn";
            'import-x/no-named-as-default-member': "warn";
            'import-x/no-duplicates': "warn";
        };
        parserOptions: {
            sourceType: "module";
            ecmaVersion: 2018;
        };
    };
    errors: {
        plugins: ["import-x"];
        rules: {
            'import-x/no-unresolved': 2;
            'import-x/named': 2;
            'import-x/namespace': 2;
            'import-x/default': 2;
            'import-x/export': 2;
        };
    };
    warnings: {
        plugins: ["import-x"];
        rules: {
            'import-x/no-named-as-default': 1;
            'import-x/no-named-as-default-member': 1;
            'import-x/no-rename-default': 1;
            'import-x/no-duplicates': 1;
        };
    };
    'stage-0': PluginConfig;
    react: {
        settings: {
            'import-x/extensions': (".js" | ".jsx")[];
        };
        parserOptions: {
            ecmaFeatures: {
                jsx: true;
            };
        };
    };
    'react-native': {
        settings: {
            'import-x/resolver': {
                node: {
                    extensions: string[];
                };
            };
        };
    };
    electron: {
        settings: {
            'import-x/core-modules': string[];
        };
    };
    typescript: {
        settings: {
            'import-x/extensions': readonly [".ts", ".tsx", ".cts", ".mts", ".js", ".jsx", ".cjs", ".mjs"];
            'import-x/external-module-folders': string[];
            'import-x/parsers': {
                '@typescript-eslint/parser': (".ts" | ".tsx" | ".cts" | ".mts")[];
            };
            'import-x/resolver': {
                typescript: true;
            };
        };
        rules: {
            'import-x/named': "off";
        };
    };
    'flat/recommended': PluginFlatConfig;
    'flat/errors': PluginFlatConfig;
    'flat/warnings': PluginFlatConfig;
    'flat/stage-0': PluginFlatConfig;
    'flat/react': PluginFlatConfig;
    'flat/react-native': PluginFlatConfig;
    'flat/electron': PluginFlatConfig;
    'flat/typescript': PluginFlatConfig;
};
declare const plugin: typeof plugin_ & {
    flatConfigs: typeof flatConfigs;
    configs: typeof configs;
};
export default plugin;
export { meta, configs, flatConfigs, rules, cjsRequire, importXResolverCompat, createNodeResolver, plugin as importX, };
export type * from './types.js';
