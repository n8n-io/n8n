import type { AiGatewayConfigDto } from '@n8n/api-types';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const gatewayState = vi.hoisted(() => ({
	isAiGatewayEnabled: true,
	config: null as AiGatewayConfigDto | null,
	supportedCredentialTypes: new Set<string>(),
	nodeTypesByType: new Map<string, INodeTypeDescription>(),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isAiGatewayEnabled() {
			return gatewayState.isAiGatewayEnabled;
		},
	}),
}));

vi.mock('@/app/stores/aiGateway.store', () => ({
	useAiGatewayStore: () => ({
		get config() {
			return gatewayState.config;
		},
		hasGatewayManagedCredential: (node: INode | null) => {
			if (!node?.credentials) return false;
			return Object.values(node.credentials).some((cred) => cred.__aiGatewayManaged === true);
		},
		isCredentialTypeSupported: (type: string) => gatewayState.supportedCredentialTypes.has(type),
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) => gatewayState.nodeTypesByType.get(type) ?? null,
	}),
}));

import { useWorkflowGatewayScan } from './useWorkflowGatewayScan';

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'n1',
		name: 'Node1',
		type: 'n8n-nodes-base.test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		displayName: 'Test Node',
		name: 'n8n-nodes-base.test',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Test' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		...overrides,
	};
}

function makeConfig(overrides: Partial<AiGatewayConfigDto> = {}): AiGatewayConfigDto {
	return {
		nodes: [],
		credentialTypes: [],
		providerConfig: {},
		...overrides,
	} as AiGatewayConfigDto;
}

describe('useWorkflowGatewayScan', () => {
	beforeEach(() => {
		gatewayState.isAiGatewayEnabled = true;
		gatewayState.config = null;
		gatewayState.supportedCredentialTypes = new Set();
		gatewayState.nodeTypesByType = new Map();
	});

	it('returns an empty result when the gateway is disabled', () => {
		gatewayState.isAiGatewayEnabled = false;
		gatewayState.config = makeConfig();
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([makeNode()]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 0 });
	});

	it('returns an empty result when the gateway config is null', () => {
		gatewayState.isAiGatewayEnabled = true;
		gatewayState.config = null;

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([makeNode()]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 0 });
	});

	it('counts an already gateway-managed node instead of offering it', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		const node = makeNode({
			credentials: { testApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true } },
		});

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 1 });
	});

	it('skips a disabled node, which does not run', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([makeNode({ disabled: true })]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 0 });
	});

	it('skips a node type on the frontend exclusion list', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.httpRequest'],
			credentialTypes: ['httpBasicAuth'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.httpRequest',
			makeNodeType({
				name: 'n8n-nodes-base.httpRequest',
				credentials: [{ name: 'httpBasicAuth', required: true }],
			}),
		);
		gatewayState.supportedCredentialTypes = new Set(['httpBasicAuth']);

		const node = makeNode({ type: 'n8n-nodes-base.httpRequest' });

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 0 });
	});

	it('skips a node with no supported candidate credential type', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		// Gateway does not actually serve this credential type, so no activation candidate exists.
		gatewayState.supportedCredentialTypes = new Set();

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([makeNode()]);

		expect(result).toEqual({ opportunities: [], blocked: [], alreadyManagedCount: 0 });
	});

	it('returns an opportunity with the resolved credentialType and activationParameters for an eligible node', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		const node = makeNode({ name: 'My Node' });

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result.alreadyManagedCount).toBe(0);
		expect(result.blocked).toEqual([]);
		expect(result.opportunities).toEqual([
			{
				nodeName: 'My Node',
				nodeType: 'n8n-nodes-base.test',
				credentialType: 'testApi',
				activationParameters: {},
			},
		]);
	});

	it('returns a blocked node with reason versionTooLow', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
			minNodeTypeVersion: { 'n8n-nodes-base.test': 2 },
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({ credentials: [{ name: 'testApi', required: true }] }),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		const node = makeNode({ typeVersion: 1 });

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result.opportunities).toEqual([]);
		expect(result.blocked).toEqual([
			{
				nodeName: 'Node1',
				nodeType: 'n8n-nodes-base.test',
				reason: 'versionTooLow',
			},
		]);
	});

	it('returns a blocked node with reason unsupportedAction, judged against resolved defaults', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['testApi'],
			supportedActions: {
				'n8n-nodes-base.test': { text: ['message'] },
			},
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({
				credentials: [{ name: 'testApi', required: true }],
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [{ name: 'Text', value: 'text' }],
						default: 'text',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Classify', value: 'classify' }],
						default: 'classify',
					},
				],
			}),
		);
		gatewayState.supportedCredentialTypes = new Set(['testApi']);

		// Node omits resource/operation entirely — the node type's default ("classify")
		// is not on the allowlist, so it must be judged as unsupportedAction rather than
		// skipped for "missing" values.
		const node = makeNode({ parameters: {} });

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result.opportunities).toEqual([]);
		expect(result.blocked).toEqual([
			{
				nodeName: 'Node1',
				nodeType: 'n8n-nodes-base.test',
				reason: 'unsupportedAction',
			},
		]);
	});

	it('returns non-empty activationParameters when a sibling credential must be activated', () => {
		gatewayState.config = makeConfig({
			nodes: ['n8n-nodes-base.test'],
			credentialTypes: ['headerAuthApi'],
		});
		gatewayState.nodeTypesByType.set(
			'n8n-nodes-base.test',
			makeNodeType({
				credentials: [
					{
						name: 'basicAuthApi',
						required: true,
						displayOptions: { show: { authentication: ['basic'] } },
					},
					{
						name: 'headerAuthApi',
						required: true,
						displayOptions: { show: { authentication: ['header'] } },
					},
				],
			}),
		);
		// Gateway only serves the header-auth credential type, not the node's current basic one.
		gatewayState.supportedCredentialTypes = new Set(['headerAuthApi']);

		const node = makeNode({ parameters: { authentication: 'basic' } });

		const { scanNodes } = useWorkflowGatewayScan();
		const result = scanNodes([node]);

		expect(result.blocked).toEqual([]);
		expect(result.opportunities).toEqual([
			{
				nodeName: 'Node1',
				nodeType: 'n8n-nodes-base.test',
				credentialType: 'headerAuthApi',
				activationParameters: { authentication: 'header' },
			},
		]);
	});
});
