export const secretPatterns = [
	{
		category: 'private_key',
		label: 'a private key block',
		regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
	},
	{
		category: 'aws_access_key_id',
		label: 'an AWS access key ID',
		regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
	},
	{
		category: 'github_token',
		label: 'a GitHub token',
		regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
	},
	{
		category: 'slack_token',
		label: 'a Slack token',
		regex: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/,
	},
	{
		category: 'anthropic_api_key',
		label: 'an Anthropic API key',
		regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
	},
	{
		category: 'openai_api_key',
		label: 'an OpenAI API key',
		regex: /\bsk-(?:proj-)[A-Za-z0-9_-]{20,}\b/,
	},
	{
		category: 'stripe_secret_key',
		label: 'a Stripe secret key',
		regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/,
	},
	{
		category: 'linear_api_key',
		label: 'a Linear API key',
		regex: /\blin_api_[A-Za-z0-9]{20,}\b/,
	},
	{
		category: 'credentialed_url',
		label: 'a URL with embedded credentials',
		regex: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/i,
	},
];

const sensitiveNamePattern =
	/(?:SECRET|TOKEN|PASSWORD|PASSCODE|PASSPHRASE|API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY|CLIENT[_-]?SECRET|WEBHOOK[_-]?SECRET|AUTH[_-]?SECRET|DATABASE[_-]?URL)/i;

const safePlaceholderPattern =
	/^(?:["']?)?(?:<[^>]+>|\[[^\]]+\]|\$\{?[A-Z0-9_]+\}?|your[_-]?[a-z0-9_-]*(?:key|token|secret|password)|redacted|masked|placeholder|example|changeme|replace[_-]?me|xxx+|\*{3,}|\.{3,})(?:["']?)?$/i;

const benignOpaqueTokenPattern =
	/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[0-9a-f]{32,64}|[A-Za-z0-9_-]{21,22}|[0-9]+\.[0-9]+\.[0-9]+(?:[-+][\w.-]+)?)$/i;

const promptFieldNames = [
	'prompt',
	'userPrompt',
	'user_prompt',
	'text',
	'message',
	'content',
	'input',
];

export function readStdin() {
	return new Promise((resolve) => {
		let input = '';

		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (chunk) => {
			input += chunk;
		});
		process.stdin.on('end', () => resolve(input));
	});
}

function stripInlineComment(value) {
	return value.replace(/\s+#.*$/, '').trim();
}

function stripQuotes(value) {
	return value.replace(/^['"`]/, '').replace(/['"`]$/, '');
}

function normalizeAssignmentValue(value) {
	return stripQuotes(stripInlineComment(value)).trim().replace(/,$/, '');
}

function isBenignOpaqueToken(value) {
	const normalized = normalizeAssignmentValue(value);
	return benignOpaqueTokenPattern.test(normalized);
}

function isSafePlaceholder(value) {
	const normalized = normalizeAssignmentValue(value);

	if (!normalized) {
		return true;
	}

	return safePlaceholderPattern.test(normalized);
}

function hasHighEntropyShape(value) {
	const normalized = normalizeAssignmentValue(value);

	if (normalized.length < 20 || /\s/.test(normalized)) {
		return false;
	}

	if (isBenignOpaqueToken(normalized)) {
		return false;
	}

	const uniqueCharacters = new Set(normalized).size;
	const hasMixedCharacterClasses =
		/[a-z]/.test(normalized) &&
		/[A-Z]/.test(normalized) &&
		/(?:\d|[_+/=-])/.test(normalized);

	return uniqueCharacters >= 12 && hasMixedCharacterClasses;
}

function hasKnownSecretPattern(value) {
	return secretPatterns.some(({ regex }) => regex.test(value));
}

function isLikelySecretValue(value) {
	const normalized = normalizeAssignmentValue(value);

	if (isSafePlaceholder(normalized) || isBenignOpaqueToken(normalized)) {
		return false;
	}

	if (hasKnownSecretPattern(normalized)) {
		return true;
	}

	return hasHighEntropyShape(normalized);
}

function detectSecretPattern(text) {
	for (const pattern of secretPatterns) {
		if (pattern.regex.test(text)) {
			return pattern;
		}
	}

	return null;
}

function detectSecretAssignment(text) {
	const assignmentPattern =
		/^\s*(?:export\s+)?([A-Z_][A-Z0-9_-]*)\s*[:=]\s*(.+?)\s*$/gim;

	for (const match of text.matchAll(assignmentPattern)) {
		const [, name, rawValue] = match;

		if (sensitiveNamePattern.test(name) && isLikelySecretValue(rawValue)) {
			return {
				category: 'secret_assignment',
				label: `a value assigned to ${name}`,
			};
		}
	}

	return null;
}

export function detectSecret(text) {
	return detectSecretPattern(text) || detectSecretAssignment(text);
}

export function extractPromptTexts(payload, fallback = '') {
	const texts = [];

	for (const field of promptFieldNames) {
		const value = payload?.[field];
		if (typeof value === 'string' && value.trim()) {
			texts.push(value);
		}
	}

	if (texts.length > 0) {
		return texts;
	}

	return fallback.trim() ? [fallback] : [];
}

export async function readPromptPayload() {
	const input = await readStdin();
	let payload = {};
	let texts = [input];

	try {
		payload = input.trim() ? JSON.parse(input) : {};
		texts = extractPromptTexts(payload, input);
	} catch {
		// If Cursor changes the payload shape, still scan the raw input text.
	}

	return { payload, texts };
}
