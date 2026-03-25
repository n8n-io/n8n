import electron from './config/electron.js';
import errors from './config/errors.js';
import electronFlat from './config/flat/electron.js';
import errorsFlat from './config/flat/errors.js';
import reactNativeFlat from './config/flat/react-native.js';
import reactFlat from './config/flat/react.js';
import recommendedFlat from './config/flat/recommended.js';
import stage0Flat from './config/flat/stage-0.js';
import typescriptFlat from './config/flat/typescript.js';
import warningsFlat from './config/flat/warnings.js';
import reactNative from './config/react-native.js';
import react from './config/react.js';
import recommended from './config/recommended.js';
import stage0 from './config/stage-0.js';
import typescript from './config/typescript.js';
import warnings from './config/warnings.js';
import { meta } from './meta.js';
import { createNodeResolver } from './node-resolver.js';
import { cjsRequire } from './require.js';
import consistentTypeSpecifierStyle from './rules/consistent-type-specifier-style.js';
import default_ from './rules/default.js';
import dynamicImportChunkname from './rules/dynamic-import-chunkname.js';
import export_ from './rules/export.js';
import exportsLast from './rules/exports-last.js';
import extensions from './rules/extensions.js';
import first from './rules/first.js';
import groupExports from './rules/group-exports.js';
import importsFirst from './rules/imports-first.js';
import maxDependencies from './rules/max-dependencies.js';
import named from './rules/named.js';
import namespace from './rules/namespace.js';
import newlineAfterImport from './rules/newline-after-import.js';
import noAbsolutePath from './rules/no-absolute-path.js';
import noAmd from './rules/no-amd.js';
import noAnonymousDefaultExport from './rules/no-anonymous-default-export.js';
import noCommonjs from './rules/no-commonjs.js';
import noCycle from './rules/no-cycle.js';
import noDefaultExport from './rules/no-default-export.js';
import noDeprecated from './rules/no-deprecated.js';
import noDuplicates from './rules/no-duplicates.js';
import noDynamicRequire from './rules/no-dynamic-require.js';
import noEmptyNamedBlocks from './rules/no-empty-named-blocks.js';
import noExtraneousDependencies from './rules/no-extraneous-dependencies.js';
import noImportModuleExports from './rules/no-import-module-exports.js';
import noInternalModules from './rules/no-internal-modules.js';
import noMutableExports from './rules/no-mutable-exports.js';
import noNamedAsDefaultMember from './rules/no-named-as-default-member.js';
import noNamedAsDefault from './rules/no-named-as-default.js';
import noNamedDefault from './rules/no-named-default.js';
import noNamedExport from './rules/no-named-export.js';
import noNamespace from './rules/no-namespace.js';
import noNodejsModules from './rules/no-nodejs-modules.js';
import noRelativePackages from './rules/no-relative-packages.js';
import noRelativeParentImports from './rules/no-relative-parent-imports.js';
import noRenameDefault from './rules/no-rename-default.js';
import noRestrictedPaths from './rules/no-restricted-paths.js';
import noSelfImport from './rules/no-self-import.js';
import noUnassignedImport from './rules/no-unassigned-import.js';
import noUnresolved from './rules/no-unresolved.js';
import noUnusedModules from './rules/no-unused-modules.js';
import noUselessPathSegments from './rules/no-useless-path-segments.js';
import noWebpackLoaderSyntax from './rules/no-webpack-loader-syntax.js';
import order from './rules/order.js';
import preferDefaultExport from './rules/prefer-default-export.js';
import unambiguous from './rules/unambiguous.js';
import { importXResolverCompat } from './utils/index.js';
const rules = {
    'no-unresolved': noUnresolved,
    named,
    default: default_,
    namespace,
    'no-namespace': noNamespace,
    export: export_,
    'no-mutable-exports': noMutableExports,
    extensions,
    'no-restricted-paths': noRestrictedPaths,
    'no-internal-modules': noInternalModules,
    'group-exports': groupExports,
    'no-relative-packages': noRelativePackages,
    'no-relative-parent-imports': noRelativeParentImports,
    'consistent-type-specifier-style': consistentTypeSpecifierStyle,
    'no-self-import': noSelfImport,
    'no-cycle': noCycle,
    'no-named-default': noNamedDefault,
    'no-named-as-default': noNamedAsDefault,
    'no-named-as-default-member': noNamedAsDefaultMember,
    'no-anonymous-default-export': noAnonymousDefaultExport,
    'no-rename-default': noRenameDefault,
    'no-unused-modules': noUnusedModules,
    'no-commonjs': noCommonjs,
    'no-amd': noAmd,
    'no-duplicates': noDuplicates,
    first,
    'max-dependencies': maxDependencies,
    'no-extraneous-dependencies': noExtraneousDependencies,
    'no-absolute-path': noAbsolutePath,
    'no-nodejs-modules': noNodejsModules,
    'no-webpack-loader-syntax': noWebpackLoaderSyntax,
    order,
    'newline-after-import': newlineAfterImport,
    'prefer-default-export': preferDefaultExport,
    'no-default-export': noDefaultExport,
    'no-named-export': noNamedExport,
    'no-dynamic-require': noDynamicRequire,
    unambiguous,
    'no-unassigned-import': noUnassignedImport,
    'no-useless-path-segments': noUselessPathSegments,
    'dynamic-import-chunkname': dynamicImportChunkname,
    'no-import-module-exports': noImportModuleExports,
    'no-empty-named-blocks': noEmptyNamedBlocks,
    'exports-last': exportsLast,
    'no-deprecated': noDeprecated,
    'imports-first': importsFirst,
};
const plugin_ = {
    meta,
    rules,
    cjsRequire,
    importXResolverCompat,
    createNodeResolver,
};
const createFlatConfig = (baseConfig, configName) => ({
    ...baseConfig,
    name: `import-x/${configName}`,
    plugins: { 'import-x': plugin_ },
});
const flatConfigs = {
    recommended: createFlatConfig(recommendedFlat, 'recommended'),
    errors: createFlatConfig(errorsFlat, 'errors'),
    warnings: createFlatConfig(warningsFlat, 'warnings'),
    'stage-0': createFlatConfig(stage0Flat, 'stage-0'),
    react: createFlatConfig(reactFlat, 'react'),
    'react-native': createFlatConfig(reactNativeFlat, 'react-native'),
    electron: createFlatConfig(electronFlat, 'electron'),
    typescript: createFlatConfig(typescriptFlat, 'typescript'),
};
const configs = {
    recommended,
    errors,
    warnings,
    'stage-0': stage0,
    react,
    'react-native': reactNative,
    electron,
    typescript,
    'flat/recommended': flatConfigs.recommended,
    'flat/errors': flatConfigs.errors,
    'flat/warnings': flatConfigs.warnings,
    'flat/stage-0': flatConfigs['stage-0'],
    'flat/react': flatConfigs.react,
    'flat/react-native': flatConfigs['react-native'],
    'flat/electron': flatConfigs.electron,
    'flat/typescript': flatConfigs.typescript,
};
const plugin = plugin_;
plugin.flatConfigs = flatConfigs;
plugin.configs = configs;
export default plugin;
export { meta, configs, flatConfigs, rules, cjsRequire, importXResolverCompat, createNodeResolver, plugin as importX, };
//# sourceMappingURL=index.js.map