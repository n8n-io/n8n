import { readFileSync } from 'node:fs';
import scss from 'postcss-scss';
import stylelint from 'stylelint';
import type { Rule } from 'stylelint';

const ruleName = '@n8n/component-css-vars';
export const COMPONENT_VARIABLE_PATTERN =
	/^--n8n-[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
const messages = stylelint.utils.ruleMessages(ruleName, {
	rejected: (variable: string) =>
		`Use a theme variable or --n8n-component--modifier for "${variable}".`,
});

interface Options {
	themeFiles?: string[];
	ignoreVariables?: string[];
}

const isString = (value: unknown) => typeof value === 'string';

const ruleFunction: Rule<boolean, Options> = (primary, options = {}) => {
	return (root, result) => {
		const valid = stylelint.utils.validateOptions(
			result,
			ruleName,
			{ actual: primary, possible: [true] },
			{
				actual: options,
				possible: { themeFiles: [isString], ignoreVariables: [isString] },
				optional: true,
			},
		);
		if (!valid) return;

		const allowed = new Set(options.ignoreVariables);
		for (const file of options.themeFiles ?? []) {
			scss.parse(readFileSync(file, 'utf8'), { from: file }).walkDecls((decl) => {
				if (decl.prop.startsWith('--')) allowed.add(decl.prop);
			});
		}

		root.walkDecls((decl) => {
			// postcss-html puts inline style declarations directly under their root.
			if (decl.parent?.type === 'root') return;

			const variables = new Set<string>();
			if (decl.prop.startsWith('--')) variables.add(decl.prop);

			// Skip strings and comments. Check nested fallbacks as separate references.
			const references =
				/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\bvar\(\s*(--[\w-]+)/g;
			let match: RegExpExecArray | null;
			while ((match = references.exec(decl.value)) !== null) {
				if (match[1]) variables.add(match[1]);
			}

			for (const variable of variables) {
				if (allowed.has(variable) || COMPONENT_VARIABLE_PATTERN.test(variable)) continue;
				stylelint.utils.report({
					message: messages.rejected(variable),
					node: decl,
					result,
					ruleName,
				});
			}
		});
	};
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = { url: 'https://github.com/n8n-io/n8n' };

export default stylelint.createPlugin(ruleName, ruleFunction);
