import { describe, it, expect } from 'vitest';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import {
	isInputTrigger,
	isExternalService,
	isCodeNode,
	getCodeParameters,
	getAssignmentFields,
	isAiNode,
	isAiAgent,
	isDangerousTool,
	getPromptParameters,
	isWebhookNode,
} from '../scanner/utils/nodeClassification';

function makeNode(overrides: Partial<INodeUi> & { name: string; type: string }): INodeUi {
	return {
		id: `node-${overrides.name}`,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...overrides,
	} as INodeUi;
}

function makeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		name: 'test.node',
		displayName: 'Test Node',
		group: [],
		description: '',
		version: 1,
		defaults: { name: 'Test' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		...overrides,
	} as INodeTypeDescription;
}

describe('isInputTrigger', () => {
	it('returns true for a trigger group node type', () => {
		const node = makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' });
		const nt = makeType({ group: ['trigger'] });
		expect(isInputTrigger(node, nt)).toBe(true);
	});

	it('returns false for a non-trigger node type', () => {
		const node = makeNode({ name: 'Set', type: 'n8n-nodes-base.set' });
		const nt = makeType({ group: ['transform'] });
		expect(isInputTrigger(node, nt)).toBe(false);
	});

	it('returns false when nodeType is null (no metadata)', () => {
		const node = makeNode({ name: 'Unknown', type: 'custom.unknown' });
		expect(isInputTrigger(node, null)).toBe(false);
	});
});

describe('isExternalService', () => {
	it('returns true for httpRequest type regardless of metadata', () => {
		const node = makeNode({ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' });
		expect(isExternalService(node, null)).toBe(true);
	});

	it('returns true for node with credentials', () => {
		const node = makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' });
		const nt = makeType({ credentials: [{ name: 'slackApi', required: true }] });
		expect(isExternalService(node, nt)).toBe(true);
	});

	it('returns false for node without credentials', () => {
		const node = makeNode({ name: 'Set', type: 'n8n-nodes-base.set' });
		const nt = makeType({ credentials: [] });
		expect(isExternalService(node, nt)).toBe(false);
	});
});

describe('isCodeNode', () => {
	it('returns true for node with code editor property', () => {
		const node = makeNode({ name: 'Code', type: 'n8n-nodes-base.code' });
		const nt = makeType({
			properties: [
				{
					name: 'jsCode',
					type: 'string',
					displayName: 'JS',
					default: '',
					typeOptions: { editor: 'codeNodeEditor' },
				},
			],
		});
		expect(isCodeNode(node, nt)).toBe(true);
	});

	it('falls back to known code types when metadata is null', () => {
		expect(isCodeNode(makeNode({ name: 'Code', type: 'n8n-nodes-base.code' }), null)).toBe(true);
		expect(isCodeNode(makeNode({ name: 'Code', type: 'n8n-nodes-base.codeNode' }), null)).toBe(
			true,
		);
		expect(isCodeNode(makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }), null)).toBe(false);
	});
});

describe('getCodeParameters', () => {
	it('returns code editor param names from metadata', () => {
		const node = makeNode({ name: 'Code', type: 'n8n-nodes-base.code' });
		const nt = makeType({
			properties: [
				{
					name: 'jsCode',
					type: 'string',
					displayName: 'JS',
					default: '',
					typeOptions: { editor: 'codeNodeEditor' },
				},
				{
					name: 'pyCode',
					type: 'string',
					displayName: 'Python',
					default: '',
					typeOptions: { editor: 'codeNodeEditor' },
				},
				{ name: 'other', type: 'string', displayName: 'Other', default: '' },
			],
		});
		expect(getCodeParameters(node, nt)).toEqual(['jsCode', 'pyCode']);
	});

	it('falls back to jsCode when metadata is null', () => {
		const node = makeNode({ name: 'Code', type: 'n8n-nodes-base.code' });
		expect(getCodeParameters(node, null)).toEqual(['jsCode']);
	});
});

describe('getAssignmentFields', () => {
	it('returns assignmentCollection param names', () => {
		const node = makeNode({ name: 'Set', type: 'n8n-nodes-base.set' });
		const nt = makeType({
			properties: [
				{ name: 'assignments', type: 'assignmentCollection', displayName: 'Fields', default: {} },
				{ name: 'other', type: 'string', displayName: 'Other', default: '' },
			],
		});
		expect(getAssignmentFields(node, nt)).toEqual(['assignments']);
	});

	it('returns empty array when metadata is null', () => {
		const node = makeNode({ name: 'Set', type: 'n8n-nodes-base.set' });
		expect(getAssignmentFields(node, null)).toEqual([]);
	});
});

describe('isAiNode', () => {
	it('returns true for node with AI codex category', () => {
		const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
		const nt = makeType({ codex: { categories: ['AI'] } });
		expect(isAiNode(node, nt)).toBe(true);
	});

	it('returns true for node with AI connection types', () => {
		const node = makeNode({ name: 'Tool', type: 'custom.tool' });
		const nt = makeType({
			inputs: [],
			outputs: [{ type: NodeConnectionTypes.AiTool }],
		});
		expect(isAiNode(node, nt)).toBe(true);
	});

	it('falls back to prefix check when metadata is null', () => {
		expect(isAiNode(makeNode({ name: 'A', type: '@n8n/n8n-nodes-langchain.agent' }), null)).toBe(
			true,
		);
		expect(isAiNode(makeNode({ name: 'B', type: 'n8n-nodes-base.set' }), null)).toBe(false);
	});
});

describe('isAiAgent', () => {
	it('returns true for node that accepts ai_tool inputs', () => {
		const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
		const nt = makeType({
			inputs: [{ type: 'main' }, { type: NodeConnectionTypes.AiTool }],
		});
		expect(isAiAgent(node, nt)).toBe(true);
	});

	it('returns true via codex subcategory fallback', () => {
		const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
		const nt = makeType({
			inputs: '={{ expression }}' as `={{${string}}}`,
			codex: { subcategories: { AI: ['Agents'] } },
		});
		expect(isAiAgent(node, nt)).toBe(true);
	});

	it('falls back to type string when metadata is null', () => {
		expect(isAiAgent(makeNode({ name: 'A', type: '@n8n/n8n-nodes-langchain.agent' }), null)).toBe(
			true,
		);
		expect(
			isAiAgent(makeNode({ name: 'B', type: '@n8n/n8n-nodes-langchain.chainLlm' }), null),
		).toBe(false);
	});
});

describe('isDangerousTool', () => {
	it('detects code editor as dangerous', () => {
		const node = makeNode({ name: 'Tool', type: 'custom.toolCode' });
		const nt = makeType({
			properties: [
				{
					name: 'code',
					type: 'string',
					displayName: 'Code',
					default: '',
					typeOptions: { editor: 'codeNodeEditor' },
				},
			],
		});
		const result = isDangerousTool(node, nt);
		expect(result.isDangerous).toBe(true);
		expect(result.reason).toBe('execute arbitrary code');
	});

	it('detects HTTP tool output as dangerous', () => {
		const node = makeNode({ name: 'HTTP Tool', type: 'custom.toolHttp' });
		const nt = makeType({
			name: 'httpRequestTool',
			displayName: 'HTTP Request Tool',
			outputs: [{ type: NodeConnectionTypes.AiTool }],
			properties: [],
		});
		const result = isDangerousTool(node, nt);
		expect(result.isDangerous).toBe(true);
		expect(result.reason).toBe('make arbitrary HTTP requests');
	});

	it('returns safe for non-dangerous tool', () => {
		const node = makeNode({ name: 'Safe', type: 'custom.safeTool' });
		const nt = makeType({
			outputs: [{ type: NodeConnectionTypes.AiTool }],
			properties: [],
		});
		const result = isDangerousTool(node, nt);
		expect(result.isDangerous).toBe(false);
	});

	it('falls back to type suffix when metadata is null', () => {
		expect(
			isDangerousTool(makeNode({ name: 'A', type: 'x.toolHttpRequest' }), null).isDangerous,
		).toBe(true);
		expect(isDangerousTool(makeNode({ name: 'B', type: 'x.toolCode' }), null).isDangerous).toBe(
			true,
		);
		expect(isDangerousTool(makeNode({ name: 'C', type: 'x.safeTool' }), null).isDangerous).toBe(
			false,
		);
	});
});

describe('getPromptParameters', () => {
	it('returns matching prompt parameters from metadata', () => {
		const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
		const nt = makeType({
			properties: [
				{ name: 'systemMessage', type: 'string', displayName: 'System Message', default: '' },
				{ name: 'temperature', type: 'number', displayName: 'Temperature', default: 0 },
				{ name: 'customPrompt', type: 'string', displayName: 'Custom Prompt', default: '' },
			],
		});
		const params = getPromptParameters(node, nt);
		expect(params).toContain('systemMessage');
		expect(params).toContain('customPrompt');
		expect(params).not.toContain('temperature');
	});

	it('falls back to known names when metadata is null', () => {
		const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
		expect(getPromptParameters(node, null)).toEqual(['systemMessage', 'text', 'messages']);
	});
});

describe('isWebhookNode', () => {
	it('returns true for node with webhooks array', () => {
		const node = makeNode({ name: 'WH', type: 'n8n-nodes-base.webhook' });
		const nt = makeType({
			webhooks: [{ httpMethod: 'GET', name: 'default', path: '', isFullPath: false }],
		});
		expect(isWebhookNode(node, nt)).toBe(true);
	});

	it('returns false for node without webhooks', () => {
		const node = makeNode({ name: 'Set', type: 'n8n-nodes-base.set' });
		const nt = makeType({ webhooks: [] });
		expect(isWebhookNode(node, nt)).toBe(false);
	});

	it('falls back to type check when metadata is null', () => {
		expect(isWebhookNode(makeNode({ name: 'WH', type: 'n8n-nodes-base.webhook' }), null)).toBe(
			true,
		);
		expect(isWebhookNode(makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }), null)).toBe(false);
	});
});
