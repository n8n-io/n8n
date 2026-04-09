import rule from "./rules/consistent-output.js";
import rule$1 from "./rules/fixer-return.js";
import rule$2 from "./rules/meta-property-ordering.js";
import rule$3 from "./rules/no-deprecated-context-methods.js";
import rule$4 from "./rules/no-deprecated-report-api.js";
import rule$5 from "./rules/no-identical-tests.js";
import rule$6 from "./rules/no-matching-violation-suggest-message-ids.js";
import rule$7 from "./rules/no-meta-replaced-by.js";
import rule$8 from "./rules/no-meta-schema-default.js";
import rule$9 from "./rules/no-missing-message-ids.js";
import rule$10 from "./rules/no-missing-placeholders.js";
import rule$11 from "./rules/no-only-tests.js";
import rule$12 from "./rules/no-property-in-node.js";
import rule$13 from "./rules/no-unused-message-ids.js";
import rule$14 from "./rules/no-unused-placeholders.js";
import rule$15 from "./rules/no-useless-token-range.js";
import rule$16 from "./rules/prefer-message-ids.js";
import rule$17 from "./rules/prefer-object-rule.js";
import rule$18 from "./rules/prefer-output-null.js";
import rule$19 from "./rules/prefer-placeholders.js";
import rule$20 from "./rules/prefer-replace-text.js";
import rule$21 from "./rules/report-message-format.js";
import rule$22 from "./rules/require-meta-default-options.js";
import rule$23 from "./rules/require-meta-docs-description.js";
import rule$24 from "./rules/require-meta-docs-recommended.js";
import rule$25 from "./rules/require-meta-docs-url.js";
import rule$26 from "./rules/require-meta-fixable.js";
import rule$27 from "./rules/require-meta-has-suggestions.js";
import rule$28 from "./rules/require-meta-schema-description.js";
import rule$29 from "./rules/require-meta-schema.js";
import rule$30 from "./rules/require-meta-type.js";
import rule$31 from "./rules/require-test-case-name.js";
import rule$32 from "./rules/test-case-property-ordering.js";
import rule$33 from "./rules/test-case-shorthand-strings.js";
import rule$34 from "./rules/unique-test-case-names.js";
import { createRequire } from "node:module";

//#region lib/index.ts
/**
* @fileoverview An ESLint plugin for linting ESLint plugins
* @author Teddy Katz
*/
const packageMetadata = createRequire(import.meta.url)("../package.json");
const PLUGIN_NAME = packageMetadata.name.replace(/^eslint-plugin-/, "");
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
	plugins: { get [PLUGIN_NAME]() {
		return plugin;
	} },
	rules: Object.fromEntries(Object.keys(allRules).filter((ruleName) => configFilters[configName](allRules[ruleName])).map((ruleName) => [`${PLUGIN_NAME}/${ruleName}`, "error"]))
});
const allRules = {
	"consistent-output": rule,
	"fixer-return": rule$1,
	"meta-property-ordering": rule$2,
	"no-deprecated-context-methods": rule$3,
	"no-deprecated-report-api": rule$4,
	"no-identical-tests": rule$5,
	"no-matching-violation-suggest-message-ids": rule$6,
	"no-meta-replaced-by": rule$7,
	"no-meta-schema-default": rule$8,
	"no-missing-message-ids": rule$9,
	"no-missing-placeholders": rule$10,
	"no-only-tests": rule$11,
	"no-property-in-node": rule$12,
	"no-unused-message-ids": rule$13,
	"no-unused-placeholders": rule$14,
	"no-useless-token-range": rule$15,
	"prefer-message-ids": rule$16,
	"prefer-object-rule": rule$17,
	"prefer-output-null": rule$18,
	"prefer-placeholders": rule$19,
	"prefer-replace-text": rule$20,
	"report-message-format": rule$21,
	"require-meta-default-options": rule$22,
	"require-meta-docs-description": rule$23,
	"require-meta-docs-recommended": rule$24,
	"require-meta-docs-url": rule$25,
	"require-meta-fixable": rule$26,
	"require-meta-has-suggestions": rule$27,
	"require-meta-schema-description": rule$28,
	"require-meta-schema": rule$29,
	"require-meta-type": rule$30,
	"require-test-case-name": rule$31,
	"test-case-property-ordering": rule$32,
	"test-case-shorthand-strings": rule$33,
	"unique-test-case-names": rule$34
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

//#endregion
export { plugin as default };