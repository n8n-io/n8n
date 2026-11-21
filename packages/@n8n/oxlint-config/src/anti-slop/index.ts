import { eslintCompatPlugin } from '@oxlint/plugins';

import { noArrayFilterMapRule } from './rules/no-array-filter-map.js';
import { noReduceAccumulatorCopyRule } from './rules/no-reduce-accumulator-copy.js';
import { noChainedTypeAssertionsRule } from './rules/no-chained-type-assertions.js';
import { noConditionalEmptyObjectSpreadRule } from './rules/no-conditional-empty-object-spread.js';
import { noKnownValueWideningRule } from './rules/no-known-value-widening.js';
import { noModuleMockingRule } from './rules/no-module-mocking.js';
import { noObjectParametersRule } from './rules/no-object-parameters.js';
import { noReflectApplyRule } from './rules/no-reflect-apply.js';
import { noReflectGetRule } from './rules/no-reflect-get.js';
import { noRuntimeTypeofRule } from './rules/no-runtime-typeof.js';
import { noForbiddenTermInSymbolNamesRule } from './rules/no-shape-in-symbol-names.js';
import { noUnknownParametersRule } from './rules/no-unknown-parameters.js';
import { noUnknownReturnsRule } from './rules/no-unknown-returns.js';
import { noUnknownTypeAliasesRule } from './rules/no-unknown-type-aliases.js';
import { noUnsafeDictionaryTypeRule } from './rules/no-unsafe-dictionary-type.js';
import { noWidenThenAssertRule } from './rules/no-widen-then-assert.js';
import { requireReadableSpacingRule } from './rules/require-readable-spacing.js';
import { requireSafetyCommentForTypeAssertionRule } from './rules/require-safety-comment-for-type-assertion.js';

/** Generic Oxlint rules that reject low-evidence and low-signal implementation patterns. */
const antiSlopPlugin = eslintCompatPlugin({
	meta: { name: 'anti-slop' },
	rules: {
		'no-array-filter-map': noArrayFilterMapRule,
		'no-reduce-accumulator-copy': noReduceAccumulatorCopyRule,
		'no-chained-type-assertions': noChainedTypeAssertionsRule,
		'no-conditional-empty-object-spread': noConditionalEmptyObjectSpreadRule,
		'no-known-value-widening': noKnownValueWideningRule,
		'no-module-mocking': noModuleMockingRule,
		'no-object-parameters': noObjectParametersRule,
		'no-reflect-apply': noReflectApplyRule,
		'no-reflect-get': noReflectGetRule,
		'no-runtime-typeof': noRuntimeTypeofRule,
		'no-unsafe-dictionary-type': noUnsafeDictionaryTypeRule,
		'no-shape-in-symbol-names': noForbiddenTermInSymbolNamesRule,
		'no-unknown-parameters': noUnknownParametersRule,
		'no-unknown-returns': noUnknownReturnsRule,
		'no-unknown-type-aliases': noUnknownTypeAliasesRule,
		'no-widen-then-assert': noWidenThenAssertRule,
		'require-readable-spacing': requireReadableSpacingRule,
		'require-safety-comment-for-type-assertion': requireSafetyCommentForTypeAssertionRule,
	},
});

export default antiSlopPlugin;
