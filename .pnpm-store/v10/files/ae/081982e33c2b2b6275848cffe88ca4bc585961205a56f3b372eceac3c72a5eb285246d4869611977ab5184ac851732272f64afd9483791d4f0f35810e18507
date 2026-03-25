import type {ESLint, Linter} from 'eslint';

declare const eslintPluginUnicorn: ESLint.Plugin & {
	configs: {
		recommended: Linter.FlatConfig;
		all: Linter.FlatConfig;

		/** @deprecated Use `all` instead. The `flat/` prefix is no longer needed. */
		'flat/all': Linter.FlatConfig;

		/** @deprecated Use `recommended` instead. The `flat/` prefix is no longer needed. */
		'flat/recommended': Linter.FlatConfig;
	};
};

export default eslintPluginUnicorn;
