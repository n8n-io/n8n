import { createRequire } from "node:module";
import consistentOutput from "./rules/consistent-output.js";
import fixerReturn from "./rules/fixer-return.js";
import metaPropertyOrdering from "./rules/meta-property-ordering.js";
import noDeprecatedContextMethods from "./rules/no-deprecated-context-methods.js";
import noDeprecatedReportApi from "./rules/no-deprecated-report-api.js";
import noIdenticalTests from "./rules/no-identical-tests.js";
import noMetaReplacedBy from "./rules/no-meta-replaced-by.js";
import noMetaSchemaDefault from "./rules/no-meta-schema-default.js";
import noMissingMessageIds from "./rules/no-missing-message-ids.js";
import noMissingPlaceholders from "./rules/no-missing-placeholders.js";
import noOnlyTests from "./rules/no-only-tests.js";
import noPropertyInNode from "./rules/no-property-in-node.js";
import noUnusedMessageIds from "./rules/no-unused-message-ids.js";
import noUnusedPlaceholders from "./rules/no-unused-placeholders.js";
import noUselessTokenRange from "./rules/no-useless-token-range.js";
import preferMessageIds from "./rules/prefer-message-ids.js";
import preferObjectRule from "./rules/prefer-object-rule.js";
import preferOutputNull from "./rules/prefer-output-null.js";
import preferPlaceholders from "./rules/prefer-placeholders.js";
import preferReplaceText from "./rules/prefer-replace-text.js";
import reportMessageFormat from "./rules/report-message-format.js";
import requireMetaDefaultOptions from "./rules/require-meta-default-options.js";
import requireMetaDocsDescription from "./rules/require-meta-docs-description.js";
import requireMetaDocsRecommended from "./rules/require-meta-docs-recommended.js";
import requireMetaDocsUrl from "./rules/require-meta-docs-url.js";
import requireMetaFixable from "./rules/require-meta-fixable.js";
import requireMetaHasSuggestions from "./rules/require-meta-has-suggestions.js";
import requireMetaSchemaDescription from "./rules/require-meta-schema-description.js";
import requireMetaSchema from "./rules/require-meta-schema.js";
import requireMetaType from "./rules/require-meta-type.js";
import testCasePropertyOrdering from "./rules/test-case-property-ordering.js";
import testCaseShorthandStrings from "./rules/test-case-shorthand-strings.js";
const require2 = createRequire(import.meta.url);
const packageMetadata = require2("../package.json");
const PLUGIN_NAME = packageMetadata.name.replace(/^eslint-plugin-/, "");
const CONFIG_NAMES = [
  "all",
  "all-type-checked",
  "recommended",
  "rules",
  "tests",
  "rules-recommended",
  "tests-recommended"
];
const configFilters = {
  all: (rule) => !(rule.meta?.docs && "requiresTypeChecking" in rule.meta.docs && rule.meta.docs.requiresTypeChecking),
  "all-type-checked": () => true,
  recommended: (rule) => !!rule.meta?.docs?.recommended,
  rules: (rule) => rule.meta?.docs?.category === "Rules",
  tests: (rule) => rule.meta?.docs?.category === "Tests",
  "rules-recommended": (rule) => configFilters.recommended(rule) && configFilters.rules(rule),
  "tests-recommended": (rule) => configFilters.recommended(rule) && configFilters.tests(rule)
};
const createConfig = (configName) => ({
  name: `${PLUGIN_NAME}/${configName}`,
  plugins: {
    get [PLUGIN_NAME]() {
      return plugin;
    }
  },
  rules: Object.fromEntries(
    Object.keys(allRules).filter((ruleName) => configFilters[configName](allRules[ruleName])).map((ruleName) => [`${PLUGIN_NAME}/${ruleName}`, "error"])
  )
});
const allRules = {
  "consistent-output": consistentOutput,
  "fixer-return": fixerReturn,
  "meta-property-ordering": metaPropertyOrdering,
  "no-deprecated-context-methods": noDeprecatedContextMethods,
  "no-deprecated-report-api": noDeprecatedReportApi,
  "no-identical-tests": noIdenticalTests,
  "no-meta-replaced-by": noMetaReplacedBy,
  "no-meta-schema-default": noMetaSchemaDefault,
  "no-missing-message-ids": noMissingMessageIds,
  "no-missing-placeholders": noMissingPlaceholders,
  "no-only-tests": noOnlyTests,
  "no-property-in-node": noPropertyInNode,
  "no-unused-message-ids": noUnusedMessageIds,
  "no-unused-placeholders": noUnusedPlaceholders,
  "no-useless-token-range": noUselessTokenRange,
  "prefer-message-ids": preferMessageIds,
  "prefer-object-rule": preferObjectRule,
  "prefer-output-null": preferOutputNull,
  "prefer-placeholders": preferPlaceholders,
  "prefer-replace-text": preferReplaceText,
  "report-message-format": reportMessageFormat,
  "require-meta-default-options": requireMetaDefaultOptions,
  "require-meta-docs-description": requireMetaDocsDescription,
  "require-meta-docs-recommended": requireMetaDocsRecommended,
  "require-meta-docs-url": requireMetaDocsUrl,
  "require-meta-fixable": requireMetaFixable,
  "require-meta-has-suggestions": requireMetaHasSuggestions,
  "require-meta-schema-description": requireMetaSchemaDescription,
  "require-meta-schema": requireMetaSchema,
  "require-meta-type": requireMetaType,
  "test-case-property-ordering": testCasePropertyOrdering,
  "test-case-shorthand-strings": testCaseShorthandStrings
};
const plugin = {
  meta: {
    name: packageMetadata.name,
    version: packageMetadata.version
  },
  rules: allRules,
  configs: {
    all: createConfig("all"),
    "all-type-checked": createConfig("all-type-checked"),
    recommended: createConfig("recommended"),
    rules: createConfig("rules"),
    tests: createConfig("tests"),
    "rules-recommended": createConfig("rules-recommended"),
    "tests-recommended": createConfig("tests-recommended")
  }
};
var index_default = plugin;
export {
  index_default as default
};
