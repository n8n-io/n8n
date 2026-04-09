"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.minVersions = exports.legacyBabel7SyntaxPlugins = exports.default = void 0;
var _pluginSyntaxImportAssertions = require("@babel/plugin-syntax-import-assertions");
var _pluginSyntaxImportAttributes = require("@babel/plugin-syntax-import-attributes");
var _pluginTransformAsyncGeneratorFunctions = require("@babel/plugin-transform-async-generator-functions");
var _pluginTransformAsyncToGenerator = require("@babel/plugin-transform-async-to-generator");
var _pluginTransformArrowFunctions = require("@babel/plugin-transform-arrow-functions");
var _pluginTransformBlockScopedFunctions = require("@babel/plugin-transform-block-scoped-functions");
var _pluginTransformBlockScoping = require("@babel/plugin-transform-block-scoping");
var _pluginTransformClasses = require("@babel/plugin-transform-classes");
var _pluginTransformClassProperties = require("@babel/plugin-transform-class-properties");
var _pluginTransformClassStaticBlock = require("@babel/plugin-transform-class-static-block");
var _pluginTransformComputedProperties = require("@babel/plugin-transform-computed-properties");
var _pluginTransformDestructuring = require("@babel/plugin-transform-destructuring");
var _pluginTransformDotallRegex = require("@babel/plugin-transform-dotall-regex");
var _pluginTransformDuplicateKeys = require("@babel/plugin-transform-duplicate-keys");
var _pluginTransformDuplicateNamedCapturingGroupsRegex = require("@babel/plugin-transform-duplicate-named-capturing-groups-regex");
var _pluginTransformDynamicImport = require("@babel/plugin-transform-dynamic-import");
var _pluginTransformExplicitResourceManagement = require("@babel/plugin-transform-explicit-resource-management");
var _pluginTransformExponentiationOperator = require("@babel/plugin-transform-exponentiation-operator");
var _pluginTransformExportNamespaceFrom = require("@babel/plugin-transform-export-namespace-from");
var _pluginTransformForOf = require("@babel/plugin-transform-for-of");
var _pluginTransformFunctionName = require("@babel/plugin-transform-function-name");
var _pluginTransformJsonStrings = require("@babel/plugin-transform-json-strings");
var _pluginTransformLiterals = require("@babel/plugin-transform-literals");
var _pluginTransformLogicalAssignmentOperators = require("@babel/plugin-transform-logical-assignment-operators");
var _pluginTransformMemberExpressionLiterals = require("@babel/plugin-transform-member-expression-literals");
var _pluginTransformModulesAmd = require("@babel/plugin-transform-modules-amd");
var _pluginTransformModulesCommonjs = require("@babel/plugin-transform-modules-commonjs");
var _pluginTransformModulesSystemjs = require("@babel/plugin-transform-modules-systemjs");
var _pluginTransformModulesUmd = require("@babel/plugin-transform-modules-umd");
var _pluginTransformNamedCapturingGroupsRegex = require("@babel/plugin-transform-named-capturing-groups-regex");
var _pluginTransformNewTarget = require("@babel/plugin-transform-new-target");
var _pluginTransformNullishCoalescingOperator = require("@babel/plugin-transform-nullish-coalescing-operator");
var _pluginTransformNumericSeparator = require("@babel/plugin-transform-numeric-separator");
var _pluginTransformObjectRestSpread = require("@babel/plugin-transform-object-rest-spread");
var _pluginTransformObjectSuper = require("@babel/plugin-transform-object-super");
var _pluginTransformOptionalCatchBinding = require("@babel/plugin-transform-optional-catch-binding");
var _pluginTransformOptionalChaining = require("@babel/plugin-transform-optional-chaining");
var _pluginTransformParameters = require("@babel/plugin-transform-parameters");
var _pluginTransformPrivateMethods = require("@babel/plugin-transform-private-methods");
var _pluginTransformPrivatePropertyInObject = require("@babel/plugin-transform-private-property-in-object");
var _pluginTransformPropertyLiterals = require("@babel/plugin-transform-property-literals");
var _pluginTransformRegenerator = require("@babel/plugin-transform-regenerator");
var _pluginTransformRegexpModifiers = require("@babel/plugin-transform-regexp-modifiers");
var _pluginTransformReservedWords = require("@babel/plugin-transform-reserved-words");
var _pluginTransformShorthandProperties = require("@babel/plugin-transform-shorthand-properties");
var _pluginTransformSpread = require("@babel/plugin-transform-spread");
var _pluginTransformStickyRegex = require("@babel/plugin-transform-sticky-regex");
var _pluginTransformTemplateLiterals = require("@babel/plugin-transform-template-literals");
var _pluginTransformTypeofSymbol = require("@babel/plugin-transform-typeof-symbol");
var _pluginTransformUnicodeEscapes = require("@babel/plugin-transform-unicode-escapes");
var _pluginTransformUnicodePropertyRegex = require("@babel/plugin-transform-unicode-property-regex");
var _pluginTransformUnicodeRegex = require("@babel/plugin-transform-unicode-regex");
var _pluginTransformUnicodeSetsRegex = require("@babel/plugin-transform-unicode-sets-regex");
var _index = require("@babel/preset-modules/lib/plugins/transform-async-arrows-in-class/index.js");
var _index2 = require("@babel/preset-modules/lib/plugins/transform-edge-default-parameters/index.js");
var _index3 = require("@babel/preset-modules/lib/plugins/transform-edge-function-name/index.js");
var _pluginBugfixFirefoxClassInComputedClassKey = require("@babel/plugin-bugfix-firefox-class-in-computed-class-key");
var _index4 = require("@babel/preset-modules/lib/plugins/transform-tagged-template-caching/index.js");
var _index5 = require("@babel/preset-modules/lib/plugins/transform-safari-block-shadowing/index.js");
var _index6 = require("@babel/preset-modules/lib/plugins/transform-safari-for-shadowing/index.js");
var _pluginBugfixSafariIdDestructuringCollisionInFunctionExpression = require("@babel/plugin-bugfix-safari-id-destructuring-collision-in-function-expression");
var _pluginBugfixSafariClassFieldInitializerScope = require("@babel/plugin-bugfix-safari-class-field-initializer-scope");
var _pluginBugfixV8SpreadParametersInOptionalChaining = require("@babel/plugin-bugfix-v8-spread-parameters-in-optional-chaining");
var _pluginBugfixV8StaticClassFieldsRedefineReadonly = require("@babel/plugin-bugfix-v8-static-class-fields-redefine-readonly");
const availablePlugins = exports.default = {
  "bugfix/transform-async-arrows-in-class": () => _index,
  "bugfix/transform-edge-default-parameters": () => _index2,
  "bugfix/transform-edge-function-name": () => _index3,
  "bugfix/transform-firefox-class-in-computed-class-key": () => _pluginBugfixFirefoxClassInComputedClassKey.default,
  "bugfix/transform-safari-block-shadowing": () => _index5,
  "bugfix/transform-safari-class-field-initializer-scope": () => _pluginBugfixSafariClassFieldInitializerScope.default,
  "bugfix/transform-safari-for-shadowing": () => _index6,
  "bugfix/transform-safari-id-destructuring-collision-in-function-expression": () => _pluginBugfixSafariIdDestructuringCollisionInFunctionExpression.default,
  "bugfix/transform-tagged-template-caching": () => _index4,
  "bugfix/transform-v8-spread-parameters-in-optional-chaining": () => _pluginBugfixV8SpreadParametersInOptionalChaining.default,
  "bugfix/transform-v8-static-class-fields-redefine-readonly": () => _pluginBugfixV8StaticClassFieldsRedefineReadonly.default,
  "transform-arrow-functions": () => _pluginTransformArrowFunctions.default,
  "transform-async-generator-functions": () => _pluginTransformAsyncGeneratorFunctions.default,
  "transform-async-to-generator": () => _pluginTransformAsyncToGenerator.default,
  "transform-block-scoped-functions": () => _pluginTransformBlockScopedFunctions.default,
  "transform-block-scoping": () => _pluginTransformBlockScoping.default,
  "transform-class-properties": () => _pluginTransformClassProperties.default,
  "transform-class-static-block": () => _pluginTransformClassStaticBlock.default,
  "transform-classes": () => _pluginTransformClasses.default,
  "transform-computed-properties": () => _pluginTransformComputedProperties.default,
  "transform-destructuring": () => _pluginTransformDestructuring.default,
  "transform-dotall-regex": () => _pluginTransformDotallRegex.default,
  "transform-duplicate-keys": () => _pluginTransformDuplicateKeys.default,
  "transform-duplicate-named-capturing-groups-regex": () => _pluginTransformDuplicateNamedCapturingGroupsRegex.default,
  "transform-dynamic-import": () => _pluginTransformDynamicImport.default,
  "transform-explicit-resource-management": () => _pluginTransformExplicitResourceManagement.default,
  "transform-exponentiation-operator": () => _pluginTransformExponentiationOperator.default,
  "transform-export-namespace-from": () => _pluginTransformExportNamespaceFrom.default,
  "transform-for-of": () => _pluginTransformForOf.default,
  "transform-function-name": () => _pluginTransformFunctionName.default,
  "transform-json-strings": () => _pluginTransformJsonStrings.default,
  "transform-literals": () => _pluginTransformLiterals.default,
  "transform-logical-assignment-operators": () => _pluginTransformLogicalAssignmentOperators.default,
  "transform-member-expression-literals": () => _pluginTransformMemberExpressionLiterals.default,
  "transform-modules-amd": () => _pluginTransformModulesAmd.default,
  "transform-modules-commonjs": () => _pluginTransformModulesCommonjs.default,
  "transform-modules-systemjs": () => _pluginTransformModulesSystemjs.default,
  "transform-modules-umd": () => _pluginTransformModulesUmd.default,
  "transform-named-capturing-groups-regex": () => _pluginTransformNamedCapturingGroupsRegex.default,
  "transform-new-target": () => _pluginTransformNewTarget.default,
  "transform-nullish-coalescing-operator": () => _pluginTransformNullishCoalescingOperator.default,
  "transform-numeric-separator": () => _pluginTransformNumericSeparator.default,
  "transform-object-rest-spread": () => _pluginTransformObjectRestSpread.default,
  "transform-object-super": () => _pluginTransformObjectSuper.default,
  "transform-optional-catch-binding": () => _pluginTransformOptionalCatchBinding.default,
  "transform-optional-chaining": () => _pluginTransformOptionalChaining.default,
  "transform-parameters": () => _pluginTransformParameters.default,
  "transform-private-methods": () => _pluginTransformPrivateMethods.default,
  "transform-private-property-in-object": () => _pluginTransformPrivatePropertyInObject.default,
  "transform-property-literals": () => _pluginTransformPropertyLiterals.default,
  "transform-regenerator": () => _pluginTransformRegenerator.default,
  "transform-regexp-modifiers": () => _pluginTransformRegexpModifiers.default,
  "transform-reserved-words": () => _pluginTransformReservedWords.default,
  "transform-shorthand-properties": () => _pluginTransformShorthandProperties.default,
  "transform-spread": () => _pluginTransformSpread.default,
  "transform-sticky-regex": () => _pluginTransformStickyRegex.default,
  "transform-template-literals": () => _pluginTransformTemplateLiterals.default,
  "transform-typeof-symbol": () => _pluginTransformTypeofSymbol.default,
  "transform-unicode-escapes": () => _pluginTransformUnicodeEscapes.default,
  "transform-unicode-property-regex": () => _pluginTransformUnicodePropertyRegex.default,
  "transform-unicode-regex": () => _pluginTransformUnicodeRegex.default,
  "transform-unicode-sets-regex": () => _pluginTransformUnicodeSetsRegex.default
};
const minVersions = exports.minVersions = {};
let legacyBabel7SyntaxPlugins = exports.legacyBabel7SyntaxPlugins = void 0;
Object.assign(minVersions, {
  "bugfix/transform-safari-id-destructuring-collision-in-function-expression": "7.16.0",
  "bugfix/transform-v8-static-class-fields-redefine-readonly": "7.12.0",
  "syntax-import-attributes": "7.22.0",
  "transform-class-static-block": "7.12.0",
  "transform-duplicate-named-capturing-groups-regex": "7.19.0",
  "transform-explicit-resource-management": "7.23.9",
  "transform-private-property-in-object": "7.10.0",
  "transform-regexp-modifiers": "7.19.0"
});
const syntax = name => () => () => ({
  manipulateOptions: (_, p) => p.plugins.push(name)
});
const legacyBabel7SyntaxPluginsLoaders = {
  "syntax-async-generators": syntax("asyncGenerators"),
  "syntax-class-properties": syntax("classProperties"),
  "syntax-class-static-block": syntax("classStaticBlock"),
  "syntax-dynamic-import": syntax("dynamicImport"),
  "syntax-explicit-resource-management": syntax("explicitResourceManagement"),
  "syntax-export-namespace-from": syntax("exportNamespaceFrom"),
  "syntax-import-meta": syntax("importMeta"),
  "syntax-json-strings": syntax("jsonStrings"),
  "syntax-logical-assignment-operators": syntax("logicalAssignment"),
  "syntax-nullish-coalescing-operator": syntax("nullishCoalescingOperator"),
  "syntax-numeric-separator": syntax("numericSeparator"),
  "syntax-object-rest-spread": syntax("objectRestSpread"),
  "syntax-optional-catch-binding": syntax("optionalCatchBinding"),
  "syntax-optional-chaining": syntax("optionalChaining"),
  "syntax-private-property-in-object": syntax("privateIn"),
  "syntax-top-level-await": syntax("topLevelAwait"),
  "syntax-import-assertions": () => _pluginSyntaxImportAssertions.default,
  "syntax-import-attributes": () => _pluginSyntaxImportAttributes.default,
  "syntax-unicode-sets-regex": () => require("@babel/plugin-syntax-unicode-sets-regex")
};
Object.assign(availablePlugins, legacyBabel7SyntaxPluginsLoaders);
exports.legacyBabel7SyntaxPlugins = legacyBabel7SyntaxPlugins = new Set(Object.keys(legacyBabel7SyntaxPluginsLoaders));

//# sourceMappingURL=available-plugins.js.map
