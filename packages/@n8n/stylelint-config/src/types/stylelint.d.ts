declare module 'stylelint' {
	export interface Config {
		[key: string]: unknown;
		plugins?: (string | unknown)[];
		rules?: Record<string, unknown>;
		ignoreFiles?: string[];
		overrides?: Array<Record<string, unknown>>;
	}

	// Minimal shape of a Stylelint rule compatible with our usage
	export type Rule = ((
		primary?: unknown,
		secondaryOptions?: unknown,
		context?: unknown,
	) => (root: unknown, result: unknown) => void) & {
		ruleName?: string;
		messages?: Record<string, unknown>;
		meta?: Record<string, unknown>;
	};

	export const utils: {
		ruleMessages: (ruleName: string, messages: Record<string, unknown>) => Record<string, unknown>;
		validateOptions: (result: unknown, ruleName: string, ...args: unknown[]) => boolean;
		report: (options: {
			message: string;
			node: unknown;
			result: unknown;
			ruleName: string;
		}) => void;
	};

	export function createPlugin(ruleName: string, rule: Rule): unknown;

	const stylelint: {
		utils: typeof utils;
		createPlugin: typeof createPlugin;
	};

	export default stylelint;
}
