import { NoJsonParseJsonStringifyRule } from './no-json-parse-json-stringify';
import { NoUncaughtJsonParseRule } from './no-uncaught-json-parse';
import { NoUnneededBackticksRule } from './no-unneeded-backticks';
import { NoUnusedParamInCatchClauseRule } from './no-unused-param-catch-clause';
import { NoUselessCatchThrowRule } from './no-useless-catch-throw';
import { NoSkippedTestsRule } from './no-skipped-tests';
import { NoInterpolationInRegularStringRule } from './no-interpolation-in-regular-string';
import { DangerouslyUseHtmlStringMissingRule } from './dangerously-use-html-string-missing';
import { NoPlainErrorsRule } from './no-plain-errors';
import { NoDynamicImportTemplateRule } from './no-dynamic-import-template';
import { MisplacedN8nTypeormImportRule } from './misplaced-n8n-typeorm-import';
import { NoTypeUnsafeEventEmitterRule } from './no-type-unsafe-event-emitter';
import { NoUntypedConfigClassFieldRule } from './no-untyped-config-class-field';
import type { ESLint } from 'eslint';
import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

const rules = {
	'no-uncaught-json-parse': NoUncaughtJsonParseRule,
	'no-json-parse-json-stringify': NoJsonParseJsonStringifyRule,
	'no-unneeded-backticks': NoUnneededBackticksRule,
	'no-unused-param-in-catch-clause': NoUnusedParamInCatchClauseRule,
	'no-useless-catch-throw': NoUselessCatchThrowRule,
	'no-skipped-tests': NoSkippedTestsRule,
	'no-interpolation-in-regular-string': NoInterpolationInRegularStringRule,
	'dangerously-use-html-string-missing': DangerouslyUseHtmlStringMissingRule,
	'no-plain-errors': NoPlainErrorsRule,
	'no-dynamic-import-template': NoDynamicImportTemplateRule,
	'misplaced-n8n-typeorm-import': MisplacedN8nTypeormImportRule,
	'no-type-unsafe-event-emitter': NoTypeUnsafeEventEmitterRule,
	'no-untyped-config-class-field': NoUntypedConfigClassFieldRule,
} satisfies Record<string, AnyRuleModule>;

export const localRulesPlugin: ESLint.Plugin = {
	meta: {
		name: 'n8n-local-rules',
	},
	// @ts-expect-error Rule type is different between ESLint and typescript-eslint
	rules,
};
