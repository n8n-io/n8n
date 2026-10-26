import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { NodeHelpers } from 'n8n-workflow';
import type { INodePropertyOptions, INodeTypeDescription } from 'n8n-workflow';

import { getParameterDisplayableOptions, serializeNode } from './nodeTransforms';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(),
}));

// Controls which env feature flags the mocked composable reports as enabled.
const enabledEnvFeatureFlags = new Set<string>();

vi.mock('n8n-workflow', async (importOriginal) => {
	const original = await importOriginal<typeof import('n8n-workflow')>();
	return {
		...original,
		NodeHelpers: {
			displayParameter: vi.fn(),
			getNodeParameters: vi.fn(),
			// serializeNode's credential filtering relies on these; keep the real
			// implementations so tests cover the actual active-type semantics.
			getActiveCredentialTypes: original.NodeHelpers.getActiveCredentialTypes,
			displayParameterPath: original.NodeHelpers.displayParameterPath,
		},
		traverseNodeParameters: vi.fn(),
	};
});

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(),
}));

describe('getParameterDisplayableOptions', () => {
	let mockGetNodeType: ReturnType<typeof vi.fn>;
	let mockNodeType: INodeTypeDescription;
	let mockNode: INodeUi;
	let testOptions: INodePropertyOptions[];

	beforeEach(() => {
		const pinia = createTestingPinia({});
		setActivePinia(pinia);

		vi.clearAllMocks();
		enabledEnvFeatureFlags.clear();
		vi.mocked(useEnvFeatureFlag).mockReturnValue({
			check: {
				value: (flag: string) => enabledEnvFeatureFlags.has(flag),
			},
		} as unknown as ReturnType<typeof useEnvFeatureFlag>);

		mockNodeType = {
			name: 'testNode',
			displayName: 'Test Node',
			version: 1,
			description: 'Test node description',
			defaults: { name: 'Test Node' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			group: ['transform'],
		};

		mockNode = {
			id: 'test-node-id',
			name: 'Test Node',
			type: 'testNode',
			typeVersion: 1,
			position: [100, 100],
			parameters: {
				testParam: 'testValue',
			},
		};

		testOptions = [
			{
				name: 'Option 1',
				value: 'option1',
			},
			{
				name: 'Option 2',
				value: 'option2',
				displayOptions: {
					show: {
						testParam: ['showValue'],
					},
				},
			},
			{
				name: 'Option 3',
				value: 'option3',
			},
			{
				name: 'Option 4',
				value: 'option4',
				displayOptions: {
					hide: {
						testParam: ['hideValue'],
					},
				},
			},
		];

		mockGetNodeType = vi.fn().mockReturnValue(mockNodeType);
		const mockNodeTypesStore = {
			getNodeType: mockGetNodeType,
		};
		vi.mocked(useNodeTypesStore).mockReturnValue(
			mockNodeTypesStore as unknown as ReturnType<typeof useNodeTypesStore>,
		);

		vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue({
			testParam: 'testValue',
		});
	});

	describe('when node is null', () => {
		it('should return all options unchanged', () => {
			const result = getParameterDisplayableOptions(testOptions, null);
			expect(result).toEqual(testOptions);
		});
	});

	describe('when node type is not found', () => {
		it('should return all options unchanged when node type is null', () => {
			mockGetNodeType.mockReturnValue(null);

			const result = getParameterDisplayableOptions(testOptions, mockNode);
			expect(result).toEqual(testOptions);
		});

		it('should return all options unchanged when node type is undefined', () => {
			mockGetNodeType.mockReturnValue(undefined);

			const result = getParameterDisplayableOptions(testOptions, mockNode);
			expect(result).toEqual(testOptions);
		});
	});

	describe('when node and node type are valid', () => {
		beforeEach(() => {
			vi.mocked(NodeHelpers.displayParameter).mockReturnValue(true);
		});

		it('should call getNodeType with correct parameters', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			expect(mockGetNodeType).toHaveBeenCalledWith(mockNode.type, mockNode.typeVersion);
		});

		it('should call getNodeParameters with correct parameters', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			expect(NodeHelpers.getNodeParameters).toHaveBeenCalledWith(
				mockNodeType.properties,
				mockNode.parameters,
				true,
				false,
				mockNode,
				mockNodeType,
			);
		});

		it('should return options without displayOptions unchanged', () => {
			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Option 1 has no displayOptions, so it should be included
			expect(result).toContainEqual(testOptions[0]);
		});

		it('should filter options based on displayOptions when displayParameter returns false', () => {
			// Mock displayParameter to return false for options with displayOptions
			vi.mocked(NodeHelpers.displayParameter).mockImplementation((_nodeParameters, option) => {
				return !option.displayOptions;
			});

			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Should include options without displayOptions
			expect(result).toContainEqual(testOptions[0]); // Option 1 - no displayOptions
			expect(result).toContainEqual(testOptions[2]); // Option 3 - no displayOptions

			// Should exclude options with displayOptions when displayParameter returns false
			expect(result).not.toContainEqual(testOptions[1]); // Option 2 - has displayOptions
			expect(result).not.toContainEqual(testOptions[3]); // Option 4 - has displayOptions
		});

		it('should call displayParameter with correct parameters for displayOptions', () => {
			getParameterDisplayableOptions(testOptions, mockNode);

			// Should be called for options with displayOptions
			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				{ testParam: 'testValue' },
				testOptions[1],
				mockNode,
				mockNodeType,
				undefined,
				'displayOptions',
			);

			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				{ testParam: 'testValue' },
				testOptions[3],
				mockNode,
				mockNodeType,
				undefined,
				'displayOptions',
			);
		});

		it('should use fallback parameters when getNodeParameters returns null', () => {
			vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue(null);

			getParameterDisplayableOptions(testOptions, mockNode);

			// Should use node.parameters as fallback
			expect(NodeHelpers.displayParameter).toHaveBeenCalledWith(
				mockNode.parameters,
				expect.any(Object),
				mockNode,
				mockNodeType,
				undefined,
				expect.any(String),
			);
		});

		it('should handle empty options array', () => {
			const result = getParameterDisplayableOptions([], mockNode);
			expect(result).toEqual([]);
		});

		it('should preserve option order', () => {
			const result = getParameterDisplayableOptions(testOptions, mockNode);

			// Find indices of included options in the result
			const option1Index = result.findIndex((opt) => opt.value === 'option1');
			const option2Index = result.findIndex((opt) => opt.value === 'option2');
			const option3Index = result.findIndex((opt) => opt.value === 'option3');
			const option4Index = result.findIndex((opt) => opt.value === 'option4');

			// All options should be included when displayParameter returns true
			expect(option1Index).toBeLessThan(option2Index);
			expect(option2Index).toBeLessThan(option3Index);
			expect(option3Index).toBeLessThan(option4Index);
		});
	});

	describe('envFeatureFlag gating', () => {
		const flaggedOption: INodePropertyOptions = {
			name: 'Flagged Option',
			value: 'flagged',
			envFeatureFlag: 'SOME_FLAG',
		};

		beforeEach(() => {
			vi.mocked(NodeHelpers.displayParameter).mockReturnValue(true);
		});

		it('hides an option whose env feature flag is disabled', () => {
			const result = getParameterDisplayableOptions([testOptions[0], flaggedOption], mockNode);

			expect(result).toContainEqual(testOptions[0]);
			expect(result).not.toContainEqual(flaggedOption);
		});

		it('shows an option whose env feature flag is enabled', () => {
			enabledEnvFeatureFlags.add('SOME_FLAG');

			const result = getParameterDisplayableOptions([testOptions[0], flaggedOption], mockNode);

			expect(result).toContainEqual(flaggedOption);
		});
	});

	describe('edge cases', () => {
		it('should handle complex node parameters', () => {
			const complexNode = {
				...mockNode,
				parameters: {
					simpleParam: 'value',
					objectParam: {
						nestedParam: 'nestedValue',
					},
					arrayParam: ['item1', 'item2'],
				},
			};

			vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue(complexNode.parameters);

			getParameterDisplayableOptions(testOptions, complexNode);

			expect(NodeHelpers.getNodeParameters).toHaveBeenCalledWith(
				mockNodeType.properties,
				complexNode.parameters,
				true,
				false,
				complexNode,
				mockNodeType,
			);
		});
	});
});

describe('serializeNode', () => {
	const nodeTypeProvider = { getNodeType: vi.fn().mockReturnValue(null) };

	function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
		return {
			id: 'id',
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	beforeEach(() => {
		nodeTypeProvider.getNodeType.mockReturnValue(null);
		vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue({});
	});

	it('passes parameters + credentials through when node type is unknown', () => {
		const node = createNode({
			name: 'Unknown',
			parameters: { foo: 'bar' },
			credentials: { someCred: { id: '1', name: 'cred' } },
		});

		const result = serializeNode(nodeTypeProvider, node);

		expect(result.parameters).toEqual({ foo: 'bar' });
		expect(result.credentials).toEqual({ someCred: { id: '1', name: 'cred' } });
	});

	it('preserves disabled / continueOnFail / onError / notes only when set', () => {
		const withFlags = createNode({
			name: 'With',
			disabled: true,
			continueOnFail: true,
			onError: 'continueRegularOutput',
			notes: 'hello',
		});
		const withoutFlags = createNode({
			name: 'Without',
			disabled: false,
			continueOnFail: false,
			onError: 'stopWorkflow',
			notes: '',
		});

		const resultWith = serializeNode(nodeTypeProvider, withFlags);
		const resultWithout = serializeNode(nodeTypeProvider, withoutFlags);

		expect(resultWith.disabled).toBe(true);
		expect(resultWith.continueOnFail).toBe(true);
		expect(resultWith.onError).toBe('continueRegularOutput');
		expect(resultWith.notes).toBe('hello');

		expect(resultWithout.disabled).toBeUndefined();
		expect(resultWithout.continueOnFail).toBeUndefined();
		expect(resultWithout.onError).toBeUndefined();
		expect(resultWithout.notes).toBeUndefined();
	});

	it('does not throw and omits null optional fields when node type is unknown', () => {
		const node = createNode({
			credentials: null as unknown as INodeUi['credentials'],
			webhookId: null as unknown as string,
			notes: null as unknown as string,
			notesInFlow: null as unknown as boolean,
			executeOnce: null as unknown as boolean,
			retryOnFail: null as unknown as boolean,
			alwaysOutputData: null as unknown as boolean,
			onError: null as unknown as INodeUi['onError'],
		});

		const result = serializeNode(nodeTypeProvider, node);

		expect(result.credentials).toBeUndefined();
		expect(result.webhookId).toBeUndefined();
		expect(result.notes).toBeUndefined();
		expect(result.notesInFlow).toBeUndefined();
		expect(result.executeOnce).toBeUndefined();
		expect(result.retryOnFail).toBeUndefined();
		expect(result.alwaysOutputData).toBeUndefined();
		expect(result.onError).toBeUndefined();
		expect(result.parameters).toEqual({});
	});

	it('does not throw when a known node type has null credentials or parameters', () => {
		const knownNodeType = {
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			version: 1,
			description: '',
			defaults: { name: 'HTTP Request' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			group: ['transform'],
			credentials: [{ name: 'httpBasicAuth', required: false }],
		} as INodeTypeDescription;

		nodeTypeProvider.getNodeType.mockReturnValue(knownNodeType);
		vi.mocked(NodeHelpers.getNodeParameters).mockReturnValue({});

		const node = createNode({
			type: 'n8n-nodes-base.httpRequest',
			credentials: null as unknown as INodeUi['credentials'],
			parameters: null as unknown as INodeUi['parameters'],
			webhookId: null as unknown as string,
		});

		expect(() => serializeNode(nodeTypeProvider, node)).not.toThrow();
		const result = serializeNode(nodeTypeProvider, node);

		expect(result.credentials).toBeUndefined();
		expect(result.webhookId).toBeUndefined();
		expect(result.parameters).toEqual({});
		expect(NodeHelpers.getNodeParameters).toHaveBeenCalledWith(
			knownNodeType.properties,
			{},
			false,
			false,
			expect.objectContaining({
				id: 'id',
				name: 'Test Node',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {},
			}),
			knownNodeType,
		);
		const normalizedNode = vi.mocked(NodeHelpers.getNodeParameters).mock.calls[0]?.[4] as Record<
			string,
			unknown
		>;
		expect(normalizedNode).not.toHaveProperty('credentials');
		expect(normalizedNode).not.toHaveProperty('webhookId');
	});

	describe('credential filtering', () => {
		// Mirrors how the HTTP Request node declares credentials: only httpSslAuth is
		// declared; generic/predefined auth types come from the genericAuthType and
		// nodeCredentialType parameters.
		const httpRequestNodeType = {
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			version: 1,
			description: '',
			defaults: { name: 'HTTP Request' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			group: ['transform'],
			credentials: [
				{
					name: 'httpSslAuth',
					required: true,
					displayOptions: { show: { provideSslCertificates: [true] } },
				},
			],
		} as INodeTypeDescription;

		it('drops credentials not referenced by genericAuthType', () => {
			nodeTypeProvider.getNodeType.mockReturnValue(httpRequestNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' },
				credentials: {
					httpHeaderAuth: { id: '1', name: 'Header Auth' },
					httpBasicAuth: { id: '2', name: 'Stale Basic Auth' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({ httpHeaderAuth: { id: '1', name: 'Header Auth' } });
		});

		it('drops credentials not referenced by nodeCredentialType', () => {
			nodeTypeProvider.getNodeType.mockReturnValue(httpRequestNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: { authentication: 'predefinedCredentialType', nodeCredentialType: 'slackApi' },
				credentials: {
					slackApi: { id: '1', name: 'Slack' },
					httpQueryAuth: { id: '2', name: 'Stale Query Auth' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({ slackApi: { id: '1', name: 'Slack' } });
		});

		it('keeps a displayed declared credential alongside the parameter-selected one', () => {
			nodeTypeProvider.getNodeType.mockReturnValue(httpRequestNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					provideSslCertificates: true,
				},
				credentials: {
					httpHeaderAuth: { id: '1', name: 'Header Auth' },
					httpSslAuth: { id: '2', name: 'SSL Cert' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({
				httpHeaderAuth: { id: '1', name: 'Header Auth' },
				httpSslAuth: { id: '2', name: 'SSL Cert' },
			});
		});

		it('keeps all credentials when the credential-type parameter is an expression', () => {
			nodeTypeProvider.getNodeType.mockReturnValue(httpRequestNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: '={{ $json.authType }}',
				},
				credentials: {
					httpHeaderAuth: { id: '1', name: 'Header Auth' },
					httpBasicAuth: { id: '2', name: 'Basic Auth' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({
				httpHeaderAuth: { id: '1', name: 'Header Auth' },
				httpBasicAuth: { id: '2', name: 'Basic Auth' },
			});
		});

		it('keeps a declared ssl credential when the ssl setting is off', () => {
			nodeTypeProvider.getNodeType.mockReturnValue(httpRequestNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
					provideSslCertificates: false,
				},
				credentials: {
					slackApi: { id: '1', name: 'Slack' },
					httpSslAuth: { id: '2', name: 'SSL Cert' },
					httpQueryAuth: { id: '3', name: 'Stale Query Auth' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			// The SSL credential is hidden but parallel to the auth credential, so it
			// survives the auth switch that drops the stale generic one.
			expect(result.credentials).toEqual({
				slackApi: { id: '1', name: 'Slack' },
				httpSslAuth: { id: '2', name: 'SSL Cert' },
			});
		});

		it('drops a stale credential despite an expression in a hidden credential-type parameter', () => {
			nodeTypeProvider.getNodeType.mockReturnValue({
				...httpRequestNodeType,
				properties: [
					{
						displayName: 'Credential Type',
						name: 'nodeCredentialType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
					},
					{
						displayName: 'Generic Auth Type',
						name: 'genericAuthType',
						type: 'credentialsSelect',
						default: '',
						displayOptions: { show: { authentication: ['genericCredentialType'] } },
					},
				],
			} as INodeTypeDescription);

			const node = createNode({
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'slackApi',
					genericAuthType: '={{ $json.authType }}',
				},
				credentials: {
					slackApi: { id: '1', name: 'Slack' },
					httpBasicAuth: { id: '2', name: 'Stale Basic Auth' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({ slackApi: { id: '1', name: 'Slack' } });
		});

		it('filters declared credentials by display state and drops unknown types', () => {
			const declaredNodeType = {
				name: 'n8n-nodes-base.testNode',
				displayName: 'Test Node',
				version: 1,
				description: '',
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				group: ['transform'],
				credentials: [
					{ name: 'shownApi' },
					{ name: 'hiddenApi', displayOptions: { show: { mode: ['special'] } } },
				],
			} as INodeTypeDescription;
			nodeTypeProvider.getNodeType.mockReturnValue(declaredNodeType);

			const node = createNode({
				type: 'n8n-nodes-base.testNode',
				credentials: {
					shownApi: { id: '1', name: 'Shown' },
					hiddenApi: { id: '2', name: 'Hidden' },
					unknownApi: { id: '3', name: 'Unknown' },
				},
			});

			const result = serializeNode(nodeTypeProvider, node);

			expect(result.credentials).toEqual({ shownApi: { id: '1', name: 'Shown' } });
		});
	});
});
