import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';
import * as nodeHelpers from '@/app/composables/useNodeHelpers';
import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
import * as nodeSettingsUtils from '@/features/ndv/shared/ndv.utils';
import * as nodeTypesUtils from '@/app/utils/nodeTypesUtils';
import type { INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { CHAT_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants';

describe('useNodeSettingsParameters', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('handleFocus', () => {
		let ndvStore: MockedStore<typeof useNDVStore>;
		let focusPanelStore: MockedStore<typeof useFocusPanelStore>;

		beforeEach(() => {
			setActivePinia(createTestingPinia());

			ndvStore = mockedStore(useNDVStore);
			focusPanelStore = mockedStore(useFocusPanelStore);

			ndvStore.activeNode = {
				id: '123',
				name: 'myParam',
				parameters: {},
				position: [0, 0],
				type: 'test',
				typeVersion: 1,
			};
			ndvStore.activeNodeName = 'Node1';
			ndvStore.setActiveNodeName = vi.fn();
			ndvStore.unsetActiveNodeName = vi.fn();
			ndvStore.resetNDVPushRef = vi.fn();
			focusPanelStore.openWithFocusedNodeParameter = vi.fn();
			focusPanelStore.focusPanelActive = false;
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('sets focused node parameter', async () => {
			const { handleFocus } = useNodeSettingsParameters();
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'test',
				parameters: {},
			};
			const path = 'parameters.foo';
			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(node, path, parameter);

			expect(focusPanelStore.openWithFocusedNodeParameter).toHaveBeenCalledWith({
				nodeId: node.id,
				parameterPath: path,
				parameter,
			});

			expect(ndvStore.unsetActiveNodeName).toHaveBeenCalled();
			expect(ndvStore.resetNDVPushRef).toHaveBeenCalled();
		});

		it('does nothing if node is undefined', async () => {
			const { handleFocus } = useNodeSettingsParameters();

			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(undefined, 'parameters.foo', parameter);

			expect(focusPanelStore.openWithFocusedNodeParameter).not.toHaveBeenCalled();
		});
	});

	describe('shouldDisplayNodeParameter', () => {
		const displayParameterSpy = vi.fn();
		function mockNodeHelpers({ isCustomApiCallSelected = false } = {}) {
			const originalNodeHelpers = nodeHelpers.useNodeHelpers();

			vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
				return {
					...originalNodeHelpers,
					isCustomApiCallSelected: vi.fn(() => isCustomApiCallSelected),
					displayParameter: displayParameterSpy,
				};
			});
		}

		let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
		let settingsStore: MockedStore<typeof useSettingsStore>;

		const mockParameter: INodeProperties = {
			name: 'foo',
			type: 'string',
			displayName: 'Foo',
			displayOptions: {},
			default: '',
		};

		const mockNodeType: INodeTypeDescription = {
			version: 1,
			name: 'testNode',
			displayName: 'Test Node',
			description: 'A test node',
			group: ['input'],
			defaults: {
				name: 'Test Node',
			},
			inputs: ['main'],
			outputs: [],
			properties: [mockParameter],
		};

		beforeEach(() => {
			setActivePinia(createTestingPinia());

			nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(mockNodeType);

			settingsStore = mockedStore(useSettingsStore);
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		describe('hidden parameter type', () => {
			it('returns false for hidden parameter type', async () => {
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, {
					...mockParameter,
					type: 'hidden',
				});
				expect(result).toBe(false);
			});

			it('does not call displayParameter for hidden parameters', async () => {
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				await shouldDisplayNodeParameter({}, null, { ...mockParameter, type: 'hidden' });
				expect(displayParameterSpy).not.toHaveBeenCalled();
			});
		});

		describe('custom API call handling', () => {
			it('returns false for custom API call with mustHideDuringCustomApiCall', async () => {
				vi.spyOn(nodeSettingsUtils, 'mustHideDuringCustomApiCall').mockReturnValueOnce(true);
				mockNodeHelpers({ isCustomApiCallSelected: true });

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, mockParameter);
				expect(result).toBe(false);
			});

			it('returns true when custom API call selected but mustHideDuringCustomApiCall is false', async () => {
				vi.spyOn(nodeSettingsUtils, 'mustHideDuringCustomApiCall').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers({ isCustomApiCallSelected: true });
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, mockParameter);
				expect(result).toBe(true);
			});

			it('does not check mustHideDuringCustomApiCall when custom API call is not selected', async () => {
				const mustHideSpy = vi
					.spyOn(nodeSettingsUtils, 'mustHideDuringCustomApiCall')
					.mockReturnValueOnce(true);
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers({ isCustomApiCallSelected: false });
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				await shouldDisplayNodeParameter({}, null, mockParameter);
				expect(mustHideSpy).not.toHaveBeenCalled();
			});
		});

		describe('auth-related parameter handling', () => {
			const authParameter: INodeProperties = {
				name: 'authentication',
				type: 'options',
				displayName: 'Authentication',
				default: 'none',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'OAuth2', value: 'oauth2' },
				],
			};

			it('returns false if parameter is auth-related', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(true);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(authParameter);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, mockParameter);
				expect(result).toBe(false);
			});

			it('returns false when parameter name matches main auth field name', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(authParameter);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter(
					{},
					{
						id: '1',
						name: 'Node1',
						position: [0, 0],
						typeVersion: 1,
						type: 'test',
						parameters: {},
					},
					authParameter,
				);
				expect(result).toBe(false);
			});

			it('shows auth field when node type is in KEEP_AUTH_IN_NDV_FOR_NODES', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(true);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(authParameter);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'HTTP Request',
					position: [0, 0],
					typeVersion: 1,
					type: HTTP_REQUEST_NODE_TYPE,
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, authParameter);
				expect(result).toBe(true);
			});

			it('shows auth field when node type is webhook (in KEEP_AUTH_IN_NDV_FOR_NODES)', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(true);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(authParameter);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Webhook',
					position: [0, 0],
					typeVersion: 1,
					type: WEBHOOK_NODE_TYPE,
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, authParameter);
				expect(result).toBe(true);
			});

			it('shows parameter when no main auth field exists', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, mockParameter);
				expect(result).toBe(true);
			});

			it('shows non-auth parameter when main auth field exists', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(authParameter);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'test',
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, mockParameter);
				expect(result).toBe(true);
			});
		});

		describe('chat trigger availableInChat parameter', () => {
			const chatTriggerNodeType: INodeTypeDescription = {
				...mockNodeType,
				name: CHAT_TRIGGER_NODE_TYPE,
			};

			const availableInChatParameter: INodeProperties = {
				name: 'availableInChat',
				type: 'boolean',
				displayName: 'Available in Chat',
				default: false,
			};

			it('hides availableInChat when chat feature is disabled', async () => {
				nodeTypesStore.getNodeType = vi.fn().mockReturnValue(chatTriggerNodeType);
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();

				settingsStore.isChatFeatureEnabled = false;

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Chat Trigger',
					position: [0, 0],
					typeVersion: 1,
					type: CHAT_TRIGGER_NODE_TYPE,
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, availableInChatParameter);
				expect(result).toBe(false);
			});

			it('shows availableInChat when chat feature is enabled', async () => {
				nodeTypesStore.getNodeType = vi.fn().mockReturnValue(chatTriggerNodeType);
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				settingsStore.isChatFeatureEnabled = true;

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Chat Trigger',
					position: [0, 0],
					typeVersion: 1,
					type: CHAT_TRIGGER_NODE_TYPE,
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, availableInChatParameter);
				expect(result).toBe(true);
			});

			it('does not affect availableInChat on non-chat trigger nodes', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				settingsStore.isChatFeatureEnabled = false;

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Other Node',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.other',
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, availableInChatParameter);
				expect(result).toBe(true);
			});
		});

		describe('displayOptions handling', () => {
			it('returns true if displayOptions is undefined', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({}, null, {
					...mockParameter,
					displayOptions: undefined,
				});
				expect(result).toBe(true);
			});

			it('returns true if disabledOptions is undefined when using disabledOptions displayKey', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const parameterWithoutDisabledOptions: INodeProperties = {
					...mockParameter,
					displayOptions: { show: { resource: ['user'] } },
				};

				const result = await shouldDisplayNodeParameter(
					{},
					null,
					parameterWithoutDisabledOptions,
					'',
					'disabledOptions',
				);
				expect(result).toBe(true);
			});
		});

		describe('path parameter handling', () => {
			it('gets rawValues from path when path is provided', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					nested: {
						foo: 'bar',
					},
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters,
					node,
					mockParameter,
					'nested',
				);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'nested',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('returns false when rawValues at path is null', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					nested: null,
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters as unknown as Record<string, string>,
					node,
					mockParameter,
					'nested',
				);
				expect(result).toBe(false);
			});

			it('returns false when rawValues at path is undefined', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters,
					node,
					mockParameter,
					'nonexistent.path',
				);
				expect(result).toBe(false);
			});
		});

		describe('expression resolution', () => {
			it('resolves expressions and calls displayParameter with resolved parameters', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: async (expr: string) => (expr === '=1+1' ? 2 : expr),
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: '=1+1' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					{ foo: 2 },
					mockParameter,
					'',
					node,
					'displayOptions',
				);

				expect(displayParameterSpy).toHaveBeenCalled();
				expect(result).toBe(true);
			});

			it('defers resolution when expression references missing parameter with $parameter', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const resolveExpressionSpy = vi.fn().mockResolvedValue(undefined);
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: resolveExpressionSpy,
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					first: '={{ $parameter.second }}',
					second: 'value',
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				// The expression with $parameter.second should be deferred until 'second' is processed
				// So resolveExpression should still be called eventually
				expect(displayParameterSpy).toHaveBeenCalled();
			});

			it('handles mutually dependent expressions (circular dependency)', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				// Track resolution order to detect any bugs:
				const resolutionOrder: string[] = [];
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: async (expr: string, siblingParameters: INodeParameters = {}) => {
						if (expr === '={{ $parameter.second }}') {
							resolutionOrder.push('first');
							return (siblingParameters.second as string) ?? 'unresolved_second';
						}
						if (expr === '={{ $parameter.first }}') {
							resolutionOrder.push('second');
							return (siblingParameters.first as string) ?? 'unresolved_first';
						}
						return 'resolved';
					},
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				// Both expressions reference each other - circular dependency
				// Object.keys() returns ['first', 'second'] in insertion order
				const nodeParameters = {
					first: '={{ $parameter.second }}',
					second: '={{ $parameter.first }}',
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				// Both should be resolved
				expect(resolutionOrder).toContain('first');
				expect(resolutionOrder).toContain('second');

				// With circular deps, the original code would keep deferring both until safety limit,
				// then resolve them. Our refactored code should defer both, then resolve in order.
				expect(resolutionOrder[0]).toBe('first');
			});

			it('handles chained expression dependencies (a depends on b, b depends on c)', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				// Track resolution order to verify dependencies are resolved correctly
				const resolutionOrder: string[] = [];
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: async (expr: string, siblingParameters: INodeParameters = {}) => {
						if (expr === '={{ $parameter.second }}') {
							resolutionOrder.push('first');
							// If second wasn't resolved yet, this would return 'unresolved'
							return (siblingParameters.second as string) ?? 'unresolved';
						}
						if (expr === '={{ $parameter.third }}') {
							resolutionOrder.push('second');
							// If third wasn't resolved yet, this would return 'unresolved'
							return (siblingParameters.third as string) ?? 'unresolved';
						}
						if (expr === '=base') {
							resolutionOrder.push('third');
							return 'base_value';
						}
						return expr;
					},
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				// Chained: first -> second -> third (which is a plain expression)
				const nodeParameters = {
					first: '={{ $parameter.second }}',
					second: '={{ $parameter.third }}',
					third: '=base',
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				// Should resolve in correct order: third -> second -> first
				// This ensures dependencies are resolved before dependents
				expect(resolutionOrder).toEqual(['third', 'second', 'first']);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						third: 'base_value',
						second: 'base_value',
						first: 'base_value',
					}),
					mockParameter,
					'',
					node,
					'displayOptions',
				);
			});

			it('sets empty string when expression resolution throws error', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: () => {
						throw new Error('Invalid expression');
					},
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: '=invalid{{expression' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					{ foo: '' },
					mockParameter,
					'',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('handles non-expression values without resolving', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);
				const resolveExpressionSpy = vi.fn();
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: resolveExpressionSpy,
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: 'plain value' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(resolveExpressionSpy).not.toHaveBeenCalled();
				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'',
					node,
					'displayOptions',
				);
			});

			it('resolves expressions with path and calls displayParameter with deepCopy', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: async (expr: string) =>
						expr === '=resolved' ? 'resolved_value' : expr,
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					nested: {
						foo: '=resolved',
					},
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters,
					node,
					mockParameter,
					'nested',
				);

				// When path is provided and expressions are resolved, it should deepCopy and set the resolved values
				expect(displayParameterSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						nested: { foo: 'resolved_value' },
					}),
					mockParameter,
					'nested',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('handles mixed expression and non-expression values', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);
				const originalWorkflowHelpers = workflowHelpers.useWorkflowHelpers();
				vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
					...originalWorkflowHelpers,
					resolveExpression: async () => 'resolved',
				}));

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					expr: '=expression',
					plain: 'plain value',
					number: 42,
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					{ expr: 'resolved', plain: 'plain value', number: 42 },
					mockParameter,
					'',
					node,
					'displayOptions',
				);
			});
		});

		describe('displayParameter delegation', () => {
			it('calls displayParameter with correct arguments', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(false);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'foo',
					type: 'string',
					displayName: 'Foo',
					disabledOptions: {},
					default: '',
				};
				const nodeParameters = { foo: 'bar' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters,
					node,
					parameter,
					'',
					'disabledOptions',
				);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					parameter,
					'',
					node,
					'disabledOptions',
				);
				expect(result).toBe(false);
			});

			it('calls displayParameter with default displayOptions', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: 'bar' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('returns the result from displayParameter', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(false);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: 'bar' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);
				expect(result).toBe(false);

				displayParameterSpy.mockResolvedValueOnce(true);
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);

				const result2 = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);
				expect(result2).toBe(true);
			});
		});

		describe('edge cases', () => {
			it('handles null node parameter', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const result = await shouldDisplayNodeParameter({ foo: 'bar' }, null, mockParameter);
				expect(result).toBe(true);
			});

			it('handles empty nodeParameters', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: {},
				};

				const result = await shouldDisplayNodeParameter({}, node, mockParameter);
				expect(result).toBe(true);
			});

			it('handles undefined path parameter (uses empty string default)', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = { foo: 'bar' };
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				// Call without path parameter (uses default empty string)
				const result = await shouldDisplayNodeParameter(nodeParameters, node, mockParameter);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('handles non-string values in nodeParameters', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					stringVal: 'test',
					numberVal: 123,
					boolVal: true,
					arrayVal: [1, 2, 3],
					objectVal: { nested: 'value' },
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters as unknown as Record<string, string>,
					node,
					mockParameter,
				);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});

			it('handles deeply nested paths', async () => {
				vi.spyOn(nodeTypesUtils, 'isAuthRelatedParameter').mockReturnValueOnce(false);
				vi.spyOn(nodeTypesUtils, 'getMainAuthField').mockReturnValueOnce(null);
				mockNodeHelpers();
				displayParameterSpy.mockResolvedValueOnce(true);

				const { shouldDisplayNodeParameter } = useNodeSettingsParameters();

				const nodeParameters = {
					level1: {
						level2: {
							level3: {
								foo: 'bar',
							},
						},
					},
				};
				const node: INodeUi = {
					id: '1',
					name: 'Node1',
					position: [0, 0],
					typeVersion: 1,
					type: 'n8n-nodes-base.set',
					parameters: nodeParameters,
				};

				const result = await shouldDisplayNodeParameter(
					nodeParameters,
					node,
					mockParameter,
					'level1.level2.level3',
				);

				expect(displayParameterSpy).toHaveBeenCalledWith(
					nodeParameters,
					mockParameter,
					'level1.level2.level3',
					node,
					'displayOptions',
				);
				expect(result).toBe(true);
			});
		});
	});
});
