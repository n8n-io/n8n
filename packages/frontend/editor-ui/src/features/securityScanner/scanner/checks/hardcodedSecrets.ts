import type { INodeUi } from '@/Interface';
import type { SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';
import { redactValue } from '../utils/redact';

// Known API key prefixes and their providers
const SECRET_PATTERNS: Array<{ pattern: RegExp; provider: string }> = [
	{ pattern: /sk_live_[a-zA-Z0-9]{20,}/, provider: 'Stripe' },
	{ pattern: /sk_test_[a-zA-Z0-9]{20,}/, provider: 'Stripe (test)' },
	{ pattern: /ghp_[a-zA-Z0-9]{36,}/, provider: 'GitHub' },
	{ pattern: /gho_[a-zA-Z0-9]{36,}/, provider: 'GitHub OAuth' },
	{ pattern: /ghs_[a-zA-Z0-9]{36,}/, provider: 'GitHub App' },
	{ pattern: /github_pat_[a-zA-Z0-9_]{20,}/, provider: 'GitHub' },
	{ pattern: /xoxb-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack Bot' },
	{ pattern: /xoxp-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack User' },
	{ pattern: /xoxa-[0-9]+-[a-zA-Z0-9]+/, provider: 'Slack App' },
	{ pattern: /AKIA[0-9A-Z]{16}/, provider: 'AWS' },
	{ pattern: /AIza[0-9A-Za-z_-]{35}/, provider: 'Google API' },
	{ pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/, provider: 'SendGrid' },
	{ pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/, provider: 'Private Key' },
	{ pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/, provider: 'SSH Private Key' },
];

// Header names that typically contain credentials
const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

// Long random strings that look like tokens (32+ hex or base64 chars)
const GENERIC_TOKEN_PATTERN = /^[a-zA-Z0-9+/=_-]{32,}$/;

/**
 * Check if a field name indicates it holds sensitive data
 */
function isSensitiveFieldName(path: string): boolean {
	const lowerPath = path.toLowerCase();
	return (
		SENSITIVE_HEADERS.has(lowerPath.split('.').pop() ?? '') ||
		/(?:api[_-]?key|access[_-]?token|auth[_-]?token|bearer[_-]?token|secret[_-]?key|private[_-]?key|client[_-]?secret|password|^token$|^secret$|^auth$)/i.test(
			lowerPath,
		)
	);
}

/**
 * Detects hardcoded secrets (API keys, tokens, private keys) in node parameters.
 */
export function checkHardcodedSecrets(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			// Skip expressions — they're dynamic values, not hardcoded
			if (isExpr) return;

			// Check known secret patterns
			for (const { pattern, provider } of SECRET_PATTERNS) {
				if (pattern.test(value)) {
					findings.push({
						id: `secret-${++counter}`,
						category: 'hardcoded-secret',
						severity: 'critical',
						title: `Hardcoded ${provider} key detected`,
						description:
							"Move this key to n8n's credential store instead of hardcoding it in the workflow.",
						nodeName: node.name,
						nodeId: node.id,
						parameterPath: path,
						matchedValue: redactValue(value),
					});
					return; // one finding per value
				}
			}

			// Check if a sensitive field has a long hardcoded value (likely a token)
			if (isSensitiveFieldName(path) && value.length >= 16 && GENERIC_TOKEN_PATTERN.test(value)) {
				findings.push({
					id: `secret-${++counter}`,
					category: 'hardcoded-secret',
					severity: 'critical',
					title: 'Possible hardcoded token or secret',
					description: `The field "${path}" contains a hardcoded value that looks like a secret. Use n8n credentials instead.`,
					nodeName: node.name,
					nodeId: node.id,
					parameterPath: path,
					matchedValue: redactValue(value),
				});
			}
		});
	}

	return findings;
}
