import type { INodeUi } from '@/Interface';
import type { SecurityFinding } from '../types';
import { walkParameters } from '../utils/parameterWalker';
import { isWebhookNode } from '../utils/nodeClassification';

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/;

/** RFC 1918 and other internal/private network ranges. */
const INTERNAL_NETWORK_PATTERN =
	/^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0)(:|\/|$)/;

/**
 * Detects insecure configuration: HTTP URLs (non-localhost), disabled SSL verification,
 * and unauthenticated webhooks.
 */
export function checkInsecureConfig(nodes: INodeUi[]): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	for (const node of nodes) {
		if (!node.parameters) continue;

		// Check for http:// URLs (non-localhost)
		walkParameters(node.parameters, (value, path, isExpr) => {
			if (isExpr) return;

			const httpMatch = value.match(/http:\/\/([^/\s]+)/);
			if (httpMatch) {
				const host = httpMatch[1].split(':')[0];
				if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
					findings.push({
						id: `config-${++counter}`,
						category: 'insecure-config',
						severity: 'warning',
						title: 'Insecure HTTP URL (no TLS)',
						description: `Use HTTPS instead of HTTP to encrypt data in transit to "${host}".`,
						remediation:
							'1. Change the URL from "http://" to "https://".\n2. If the server does not support HTTPS, contact the service provider to enable TLS.\n3. If this is an internal service, consider placing it behind a reverse proxy with TLS termination.',
						nodeName: node.name,
						nodeId: node.id,
						nodeType: node.type,
						parameterPath: path,
					});
				}
			}
		});

		// Check for allowUnauthorizedCerts
		if (
			(node.parameters as Record<string, unknown>).allowUnauthorizedCerts === true ||
			(node.parameters as Record<string, unknown>).allowUnauthorizedCerts === 'true'
		) {
			findings.push({
				id: `config-${++counter}`,
				category: 'insecure-config',
				severity: 'warning',
				title: 'SSL certificate verification disabled',
				description:
					'Disabling SSL verification makes the connection vulnerable to man-in-the-middle attacks.',
				remediation:
					'1. Open the node and uncheck "Allow Unauthorized Certs" (or set it to false).\n2. If the server uses a self-signed certificate, install the CA certificate on the n8n server instead.\n3. For development/testing only: re-enable verification before deploying to production.',
				nodeName: node.name,
				nodeId: node.id,
				nodeType: node.type,
				parameterPath: 'allowUnauthorizedCerts',
			});
		}

		// Check for unauthenticated webhooks
		if (isWebhookNode(node)) {
			const auth = (node.parameters as Record<string, unknown>).authentication;
			if (!auth || auth === 'none') {
				findings.push({
					id: `config-${++counter}`,
					category: 'insecure-config',
					severity: 'warning',
					title: 'Unauthenticated webhook',
					description:
						'This webhook has no authentication. Anyone with the URL can trigger it. Add header or basic auth.',
					remediation:
						'1. Open the Webhook node and set Authentication to "Header Auth" or "Basic Auth".\n2. Configure the authentication credentials.\n3. Update the calling system to include the required auth headers.\n4. Test the webhook to confirm unauthorized requests are rejected.',
					nodeName: node.name,
					nodeId: node.id,
					nodeType: node.type,
					parameterPath: 'authentication',
				});
			}
		}

		// Check HTTP Request node without credentials
		if (node.type === 'n8n-nodes-base.httpRequest') {
			const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
			const authType = (node.parameters as Record<string, unknown>).authentication;
			if (!hasCredentials && (!authType || authType === 'none')) {
				// Only flag if the URL looks like an external API (not localhost)
				const url = String((node.parameters as Record<string, unknown>).url ?? '');
				if (
					url &&
					!url.startsWith('=') &&
					!LOCAL_URL_PATTERN.test(url) &&
					/^https?:\/\/[^/]+/.test(url)
				) {
					findings.push({
						id: `config-${++counter}`,
						category: 'insecure-config',
						severity: 'info',
						title: 'HTTP Request without credentials',
						description:
							'This HTTP Request node has no authentication configured. If the API requires auth, use n8n credentials.',
						remediation:
							'1. If this API requires authentication, click "Authentication" in the node and select the appropriate method.\n2. Create an n8n credential for the service.\n3. If the API is truly public, you can ignore this finding.',
						nodeName: node.name,
						nodeId: node.id,
						nodeType: node.type,
						parameterPath: 'authentication',
					});
				}
			}
		}
	}

	// SSRF risk: webhook trigger + HTTP requests to internal network
	const hasWebhook = nodes.some((n) => isWebhookNode(n));
	if (hasWebhook) {
		for (const node of nodes) {
			if (node.type !== 'n8n-nodes-base.httpRequest' || !node.parameters) continue;
			const url = String((node.parameters as Record<string, unknown>).url ?? '');
			if (url && !url.startsWith('=') && INTERNAL_NETWORK_PATTERN.test(url)) {
				findings.push({
					id: `config-${++counter}`,
					category: 'insecure-config',
					severity: 'warning',
					title: `SSRF risk: webhook with internal URL in "${node.name}"`,
					description:
						'This workflow has a public webhook and an HTTP Request to an internal network address. An attacker could exploit the webhook to probe internal services.',
					remediation:
						'1. Avoid using internal/private network URLs in HTTP Request nodes that receive data from webhooks.\n2. If internal access is needed, validate and sanitize the input before making the request.\n3. Use an allowlist of permitted internal endpoints instead of accepting arbitrary URLs.\n4. Consider using n8n environment variables for internal URLs rather than hardcoding them.',
					nodeName: node.name,
					nodeId: node.id,
					nodeType: node.type,
					parameterPath: 'url',
				});
			}
		}
	}

	return findings;
}
