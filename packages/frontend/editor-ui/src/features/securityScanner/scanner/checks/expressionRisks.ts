import type { INodeUi } from '@/Interface';
import type { SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';

const SENSITIVE_FIELD_PATTERNS = /(?:password|secret|token|apiKey|api_key|private_key)/i;

/**
 * Detects risky expressions: $env usage and expressions that access
 * password/secret/token fields on other nodes.
 */
export function checkExpressionRisks(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!node.parameters) continue;

		walkParameters(node.parameters, (value, path, isExpr) => {
			if (!isExpr) return;

			// Check for $env usage
			if (value.includes('$env.') || value.includes('$env[')) {
				findings.push({
					id: `expr-${++counter}`,
					category: 'expression-risk',
					severity: 'info',
					title: 'Environment variable accessed in expression',
					description:
						"Using $env may expose server-side environment variables. Ensure this is intentional and the variable doesn't contain secrets being passed to untrusted outputs.",
					remediation:
						'1. Verify that the environment variable does not contain secrets being sent to untrusted outputs.\n2. If it contains a secret, move it to n8n credentials instead.\n3. Restrict which environment variables are accessible via the N8N_BLOCK_ENV_ACCESS_IN_NODE setting.',
					nodeName: node.name,
					nodeId: node.id,
					nodeType: node.type,
					parameterPath: path,
				});
			}

			// Check for expressions accessing sensitive fields
			if (SENSITIVE_FIELD_PATTERNS.test(value)) {
				findings.push({
					id: `expr-${++counter}`,
					category: 'expression-risk',
					severity: 'info',
					title: 'Expression accesses sensitive field',
					description:
						"This expression references a field name that looks like a credential or secret. Ensure sensitive data isn't being passed to untrusted destinations.",
					remediation:
						'1. Verify the destination of this data — ensure it is not being sent to an untrusted or external service.\n2. If the field contains credentials, use n8n credentials instead of passing them via expressions.\n3. Add a Set node to redact or mask the sensitive field before passing it downstream.',
					nodeName: node.name,
					nodeId: node.id,
					nodeType: node.type,
					parameterPath: path,
				});
			}
		});
	}

	return findings;
}
