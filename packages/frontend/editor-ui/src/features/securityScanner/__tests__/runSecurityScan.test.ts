import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { INodeUi } from '@/Interface';
import type { IConnections, INodeTypeDescription } from 'n8n-workflow';
import { runSecurityScan } from '../scanner/runSecurityScan';
import { checkHardcodedSecrets } from '../scanner/checks/hardcodedSecrets';
import { checkPiiPatterns } from '../scanner/checks/piiPatterns';
import { checkInsecureConfig } from '../scanner/checks/insecureConfig';
import { checkDataExposure } from '../scanner/checks/dataExposure';
import { checkExpressionRisks } from '../scanner/checks/expressionRisks';
import { checkAiSecurity } from '../scanner/checks/aiSecurityChecks';
import { redactValue } from '../scanner/utils/redact';

/**
 * Node type descriptions used by the node classification utilities.
 * Includes properties, codex, inputs/outputs, and webhooks so the
 * metadata-driven utility functions work correctly.
 */
const MOCK_NODE_TYPES: Record<string, Partial<INodeTypeDescription>> = {
	'n8n-nodes-base.webhook': {
		group: ['trigger'],
		credentials: [],
		webhooks: [{ httpMethod: 'GET', name: 'default', path: '', isFullPath: false }],
		properties: [
			{
				name: 'authentication',
				type: 'options',
				displayName: 'Authentication',
				default: 'none',
			},
		],
	},
	'n8n-nodes-base.formTrigger': {
		group: ['trigger'],
		credentials: [],
		webhooks: [{ httpMethod: 'POST', name: 'setup', path: '', isFullPath: false }],
		properties: [
			{
				name: 'authentication',
				type: 'options',
				displayName: 'Authentication',
				default: 'none',
			},
		],
	},
	'n8n-nodes-base.httpRequest': { group: [], credentials: [], properties: [] },
	'n8n-nodes-base.slack': {
		group: [],
		credentials: [{ name: 'slackApi', required: true }],
		properties: [],
	},
	'n8n-nodes-base.code': {
		group: ['transform'],
		credentials: [],
		properties: [
			{
				name: 'jsCode',
				type: 'string',
				displayName: 'JavaScript',
				default: '',
				typeOptions: { editor: 'codeNodeEditor' },
			},
		],
	},
	'n8n-nodes-base.codeNode': {
		group: ['transform'],
		credentials: [],
		properties: [
			{
				name: 'jsCode',
				type: 'string',
				displayName: 'JavaScript',
				default: '',
				typeOptions: { editor: 'codeNodeEditor' },
			},
		],
	},
	'n8n-nodes-base.set': {
		group: ['input'],
		credentials: [],
		properties: [
			{
				name: 'assignments',
				type: 'assignmentCollection',
				displayName: 'Fields to Set',
				default: {},
			},
		],
	},
	'@n8n/n8n-nodes-langchain.agent': {
		group: [],
		credentials: [],
		codex: { categories: ['AI'], subcategories: { AI: ['Agents', 'Root Nodes'] } },
		inputs: [
			{ type: 'main', displayName: '' },
			{ type: 'ai_languageModel', displayName: 'Model' },
			{ type: 'ai_tool', displayName: 'Tool' },
		],
		outputs: ['main'],
		properties: [
			{
				name: 'systemMessage',
				type: 'string',
				displayName: 'System Message',
				default: '',
			},
		],
	},
	'@n8n/n8n-nodes-langchain.chainLlm': {
		group: [],
		credentials: [],
		codex: { categories: ['AI'], subcategories: { AI: ['Chains', 'Root Nodes'] } },
		inputs: ['main', 'ai_languageModel'],
		outputs: ['main'],
		properties: [
			{
				name: 'messages',
				type: 'fixedCollection',
				displayName: 'Chat Messages',
				default: {},
			},
		],
	},
	'@n8n/n8n-nodes-langchain.toolHttpRequest': {
		group: [],
		credentials: [],
		name: 'toolHttpRequest',
		displayName: 'HTTP Request Tool',
		codex: { categories: ['AI'], subcategories: { AI: ['Tools'] } },
		inputs: [],
		outputs: ['ai_tool'],
		properties: [
			{
				name: 'url',
				type: 'string',
				displayName: 'URL',
				default: '',
			},
		],
	},
	'@n8n/n8n-nodes-langchain.toolCode': {
		group: [],
		credentials: [],
		name: 'toolCode',
		displayName: 'Code Tool',
		codex: { categories: ['AI'], subcategories: { AI: ['Tools'] } },
		inputs: [],
		outputs: ['ai_tool'],
		properties: [
			{
				name: 'jsCode',
				type: 'string',
				displayName: 'JavaScript',
				default: '',
				typeOptions: { editor: 'codeNodeEditor' },
			},
			{
				name: 'pythonCode',
				type: 'string',
				displayName: 'Python',
				default: '',
				typeOptions: { editor: 'codeNodeEditor' },
			},
		],
	},
};

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) =>
			(MOCK_NODE_TYPES[type] as INodeTypeDescription | undefined) ?? null,
	}),
}));

beforeEach(() => {
	setActivePinia(createPinia());
});

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
		expect(findings[0].remediation).toBeTruthy();
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
		expect(findings[0].remediation).toBeTruthy();
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

	it('should detect PII field names in any node with assignmentCollection', () => {
		// Simulate a custom node type with assignmentCollection
		const customType = 'n8n-nodes-base.customTransform';
		(MOCK_NODE_TYPES as Record<string, Partial<INodeTypeDescription>>)[customType] = {
			group: [],
			credentials: [],
			properties: [
				{
					name: 'fields',
					type: 'assignmentCollection',
					displayName: 'Fields',
					default: {},
				},
			],
		};

		const nodes = [
			makeNode({
				name: 'Custom Transform',
				type: customType,
				parameters: {
					fields: {
						assignments: [{ name: 'ssn', value: '={{ $json.ssn }}' }],
					},
				},
			}),
		];
		const findings = checkPiiPatterns(nodes);
		expect(findings.some((f) => f.title.includes('ssn'))).toBe(true);
		expect(findings.some((f) => f.title.includes('Custom Transform'))).toBe(true);

		// Cleanup
		delete (MOCK_NODE_TYPES as Record<string, unknown>)[customType];
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

	it('should detect unauthenticated formTrigger (webhook-based trigger)', () => {
		const nodes = [
			makeNode({
				name: 'Form Trigger',
				type: 'n8n-nodes-base.formTrigger',
				parameters: {
					authentication: 'none',
				},
			}),
		];
		const findings = checkInsecureConfig(nodes);
		expect(findings.some((f) => f.title.includes('webhook'))).toBe(true);
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

	it('should detect dangerous patterns in toolCode pythonCode parameter', () => {
		const nodes = [
			makeNode({
				name: 'Code Tool',
				type: '@n8n/n8n-nodes-langchain.toolCode',
				parameters: {
					pythonCode: 'import subprocess; subprocess.spawn("ls")',
				},
			}),
		];
		const findings = checkDataExposure(nodes, {});
		expect(findings.some((f) => f.title.includes('spawn()'))).toBe(true);
		expect(findings.some((f) => f.parameterPath === 'pythonCode')).toBe(true);
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
		expect(findings[0].remediation).toBeTruthy();
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

describe('checkAiSecurity', () => {
	it('should detect user input in AI system prompt (prompt injection)', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {
					systemMessage: '={{ $json.userPrompt }}',
				},
			}),
		];
		const findings = checkAiSecurity(nodes, {});
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('expression-risk');
		expect(findings[0].severity).toBe('warning');
		expect(findings[0].title).toContain('system prompt');
	});

	it('should not flag static system prompts', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {
					systemMessage: 'You are a helpful assistant.',
				},
			}),
		];
		const findings = checkAiSecurity(nodes, {});
		expect(findings).toHaveLength(0);
	});

	it('should detect direct trigger-to-AI data flow', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			Webhook: {
				main: [[{ node: 'AI Agent', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('data-exposure');
		expect(findings[0].title).toContain('directly');
	});

	it('should detect over-privileged AI agent tools', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
			makeNode({
				name: 'HTTP Tool',
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			'HTTP Tool': {
				ai_tool: [[{ node: 'AI Agent', type: 'ai_tool' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('insecure-config');
		expect(findings[0].title).toContain('HTTP Request tool');
	});

	it('should detect AI output to external service', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			'AI Agent': {
				main: [[{ node: 'Slack', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		expect(findings.length).toBeGreaterThanOrEqual(1);
		expect(findings[0].category).toBe('data-exposure');
		expect(findings[0].title).toContain('AI output');
	});

	it('should detect secrets in AI system prompts', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {
					systemMessage: 'Use this key: AKIAIOSFODNN7EXAMPLE to call the API',
				},
			}),
		];
		const findings = checkAiSecurity(nodes, {});
		expect(findings.length).toBeGreaterThanOrEqual(1);
		const secretFinding = findings.find((f) => f.category === 'hardcoded-secret');
		expect(secretFinding).toBeDefined();
		expect(secretFinding?.severity).toBe('critical');
		expect(secretFinding?.title).toContain('AWS');
		expect(secretFinding?.matchedValue).toContain('*');
	});

	it('should not flag secrets outside system prompt parameters', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {
					otherParam: 'AKIAIOSFODNN7EXAMPLE',
				},
			}),
		];
		const findings = checkAiSecurity(nodes, {});
		const secretFindings = findings.filter((f) => f.category === 'hardcoded-secret');
		expect(secretFindings).toHaveLength(0);
	});

	it('should detect AI agent chaining without guardrails', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent 1',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
			makeNode({
				name: 'AI Chain',
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			'AI Agent 1': {
				main: [[{ node: 'AI Chain', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		const chainFinding = findings.find((f) => f.title.includes('chains directly'));
		expect(chainFinding).toBeDefined();
		expect(chainFinding?.category).toBe('data-exposure');
		expect(chainFinding?.severity).toBe('warning');
	});

	it('should not flag AI to non-AI connections as chaining', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
			makeNode({
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			'AI Agent': {
				main: [[{ node: 'Set', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		const chainFindings = findings.filter((f) => f.title.includes('chains directly'));
		expect(chainFindings).toHaveLength(0);
	});

	it('should detect Code tool as dangerous tool', () => {
		const nodes = [
			makeNode({
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				parameters: {},
			}),
			makeNode({
				name: 'Code Tool',
				type: '@n8n/n8n-nodes-langchain.toolCode',
				parameters: {},
			}),
		];
		const connections: IConnections = {
			'Code Tool': {
				ai_tool: [[{ node: 'AI Agent', type: 'ai_tool' as never, index: 0 }]],
			},
		};
		const findings = checkAiSecurity(nodes, connections);
		const toolFinding = findings.find((f) => f.title.includes('Code tool'));
		expect(toolFinding).toBeDefined();
		expect(toolFinding?.category).toBe('insecure-config');
	});
});

describe('Tier 1 checks', () => {
	it('should detect dangerous eval() in Code nodes', () => {
		const nodes = [
			makeNode({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: {
					jsCode: 'const result = eval($json.expression); return [{json: {result}}];',
				},
			}),
		];
		const findings = checkDataExposure(nodes, {});
		const evalFinding = findings.find((f) => f.title.includes('eval()'));
		expect(evalFinding).toBeDefined();
		expect(evalFinding?.severity).toBe('warning');
		expect(evalFinding?.category).toBe('data-exposure');
	});

	it('should detect child_process in Code nodes', () => {
		const nodes = [
			makeNode({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: {
					jsCode: "const { exec } = require('child_process'); exec('ls');",
				},
			}),
		];
		const findings = checkDataExposure(nodes, {});
		const childProcFinding = findings.find((f) => f.title.includes('child_process'));
		expect(childProcFinding).toBeDefined();
	});

	it('should detect fan-out blast radius', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({ name: 'Slack1', type: 'n8n-nodes-base.slack', parameters: {} }),
			makeNode({ name: 'Slack2', type: 'n8n-nodes-base.slack', parameters: {} }),
			makeNode({ name: 'Slack3', type: 'n8n-nodes-base.slack', parameters: {} }),
			makeNode({ name: 'Slack4', type: 'n8n-nodes-base.slack', parameters: {} }),
			makeNode({ name: 'Slack5', type: 'n8n-nodes-base.slack', parameters: {} }),
		];
		const connections: IConnections = {
			Webhook: {
				main: [
					[
						{ node: 'Slack1', type: 'main' as never, index: 0 },
						{ node: 'Slack2', type: 'main' as never, index: 0 },
						{ node: 'Slack3', type: 'main' as never, index: 0 },
						{ node: 'Slack4', type: 'main' as never, index: 0 },
						{ node: 'Slack5', type: 'main' as never, index: 0 },
					],
				],
			},
		};
		const findings = checkDataExposure(nodes, connections);
		const fanOutFinding = findings.find((f) => f.title.includes('fan-out'));
		expect(fanOutFinding).toBeDefined();
		expect(fanOutFinding?.severity).toBe('warning');
		expect(fanOutFinding?.title).toContain('5');
	});

	it('should detect SSRF risk with webhook and internal URL', () => {
		const nodes = [
			makeNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { authentication: 'none' },
			}),
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'http://192.168.1.100/admin' },
			}),
		];
		const findings = checkInsecureConfig(nodes);
		const ssrfFinding = findings.find((f) => f.title.includes('SSRF'));
		expect(ssrfFinding).toBeDefined();
		expect(ssrfFinding?.severity).toBe('warning');
	});

	it('should not flag SSRF when no webhook exists', () => {
		const nodes = [
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'http://192.168.1.100/admin' },
			}),
		];
		const findings = checkInsecureConfig(nodes);
		const ssrfFindings = findings.filter((f) => f.title.includes('SSRF'));
		expect(ssrfFindings).toHaveLength(0);
	});

	it('should detect SSRF risk with formTrigger (webhook-based)', () => {
		const nodes = [
			makeNode({
				name: 'Form Trigger',
				type: 'n8n-nodes-base.formTrigger',
				parameters: {},
			}),
			makeNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'http://10.0.0.1/internal' },
			}),
		];
		const findings = checkInsecureConfig(nodes);
		const ssrfFinding = findings.find((f) => f.title.includes('SSRF'));
		expect(ssrfFinding).toBeDefined();
	});
});

describe('remediation text', () => {
	it('should include non-empty remediation in all findings', () => {
		const nodes = [
			makeNode({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: { authentication: 'none' },
			}),
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
				name: 'Set',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'email', value: 'user@example.com' }],
					},
				},
			}),
			makeNode({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				parameters: {
					jsCode: 'console.log($input.all());\nreturn items;',
				},
			}),
		];
		const connections: IConnections = {
			Webhook: {
				main: [[{ node: 'HTTP Request', type: 'main' as never, index: 0 }]],
			},
		};
		const findings = runSecurityScan(nodes, connections);
		expect(findings.length).toBeGreaterThan(0);
		for (const finding of findings) {
			expect(finding.remediation).toBeTruthy();
			expect(finding.remediation.length).toBeGreaterThan(20);
		}
	});
});
