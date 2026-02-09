import { describe, it, expect } from 'vitest';
import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import { runSecurityScan } from '../scanner/runSecurityScan';
import { checkHardcodedSecrets } from '../scanner/checks/hardcodedSecrets';
import { checkPiiPatterns } from '../scanner/checks/piiPatterns';
import { checkInsecureConfig } from '../scanner/checks/insecureConfig';
import { checkDataExposure } from '../scanner/checks/dataExposure';
import { checkExpressionRisks } from '../scanner/checks/expressionRisks';
import { redactValue } from '../scanner/utils/redact';

function makeNode(overrides: Partial<INodeUi> & { name: string; type: string }): INodeUi {
	const { name, type, ...rest } = overrides;
	return {
		id: `node-${name}`,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...rest,
		name,
		type,
	} as INodeUi;
}

describe('redactValue', () => {
	it('should redact short values', () => {
		expect(redactValue('abc')).toBe('******');
	});

	it('should redact medium values', () => {
		const result = redactValue('1234567890');
		expect(result.startsWith('12')).toBe(true);
		expect(result.endsWith('90')).toBe(true);
		expect(result).toContain('*');
	});

	it('should redact long values', () => {
		const result = redactValue('xk_fake_abc123def456ghi789');
		expect(result.startsWith('xk_f')).toBe(true);
		expect(result.endsWith('i789')).toBe(true);
		expect(result).toContain('*');
	});
});

describe('checkHardcodedSecrets', () => {
	it('should detect Stripe API keys', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.stripe.com/v1/charges',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer sk_test_FAKE0000000000000000xx' }],
					},
				},
			}),
		];
		const findings = checkHardcodedSecrets(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('hardcoded-secret');
		expect(findings[0].severity).toBe('critical');
		expect(findings[0].title).toContain('Stripe');
	});

	it('should detect GitHub tokens', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.github.com',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'token ghp_abcdefghijklmnopqrstuvwxyz1234567890',
							},
						],
					},
				},
			}),
		];
		const findings = checkHardcodedSecrets(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('GitHub');
	});

	it('should detect AWS access keys', () => {
		const nodes = [
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'awsKey', value: 'AKIAIOSFODNN7EXAMPLE' }],
					},
				},
			}),
		];
		const findings = checkHardcodedSecrets(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('AWS');
	});

	it('should skip expressions (dynamic values)', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: '={{ $json.url }}',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: '={{ $json.token }}' }],
					},
				},
			}),
		];
		const findings = checkHardcodedSecrets(nodes);
		expect(findings).toHaveLength(0);
	});

	it('should not flag non-secret strings', () => {
		const nodes = [
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'greeting', value: 'Hello, world!' }],
					},
				},
			}),
		];
		const findings = checkHardcodedSecrets(nodes);
		expect(findings).toHaveLength(0);
	});
});

describe('checkPiiPatterns', () => {
	it('should detect email addresses', () => {
		const nodes = [
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'contact', value: 'user@example.com' }],
					},
				},
			}),
		];
		const findings = checkPiiPatterns(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('Email');
	});

	it('should detect SSN patterns', () => {
		const nodes = [
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'id', value: '123-45-6789' }],
					},
				},
			}),
		];
		const findings = checkPiiPatterns(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('SSN');
	});

	it('should detect PII field names in Set nodes', () => {
		const nodes = [
			makeNode({
				name: 'Set Data',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [
							{ name: 'firstName', value: '={{ $json.name }}' },
							{ name: 'ssn', value: '={{ $json.ssn }}' },
						],
					},
				},
			}),
		];
		const findings = checkPiiPatterns(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(2);
		expect(findings.some((f) => f.title.includes('firstName'))).toBe(true);
		expect(findings.some((f) => f.title.includes('ssn'))).toBe(true);
	});
});

describe('checkInsecureConfig', () => {
	it('should detect HTTP URLs (non-localhost)', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'http://api.example.com/data',
				},
			}),
		];
		const findings = checkInsecureConfig(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('HTTP');
	});

	it('should not flag localhost HTTP URLs', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'http://localhost:3000/api',
				},
			}),
		];
		const findings = checkInsecureConfig(nodes);
		expect(findings).toHaveLength(0);
	});

	it('should detect unauthenticated webhooks', () => {
		const nodes = [
			makeNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: {
					authentication: 'none',
					path: '/my-hook',
				},
			}),
		];
		const findings = checkInsecureConfig(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('webhook');
	});

	it('should detect disabled SSL verification', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://api.example.com',
					allowUnauthorizedCerts: true,
				},
			}),
		];
		const findings = checkInsecureConfig(nodes);
		expect(findings.some((f) => f.title.includes('SSL'))).toBe(true);
	});
});

describe('checkDataExposure', () => {
	it('should detect webhook data flowing to external service', () => {
		const nodes = [
			makeNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { path: '/hook' },
			}),
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://api.external.com' },
			}),
		];
		const connections: IConnections = {
			Webhook: {
				main: [[{ node: 'HTTP Request', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = checkDataExposure(nodes, connections);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('data-exposure');
	});

	it('should detect console.log in Code nodes', () => {
		const nodes = [
			makeNode({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: {
					jsCode: 'console.log($input.all());\nreturn items;',
				},
			}),
		];
		const findings = checkDataExposure(nodes, {});
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('console.log');
	});
});

describe('checkExpressionRisks', () => {
	it('should detect $env usage in expressions', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: '={{ $env.API_URL }}/endpoint',
				},
			}),
		];
		const findings = checkExpressionRisks(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('Environment variable');
	});

	it('should detect access to sensitive fields in expressions', () => {
		const nodes = [
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'authHeader', value: '={{ $json.password }}' }],
					},
				},
			}),
		];
		const findings = checkExpressionRisks(nodes);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].title).toContain('sensitive field');
	});
});

describe('runSecurityScan', () => {
	it('should return empty array for empty workflow', () => {
		const findings = runSecurityScan([], {});
		expect(findings).toHaveLength(0);
	});

	it('should return findings sorted by severity (critical first)', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'http://api.example.com',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer sk_test_FAKE0000000000000000xx' }],
					},
				},
			}),
			makeNode({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: {
					jsCode: 'console.log("hello");',
				},
			}),
		];
		const findings = runSecurityScan(nodes, {});
		expect(findings.length).toBeGreaterThan(0);

		// Verify ordering: critical before warning before info
		for (let i = 1; i < findings.length; i++) {
			const prev = { critical: 0, warning: 1, info: 2 }[findings[i - 1].severity];
			const curr = { critical: 0, warning: 1, info: 2 }[findings[i].severity];
			expect(prev).toBeLessThanOrEqual(curr);
		}
	});

	it('should aggregate findings from all checks', () => {
		const nodes = [
			makeNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { authentication: 'none' },
			}),
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'email', value: 'user@example.com' }],
					},
				},
			}),
		];
		const findings = runSecurityScan(nodes, {});
		const categories = new Set(findings.map((f) => f.category));
		expect(categories.size).toBeGreaterThanOrEqual(2);
	});
});
