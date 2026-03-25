import packageJson from '../../package.json' with {type: 'json'};

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

/** @returns {{ [ruleName: string]: import('eslint').Rule.RuleModule }} */
export default function createDeprecatedRules(rules) {
	return Object.fromEntries(
		Object.entries(rules).map(([ruleId, deprecatedInfo]) => {
			const url = `${repoUrl}/blob/v${packageJson.version}/docs/deprecated-rules.md#${ruleId}`;
			return [
				ruleId,
				{
					create: () => ({}),
					meta: {
						docs: {
							description: deprecatedInfo.message,
							url,
						},
						deprecated: {
							message: deprecatedInfo.message,
							url,
							replacedBy: deprecatedInfo.replacedBy,
						},
					},
				},
			];
		}),
	);
}
