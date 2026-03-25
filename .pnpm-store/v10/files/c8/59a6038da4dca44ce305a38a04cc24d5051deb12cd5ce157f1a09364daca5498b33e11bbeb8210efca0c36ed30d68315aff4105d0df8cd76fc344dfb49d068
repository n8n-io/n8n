const ISSUE_LINK_PREFIX = 'https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?';

export default function assertToken(token, {test, expected, ruleId}) {
	if (test?.(token)) {
		return;
	}

	expected = Array.isArray(expected) ? expected : [expected];
	expected = expected.map(expectedToken => typeof expectedToken === 'string' ? {value: expectedToken} : expectedToken);

	if (
		!test
		&& expected.some(
			expectedToken =>
				Object.entries(expectedToken)
					.every(([key, value]) => token[key] === value),
		)
	) {
		return;
	}

	const actual = `'${JSON.stringify({value: token.value, type: token.type})}'`;
	expected = expected.map(expectedToken => `'${JSON.stringify(expectedToken)}'`).join(' or ');
	const title = `\`${ruleId}\`: Unexpected token ${actual}`;
	const issueLink = `${ISSUE_LINK_PREFIX}title=${encodeURIComponent(title)}`;
	const message = `Expected token ${expected}, got ${actual}.\nPlease open an issue at ${issueLink}.`;

	throw new Error(message);
}
