declare module 'eslint-plugin-n8n-nodes-base' {
	import type { ESLint } from 'eslint';

	const plugin: ESLint.Plugin & {
		configs: {
			community: {
				rules: Record<string, Linter.RuleEntry>;
			};
			credentials: {
				rules: Record<string, Linter.RuleEntry>;
			};
			nodes: {
				rules: Record<string, Linter.RuleEntry>;
			};
		};
	};

	export default plugin;
}
